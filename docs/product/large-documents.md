# Large Document Processing

## ✅ Status: RESOLVED - Phase 1 Deployed (October 2025)

**Current Capabilities**:
- ✅ Up to 85,337 words / 488,451 characters tested and working
- ✅ Parallel batch processing (5 chunks concurrent)
- ✅ 99.9%+ position accuracy across all document sizes
- ✅ Zero rate limiting (0 × 429 errors)

**Known Limitations**:
- ⚠️ Browser freeze: Multi-minute freeze when rendering 5,000+ suggestions (functional but poor UX)
- ⚠️ High memory: 1,575 MB (73.5% browser limit) on large docs
- ⚠️ Processing time: ~15-20 min for 85K words (acceptable for batch, not interactive)

---

## 📊 Test Results Summary

### Completed Tests (October 3, 2025)

| Document Size | Status | Suggestions | Time | Memory | Notes |
|---------------|--------|-------------|------|--------|-------|
| Small (1,247 words) | ✅ PASS | 265 | ~2 min | OK | Baseline test |
| Medium (27,782 words) | ✅ PASS | 2,326 | 39.7 min | 172 MB | Sequential processing, 99.9% accuracy |
| Large (85K words, sequential) | ❌ FAIL | - | 32-43 min | - | Edge timeout at chunks 58/92 |
| Large (85K words, parallel) | ✅ SUCCESS | 5,005 | ~15-20 min | 1,575 MB | **Parallel batching breakthrough** |

### Key Achievements

**✅ Parallel Processing Breakthrough**:
- 85K words processed successfully with 5,005 suggestions
- 3-5x faster than sequential processing
- Promise.allSettled() provides error tolerance

**✅ Critical Bug Fixes**:
- JWT reload destroying suggestions → Extended to 24hr expiration
- CORS issues → Fixed in edge function

**✅ Technical Metrics**:
- Zero rate limiting (313 requests, 0 × 429 errors)
- Position mapping accuracy: 99.9%+
- Error tolerance: 98.7% success rate on individual chunks

---

## 🏗️ Implementation

**Custom API Resolver** (`src/hooks/useTiptapEditor.ts`, lines 116-188):
```typescript
// Parallel batch processing with custom resolver
// Processes document in chunks concurrently
// Uses Promise.allSettled() for error tolerance
```

**Edge Function**: `supabase/functions/ai-suggestions-html/`
- Handles HTML chunk processing
- Returns suggestions in ProseMirror position format
- Extended timeout to handle large batches

**JWT Configuration**:
- 24hr expiration (prevents suggestion loss during processing)
- Server-generated via `supabase/functions/generate-tiptap-jwt/`

---

## 🏛️ Implementation Pattern

### TipTap Custom Backend Integration

Our implementation follows **TipTap's recommended `apiResolver` pattern** for custom backend integration. See [TipTap Custom LLMs Documentation](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms).

### Client-Server Contract

**Edge Function** (`ai-suggestions-html`):
- **Accepts**: Single HTML chunk + rules
- **Returns**: Suggestions for that chunk only
- **Design**: Stateless, simple, focused on one task

**Client apiResolver** (`useTiptapEditor.ts:116-236`):
- **Receives**: `htmlChunks` array from TipTap (pre-chunked using `chunkSize: 10`)
- **Responsibility**: Loop through chunks, call edge function for each, aggregate results
- **Pattern**: Parallel batching (5 concurrent), `Promise.allSettled()` for error tolerance
- **Returns**: Aggregated suggestions in `'replacements'` format (TipTap's recommended format)

### Why This Pattern?

TipTap provides flexibility in how you handle `htmlChunks` - you can send all chunks to your backend at once, or process them individually. Both are valid approaches.

**Alternative: Batch Processing** (send all chunks to backend):
```typescript
apiResolver: async ({ htmlChunks, rules }) => {
  const response = await fetch('ai-suggestions-batch', {
    body: JSON.stringify({ htmlChunks, rules })
  })
  return { format: 'replacements', content: response }
}
```

**Our Choice: Individual Processing**:
- ✅ Simpler edge function (single responsibility)
- ✅ Better error handling per chunk
- ✅ Client controls parallelization (easy to adjust `BATCH_SIZE`)
- ✅ Easier debugging (know exactly which chunk failed)
- ✅ Shorter edge function execution time (avoids timeouts)

Both approaches follow TipTap's official integration pattern. We chose individual processing for edge function simplicity and client-side control.

**Full Architecture Details**: See [AI Suggestions Flow](../ai-suggestions/ai-suggestions-flow.md)

---

## ⚠️ Known Issues & Workarounds

### Browser Freeze on Large Suggestion Sets

**Symptom**: Multi-minute UI freeze when rendering 5,000+ suggestions
**Impact**: Poor UX, but editor remains functional after freeze
**Root Cause**: Happens AFTER our processing completes - TipTap's position mapping (HTML→ProseMirror) + React rendering 5K+ decorations are both synchronous
**Workaround**: None currently
**Phase 2 Fix**: Progressive loading + virtualized ChangeList (queue alone won't fix the freeze)

### High Memory Usage

**Symptom**: 1,575 MB memory usage on 85K word documents
**Impact**: Approaches browser memory limits (~73.5% of 2GB limit)
**Workaround**: Close other browser tabs, refresh editor after processing
**Future**: Progressive rendering and virtualization in Phase 2

### Long Processing Times

**Symptom**: ~15-20 minutes for 85K word documents
**Impact**: Not suitable for interactive editing workflows
**Context**: Acceptable for batch processing, initial AI pass
**Future**: Background queue with progress tracking in Phase 2

---

## 🚀 Next Steps (Phase 2)

**Not in v1.0** - deferred for production scaling:
- **Progressive loading** - Load suggestions in batches (500 at a time) to prevent browser freeze
- **Virtualized ChangeList** - Only render visible suggestions (react-window or similar)
- **Background queue** (optional) - Server-side processing for better UX, but doesn't fix browser freeze
- Memory optimization beyond 85K words

**Note**: A background queue helps with processing time but won't fix the browser freeze. The freeze happens when TipTap maps positions and React renders decorations - these are synchronous operations that require progressive loading to solve.

**Current Recommendation**: Ship Phase 1 with documented limits, gather user feedback

---

## 📚 Related Documentation

### Official TipTap Resources
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms) - Official guide for custom backends (our implementation follows this)
- [AI Suggestion API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference) - Complete API documentation
- [Configuration Options](https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure) - Extension configuration guide

### Internal Documentation
- **Implementation**: `src/hooks/useTiptapEditor.ts:116-236` (custom apiResolver)
- **Edge Function**: `supabase/functions/ai-suggestions-html/` (processes single chunks)
- **Architecture**: [AI Suggestions Flow](../ai-suggestions/ai-suggestions-flow.md) (complete pattern documentation)
- **JWT Configuration**: [TipTap JWT](./tiptap-jwt.md) (authentication setup)

**Last Updated**: October 6, 2025 (Added official TipTap documentation links and implementation pattern clarifications)

## Tags
#large_documents #phase1 #performance #parallel_processing #testing #resolved
