# Large Document Processing Guide

## 🟡 Issue PARTIALLY RESOLVED (October 2, 2025)

**Current Capabilities**:
- ✅ Medium documents (up to 27K words / 155K chars) - WORKING
- ❌ Large documents (85K+ words) - Browser timeout at ~2 minutes

**Status**: 🟡 **PARTIAL SUCCESS**

**Recent Breakthrough**: Console.log CPU load fix (Oct 1, 2025) enabled 27K word processing

**Problem**: AI Pass fails on 85K+ word documents due to Chrome's 2-minute browser timeout.

**Test Date**: October 1, 2025 (via Playwright MCP)

**Evidence (Historical - Before Console.log Fix)**:
```
Failed to load resource: the server responded with a status of 429 ()
@ https://api.tiptap.dev/v1/ai/suggestions:0

❌ AI loading error: Failed to fetch from Tiptap Cloud API.
HTTP response has status 429
```

---

## ✅ Console.log CPU Load Fix - BREAKTHROUGH (October 1, 2025)

**Status**: ✅ **RESOLVED for medium documents (27K words)**

**The Discovery**:
JavaScript is single-threaded. Frequent console.log() calls in the polling loop were blocking the main thread, disrupting TipTap's internal request throttling mechanism.

**Root Cause Analysis**:
- Each console.log() call performs CPU-intensive operations:
  - Format log string
  - Write to buffer
  - Update DevTools UI
- Polling logs ran every 1 second (36 logs per 36-second test)
- Main thread contention → TipTap throttling timing disrupted → chunks sent too fast → 429 rate limit

**Evidence Pattern**:
```
chunkSize: 2  → Failed at 27s (MORE chunks sent = faster failure)
chunkSize: 10 → Failed at 54s (medium chunks)
chunkSize: 35 → Failed at 74s (FEWER chunks = slower failure)
```
The pattern proved the issue was **request RATE**, not total request count or chunk size.

**Solution Implemented**:
- Reduced polling log frequency from 1s → 5s in `waitForAiSuggestions()`
- 80% reduction in console spam (36 logs → 7 logs per 36 seconds)
- Freed main thread → TipTap's built-in throttling now works correctly

**Result**:
✅ **27,782 words / 155,339 characters** - Previously impossible, now SUCCEEDS
- Proper throttling slows chunk sends appropriately
- "Runs for longer" = evidence of correct throttling behavior

**File**: `src/components/workspace/ExperimentalEditor.tsx:325-333`
**Commit**: fc1735b (October 1, 2025)

**Next Steps**:
- Test with logging completely disabled
- Test full 85K+ word documents (may still hit 2-minute browser timeout)

---

## ❌ Two-Minute Browser Timeout - ACTIVE BLOCKER (85K+ words)

**Status**: ❌ **BLOCKS large documents**

**The Problem**:
Chrome enforces a hard ~2-minute timeout for XMLHttpRequest and Fetch API requests that **cannot be extended** via configuration. When TipTap's `loadAiSuggestions()` command takes longer than 2 minutes to process a full document, Chrome forcibly kills the connection.

**Error Manifestations**:
- `ERR_CONNECTION_CLOSED`
- HTTP 429 rate limit errors from OpenAI
- Connection drops at exactly ~120 seconds

**Why Console.log Fix Doesn't Solve This**:
- Console.log fix: Solves rate limiting for medium docs (up to 27K words)
- Browser timeout: Separate issue affecting 85K+ word documents
- Need: Custom resolver to bypass browser timeout entirely

**The Solution - Custom Resolver**:
Instead of one long request that times out, use custom apiResolver to:
1. Receive chunked content from TipTap (htmlChunks array)
2. Process chunks separately (each < 30 seconds)
3. Return aggregated results
4. OR use job-based pattern (submit job, poll for results)

This solves **BOTH** problems:
- Rate limiting: Add configurable delays between chunk requests
- Browser timeout: Each request completes in < 30 seconds

---

## Problem Analysis

