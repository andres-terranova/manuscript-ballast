import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Vercel AI SDK imports
import { generateObject } from "https://esm.sh/ai@5.0.38";
import { openai } from "https://esm.sh/@ai-sdk/openai@2.0.27";

// Zod schemas (exact as specified)
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const SuggestionType = z.enum(["insert", "delete", "replace"]);
export const SuggestionCategory = z.enum(["grammar", "spelling", "style"]);

export const SuggestionZ = z.object({
  id: z.string().min(1),
  type: SuggestionType,
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  before: z.string(),
  after: z.string(),
  category: SuggestionCategory,
  note: z.string(),
  location: z.string().optional()
});

export const SuggestResponseZ = z.object({
  suggestions: z.array(SuggestionZ)
});

// Rate limiting store (in-memory)
const rateLimitStore = new Map<string, number>();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// System prompt (verbatim as specified)
const SYSTEM_PROMPT = `You are a meticulous copy editor. Return ONLY valid JSON matching this schema:
{ "suggestions": [ { "id": "string", "type": "insert"|"delete"|"replace", "start": number, "end": number, "before": "string", "after": "string", "category": "grammar"|"spelling"|"style", "note": "string", "location": "string" } ] }.
CRITICAL: The "category" field MUST be exactly one of: "grammar", "spelling", or "style". Never use "punctuation" - classify punctuation fixes as "grammar" instead.
Indices refer to UTF-16 positions in THE PROVIDED PLAIN TEXT (not HTML). Fix grammar, spelling, clarity and concise style; prefer Chicago style conventions when ambiguous. Do not introduce new facts. Never include prose outside the JSON object.`;

function buildPrompt(scope: string, rules: string[], text: string): string {
  return `Scope: ${scope}
Rules: ${rules.length > 0 ? rules.join(", ") : "none"}
TEXT:
${text}`;
}

function getClientIdentifier(req: Request): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitStore.get(clientId);
  
  if (lastRequest && (now - lastRequest) < 5000) { // 5 second throttle
    return false;
  }
  
  rateLimitStore.set(clientId, now);
  return true;
}

function chunkText(text: string, chunkSize: number = 4000): string[] {
  // Use configurable chunk size (default 4000 chars)
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Dynamic max chunks based on document size (no arbitrary 20-chunk limit)
  const maxChunks = Math.min(150, Math.ceil(text.length / 2000)); // Allow up to 150 chunks
  if (chunks.length > maxChunks) {
    console.log(`Text too large (${chunks.length} chunks), limiting to first ${maxChunks} chunks`);
    return chunks.slice(0, maxChunks);
  }

  return chunks;
}

async function generateSuggestions(text: string, scope: string, rules: string[]): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const modelName = Deno.env.get('AI_MODEL') || 'gpt-4.1-2025-04-14';
  const model = openai(modelName, { apiKey: openaiApiKey });
  const prompt = buildPrompt(scope, rules, text);

  const maxRetries = 2;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: SuggestResponseZ,
        system: SYSTEM_PROMPT,
        prompt: prompt,
        max_completion_tokens: 4000,
      });

      // Validate and sanitize the result
      if (result.object?.suggestions) {
        const sanitizedSuggestions = result.object.suggestions.filter(suggestion => {
          return suggestion && 
                 typeof suggestion.id === 'string' &&
                 typeof suggestion.type === 'string' &&
                 typeof suggestion.category === 'string' &&
                 typeof suggestion.before === 'string' &&
                 typeof suggestion.after === 'string' &&
                 typeof suggestion.note === 'string' &&
                 typeof suggestion.start === 'number' &&
                 typeof suggestion.end === 'number';
        });

        return { suggestions: sanitizedSuggestions };
      }

      return { suggestions: [] };
    } catch (e) {
      lastError = e;
      console.error(`Attempt ${attempt + 1} failed:`, e);
      
      if (attempt === maxRetries - 1) {
        console.error('All retry attempts failed:', e);
        throw new Error('AI service temporarily unavailable');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw lastError;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  const clientId = getClientIdentifier(req);

  try {
    // Rate limiting
    if (!checkRateLimit(clientId)) {
      console.log(`Rate limit exceeded for client: ${clientId}`);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse input
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, scope = 'entire', rules = [] } = body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return new Response(JSON.stringify({ error: 'Text is required and cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chunk text if needed
    const chunks = chunkText(text);
    console.log(`Processing ${text.length} characters in ${chunks.length} chunks`);

    let allSuggestions: any[] = [];
    let currentOffset = 0;

    // Process chunks with timeout
    for (const chunk of chunks) {
      try {
        const result = await withTimeout(
          generateSuggestions(chunk, scope, rules),
          30000 // 30 second timeout per chunk for faster response
        );

        // Shift indices by current offset
        const shiftedSuggestions = result.suggestions.map((suggestion: any) => ({
          ...suggestion,
          start: suggestion.start + currentOffset,
          end: suggestion.end + currentOffset,
        }));

        allSuggestions.push(...shiftedSuggestions);
        currentOffset += chunk.length + (chunks.length > 1 ? 2 : 0); // Account for paragraph breaks
      } catch (error) {
        if (error.message === 'Request timeout') {
          console.error('Request timeout for chunk');
          return new Response(JSON.stringify({ error: 'timeout' }), {
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`Completed in ${elapsedMs}ms: ${text.length} chars, ${chunks.length} chunks, ${allSuggestions.length} suggestions`);

    return new Response(JSON.stringify({ suggestions: allSuggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`Error after ${elapsedMs}ms:`, error);

    if (error.message.includes('Invalid response format')) {
      return new Response(JSON.stringify({ error: 'invalid_response' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});