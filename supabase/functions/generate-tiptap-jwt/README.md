# TipTap JWT Generation Function

This Supabase edge function generates JWT tokens for TipTap Pro authentication.

## Setup

1. Deploy the function to Supabase:
```bash
supabase functions deploy generate-tiptap-jwt
```

2. Set the required environment variables in Supabase dashboard:
```bash
# Go to your project settings > Edge Functions > generate-tiptap-jwt > Environment Variables

TIPTAP_CONTENT_AI_SECRET=<your-content-ai-secret>
TIPTAP_APP_ID=<your-app-id>
```

These values come from your TipTap Cloud dashboard:
- `TIPTAP_CONTENT_AI_SECRET`: Found in TipTap Cloud > Content AI > Settings > Secret
- `TIPTAP_APP_ID`: Found in TipTap Cloud > Content AI > Settings > App ID

## How it works

1. Client requests a JWT token from this function
2. Function generates a JWT signed with the Content AI Secret
3. JWT includes proper claims for TipTap authentication
4. Client uses the JWT to authenticate with TipTap API
5. JWT auto-refreshes before expiration (1 hour lifetime)

## Testing

Test the function locally:
```bash
supabase functions serve generate-tiptap-jwt --env-file .env.local
```

Create `.env.local` with:
```
TIPTAP_CONTENT_AI_SECRET=your_secret
TIPTAP_APP_ID=your_app_id
```

## Security

- The Content AI Secret is never exposed to the client
- JWTs are generated server-side only
- Tokens expire after 1 hour
- Client automatically refreshes tokens before expiration