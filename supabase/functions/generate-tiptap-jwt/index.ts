import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Generating Tiptap JWT token...');
    
    const secret = Deno.env.get('TIPTAP_CONTENT_AI_SECRET');
    const appId = 'pkry1n5m';
    
    if (!secret) {
      console.error('TIPTAP_CONTENT_AI_SECRET not found in environment');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Content AI secret' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: 'https://api.tiptap.dev',
      iat: now,
      exp: now + (60 * 60 * 24 * 30), // 30 days expiry
    };

    // Generate JWT using Web Crypto API (more compatible with Deno)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Create header and payload
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature
    const data = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    const jwt = `${data}.${signatureB64}`;
    
    console.log('JWT token generated successfully');
    
    return new Response(
      JSON.stringify({ 
        token: jwt,
        appId: appId,
        expiresAt: payload.exp * 1000 // Convert to milliseconds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Error in generate-tiptap-jwt function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWT token', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});