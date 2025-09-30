# Supabase Edge Functions Documentation

## Overview

This directory contains Deno-based serverless functions for backend processing tasks. Edge functions run close to users for low latency and are used for CPU-intensive operations that can't run in the browser.

## Function Directory Structure

```
supabase/functions/
├── queue-processor/
│   └── index.ts           # ⭐ Main document processor
├── generate-tiptap-jwt/
│   ├── index.ts           # JWT token generation
│   └── README.md          # JWT implementation docs
├── process-docx/
│   └── index.ts           # 🟡 Direct DOCX processor (deprecated)
└── suggest/
    └── index.ts           # 🟡 Legacy AI suggestions (deprecated)
```

## Core Functions

### queue-processor ⭐ (Primary Document Processor)

**Purpose**: Processes DOCX files from the processing queue in background.

**Status**: ✅ Production ready

**Trigger**: HTTP POST (called by frontend polling or manual trigger)

**Configuration**:
```toml
# supabase/config.toml
[functions.queue-processor]
verify_jwt = false  # Allows system-level calls
```

**Request Format**:
```typescript
// No request body required
POST /functions/v1/queue-processor
Headers:
  Content-Type: application/json
Body: {}
```

**Response Format**:
```typescript
// Success
{
  "success": true,
  "message": "Job abc123 completed successfully",
  "job_id": "abc123-def456-..."
}

// No jobs
{
  "message": "No pending jobs in queue"
}

// Error
{
  "success": false,
  "error": "Processing failed: <reason>",
  "job_id": "abc123-def456-..."
}
```

**Processing Flow**:
```
1. Query processing_queue for pending jobs (ORDER BY priority DESC, created_at ASC)
   ↓
2. If no jobs, return "No pending jobs"
   ↓
3. Mark job as 'processing', set started_at timestamp
   ↓
4. Update progress: "downloading" (20%)
   ↓
5. Download DOCX file from Supabase Storage
   ↓
6. Update progress: "extracting_text" (50%)
   ↓
7. Use Mammoth.js to extract text and convert to HTML
   ↓
8. Check CPU timeout (1.8s limit) - if exceeded, use fast HTML fallback
   ↓
9. Update progress: "saving_results" (80%)
   ↓
10. Calculate document statistics (word count, character count)
    ↓
11. Update manuscript record with content and stats
    ↓
12. Mark job as 'completed', set completed_at timestamp
    ↓
13. Return success response
```

**Key Features**:
- **CPU Timeout Protection**: 1.8s processing limit prevents edge function timeout
- **Automatic Retry**: Failed jobs automatically retried (up to 3 attempts)
- **Stuck Job Detection**: Jobs in 'processing' >2 minutes are reset to 'pending'
- **Progress Tracking**: Real-time status updates (downloading → extracting_text → saving_results)
- **Adaptive Processing**: Fast HTML fallback if CPU time exceeded

**Environment Variables**:
```bash
# None required - uses Supabase client with service role key
```

**Error Handling**:
```typescript
try {
  // Process document
} catch (error) {
  // Increment attempts
  // Update error_message
  // Mark as 'failed' if max_attempts reached
  // Otherwise reset to 'pending' for retry
}
```

**Performance**:
- Small docs (189KB): ~1.5s
- Medium docs (240KB): ~2s
- Large docs (437KB): ~3s
- Tested capacity: 60K+ words

**File Location**: `supabase/functions/queue-processor/index.ts`

**Related Documentation**: [Queue System Architecture](../../docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md)

---

### generate-tiptap-jwt (JWT Token Generator)

**Purpose**: Generates JWT tokens for TipTap Pro AI authentication.

**Status**: ✅ Implementation complete, 🔴 TipTap rejects tokens (under investigation)

**Trigger**: HTTP POST from frontend

**Configuration**:
```toml
[functions.generate-tiptap-jwt]
verify_jwt = true  # Requires authenticated user
```

**Request Format**:
```typescript
POST /functions/v1/generate-tiptap-jwt
Headers:
  Authorization: Bearer <supabase-session-token>
  Content-Type: application/json
Body: {}
```

**Response Format**:
```typescript
// Success
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expiresAt": 1759008200,  // Unix timestamp
  "expiresIn": 3600          // Seconds until expiration
}

// Error
{
  "error": "Failed to generate JWT: <reason>"
}
```

