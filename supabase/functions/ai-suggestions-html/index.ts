import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { html, chunkId, rules } = await req.json();

    console.log(`Processing chunk ${chunkId} with ${html.length} characters`);

    // Validate input
    if (!html || typeof html !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid HTML input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const items = [];

    // Call OpenAI for each rule
    for (const rule of rules) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a ${rule.title}. ${rule.prompt}

CRITICAL INSTRUCTIONS:
1. Return suggestions in JSON format with this exact structure:
{
  "suggestions": [
    {
      "deleteHtml": "<p>exact HTML snippet to delete</p>",
      "insertHtml": "<p>exact HTML snippet to insert</p>",
      "note": "Brief explanation of the change"
    }
  ]
}

2. The deleteHtml MUST be an exact match from the input HTML (preserve all formatting, whitespace, tags)
3. Suggest changes ONLY for issues your role explicitly identifies - do not fix unrelated problems
4. If no changes needed, return empty suggestions array`
            },
            {
              role: 'user',
              content: `Analyze this HTML content:\n\n${html}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`OpenAI API error: ${response.status} - ${error}`);
        throw new Error(`OpenAI API failed: ${response.status}`);
      }

      const result = await response.json();
      const content = JSON.parse(result.choices[0].message.content || '{"suggestions":[]}');

      if (content.suggestions && Array.isArray(content.suggestions)) {
        items.push(...content.suggestions.map(s => ({
          ruleId: rule.id,
          deleteHtml: s.deleteHtml,
          insertHtml: s.insertHtml,
          chunkId: chunkId,
          note: `${rule.title}: ${s.note || 'Suggestion'}`
        })));
      }
    }

    console.log(`Chunk ${chunkId} complete: ${items.length} suggestions`);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
