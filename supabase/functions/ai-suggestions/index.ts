import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface SuggestionRequest {
  text: string;
  context?: string;
}

interface OpenAISuggestion {
  type: 'insert' | 'replace' | 'delete';
  start: number;
  end: number;
  before: string;
  after: string;
  category: 'grammar' | 'spelling' | 'style';
  note: string;
}

async function generateSuggestions(text: string, context?: string): Promise<OpenAISuggestion[]> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze the following text and provide specific editing suggestions. Focus on grammar, spelling, and style improvements. For each suggestion, provide:
1. The exact text that should be changed (before)
2. The replacement text (after)
3. The character position where the change starts
4. The character position where the change ends
5. The type of change (insert, replace, or delete)
6. The category (grammar, spelling, or style)
7. A brief explanation

Text to analyze:
${text}

${context ? `Additional context: ${context}` : ''}

Respond with a JSON array of suggestions in this exact format:
[
  {
    "type": "replace",
    "start": 0,
    "end": 5,
    "before": "Thier",
    "after": "Their",
    "category": "spelling",
    "note": "Corrected spelling of 'their'"
  }
]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional editor. Provide specific, actionable suggestions for improving text quality. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;

  if (!content) {
    return [];
  }

  try {
    // Extract JSON from the response (in case there's additional text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON array found in response:', content);
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    
    // Validate and clean suggestions
    return suggestions.filter((suggestion: any) => {
      return (
        suggestion.type &&
        typeof suggestion.start === 'number' &&
        typeof suggestion.end === 'number' &&
        suggestion.before &&
        suggestion.after &&
        suggestion.category &&
        suggestion.note
      );
    });
  } catch (error) {
    console.error('Error parsing OpenAI response:', error, content);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body: SuggestionRequest = await req.json();
    
    if (!body.text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Generating AI suggestions for text length:', body.text.length);
    
    const suggestions = await generateSuggestions(body.text, body.context);
    
    console.log('Generated', suggestions.length, 'suggestions');
    
    return new Response(
      JSON.stringify({ 
        suggestions,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-suggestions function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});