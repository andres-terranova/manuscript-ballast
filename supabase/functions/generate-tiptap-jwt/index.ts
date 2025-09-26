import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as jose from 'https://deno.land/x/jose@v5.1.0/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const TIPTAP_CONTENT_AI_SECRET = Deno.env.get('TIPTAP_CONTENT_AI_SECRET')
    const TIPTAP_APP_ID = Deno.env.get('TIPTAP_APP_ID')

    if (!TIPTAP_CONTENT_AI_SECRET || !TIPTAP_APP_ID) {
      console.error('Missing TipTap environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestData = await req.json()
    const userId = requestData.userId || 'anonymous'

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = 3600 // 1 hour

    // Create JWT payload matching the exact structure from TipTap's example
    const payload = {
      iat: now,
      nbf: now, // not before - same as issued at
      exp: now + expiresIn,
      iss: "https://cloud.tiptap.dev",
      aud: "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8" // TipTap's standard audience
    }

    // Create JWT using the Content AI Secret with exact header structure
    const secret = new TextEncoder().encode(TIPTAP_CONTENT_AI_SECRET)
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }) // Include typ in header
      .sign(secret)

    console.log('Generated JWT for user:', userId)
    console.log('JWT expires at:', new Date((now + expiresIn) * 1000).toISOString())

    return new Response(
      JSON.stringify({
        jwt,
        appId: TIPTAP_APP_ID,
        expiresIn,
        expiresAt: now + expiresIn
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error generating JWT:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate JWT', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})