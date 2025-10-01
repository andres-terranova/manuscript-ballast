# API Documentation

## Overview

This directory contains documentation for external APIs and integrations used in Manuscript Ballast.

## Integrated Services

### 1. Supabase

**Purpose**: Backend-as-a-Service (database, authentication, storage, edge functions)

**Components Used**:
- PostgreSQL database
- Authentication (email/password)
- Storage (DOCX files)
- Edge Functions (Deno-based serverless)
- Realtime (future)

**Client Configuration**:
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Key Tables**:
- `manuscripts` - Document storage
- `processing_queue` - Background job queue
- `auth.users` - User accounts (built-in)

**RLS Policies**:
```sql
-- Example: Users can only access their own manuscripts
CREATE POLICY "Users can view own manuscripts"
  ON manuscripts FOR SELECT
  USING (auth.uid() = user_id);
```

**Edge Functions**:
- `queue-processor` - Processes DOCX files from queue
- `suggest` - Legacy AI suggestion generation
- `generate-tiptap-jwt` - Server-side JWT generation
- `process-docx` - Direct DOCX processing (deprecated in favor of queue)

**API Endpoints**:
```bash
# Base URL
https://<project-ref>.supabase.co

# Edge Functions
POST /functions/v1/queue-processor
POST /functions/v1/suggest
POST /functions/v1/generate-tiptap-jwt
```

**Documentation**: [Supabase Docs](https://supabase.com/docs)

---

### 2. TipTap Pro AI

**Purpose**: AI-powered editing suggestions with real-time inline display

**Subscription**: Team plan required for AI features

**Authentication**: JWT tokens (HS256)

**API Endpoints**:
```bash
# Base URL
https://api.tiptap.dev

# AI Suggestions
POST /v1/ai/suggestions
Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
Body:
  {
    "html": "<p>Document content...</p>",
    "rules": [...],
    "appId": "<your-app-id>"
  }
```

**JWT Token Structure**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "iat": 1758921800,
  "nbf": 1758921800,
  "exp": 1759008200,
  "iss": "https://cloud.tiptap.dev",
  "aud": "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8"
}
```

**Rate Limits**:
- Plan-dependent
- Built-in rate limiting (429 errors handled internally)
- Chunking reduces API calls

**Configuration**:
```typescript
// src/hooks/useTiptapEditor.ts
AiSuggestion.configure({
  appId: import.meta.env.VITE_TIPTAP_APP_ID,
  token: jwtToken,
  enableCache: true,
  chunkSize: 10,
  // ...
})
```

**Environment Variables**:
```bash
# Client-side
VITE_TIPTAP_APP_ID=<your-app-id>
VITE_TIPTAP_JWT=<temporary-jwt>

# Server-side (Supabase edge functions)
TIPTAP_CONTENT_AI_SECRET=<content-ai-secret>
TIPTAP_APP_ID=<your-app-id>
```

**Known Issues**:
- Server-generated JWT tokens rejected (401 auth_cloud_failed)
- Temporary workaround: Use JWT from TipTap dashboard
- See [../guides/TIPTAP_JWT_GUIDE.md](../guides/TIPTAP_JWT_GUIDE.md)

**Documentation**:
- [TipTap Pro Docs](https://tiptap.dev/docs/content-ai)
- [AI Suggestion API](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)

---

### 3. OpenAI (Legacy)

**Purpose**: AI suggestions for Standard Editor (deprecated)

**Status**: 🟡 Maintenance mode (will be phased out)

**API Used**: Chat Completions (GPT-4)

**Endpoint**:
```bash
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer <OPENAI_API_KEY>
  Content-Type: application/json
Body:
  {
    "model": "gpt-4",
    "messages": [...],
    "temperature": 0.7
  }
```

**Configuration**:
```bash
# Server-side only (Supabase edge function)
OPENAI_API_KEY=sk-...
```

**Used In**:
- `supabase/functions/suggest/index.ts`

**Migration Plan**:
- Replace with TipTap Pro AI
- Deprecate suggest edge function
- Remove OpenAI dependency

---

### 4. Mammoth.js (Library)

**Purpose**: DOCX to HTML conversion

**Type**: NPM library (not external API)

**Usage**:
```typescript
// supabase/functions/queue-processor/index.ts
import * as mammoth from 'mammoth';

