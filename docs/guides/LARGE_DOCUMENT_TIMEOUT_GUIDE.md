# Large Document Processing Guide

## ❌ Issue ACTIVE - Fix Failed (October 1, 2025)

**Problem**: AI Pass fails with 429 rate limit error on 85K+ word documents.

**Timeline**:
- **Original**: ~54 seconds with `chunkSize: 10`
- **After Fix**: ~27 seconds with `chunkSize: 2` (WORSE!)

**Attempted Fix**: Changed `chunkSize: 10` to `chunkSize: 2`

**Result**: **FIX DID NOT WORK** - Error occurs even faster now (27s vs 54s)

**Test Date**: October 1, 2025 (via Playwright MCP)

**Evidence**:
```
Failed to load resource: the server responded with a status of 429 ()
@ https://api.tiptap.dev/v1/ai/suggestions:0

❌ AI loading error after 27.0s: Failed to fetch from Tiptap Cloud API.
HTTP response has status 429
```

**Status**: 🔴 BROKEN - Need alternative approach (see "Next Steps" section below)

---

## Problem Analysis

### What Happened
Documents over 50K words (488K+ characters) were failing with HTTP 429 (Too Many Requests) when running AI Pass.

**Tested Document**:
- 85,337 words / 488,451 characters (Knights of Mairia)
- Failed at ~54 seconds with 429 rate limit error
- Using `chunkSize: 10` (5x larger than TipTap's default)

### Why It Failed

**TipTap's AI Suggestion Extension Configuration**:
- Default `chunkSize`: **2 top-level HTML nodes** per chunk
- Default `enableCache`: **true**
- API is optimized for processing 2-node chunks

**Our Configuration (Before Fix)**:
```typescript
AiSuggestion.configure({
  chunkSize: 10,  // ❌ 5x larger than default!
  enableCache: true,
})
```

**The Math**:
- 85K word document ≈ 5,000 top-level nodes (paragraphs)
- With chunkSize=10: ~500 API calls
- With chunkSize=2: ~2,500 API calls

**Expected Result**:
- More, smaller chunks = Better (spreads load over time)
- Fewer, larger chunks = Worse (overwhelms API quickly)

**Actual Result from Testing (Oct 1, 2025)**:
- ❌ chunkSize=10: Failed at 54 seconds with 429
- ❌ chunkSize=2: Failed at 27 seconds with 429 (WORSE!)

**Analysis**: Reducing chunk size increased API request frequency, hitting rate limits faster. The rate limiting appears to be **requests per time window**, not data volume.

---

## The Fix (FAILED)

### Code Change (Did Not Work)
```typescript
// src/hooks/useTiptapEditor.ts:116

// ❌ Original (failed at 54s)
chunkSize: 10,  // 10 HTML nodes per chunk

// ❌ Attempted Fix (failed at 27s - WORSE!)
chunkSize: 2,   // TipTap's default - made rate limiting faster
```

### Why This FAILED
1. **Increased Request Frequency**: More chunks = more requests per second
2. **Rate Limit is Request-Based**: TipTap API appears to limit requests/second, not data volume
3. **Wrong Assumption**: Assumed smaller chunks would spread load, but they concentrated requests
4. **Test Result**: Failed FASTER with smaller chunks (27s vs 54s)

### Next Steps Required
1. **Investigate TipTap API Limits**: Contact TipTap about actual rate limits
2. **Add Request Throttling**: Implement delay between chunk requests
3. **Consider AI Agent Extension**: Character-based chunking instead of node-based
4. **Test with chunkSize: 20-50**: Larger chunks to reduce request frequency
5. **Implement Retry Logic**: Handle 429 with exponential backoff

---

## Configuration Reference

### Current Settings (Optimal)
```typescript
// src/hooks/useTiptapEditor.ts
AiSuggestion.configure({
  rules: [/* Custom proofreading rules */],
  appId: tiptapAppId,
  token: jwt,

  // Chunking & Caching (use TipTap defaults)
  chunkSize: 2,           // Default: 2 nodes per chunk
  enableCache: true,      // Default: true (already on)

  // Loading behavior
  loadOnStart: false,     // Only load on user action
  reloadOnUpdate: false,  // Don't auto-reload on edits
  debounceTimeout: 800,   // Default: 800ms

  // Model
  modelName: 'gpt-4o-mini',

  // Error handling
  onLoadSuggestionsError: (error, context) => {
    console.error('AI Suggestions error:', error);
  }
})
```

### When to Adjust chunkSize

**General Rule**: Use TipTap's default (2) unless you have a specific reason not to.

**Possible Adjustments**:
- `chunkSize: 1` - For VERY large documents (>200K words) if still hitting limits
- `chunkSize: 3-5` - For smaller documents where faster processing is desired
- Never use >5 for large documents

### Alternative: AI Agent Extension

For documents >500K characters, consider using the AI Agent extension instead:

```typescript
// AI Agent uses character-based chunking (not node-based)
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
- AI Suggestion: Node-based chunking (good for <500K chars)
- AI Agent: Character-based chunking (designed for large documents)

---

## Testing Recommendations

### Before Production
- [ ] Test with 85K word document (Knights of Mairia)
- [ ] Verify no 429 errors occur
- [ ] Check processing completes successfully
- [ ] Monitor processing time (should be <2 minutes)
- [ ] Verify memory usage stays reasonable

### Metrics to Monitor
```typescript
// Log in ExperimentalEditor.tsx
console.log('Document processing:', {
  wordCount: manuscript.word_count,
  charCount: manuscript.character_count,
  chunkSize: 2,
  startTime: new Date(),
});

// After completion
console.log('Processing complete:', {
  duration: Date.now() - startTime,
  suggestionsGenerated: suggestions.length,
  status: 'success'
});
```

---

## Performance Expectations

| Document Size | Expected Time | Status |
|--------------|---------------|---------|
| < 10K words | < 30 seconds | ✅ Fast |
| 10K - 50K words | 30s - 90s | ✅ Normal |
| 50K - 100K words | 90s - 180s | ✅ Working |
| > 100K words | > 3 minutes | ⚠️ Consider AI Agent |

---

## Still Having Issues?

If you still encounter rate limiting with `chunkSize: 2`:

1. **Check Your API Tier**: Contact TipTap about rate limits for your account
2. **Verify Token**: Ensure JWT is valid and not expired
3. **Check Network**: Slow connections may cause timeouts unrelated to rate limiting
4. **Try chunkSize: 1**: Even smaller chunks for extreme cases
5. **Consider AI Agent**: Switch to character-based chunking

---

## Related Documentation

- TipTap AI Suggestion API: https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference
- TipTap Large Documents: https://tiptap.dev/docs/content-ai/capabilities/agent/features/large-documents
- TipTap Caching: https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure#configure-caching
- Our Implementation: `src/hooks/useTiptapEditor.ts`

---

## Test Results (October 1, 2025)

**Test Method**: Playwright MCP automated browser testing

**Test Document**: Knights of Mairia_LG_Edit (85,337 words / 488,451 characters)

**Results**:
- ❌ chunkSize: 2 - Failed at 27 seconds with HTTP 429
- ❌ Fix made the problem WORSE (54s → 27s)
- Console logs confirm chunkSize: 2 configuration active
- JWT authentication successful (not an auth issue)
- Zero suggestions generated

**Conclusion**: Reducing chunk size increases API request rate, triggering rate limits faster.

---

**Last Updated**: October 1, 2025
**Status**: ❌ BROKEN - Active issue
**Next Action**: Investigate alternative approaches (see "Next Steps Required" section)