**JWT Structure**:
```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "iat": 1758921800,  // Issued at
  "nbf": 1758921800,  // Not before
  "exp": 1759008200,  // Expires (1 hour)
  "iss": "https://cloud.tiptap.dev",
  "aud": "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8"
}
```

**Signing**:
```typescript
import { create } from 'https://deno.land/x/djwt/mod.ts';

const jwt = await create(
  { alg: 'HS256', typ: 'JWT' },
  payload,
  TIPTAP_CONTENT_AI_SECRET
);
```

**Environment Variables**:
```bash
TIPTAP_CONTENT_AI_SECRET=<content-ai-secret>
TIPTAP_APP_ID=pkry1n5m
```

**Known Issues**:
- Server-generated tokens are rejected by TipTap API (401 auth_cloud_failed)
- Structure matches TipTap's example JWT exactly
- Temporary workaround: Use JWT from TipTap dashboard

**File Location**: `supabase/functions/generate-tiptap-jwt/index.ts`

**Related Documentation**: [TipTap JWT Guide](../../docs/guides/TIPTAP_JWT_GUIDE.md)

---

### process-docx (Direct DOCX Processor - Deprecated)

**Purpose**: Direct DOCX processing without queue system.

**Status**: 🟡 Deprecated in favor of queue-processor

**Why Deprecated**:
- Caused WORKER_LIMIT errors on large documents
- No retry mechanism
- No progress tracking
- Blocking operation

**Migration**:
- Use `queue-processor` function instead
- Add jobs to `processing_queue` table
- Let frontend auto-polling trigger processing

**File Location**: `supabase/functions/process-docx/index.ts`

---

### suggest (Legacy AI Suggestions - Deprecated)

**Purpose**: Generate AI suggestions using OpenAI API.

**Status**: 🟡 Deprecated in favor of TipTap Pro AI

**Trigger**: HTTP POST from Standard Editor (legacy)

**Request Format**:
```typescript
POST /functions/v1/suggest
Headers:
  Authorization: Bearer <supabase-session-token>
  Content-Type: application/json
Body: {
  "text": "Document content...",
  "rules": ["grammar", "clarity", "tone"],
  "manuscriptId": "abc123-..."
}
```

**Response Format**:
```typescript
{
  "suggestions": [
    {
      "original": "they was",
      "replacement": "they were",
      "explanation": "Subject-verb agreement",
      "type": "grammar"
    },
    // ... more suggestions
  ]
}
```

