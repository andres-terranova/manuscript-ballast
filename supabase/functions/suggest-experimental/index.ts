import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Experimental suggestions schema with context windows
const experimentalSuggestionSchema = z.object({
  textToReplace: z.string(),
  textReplacement: z.string(), 
  reason: z.string().optional(),
  textBefore: z.string().optional(),
  textAfter: z.string().optional(),
});

const requestSchema = z.object({
  text: z.string().min(1),
});

const responseSchema = z.object({
  suggestions: z.array(experimentalSuggestionSchema),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Experimental suggest function called");

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse and validate request
    const body = await req.json();
    const { text } = requestSchema.parse(body);
    
    console.log("Processing text length:", text.length);

    // System prompt for experimental editor with context windows
    const systemPrompt = `You are an AI editing assistant for an experimental editor that uses prosemirror-suggestion-mode.

Your task is to analyze text and provide suggestions with context windows to help with positioning.

For each suggestion, you MUST include:
- textToReplace: the exact text to replace
- textReplacement: the corrected text
- reason: brief explanation of the change
- textBefore: 20-30 characters of text BEFORE the change location (for positioning context)
- textAfter: 20-30 characters of text AFTER the change location (for positioning context)

Focus on:
1. Grammar and spelling errors
2. Style improvements
3. Clarity enhancements
4. Consistency fixes

Return only valid JSON with a "suggestions" array. Each suggestion must include context windows.`;

    const userPrompt = `Analyze this text and provide editing suggestions with context windows:

"${text}"

Return JSON: {"suggestions": [{"textToReplace": "text", "textReplacement": "replacement", "reason": "explanation", "textBefore": "context before", "textAfter": "context after"}]}`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const aiContent = openAIData.choices[0].message.content;
    
    console.log("Raw AI response:", aiContent);

    // Parse and validate AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', aiContent);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response structure
    const validatedResponse = responseSchema.parse(parsedResponse);
    
    console.log("Generated suggestions:", validatedResponse.suggestions.length);

    return new Response(JSON.stringify(validatedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-experimental function:', error);
    
    // Return a more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      suggestions: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});