### What's Happening
Documents over 50K words (488K+ characters) fail with HTTP 429 (Too Many Requests) when running AI Pass.

**Tested Document**:
- 85,337 words / 488,451 characters (Knights of Mairia)
- Multiple `chunkSize` values tested - all eventually hit 429 error
- JWT authentication is working correctly (not an auth issue)

### Why Our Fixes Keep Failing

**Test Results**:
- ❌ `chunkSize: 10` → Failed at 54 seconds with 429
- ❌ `chunkSize: 2` → Failed at 27 seconds with 429 (WORSE - more frequent requests)
- ❌ `chunkSize: 35` → Failed at 74 seconds with 429 (delayed but still fails)

**Pattern Analysis**:
- Smaller chunks = More API calls = Faster 429 error
- Larger chunks = Fewer API calls = Delayed 429 error (but still fails)
- Rate limiting appears to be **requests per time window**, not data volume
- Simply adjusting `chunkSize` only delays the inevitable

**Root Cause**: TipTap API has rate limits we're hitting regardless of chunk size. We need throttling between requests, not just chunk size adjustment.

---

## ❌ Pre-Console.log Fix Attempts (Historical Context)

**Note**: These approaches failed because they were tested BEFORE the console.log CPU load fix. Adjusting chunkSize is not inherently ineffective - these tests were done when console.log() was disrupting TipTap's throttling. Now that the console.log issue is fixed, dynamic chunkSize adjustment may be a viable optimization strategy.

### 1. Adjusting `chunkSize` Without Fixing Console.log
```typescript
// ❌ Does NOT solve the problem - only delays it
AiSuggestion.configure({
  chunkSize: 2,   // Fails faster (27s)
  chunkSize: 10,  // Fails medium (54s)
  chunkSize: 35,  // Fails slower (74s) - but still fails!
})
```
**Why it failed then**: Console.log CPU load was disrupting TipTap's throttling regardless of chunkSize. No delay between API requests + main thread contention meant we hammered the API too fast.

**Current status**: With console.log fix applied, chunkSize: 5 works for 27K word documents. Dynamic adjustment based on document size may help optimize for larger documents.

### 2. Native TipTap Caching
```typescript
// ❌ Doesn't prevent initial rate limiting
AiSuggestion.configure({
  enableCache: true,  // Only helps on subsequent loads
  chunkSize: 10,      // Still hits rate limits on first load
})
```
**Why it fails**: Caching only helps after first successful load. Doesn't prevent 429 on initial processing.

### 3. Custom Resolver Without Throttling
```typescript
// ❌ DEPRECATED - See TIPTAP_AI_RATE_LIMITING_GUIDE.md (archived)
// - Converted HTML to plain text (lost structure)
// - Manual position adjustment logic
// - No request throttling added
```
**Why it failed**: Custom chunking without throttling still triggers rate limits.

---

## 🎯 Proposed Solutions (NOT YET IMPLEMENTED)

### Option A: Custom Resolver with Throttling ⭐ (Recommended)

**Status**: ⚠️ **PLANNED - NOT IMPLEMENTED**

**What**: Override TipTap's default API calling logic with throttled implementation.

**Benefits**:
- ✅ Bypasses Chrome's 2-minute browser timeout (PRIMARY BENEFIT)
- ✅ Prevents rate limiting via throttled requests
- ✅ Supports unlimited document length
- ✅ Full control over LLM provider and costs
- ✅ Better error handling and retry logic

**How**:
1. Create `src/utils/throttledTiptapResolver.ts`
   - Implement custom chunking logic
   - Add configurable delay between API calls (2-3 seconds)
   - Use TipTap's API endpoint with our JWT
   - Aggregate results from all chunks

2. Update `src/hooks/useTiptapEditor.ts`:
   ```typescript
   AiSuggestion.configure({
     async resolver({ defaultResolver, rules, ...options }) {
       return defaultResolver({
         ...options,
         rules,
         apiResolver: async ({ html, htmlChunks, rules }) => {
           // Process chunks with custom backend LLM
           // Each request < 30-60 seconds (bypass 2-min timeout)
           // Return format: { format: 'replacements', content: {...} }
         },
       });
     },
   })
   ```

