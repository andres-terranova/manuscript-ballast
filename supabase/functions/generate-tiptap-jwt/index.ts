import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentAISecret = Deno.env.get('TIPTAP_CONTENT_AI_SECRET');
    const contentAIAppId = 'pkry1n5m'; // Your Content AI App ID
    
    if (!contentAISecret) {
      console.error('TIPTAP_CONTENT_AI_SECRET not found in environment');
      return new Response(
        JSON.stringify({ error: 'Content AI secret not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate JWT token for Content AI authentication
    // The JWT should include the app ID and be signed with the secret
    const payload = {
      appId: contentAIAppId,
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
    };

    // Create the secret key for signing
    const secretKey = new TextEncoder().encode(contentAISecret);
    
    const jwt = await encode(
      { alg: "HS256", typ: "JWT" },
      payload,
      secretKey
    );

    console.log('Generated JWT token for Content AI');

    return new Response(
      JSON.stringify({ 
        jwt,
        appId: contentAIAppId,
        expiresAt: payload.exp 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating Tiptap JWT:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWT token' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});