const result = await mammoth.convertToHtml(
  { arrayBuffer },
  { 
    styleMap: [...],
    ignoreEmptyParagraphs: true
  }
);
```

**Features Used**:
- DOCX parsing
- HTML conversion
- Text extraction
- Basic formatting preservation

**Limitations**:
- Complex formatting may be lost
- No table support
- Limited styling options

**Documentation**: [Mammoth.js GitHub](https://github.com/mwilliamson/mammoth.js)

---

## API Response Formats

### TipTap AI Suggestion Response

```typescript
interface TipTapSuggestion {
  id: string;
  type: 'grammar' | 'clarity' | 'tone' | 'style';
  from: number;  // ProseMirror position
  to: number;    // ProseMirror position
  original: string;
  replacement: string;
  explanation?: string;
  confidence?: number;
}
```

### Supabase Query Response

```typescript
interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
}
```

### Queue Processor Response

```typescript
interface QueueProcessorResponse {
  success: boolean;
  message: string;
  job_id?: string;
  error?: string;
}
```

## Error Handling Patterns

### TipTap API Errors

```typescript
try {
  await editor.chain().loadAiSuggestions().run();
} catch (error) {
  if (error.status === 401) {
    // Authentication failed - check JWT
    toast.error("Authentication failed. Check TipTap credentials.");
  } else if (error.status === 429) {
    // Rate limit exceeded
    toast.error("Rate limit exceeded. Please wait and try again.");
  } else {
    // Other errors
    console.error("TipTap AI error:", error);
  }
}
```

### Supabase Errors

```typescript
const { data, error } = await supabase
  .from('manuscripts')
  .select('*')
  .eq('id', manuscriptId)
  .single();

if (error) {
  // Check error code
  if (error.code === 'PGRST116') {
    // Not found
    toast.error("Manuscript not found");
  } else if (error.code === '42501') {
    // RLS policy violation
    toast.error("You don't have permission to access this manuscript");
  } else {
    console.error("Supabase error:", error);
  }
}
```

## Rate Limiting & Quotas

### TipTap Pro
- **Rate Limits**: Plan-dependent (check TipTap dashboard)
- **Retry Strategy**: Built-in (handled by extension)
- **Monitoring**: TipTap dashboard → Usage

### Supabase
- **Edge Functions**: 500K invocations/month (free tier)
- **Database**: Unlimited queries (free tier)
- **Storage**: 1GB (free tier)
- **Timeout**: 2 minutes per edge function invocation

### OpenAI (Legacy)
- **Rate Limits**: Model-dependent
- **Costs**: Per token usage
- **Monitoring**: OpenAI dashboard

## Security Considerations

### API Keys Storage
- ✅ Client-side: Only public keys and JWT tokens
- ✅ Server-side: Secrets in Supabase environment variables
- ❌ Never commit secrets to git

### Token Expiration
- TipTap JWT: 1 hour (configurable)
- Supabase session: 1 week (default)
- OpenAI key: No expiration (rotate manually)

### CORS Configuration
- TipTap: Configure "Allowed Origins" in dashboard
- Supabase: Configured automatically
- Edge functions: verify_jwt setting

## Monitoring & Debugging

### TipTap Pro
```bash
# Check dashboard for:
- API usage statistics
- Error rates
- Rate limit status
- Billing information
```

### Supabase
```bash
# View edge function logs
supabase functions logs <function-name>

# Query database directly
supabase db --db-url <connection-string> --execute "SELECT * FROM processing_queue"

# Check storage usage
# Via Supabase dashboard → Storage
```

### Browser Console
```javascript
// Enable TipTap debug logging
localStorage.setItem('tiptap-debug', 'true');

// Check API calls in Network tab
// Filter by "api.tiptap.dev" or "supabase.co"
```

## Migration Notes

### From OpenAI to TipTap Pro
1. Update edge function to use TipTap API
2. Migrate suggestion format
3. Update frontend mapping logic
4. Test with various document sizes
5. Deprecate OpenAI dependency

### From Direct Calls to Queue System
1. Replace direct edge function calls
2. Add jobs to processing_queue table
3. Let useQueueProcessor hook handle execution
4. Update UI to show queue status

## Related Documentation

- [TipTap JWT Guide](../guides/TIPTAP_JWT_GUIDE.md)
- [Queue System Architecture](../architecture/QUEUE_SYSTEM_ARCHITECTURE.md)
- [Edge Functions Documentation](../../supabase/functions/CLAUDE.md)

---

**Last Updated**: September 30, 2025