3. Add configuration options:
   - `CHUNK_DELAY_MS`: Delay between chunk requests (default: 2000ms)
   - `MAX_CHUNKS`: Safety limit to prevent infinite loops
   - `CHUNK_SIZE`: Nodes per chunk (default: 35)

**Critical Requirements**:

1. **htmlChunks Property**: Must include all chunks for caching mechanism
   ```typescript
   // Response MUST include htmlChunks
   return {
     format: 'replacements',
     content: {
       htmlChunks: [...],  // All chunks from input
       items: [...]        // Suggestions
     }
   };
   ```

2. **Response Format**: Must match TipTap's `replacements` format
   - Each item needs: `ruleId`, `deleteHtml`, `insertHtml`, `chunkId`
   - See full example in TipTap docs

3. **Request Timing**: Keep each chunk request under 30-60 seconds
   - Bypasses browser timeout
   - Prevents rate limiting

**Documentation**:
- [Custom LLM Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms#replace-the-api-endpoint-recommended)
- [Response Format Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)

**Pros**:
- Full control over API call timing
- Can implement exponential backoff
- Can add retry logic for failed chunks
- Most flexible solution
- Solves BOTH rate limiting AND browser timeout

**Cons**:
- More complex to implement (~200 lines)
- Need to maintain our own chunking logic
- Bypasses TipTap's built-in optimizations

**Estimated Time**: 2-3 hours

---

### Option B: Continue Testing Larger `chunkSize` Values

**Status**: ⚠️ **NOT RECOMMENDED**

**What**: Keep increasing `chunkSize` (50, 75, 100) to delay rate limit.

**Why NOT recommended**:
- Only delays the inevitable 429 error
- Doesn't solve root cause
- May hit other API limits (request size, timeout)
- Already tested values 2, 10, 35 - all failed

**Estimated Time**: 30 minutes per test (but unlikely to succeed)

---

### Option C: Retry Logic with Exponential Backoff

**Status**: ⚠️ **COULD WORK BUT POOR UX**

**What**: Catch 429 errors and retry with increasing delays.

**How**:
1. Wrap `loadAiSuggestions()` call in retry logic
2. On 429 error, wait (5s, 10s, 20s, 40s)
3. Retry up to N times
4. Show progress to user

**Pros**:
- Handles temporary rate limits
- Relatively simple to add
- Works with existing TipTap logic

**Cons**:
- Doesn't prevent rate limits, just handles them
- Can be very slow (multiple retries)
- Poor user experience (waiting for retries)
- May still fail on very large documents

**Estimated Time**: 1-2 hours

---

## 📋 Implementation Checklist (When Ready)

**Before implementing**:
- [ ] Verify TipTap API rate limits with vendor (requests/second, requests/minute)
- [ ] Check if our API tier supports higher limits
- [ ] Review TipTap docs for any built-in throttling options we missed

**For Option A (Custom Resolver)**:
- [ ] Create `src/utils/throttledTiptapResolver.ts`
- [ ] Implement chunking function
- [ ] Add configurable delay between requests
- [ ] Add retry logic for 429 errors
- [ ] Update `useTiptapEditor.ts` to use custom resolver
- [ ] Test with small document (10K words)
- [ ] Test with large document (85K words)
- [ ] Monitor network tab for request timing
- [ ] Verify no 429 errors occur

**Testing metrics**:
```typescript
// Expected for 85K word doc with Option A:
// - ~30 chunks at 2s delay = ~60s + processing time
// - Should avoid 429 errors entirely
```

---

## Current Configuration (Active as of Oct 1, 2025)

```typescript
// File: src/hooks/useTiptapEditor.ts:116
AiSuggestion.configure({
  rules: [/* Custom proofreading rules */],
  appId: tiptapAppId,
  token: jwt,

  // Current settings (STILL HITTING 429 ERRORS)
  chunkSize: 2,           // ❌ Fails at 27s
  enableCache: true,      // Doesn't prevent initial 429

  // Loading behavior
  loadOnStart: false,
  reloadOnUpdate: false,
  debounceTimeout: 800,

  // Model
  modelName: 'gpt-4o-mini',

  // Error handling
  onLoadSuggestionsError: (error, context) => {
    console.error('AI Suggestions error:', error);
  }
})
```

---

## Alternative: AI Agent Extension

**Status**: ⚠️ **NOT TESTED - POSSIBLE ALTERNATIVE**

For documents >500K characters, TipTap offers a different extension with character-based chunking:

```typescript
import AiAgent from '@tiptap-pro/extension-ai-agent';

AiAgent.configure({
  provider: new AiAgentProvider({
    appId: tiptapAppId,
    token: jwt,
    chunkSize: 32000,  // 32K characters per chunk (default)
  })
})
```

**Differences**:
- AI Suggestion: Node-based chunking (what we're using now)
- AI Agent: Character-based chunking (may have different rate limits)

**Unknown**: Whether AI Agent has same rate limiting issues. Needs testing.

---

## Key Questions to Answer

Before proceeding with implementation:

1. **Are chunks sent concurrently or sequentially?**
   - Open DevTools network tab during next test
   - Filter for `api.tiptap.dev`
   - Check if requests fire all at once or one-by-one

2. **What are TipTap's actual rate limits?**
   - Contact TipTap support for our API tier limits
   - Requests per second? Requests per minute?
   - Does our plan tier support higher limits?

3. **Does TipTap have built-in throttling options?**
   - Re-read docs for concurrency controls
   - Max concurrent requests setting?
   - Request throttling configuration?

---

## Performance Expectations (When Working)

| Document Size | Expected Time | Current Status |
|--------------|---------------|----------------|
| < 27K words | 30s - 90s | ✅ Working (console.log fix) |
| 27K - 85K words | 90s - 120s | 🟡 Untested (likely hits timeout) |
| 85K+ words | N/A (times out) | ❌ Needs custom resolver |

---

## Related Documentation

- TipTap AI Suggestion API: https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference
- TipTap Large Documents: https://tiptap.dev/docs/content-ai/capabilities/agent/features/large-documents
- TipTap Caching: https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure#configure-caching
- Our Implementation: `src/hooks/useTiptapEditor.ts`

---

## Test Results History

### October 1, 2025 - Console.log Fix SUCCESS ✅

**Test Document**: 27,782 words / 155,339 characters

**Results**:
- ✅ **SUCCESS** - Full document processed without errors
- Configuration: Reduced polling logs from 1s → 5s frequency
- Evidence: Proper throttling behavior observed ("runs for longer")
- Zero 429 rate limit errors
- Suggestions generated successfully

**Breakthrough**: Identified and fixed console.log() CPU contention issue

---

### October 1, 2025 - Playwright MCP Tests (Before Console.log Fix)

**Test Document**: Knights of Mairia_LG_Edit (85,337 words / 488,451 characters)

**Results**:
- ❌ chunkSize: 2 → Failed at 27 seconds with HTTP 429
- ❌ chunkSize: 35 → Failed at 74 seconds with HTTP 429
- Pattern: Larger chunks delay failure but don't prevent it
- JWT authentication: ✅ Working correctly
- Console logs confirm: Active configuration being used
- Zero suggestions generated in all tests

**Conclusion**: Adjusting chunk size alone does not solve rate limiting. Console.log CPU load was disrupting TipTap's throttling.

---

**Last Updated**: October 2, 2025
**Status**: 🟡 **PARTIALLY RESOLVED**
- ✅ Medium docs (27K words): Working via console.log fix
- ❌ Large docs (85K+ words): Needs custom resolver for browser timeout
**Next Action**: Implement custom resolver (Option A) for 85K+ word support
**Priority**: 🟡 High - console.log fix resolved immediate issues, custom resolver needed for full capacity
