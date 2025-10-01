# Large Document Processing Guide

## ❌ Issue ACTIVE - NOT RESOLVED (October 1, 2025)

**Problem**: AI Pass fails with 429 rate limit error on 85K+ word documents.

**Status**: 🔴 **BROKEN** - Multiple fix attempts have failed. Issue remains unresolved.

**Timeline**:
- **Original**: ~54 seconds with `chunkSize: 10`
- **Attempt #1**: ~27 seconds with `chunkSize: 2` (WORSE!)
- **Attempt #2**: ~74 seconds with `chunkSize: 35` (still fails with 429)

**Current State**: No working solution yet. All tested configurations still hit 429 rate limit.

**Test Date**: October 1, 2025 (via Playwright MCP)

**Evidence**:
```
Failed to load resource: the server responded with a status of 429 ()
@ https://api.tiptap.dev/v1/ai/suggestions:0

❌ AI loading error: Failed to fetch from Tiptap Cloud API.
HTTP response has status 429
```

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

## ❌ Failed Approaches (Don't Repeat These)

### 1. Adjusting `chunkSize` Alone
```typescript
// ❌ Does NOT solve the problem - only delays it
AiSuggestion.configure({
  chunkSize: 2,   // Fails faster (27s)
  chunkSize: 10,  // Fails medium (54s)
  chunkSize: 35,  // Fails slower (74s) - but still fails!
})
```
**Why it fails**: No delay between API requests means we still hammer the API too fast.

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

**How**:
1. Create `src/utils/throttledTiptapResolver.ts`
   - Implement custom chunking logic
   - Add configurable delay between API calls (2-3 seconds)
   - Use TipTap's API endpoint with our JWT
   - Aggregate results from all chunks

2. Update `src/hooks/useTiptapEditor.ts`:
   ```typescript
   AiSuggestion.configure({
     resolver: async ({ content, rules }) => {
       return throttledTiptapResolver({
         content: content.html,
         rules,
         appId: aiSuggestionConfig.appId!,
         token: aiSuggestionConfig.token!,
         chunkSize: 35,
         delayMs: 2000, // 2 second delay between chunks
       });
     },
   })
   ```

3. Add configuration options:
   - `CHUNK_DELAY_MS`: Delay between chunk requests (default: 2000ms)
   - `MAX_CHUNKS`: Safety limit to prevent infinite loops
   - `CHUNK_SIZE`: Nodes per chunk (default: 35)

**Pros**:
- Full control over API call timing
- Can implement exponential backoff
- Can add retry logic for failed chunks
- Most flexible solution

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
| < 10K words | < 30 seconds | ✅ Working |
| 10K - 50K words | 30s - 90s | ⚠️ May work |
| 50K - 100K words | 90s - 180s | ❌ BROKEN (429) |
| > 100K words | > 3 minutes | ❌ BROKEN (429) |

---

## Related Documentation

- TipTap AI Suggestion API: https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference
- TipTap Large Documents: https://tiptap.dev/docs/content-ai/capabilities/agent/features/large-documents
- TipTap Caching: https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure#configure-caching
- Our Implementation: `src/hooks/useTiptapEditor.ts`

---

## Test Results History

### October 1, 2025 - Playwright MCP Tests

**Test Document**: Knights of Mairia_LG_Edit (85,337 words / 488,451 characters)

**Results**:
- ❌ chunkSize: 2 → Failed at 27 seconds with HTTP 429
- ❌ chunkSize: 35 → Failed at 74 seconds with HTTP 429
- Pattern: Larger chunks delay failure but don't prevent it
- JWT authentication: ✅ Working correctly
- Console logs confirm: Active configuration being used
- Zero suggestions generated in all tests

**Conclusion**: Adjusting chunk size alone does not solve rate limiting. Need request throttling.

---

**Last Updated**: October 1, 2025
**Status**: ❌ **BROKEN - ACTIVE ISSUE - NOT RESOLVED**
**Next Action**: Decide on implementation approach (recommend Option A)
**Assigned**: Not yet assigned
**Priority**: 🔴 Critical - blocking large document AI processing
