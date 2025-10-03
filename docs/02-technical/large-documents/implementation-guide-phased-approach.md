# Large Document AI Processing: Phased Implementation Guide
## Complete Technical Reference for Custom Resolver & Job Queue Approaches

**Date**: October 3, 2025
**Status**: Implementation Ready
**Strategy**: Two-Phase Approach (Validation → Production)

---

## Document Purpose

This guide provides complete implementation details for processing AI suggestions on 85K+ word documents using a phased approach:

- **Phase 1 (Weeks 1-2)**: Simple custom `apiResolver` for rapid validation (95% confidence)
- **Phase 2 (Weeks 3-14)**: Job queue infrastructure for production scale (conditional on Phase 1 results)

**For strategic context**, see: `docs/02-technical/large-documents/evaluation-reports/strategic-evaluation-synthesis.md`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State & Problem](#current-state--problem)
3. [Phase 1: Custom Resolver (Validation)](#phase-1-custom-resolver-validation)
4. [Phase 2: Job Queue (Production)](#phase-2-job-queue-production)
5. [Position Mapping Architecture](#position-mapping-architecture)
6. [Testing Strategy](#testing-strategy)
7. [Monitoring & Observability](#monitoring--observability)
8. [Cost Analysis](#cost-analysis)
9. [Migration Path](#migration-path)

---

## Executive Summary

### The Challenge

**Browser Timeout**: Chrome enforces a hard ~2-minute timeout for HTTP requests. Processing 85K+ word documents with AI suggestions exceeds this limit, causing connection failures.

### The Solution: Two Phases

**Phase 1: Immediate (95% Confidence)**
- Custom `apiResolver` that processes chunks sequentially in browser
- Each chunk request < 30 seconds (bypasses timeout)
- Implementation: 2-3 hours
- Validates critical assumption: HTML snippet matching works at scale

**Phase 2: Conditional (If Phase 1 reveals limitations)**
- Job queue with server-side processing
- User can close browser
- Progress tracking & resumability
- Implementation: 12 weeks

### Key Technical Insight

**Both phases preserve position mapping identically** through TipTap's `defaultResolver`:

```typescript
// You provide HTML suggestions
{
  deleteHtml: '<p>teh cat</p>',
  insertHtml: '<p>the cat</p>',
  chunkId: 0
}

// TipTap's defaultResolver converts to ProseMirror positions
{
  deleteRange: { from: 123, to: 145 },
  deleteText: 'teh cat',
  replacementOptions: [{ addText: 'the cat' }]
}
```

**Your UI code requires zero changes** - positions arrive pre-calculated regardless of which phase you use.

---

## Current State & Problem

### What Works Now (October 2025)

✅ **Medium Documents** (up to 27K words / 155K characters)
- Native TipTap with `chunkSize: 5`
- Console.log CPU fix resolved rate limiting
- Production-ready

### What Doesn't Work

❌ **Large Documents** (85K+ words)
- Browser timeout kills request at ~2 minutes
- No results returned
- AI Pass fails completely

### Evidence

**Test Document**: Knights of Mairia (85,337 words / 488,451 characters)
**Error**: Connection closed at ~120 seconds
**Root Cause**: Chrome's hard timeout (not configurable via JavaScript)

---

## Phase 1: Custom Resolver (Validation)

### Overview

**Goal**: Validate HTML snippet matching works at 85K word scale
**Time**: 2-3 hours implementation, 1 week testing
**Confidence**: 95%
**Strategy**: Sequential chunk processing with throttling in browser

### How Position Mapping Works

#### Critical Discovery

TipTap's `defaultResolver` handles **ALL** position mapping automatically. Your responsibility:

1. ✅ Return HTML-based suggestions (`deleteHtml`, `insertHtml`)
2. ✅ Include `chunkId` for each suggestion
3. ✅ Echo back `htmlChunks` for caching

TipTap's responsibility:

1. ✅ Find HTML snippets in document
2. ✅ Map to ProseMirror positions (`deleteRange.from/to`)
3. ✅ Handle chunk-to-position conversion

#### Complete Flow

```
User triggers AI Pass
    ↓
TipTap chunks document → htmlChunks array
    ↓
Custom apiResolver processes each chunk sequentially
    ↓
Returns: { format: 'replacements', content: { htmlChunks, items } }
    ↓
defaultResolver receives HTML-based response
    ↓
defaultResolver maps HTML → ProseMirror positions
    ↓
Returns suggestions with deleteRange.from/to
    ↓
convertAiSuggestionsToUI() extracts positions (UNCHANGED CODE)
    ↓
UI renders suggestions at correct positions
```

### Implementation

#### Step 1: Modify `useTiptapEditor.ts`

**File**: `src/hooks/useTiptapEditor.ts` (Lines 105-175)

```typescript
AiSuggestion.configure({
  rules: [
    // ... your existing rules ...
  ],
  appId: aiSuggestionConfig.appId,
  token: aiSuggestionConfig.token,
  enableCache: true,
  chunkSize: 5,
  modelName: 'gpt-4o-mini',

  // 🆕 ADD CUSTOM RESOLVER HERE
  async resolver({ defaultResolver, rules, ...options }) {
    return await defaultResolver({
      ...options,
      rules,

      // Custom apiResolver for chunked processing
      apiResolver: async ({ html, htmlChunks, rules }) => {
        const allSuggestions = [];
        const startTime = Date.now();

        console.log(`🔄 Processing ${htmlChunks.length} chunks for ${html.length} characters`);

        // Sequential chunk processing with throttling
        for (const [index, chunk] of htmlChunks.entries()) {
          try {
            console.log(`📝 Processing chunk ${index + 1}/${htmlChunks.length}`);

            const response = await fetch('/api/ai/suggestions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                html: chunk.html,
                chunkId: chunk.id,
                rules: rules.map(r => ({
                  id: r.id,
                  prompt: r.prompt,
                  title: r.title
                }))
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(`AI API failed: ${response.status} - ${error.message}`);
            }

            const { items } = await response.json();
            allSuggestions.push(...items);

            console.log(`✅ Chunk ${index + 1} complete: ${items.length} suggestions`);

            // 2.5s delay between chunks (prevents rate limiting)
            if (index < htmlChunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2500));
            }
          } catch (error) {
            console.error(`❌ Chunk ${index + 1} failed:`, error);
            throw error;
          }
        }

        const totalTime = Date.now() - startTime;
        console.log(`✅ Complete: ${allSuggestions.length} suggestions in ${totalTime}ms`);

        // Return in TipTap's expected format
        // defaultResolver will map these HTML suggestions to ProseMirror positions
        return {
          format: 'replacements',
          content: {
            htmlChunks,  // Required for caching
            items: allSuggestions
          }
        };
      }
    });
  },

  // ... rest of config (loadOnStart, reloadOnUpdate, etc.) ...
})
```

#### Step 2: Create Backend Endpoint

**Option A**: New edge function

```typescript
// supabase/functions/ai-suggestions-html/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { html, chunkId, rules } = await req.json();

  const suggestions = [];

  for (const rule of rules) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a ${rule.title}. ${rule.prompt}`
        },
        {
          role: 'user',
          content: `Analyze this HTML content and return suggestions in JSON format:

HTML:
${html}

Return format:
{
  "suggestions": [
    {
      "deleteHtml": "<p>original text</p>",
      "insertHtml": "<p>corrected text</p>",
      "note": "Explanation of the change"
    }
  ]
}

CRITICAL: Return HTML snippets exactly as they appear in the input, preserving all formatting.`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    if (result.suggestions) {
      suggestions.push(...result.suggestions.map(s => ({
        ruleId: rule.id,
        deleteHtml: s.deleteHtml,
        insertHtml: s.insertHtml,
        chunkId: chunkId,
        note: `${rule.title}: ${s.note}`
      })));
    }
  }

  return new Response(JSON.stringify({ items: suggestions }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Option B**: Modify existing `/supabase/functions/suggest/index.ts`

Add HTML format support to existing endpoint (already handles character offsets, add HTML branch).

#### Step 3: Validation Testing

**Test 1: 10K Word Document**
```typescript
// In browser console after running AI Pass
const editor = window.__editor; // Get editor instance
const storage = editor.extensionStorage.aiSuggestion;
const suggestions = storage.getSuggestions();

suggestions.forEach(s => {
  const actual = editor.state.doc.textBetween(s.deleteRange.from, s.deleteRange.to);
  console.log({
    id: s.id,
    expected: s.deleteText,
    actual: actual,
    match: actual === s.deleteText,
    positions: { from: s.deleteRange.from, to: s.deleteRange.to }
  });
});

// All should show match: true
```

**Test 2: 27K Word Document**
- Verify no rate limiting (should succeed with 2.5s delays)
- Check memory usage: `performance.memory.usedJSHeapSize` (<500MB acceptable)

**Test 3: 85K Word Document** ⭐ **CRITICAL VALIDATION**
- Verify no browser timeout (should complete in ~5-15 minutes)
- Check all positions accurate
- Monitor browser memory

### Benefits of Phase 1

✅ **Solves Browser Timeout**
- Each chunk request < 30 seconds
- No single request exceeds 2-minute limit

✅ **Prevents Rate Limiting**
- 2.5 second delays between chunks
- Controlled request rate

✅ **Validates Core Assumption**
- Tests HTML snippet matching at 85K word scale
- Proves position mapping works
- De-risks Phase 2 investment

✅ **Maintains Current Architecture**
- No UI changes needed
- `convertAiSuggestionsToUI()` works identically
- Same suggestion structure

### Limitations of Phase 1

❌ **User Must Keep Browser Open**
- Processing 85K words takes 15-20 minutes
- Can't close tab or navigate away
- Network interruption = restart from beginning

❌ **No Progress Persistence**
- Browser crash = lost progress
- Cannot resume from failure point

❌ **Limited Monitoring**
- Basic console logs only
- No centralized error tracking

❌ **Not Suitable for Production Long-Term**
- UX friction may be unacceptable to users
- Browser memory limits at extreme scale (100K+ words)

### Success Criteria for Phase 1

**Technical Validation**:
- ✅ All suggestions have correct positions (100% accuracy)
- ✅ HTML matching success rate >95%
- ✅ Browser memory <500MB
- ✅ Processing time <15 minutes for 85K words
- ✅ Zero 429 rate limit errors

**Decision Point**:
- **If all criteria met + UX acceptable** → Ship Phase 1 to production
- **If all criteria met + UX friction** → Proceed to Phase 2
- **If criteria not met** → Investigate alternatives (consult TipTap support)

---

## Phase 2: Job Queue (Production)

### Overview

**Goal**: Production-grade system with persistence and resumability
**Time**: 12 weeks
**Confidence**: 75-80% (increases to 90%+ after Phase 1 validation)
**Strategy**: Move processing to edge functions, client polls for status

### When to Implement Phase 2

Proceed only if Phase 1 reveals:
- ❌ Browser memory issues
- ❌ User complaints about browser requirement
- ❌ Demand for progress tracking
- ❌ Need for better monitoring
- ❌ Scalability ceiling (100K+ words)

### Architecture Overview

```
┌─────────────────────────────────────────┐
│            Browser Client               │
│  ┌──────────────────────────────────┐  │
│  │  1. Submit Job                    │  │
│  │  2. Poll for Status (every 3s)   │  │
│  │  3. Retrieve Results              │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕ HTTP
┌─────────────────────────────────────────┐
│         Edge Functions (Deno)            │
│  ┌──────────────────────────────────┐  │
│  │  ai-processing-start              │  │
│  │  ai-processing-worker             │  │
│  │  ai-processing-status             │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕ Database
┌─────────────────────────────────────────┐
│           Supabase Database             │
│  ┌──────────────────────────────────┐  │
│  │  ai_processing_jobs table         │  │
│  │  - id, status, progress           │  │
│  │  - html_chunks, suggestions       │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
-- Migration: 20251003_create_ai_processing_jobs.sql

CREATE TABLE ai_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),

  document_html TEXT NOT NULL,
  html_chunks JSONB,
  rules JSONB NOT NULL,
  suggestions JSONB,
  progress JSONB,  -- { processed: 10, total: 30 }
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_ai_jobs_status ON ai_processing_jobs(status, created_at DESC);
CREATE INDEX idx_ai_jobs_user ON ai_processing_jobs(user_id, created_at DESC);
CREATE INDEX idx_ai_jobs_manuscript ON ai_processing_jobs(manuscript_id, created_at DESC);

-- RLS policies
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs"
  ON ai_processing_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create jobs"
  ON ai_processing_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update any job (for background processing)
CREATE POLICY "Service role can update jobs"
  ON ai_processing_jobs
  FOR UPDATE
  USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_jobs_updated_at
  BEFORE UPDATE ON ai_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Edge Function: Job Submission

**File**: `supabase/functions/ai-processing-start/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const { html, htmlChunks, rules, manuscriptId } = await request.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Create job record
  const { data: job, error } = await supabase
    .from('ai_processing_jobs')
    .insert({
      status: 'queued',
      manuscript_id: manuscriptId,
      document_html: html,
      html_chunks: htmlChunks,
      rules
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Trigger background processing
  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-processing-worker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobId: job.id })
  });

  return new Response(JSON.stringify({ jobId: job.id }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Edge Function: Background Worker

**File**: `supabase/functions/ai-processing-worker/index.ts`

```typescript
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!
});

const CHUNK_DELAY_MS = parseInt(Deno.env.get('CHUNK_DELAY_MS') || '2000');

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const { jobId } = await request.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get job
  const { data: job } = await supabase
    .from('ai_processing_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404
    });
  }

  // Update status to processing
  await supabase
    .from('ai_processing_jobs')
    .update({ status: 'processing' })
    .eq('id', jobId);

  try {
    const chunks = job.html_chunks || [];
    const allSuggestions = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Call OpenAI for this chunk
      const chunkSuggestions = await analyzeChunkWithOpenAI(
        chunk.html,
        job.rules,
        i
      );

      allSuggestions.push(...chunkSuggestions);

      // Update progress
      await supabase
        .from('ai_processing_jobs')
        .update({
          progress: {
            processed: i + 1,
            total: chunks.length
          }
        })
        .eq('id', jobId);

      // Throttle to avoid rate limits
      if (i < chunks.length - 1) {
        await sleep(CHUNK_DELAY_MS);
      }
    }

    // Mark complete
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'completed',
        suggestions: allSuggestions,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Mark failed
    await supabase
      .from('ai_processing_jobs')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
}

async function analyzeChunkWithOpenAI(
  html: string,
  rules: any[],
  chunkId: number
): Promise<any[]> {
  const suggestions = [];

  for (const rule of rules) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a ${rule.title}. ${rule.prompt}`
        },
        {
          role: 'user',
          content: `Analyze this HTML content and return suggestions in JSON format:

HTML:
${html}

Return format:
{
  "suggestions": [
    {
      "deleteHtml": "<p>original text</p>",
      "insertHtml": "<p>corrected text</p>",
      "note": "Explanation of the change"
    }
  ]
}

CRITICAL: Return HTML snippets exactly as they appear in the input.`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    if (result.suggestions) {
      suggestions.push(...result.suggestions.map((s: any) => ({
        ruleId: rule.id,
        deleteHtml: s.deleteHtml,
        insertHtml: s.insertHtml,
        note: `${rule.title}: ${s.note}`,
        chunkId
      })));
    }
  }

  return suggestions;
}
```

### Edge Function: Status Check

**File**: `supabase/functions/ai-processing-status/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.pathname.split('/').pop();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: job, error } = await supabase
    .from('ai_processing_jobs')
    .select('id, status, progress, suggestions, error_message')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404
    });
  }

  return new Response(JSON.stringify(job), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Client Integration

**File**: `src/hooks/useTiptapEditor.ts` (Modified for Phase 2)

```typescript
AiSuggestion.configure({
  async resolver({ defaultResolver, rules, ...options }) {
    // Check document size
    const documentSize = options.html?.length || 0;

    // Use job queue for large documents
    if (documentSize > 50000) {
      console.log('🔄 Using job queue for large document');

      return defaultResolver({
        ...options,
        rules,
        apiResolver: async ({ html, htmlChunks, rules }) => {
          // 1. Submit job
          const { jobId } = await fetch('/api/ai-processing/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html,
              htmlChunks,
              rules,
              manuscriptId: getCurrentManuscriptId()
            })
          }).then(r => r.json());

          console.log(`📝 Job submitted: ${jobId}`);

          // 2. Poll for completion
          const result = await pollForJobCompletion(jobId);

          // 3. Return in TipTap format
          return {
            format: 'replacements',
            content: {
              htmlChunks,
              items: result.suggestions
            }
          };
        }
      });
    } else {
      // Use native TipTap for medium documents
      console.log('✨ Using native TipTap for medium document');
      return defaultResolver({ ...options, rules });
    }
  }
});

async function pollForJobCompletion(jobId: string): Promise<any> {
  const startTime = Date.now();
  const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes max
  const POLL_INTERVAL = 3000; // 3 seconds

  while (true) {
    const elapsed = Date.now() - startTime;

    if (elapsed > MAX_POLL_TIME) {
      throw new Error('Job polling timeout - processing took too long');
    }

    // Short request - no browser timeout!
    const job = await fetch(`/api/ai-processing/status/${jobId}`)
      .then(r => r.json());

    console.log(`📊 Job ${jobId}: ${job.status}`, job.progress);

    if (job.status === 'completed') {
      console.log('✅ Job completed successfully');
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Job failed: ${job.error_message}`);
    }

    // Show progress to user
    if (job.progress) {
      updateProgressUI(job.progress);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

function updateProgressUI(progress: { processed: number; total: number }) {
  const percentage = Math.round((progress.processed / progress.total) * 100);
  // Update UI with progress (toast, progress bar, etc.)
  console.log(`Progress: ${percentage}% (${progress.processed}/${progress.total} chunks)`);
}
```

### Benefits of Phase 2

✅ **Complete Browser Timeout Bypass**
- Polling requests < 1 second each
- Processing happens server-side (no 2-minute limit)

✅ **Production UX**
- User can close browser
- Progress tracking ("Processing chunk 10 of 30")
- Resume on page reload

✅ **State Persistence**
- Jobs survive browser crashes
- Network interruptions handled gracefully
- Audit trail in database

✅ **Superior Error Handling**
- Retry failed chunks individually
- Exponential backoff
- Graceful degradation

✅ **Scalability**
- Not limited by browser resources
- Can handle unlimited document size
- Potential for parallel processing

✅ **Monitoring**
- Centralized logging
- Analytics events
- Performance tracking
- Alerts for failures

### Implementation Timeline (12 Weeks)

**Week 3-4: Infrastructure**
- Database schema + migrations
- Edge functions (start, worker, status)
- RLS policies

**Week 5-6: Client Integration**
- Polling logic
- Progress UI
- Error handling

**Week 7-8: Testing**
- Unit tests
- Integration tests
- Load testing (10 concurrent users, 500+ suggestions)

**Week 9-10: Edge Cases**
- User closes browser (verify job continues)
- Network interruption (verify retry)
- Malformed responses

**Week 11-12: Beta & Rollout**
- Internal testing
- Beta users (10-20)
- Gradual rollout (10% → 50% → 100%)

---

## Position Mapping Architecture

### How TipTap Handles Positions

**You DON'T manually calculate ProseMirror positions**. TipTap's `defaultResolver` does this automatically.

#### Your Responsibility

```typescript
// Return HTML-based suggestions
{
  ruleId: '1',
  deleteHtml: '<p>The quick brown fox</p>',
  insertHtml: '<p>The fast brown fox</p>',
  chunkId: 0,
  note: 'Use "fast" for clarity'
}
```

#### TipTap's Responsibility

```typescript
// Maps to ProseMirror positions
{
  id: 'suggestion-1',
  deleteRange: {
    from: 123,  // ← Calculated by defaultResolver
    to: 145     // ← Calculated by defaultResolver
  },
  deleteText: 'The quick brown fox',
  replacementOptions: [{
    id: '1',
    addText: 'The fast brown fox'
  }],
  rule: { id: '1', title: 'Clarity', ... }
}
```

### Current Code Compatibility

**File**: `src/components/workspace/ExperimentalEditor.tsx` (Lines 292-339)

```typescript
// ✅ This code remains UNCHANGED in both Phase 1 and Phase 2
const convertAiSuggestionsToUI = (editor: any): UISuggestion[] => {
  const aiStorage = editor.extensionStorage?.aiSuggestion;
  const aiSuggestions = aiStorage.getSuggestions();

  return aiSuggestions.map((suggestion: any) => {
    return {
      id: suggestion.id || `ai-suggestion-${index}`,
      type: suggestion.replacementOptions?.length > 0 ? 'replace' : 'delete',
      origin: 'server' as const,

      // ✅ Positions come from defaultResolver - identical structure
      pmFrom: suggestion.deleteRange?.from || 0,
      pmTo: suggestion.deleteRange?.to || 0,
      before: suggestion.deleteText || '',
      after: suggestion.replacementOptions?.[0]?.addText || '',

      category: 'ai-suggestion' as SuggestionCategory,
      note: `${ruleTitle || 'AI'}: ${suggestion.replacementOptions?.[0]?.note || 'Improvement suggestion'}`,
      actor: 'AI' as SuggestionActor,
      ruleId: ruleId,
      ruleTitle: ruleTitle
    };
  });
};
```

**Why it works**: Whether suggestions come from Phase 1 (client-side) or Phase 2 (job queue), `defaultResolver` ensures identical structure with `deleteRange.from/to`.

### Implementation Requirements

#### ✅ What You MUST Do

1. **Include `chunkId` in Each Suggestion**
```typescript
{
  ruleId: '1',
  deleteHtml: '<p>text</p>',
  insertHtml: '<p>corrected</p>',
  chunkId: 0  // ← Maps to htmlChunks[0]
}
```

2. **Echo `htmlChunks` in Response**
```typescript
return {
  format: 'replacements',
  content: {
    htmlChunks,  // ← REQUIRED for TipTap caching
    items: allSuggestions
  }
};
```

3. **Use HTML Format (Not Plain Text)**
```typescript
// ✅ CORRECT
deleteHtml: '<p>Hello world</p>'
insertHtml: '<p>Hi world</p>'

// ❌ WRONG
deleteText: 'Hello world'
insertText: 'Hi world'
```

#### ❌ What You DON'T Need to Do

1. ❌ Manual position calculation
2. ❌ ProseMirror position mapping
3. ❌ Chunk-to-position conversion
4. ❌ Transaction mapping
5. ❌ Character offset conversion

**TipTap handles all of this automatically**.

---

## Testing Strategy

### Phase 1 Testing

**Week 1: Basic Validation**

```typescript
// Test 1: 10K word document
// Expected: Success, positions accurate

// Test 2: 27K word document
// Expected: Success, no rate limiting

// Test 3: 85K word document ⭐ CRITICAL
// Expected: Success, no browser timeout, all positions correct
```

**Validation Script** (Browser Console):
```typescript
const editor = window.__editor;
const storage = editor.extensionStorage.aiSuggestion;
const suggestions = storage.getSuggestions();

// Verify each suggestion
suggestions.forEach(s => {
  const actual = editor.state.doc.textBetween(s.deleteRange.from, s.deleteRange.to);
  const match = actual === s.deleteText;

  console.log({
    id: s.id,
    expected: s.deleteText,
    actual: actual,
    match: match,  // ← Should be true
    positions: { from: s.deleteRange.from, to: s.deleteRange.to }
  });

  if (!match) {
    console.error('❌ Position mismatch detected!');
  }
});
```

### Phase 2 Testing

**Week 7-8: Load Testing**

```typescript
// Concurrent users test
// - 10 users submit 85K word docs simultaneously
// - Verify job queue handles concurrency
// - Monitor database performance

// Large suggestion volume test
// - Generate 500+ suggestions
// - Verify TipTap handles volume
// - Monitor browser memory

// Edge function timeout test
// - Simulate slow OpenAI responses
// - Verify retry logic works
// - Check graceful degradation
```

**Edge Cases**:
1. User closes browser mid-processing → Job continues
2. Network interruption during polling → Reconnects and resumes
3. Edge function fails → Job marked as failed, user notified
4. Malformed HTML from LLM → Validation catches, job fails gracefully

---

## Monitoring & Observability

### Phase 1 Monitoring

```typescript
// Basic performance tracking
const metrics = {
  documentSize: html.length,
  chunkCount: htmlChunks.length,
  suggestionCount: 0,
  totalTime: 0,
  browserMemory: performance.memory?.usedJSHeapSize
};

analytics.track('ai_processing_started', metrics);

// ... processing ...

metrics.totalTime = Date.now() - startTime;
metrics.suggestionCount = allSuggestions.length;
analytics.track('ai_processing_completed', metrics);
```

### Phase 2 Monitoring

**Analytics Events**:
```typescript
analytics.track('ai_job_submitted', {
  jobId: string,
  documentSize: number,
  chunkCount: number,
  ruleCount: number
});

analytics.track('ai_job_completed', {
  jobId: string,
  duration: number,
  suggestionCount: number,
  chunkCount: number,
  avgChunkProcessingTime: number
});

analytics.track('ai_job_failed', {
  jobId: string,
  error: string,
  duration: number,
  failedChunkId?: number
});
```

**Database Queries**:
```sql
-- Job success rate (last 24 hours)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM ai_processing_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Average processing time by document size
SELECT
  CASE
    WHEN LENGTH(document_html) < 50000 THEN 'small'
    WHEN LENGTH(document_html) < 200000 THEN 'medium'
    ELSE 'large'
  END as size_category,
  COUNT(*) as job_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
FROM ai_processing_jobs
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY size_category;
```

---

## Cost Analysis

### Phase 1 Costs

**Infrastructure**: $0 (uses existing endpoints)
**Engineering**: ~40 hours (1 week FTE)
**Total**: ~$4,000 (assuming $100/hour loaded cost)

### Phase 2 Costs

**OpenAI API** (GPT-4o-mini):
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- 85K word doc ≈ 285 requests (57 chunks × 5 rules)
- **Cost per doc**: ~$0.19
- **Monthly (1000 docs)**: ~$190

**Supabase**:
- Database storage: ~$12.50/month
- Edge functions: ~$2.00/month
- Bandwidth: ~$22.50/month
- **Total**: ~$37/month

**Engineering**:
- Implementation: 480 hours (12 weeks FTE)
- **Total**: ~$48,000

**First Year Total**: ~$50,760 ($48,000 + $2,760 monthly)

---

## Migration Path

### From Phase 1 to Phase 2

**1. Database Setup**
```bash
# Run migration
supabase migration up
```

**2. Deploy Edge Functions**
```bash
supabase functions deploy ai-processing-start
supabase functions deploy ai-processing-worker
supabase functions deploy ai-processing-status
```

**3. Update Client Code**
- Modify `useTiptapEditor.ts` resolver
- Add document size check (50K threshold)
- Route large docs to job queue

**4. Feature Flag Rollout**
```typescript
// Gradual rollout
const ENABLE_JOB_QUEUE = process.env.NEXT_PUBLIC_ENABLE_JOB_QUEUE === 'true';
const ROLLOUT_PERCENTAGE = parseInt(process.env.NEXT_PUBLIC_JOB_QUEUE_ROLLOUT || '0');

function shouldUseJobQueue(userId: string, documentSize: number): boolean {
  if (!ENABLE_JOB_QUEUE) return false;

  const userHash = hashUserId(userId);
  const userPercentile = userHash % 100;

  return documentSize > 50000 && userPercentile < ROLLOUT_PERCENTAGE;
}
```

**Rollout Schedule**:
- Week 11: 10% of users
- Week 12: 25% of users
- Week 13: 50% of users
- Week 14: 100% of users

---

## Environment Variables

```bash
# .env.local

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Job Queue Configuration (Phase 2)
CHUNK_DELAY_MS=2000                    # Delay between chunks (ms)
MAX_CHUNK_SIZE=2000                    # Max tokens per chunk
MAX_CONCURRENT_JOBS=10                 # Max simultaneous jobs
JOB_TIMEOUT_MS=600000                  # Job timeout (10 minutes)
POLL_INTERVAL_MS=3000                  # Client polling interval

# Feature Flags
NEXT_PUBLIC_ENABLE_JOB_QUEUE=true
NEXT_PUBLIC_JOB_QUEUE_ROLLOUT=100      # Percentage (0-100)
NEXT_PUBLIC_JOB_QUEUE_BETA_USERS=user1,user2,user3

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Appendix: TipTap Response Formats

### Format 1: `replacements` (Recommended)

```typescript
return {
  format: 'replacements',
  content: {
    htmlChunks: [...],  // Required for caching
    items: [
      {
        ruleId: '1',
        deleteHtml: '<p>The quick brown fox</p>',
        insertHtml: '<p>The fast brown fox</p>',
        chunkId: 0,
        note: 'Use "fast" for clarity'
      }
    ]
  }
};
```

### Format 2: `fullHtml` (Alternative)

```typescript
return {
  format: 'fullHtml',
  content: {
    items: [
      {
        ruleId: '1',
        fullHtml: '<p>The fast brown fox...</p><p>Another paragraph...</p>'
        // TipTap diffs against original to find changes
      }
    ]
  }
};
```

**Recommendation**: Use `replacements` - more explicit and easier to debug.

---

## Conclusion

This phased approach provides:

1. **Fast Validation** (Phase 1: 2-3 hours)
   - Tests critical assumption (HTML matching)
   - Delivers working solution immediately
   - Low risk, high confidence

2. **Production Scale** (Phase 2: 12 weeks, conditional)
   - Only if Phase 1 reveals limitations
   - Enterprise-grade infrastructure
   - Validated investment based on real data

**Both phases preserve position mapping identically** through TipTap's `defaultResolver`.

**Your UI code requires zero changes** in either phase.

---

**Last Updated**: October 3, 2025
**Next Review**: After Phase 1 testing (Week 2)
**Implementation Status**: Ready to begin Phase 1