**Why Deprecated**:
- TipTap Pro AI provides better quality
- No built-in chunking or caching
- Plain text suggestions require complex position mapping
- Higher API costs (direct OpenAI vs TipTap's optimized calls)

**Migration Path**:
- ExperimentalEditor uses TipTap Pro AI directly
- No edge function needed
- JWT authentication handled by generate-tiptap-jwt

**File Location**: `supabase/functions/suggest/index.ts`

---

## Common Patterns & Best Practices

### Supabase Client Initialization

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

**⚠️ Use service role key for elevated permissions** (bypass RLS)

### Error Handling

```typescript
// ✅ Good: Graceful error handling
try {
  const result = await processDocument(data);
  return new Response(JSON.stringify({ success: true, result }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
} catch (error) {
  console.error('Processing error:', error);
  return new Response(JSON.stringify({ 
    success: false, 
    error: error.message 
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 500,
  });
}

// ❌ Bad: Let errors crash function
const result = await processDocument(data);
return new Response(JSON.stringify(result));
```

### CORS Headers

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle OPTIONS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Include in all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

### CPU Timeout Protection

```typescript
const START_TIME = Date.now();
const CPU_TIMEOUT_MS = 1800;  // 1.8 seconds

function checkTimeout() {
  const elapsed = Date.now() - START_TIME;
  if (elapsed > CPU_TIMEOUT_MS) {
    throw new Error('CPU timeout exceeded');
  }
}

// Check periodically during processing
async function processLargeDocument(data) {
  for (const chunk of chunks) {
    checkTimeout();
    await processChunk(chunk);
  }
}
```

### Progress Updates

```typescript
async function updateProgress(jobId: string, step: string, percentage: number) {
  await supabase
    .from('processing_queue')
    .update({
      progress_data: { step, percentage },
    })
    .eq('id', jobId);
}

// Usage
await updateProgress(jobId, 'downloading', 20);
await updateProgress(jobId, 'extracting_text', 50);
await updateProgress(jobId, 'saving_results', 80);
```

## Deployment & Testing

### Deploy Function

```bash
# Deploy single function
supabase functions deploy queue-processor

# Deploy all functions
supabase functions deploy

# Deploy with environment variables
supabase functions deploy queue-processor \
  --project-ref your-project-ref
```

### View Logs

```bash
# Real-time logs
supabase functions logs queue-processor

# Filter by level
supabase functions logs queue-processor --level error

# Tail logs
supabase functions logs queue-processor --tail
```

### Local Testing

```bash
# Serve function locally
supabase functions serve queue-processor

# Test with curl
curl -X POST http://localhost:54321/functions/v1/queue-processor \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Environment Variables

Set in Supabase Dashboard → Edge Functions → [function-name] → Environment Variables

```bash
# For generate-tiptap-jwt
TIPTAP_CONTENT_AI_SECRET=your-secret
TIPTAP_APP_ID=your-app-id

# For suggest (legacy)
OPENAI_API_KEY=your-api-key
```

## Performance Optimization

### Memory Management

```typescript
// ✅ Good: Release memory after processing
async function processDocx(arrayBuffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  
  // Clear large objects
  arrayBuffer = null as any;
  result = null as any;
  
  return text;
}

// ❌ Bad: Keep large objects in memory
const result = await mammoth.extractRawText({ arrayBuffer });
// arrayBuffer still in memory
// result still in memory
```

### Database Queries

```typescript
// ✅ Good: Select only needed columns
const { data } = await supabase
  .from('manuscripts')
  .select('id, title, word_count')
  .eq('id', manuscriptId)
  .single();

// ❌ Bad: Select all columns
const { data } = await supabase
  .from('manuscripts')
  .select('*')
  .eq('id', manuscriptId)
  .single();
```

### Concurrent Processing

```typescript
// ✅ Good: Process multiple jobs concurrently (future)
const jobs = await getTopNPendingJobs(5);
await Promise.all(jobs.map(job => processJob(job)));

// ⚠️ Current: Process one job at a time (safer)
const job = await getNextPendingJob();
await processJob(job);
```

## Monitoring & Debugging

### Key Metrics

- **Invocation count**: Functions → Usage
- **Error rate**: Functions → Logs (filter by level=error)
- **Execution time**: Average processing time per function
- **Queue backlog**: Query `processing_queue` for pending jobs

### Debug Logging

```typescript
// Add structured logging
console.log(JSON.stringify({
  level: 'info',
  function: 'queue-processor',
  jobId: job.id,
  step: 'extracting_text',
  elapsed: Date.now() - startTime,
}));
```

### Common Issues

**Issue**: Function timeout (2-minute limit)
- **Solution**: Use queue system, break into smaller tasks

**Issue**: Memory exhaustion
- **Solution**: Process in chunks, release memory early

**Issue**: Rate limiting
- **Solution**: Implement exponential backoff, queue system

**Issue**: RLS policy violations
- **Solution**: Use service role key, check policies

## Security Considerations

### Service Role Key

- ⚠️ **NEVER expose to client-side**
- ✅ Only use in edge functions
- ✅ Provides elevated permissions (bypass RLS)

### JWT Verification

```typescript
// Verify user JWT for authenticated endpoints
const authHeader = req.headers.get('authorization');
if (!authHeader) {
  return new Response('Unauthorized', { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: user, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Input Validation

```typescript
// ✅ Good: Validate input
const schema = z.object({
  manuscriptId: z.string().uuid(),
  text: z.string().min(1).max(1000000),
});

const result = schema.safeParse(requestData);
if (!result.success) {
  return new Response(JSON.stringify({ error: 'Invalid input' }), {
    status: 400,
  });
}

// ❌ Bad: Trust all input
const { manuscriptId, text } = requestData;
```

## Related Documentation

- [Queue System Architecture](../../docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md)
- [TipTap JWT Guide](../../docs/guides/TIPTAP_JWT_GUIDE.md)
- [API Documentation](../../docs/api/README.md)
- [Library Utilities](../../src/lib/CLAUDE.md)

---

**Last Updated**: September 30, 2025
