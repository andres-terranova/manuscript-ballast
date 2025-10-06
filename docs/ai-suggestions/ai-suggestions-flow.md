# AI Suggestions Processing Flow

## ⚠️ IMPORTANT: Read This First

### Location & Implementation
- **PRIMARY FILE**: `src/components/workspace/Editor.tsx` ✅
- **NOT**: `src/components/workspace/ManuscriptWorkspace.tsx` ❌ (that's for manual suggestions)
- **EXTENSION**: TipTap Pro AI Suggestion (commercial, requires JWT auth)

### Common Developer Mistakes to Avoid
1. **"I need to implement progressive loading"** ❌
   - Reality: TipTap loads ALL suggestions at once when processing completes
   - Use `editor.storage.aiSuggestion.getSuggestions()` to get them all

2. **"I'll work with ManuscriptWorkspace.tsx suggestions"** ❌
   - Reality: That's a different system using ProseMirror decorations for manual suggestions
   - AI suggestions use TipTap Pro's extension in Editor.tsx

3. **"The suggestions load one by one"** ❌
   - Reality: Parallel batch processing sends 5 chunks at a time
   - ALL results return together when complete

4. **"I need to implement virtualization for loading"** ❌
   - Reality: Virtualization is only needed for RENDERING 5K+ items
   - The loading itself delivers everything at once

## Overview

This document explains how AI suggestions are generated and processed in Manuscript Ballast, clarifying the architectural pattern we use to integrate with TipTap Pro's AI Suggestion extension.

**Essential TipTap Documentation**:
- [AI Suggestion Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion) - Start here!
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms) - Our approach
- [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference) - Storage & methods
- [Configuration Options](https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure) - Extension setup

## Architecture Overview

### The Two-Component Pattern

Our AI suggestions system uses a **client-server split** where:
- **Edge function** (`ai-suggestions-html`) processes one chunk at a time
- **Client apiResolver** (`useTiptapEditor.ts`) loops through chunks and aggregates results

This follows TipTap's recommended `apiResolver` pattern for custom backend integration. TipTap provides flexibility in how you process chunks - you can send all chunks to your backend at once, or process them individually. We chose individual processing for our edge function architecture.

### How chunkSize Works

**Client-Side (TipTap Pro)**:
```typescript
// useTiptapEditor.ts:114
chunkSize: 20,  // TipTap Pro chunks document into 20 nodes per chunk

// TipTap Pro then calls your resolver with pre-chunked content:
apiResolver: async ({ html, htmlChunks, rules }) => {
  // htmlChunks is ALREADY chunked by TipTap based on chunkSize
  // Example: 85K word doc → ~46 chunks (if chunkSize=20)
}
```

**Edge Function**:
```typescript
// ai-suggestions-html/index.ts:25
const { html, chunkId, rules } = await req.json();
// Edge function ONLY receives:
// - html: Single pre-chunked HTML string
// - chunkId: Identifier
// - rules: AI rules
// It has NO knowledge of chunkSize - that's handled by TipTap Pro
```

### The Complete Processing Flow

1. **TipTap Pro chunks document** (controlled by `chunkSize: 20`)
2. **TipTap Pro passes htmlChunks array** to your apiResolver
3. **Your apiResolver batches chunks** (controlled by `BATCH_SIZE: 5`)
4. **Your apiResolver adds delays between batches** (controlled by `setTimeout: 500ms`)
5. **Edge Function processes individual rules sequentially** (line 40: `for (const rule of rules)`)

---

## Edge Function Contract

**Location**: `supabase/functions/ai-suggestions-html/index.ts`

### Input
```typescript
{
  html: string,        // Single HTML chunk content
  chunkId: string,     // Unique identifier for this chunk
  rules: Array<{       // AI rules to apply
    id: string,
    title: string,
    prompt: string
  }>
}
```

### Processing
```typescript
// Line 25: Accept single chunk
const { html, chunkId, rules } = await req.json();

// Lines 40-103: Process each rule sequentially
for (const rule of rules) {
  // Call OpenAI for this rule on this chunk
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    // ... OpenAI API call
  });

  // Collect suggestions
  items.push(...suggestions.map(s => ({
    ruleId: rule.id,
    deleteHtml: s.deleteHtml,
    insertHtml: s.insertHtml,
    chunkId: chunkId,
    note: `${rule.title}: ${s.note}`
  })));
}
```

### Output
```typescript
{
  items: Array<{
    ruleId: string,
    deleteHtml: string,
    insertHtml: string,
    chunkId: string,
    note: string
  }>
}
```

**Design Philosophy**: Keep the edge function simple, focused, and stateless. Process one chunk, return suggestions for that chunk only.

---

## Client-Side Aggregation Pattern

**Location**: `src/hooks/useTiptapEditor.ts:116-236`

### TipTap's Role

TipTap Pro AI Suggestion extension handles:
1. ✅ Document chunking (using `chunkSize: 20` - 20 top-level nodes per chunk)
2. ✅ Providing `htmlChunks` array to our `apiResolver` (pre-chunked based on chunkSize)
3. ✅ Expecting ALL suggestions back from `apiResolver`
4. ✅ Position mapping (HTML positions → ProseMirror positions)

**Important Distinction**:
- **Chunking** = TipTap Pro splits the document (controlled by `chunkSize` in extension config)
- **Batching** = Our apiResolver groups chunks for parallel processing (controlled by `BATCH_SIZE` in our code)

### Our apiResolver's Responsibility

```typescript
async resolver({ defaultResolver, rules, ...options }) {
  return await defaultResolver({
    ...options,
    rules,

    // Our custom apiResolver receives pre-chunked content
    apiResolver: async ({ html, htmlChunks, rules }) => {
      const allSuggestions = [];

      // Process chunks in parallel batches of 5
      const BATCH_SIZE = 5;
      for (let i = 0; i < htmlChunks.length; i += BATCH_SIZE) {
        const batch = htmlChunks.slice(i, i + BATCH_SIZE);

        // Create parallel fetch promises for this batch
        const batchPromises = batch.map((chunk, batchIndex) => {
          return fetch(`${supabaseUrl}/functions/v1/ai-suggestions-html`, {
            method: 'POST',
            body: JSON.stringify({
              html: chunk.html,      // Single chunk
              chunkId: chunk.id,
              rules: rules
            })
          })
          .then(async (response) => {
            const { items } = await response.json();
            return { chunkIndex, suggestions: items, success: true };
          })
          .catch((error) => {
            return { chunkIndex, error: error.message, success: false };
          });
        });

        // Wait for all chunks in this batch
        const batchResults = await Promise.allSettled(batchPromises);

        // Collect successful suggestions
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.success) {
            allSuggestions.push(...result.value.suggestions);
          }
        });

        // Rate limiting delay between batches
        if (i + BATCH_SIZE < htmlChunks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Return aggregated results in TipTap's expected format
      return {
        format: 'replacements',
        content: {
          htmlChunks,
          items: allSuggestions
        }
      };
    }
  });
}
```

### Why This Pattern?

**TipTap's Flexibility**: The [official documentation](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms) shows you can structure your `apiResolver` however you want - TipTap provides `htmlChunks` and you decide how to process them.

#### Approach A: Send All Chunks to Backend
```typescript
apiResolver: async ({ htmlChunks, rules }) => {
  // Backend receives all chunks and processes them
  const response = await fetch('ai-suggestions-batch', {
    body: JSON.stringify({ htmlChunks, rules })
  });
  return { format: 'replacements', content: response };
}
```
- Backend handles parallelization
- Fewer network requests
- Backend manages all complexity

#### Approach B: Process Chunks Individually (Our Choice)
```typescript
apiResolver: async ({ htmlChunks, rules }) => {
  // Client loops through chunks, calls backend for each
  for (const chunk of htmlChunks) {
    await fetch('ai-suggestions-single', {
      body: JSON.stringify({ html: chunk.html, chunkId: chunk.id, rules })
    });
  }
  // Aggregate results
}
```

**Why We Chose Approach B:**
- ✅ Simpler edge function (single responsibility - process one chunk)
- ✅ Client-side parallelization control (easy to adjust `BATCH_SIZE`)
- ✅ Per-chunk error handling with `Promise.allSettled()`
- ✅ Granular progress tracking (know exactly which chunk is processing)
- ✅ Easier debugging (isolate failures to specific chunks)
- ✅ Shorter edge function execution time (avoids timeouts)

Both approaches are valid per TipTap's architecture. We prioritized edge function simplicity and client-side control.

---

## Browser Freeze Analysis

### When the Freeze Happens

The browser freeze occurs **AFTER** our code completes successfully. Here's the timeline:

1. ✅ **Our apiResolver completes** (~15-20 min for 85K words)
   - All chunks processed
   - All suggestions aggregated
   - Results returned to TipTap

2. ❌ **TipTap's defaultResolver processes** (FREEZE #1)
   - Maps 5,000+ HTML positions → ProseMirror positions
   - **Synchronous operation**
   - Blocks browser UI thread

3. ❌ **React renders decorations** (FREEZE #2)
   - Creates 5,000+ suggestion decoration elements
   - **Synchronous DOM operations**
   - Blocks browser UI thread

### What Causes It

**TipTap's Position Mapping** (`useTiptapEditor.ts:121`):
```typescript
return await defaultResolver({
  ...options,
  rules,
  apiResolver: async ({ html, htmlChunks, rules }) => {
    // Our code runs here (completes successfully)
    return { format: 'replacements', content: { items: allSuggestions } };
  }
  // After this returns, TipTap's defaultResolver:
  // 1. Maps HTML positions to ProseMirror (FREEZE)
  // 2. Creates Suggestion objects (FREEZE)
});
```

**React Rendering** (`ChangeList.tsx`):
```typescript
// When suggestions update, React renders all at once
{suggestions.map(suggestion => (
  <SuggestionItem key={suggestion.id} {...suggestion} />
))}
// With 5,000+ suggestions, this freezes the UI
```

### Phase 2 Queue - What It Fixes vs Doesn't Fix

**What a Queue WOULD Fix:**
- ✅ Long processing time (server does work, user can close browser)
- ✅ Memory usage during processing (isolated to server)
- ✅ User experience during AI processing (non-blocking background job)

**What a Queue CANNOT Fix:**
- ❌ Browser freeze when downloading 5,000 suggestions
- ❌ Browser freeze during TipTap's position mapping
- ❌ Browser freeze during React's rendering

**Why:** Even with a queue, when suggestions are ready:
```typescript
// User returns to app, downloads results
const suggestions = await pollQueueUntilComplete(); // Returns 5,000 items

// Feed to TipTap
editor.commands.setAiSuggestions(suggestions);
// ↑ FREEZE STILL HAPPENS HERE
// TipTap maps positions synchronously
// React renders 5,000 decorations synchronously
```

### The Actual Solution for Phase 2

**Progressive Loading + Virtualization:**

1. **Progressive Loading** - Don't load all 5,000 at once:
   ```typescript
   // Load first 500 suggestions
   const first500 = suggestions.slice(0, 500);
   editor.commands.setAiSuggestions(first500);

   // Load next 500 when user scrolls past 400
   const next500 = suggestions.slice(500, 1000);
   editor.commands.setAiSuggestions([...existing, ...next500]);
   ```

2. **Virtualized ChangeList** - Only render visible suggestions:
   ```typescript
   // Use react-window or similar
   <VirtualList
     itemCount={suggestions.length}
     itemSize={80}
     renderItem={({ index }) => (
       <SuggestionItem suggestion={suggestions[index]} />
     )}
   />
   ```

3. **Optional: Background Queue** - For better UX during processing:
   - Queue job for AI processing (runs on server)
   - Poll for completion (user can close browser)
   - When ready, progressively load results (addresses freeze)

---

## Performance Characteristics

### Current System (Phase 1)

**Small Documents** (<10K words):
- Processing: ~2 minutes
- Suggestions: ~200-500
- Experience: No freeze, smooth

**Medium Documents** (10-30K words):
- Processing: ~5-10 minutes
- Suggestions: ~1,000-2,000
- Experience: Brief freeze (~10-30s), acceptable

**Large Documents** (30-85K words):
- Processing: ~15-20 minutes
- Suggestions: ~3,000-5,000
- Experience: Multi-minute freeze, poor UX (but functional)

### Parallel Batching Performance

**Current Configuration** (Optimized via UAT - October 2025):
- **chunkSize**: 20 (19% faster than 10)
- **BATCH_SIZE**: 5 concurrent chunks
- **Rate Limiting**: 500ms delay between batches
- **Error Tolerance**: `Promise.allSettled()` continues on failures

**Metrics** (30-50K word document with chunkSize: 20):
- Total chunks: ~46 (50% fewer than chunkSize: 10)
- Batches: ~10 (46 ÷ 5)
- API calls: ~156 requests (50% fewer than chunkSize: 10)
- Success rate: 100%
- Rate limiting errors: 0
- Total time: ~5.7 minutes (vs ~7.1 minutes with chunkSize: 10)

**Performance Improvement**:
- ✅ **19% faster** processing (80 seconds saved)
- ✅ **50% fewer API calls** (lower costs, reduced rate limit risk)
- ✅ **No timeout issues** observed with larger chunks
- ✅ **100% success rate** in UAT testing

---

## Integration with TipTap Flow

### Complete Flow Diagram

```
1. User clicks "Run AI Pass" in Editor.tsx
   ↓
2. TipTap chunks document (chunkSize: 20)
   → Creates htmlChunks array
   ↓
3. TipTap calls our resolver
   → Passes htmlChunks to our apiResolver
   ↓
4. Our apiResolver loops through chunks
   → Batches of 5 parallel fetch calls
   → Each calls ai-suggestions-html edge function
   → Aggregates all results
   ↓
5. Returns to TipTap's defaultResolver
   → TipTap maps HTML positions → ProseMirror
   → (POTENTIAL FREEZE with 5K+ suggestions)
   ↓
6. TipTap creates Suggestion objects
   → Stores in editor state
   ↓
7. React re-renders with new suggestions
   → ChangeList shows all suggestions
   → (POTENTIAL FREEZE with 5K+ suggestions)
   ↓
8. User sees suggestions in editor
```

### Key Interfaces

**TipTap → Our Code:**
```typescript
apiResolver: async ({
  html: string,                          // Full document HTML
  htmlChunks: Array<{                    // Pre-chunked by TipTap
    html: string,
    id: string
  }>,
  rules: Array<{                         // AI rules to apply
    id: string,
    prompt: string,
    title: string
  }>
}) => {
  // Our responsibility: return all suggestions
  return {
    format: 'replacements',
    content: {
      htmlChunks,
      items: [...allSuggestions]
    }
  }
}
```

**Our Code → Edge Function:**
```typescript
fetch('ai-suggestions-html', {
  body: {
    html: string,        // Single chunk HTML
    chunkId: string,     // Chunk identifier
    rules: [...]         // Same rules array
  }
})
// Returns: { items: [...suggestions] }
```

---

## TipTap Official Integration Pattern

Our implementation follows **TipTap's recommended approach** for custom backend integration:

From [TipTap Custom LLMs Documentation](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms):

> **Recommended Approach: Replace the API endpoint**
>
> Use a custom `apiResolver` function to generate suggestions using your own backend and LLM. Let Tiptap handle suggestion display and conflict resolution.

```typescript
// TipTap's official pattern
AiSuggestion.configure({
  async resolver({ defaultResolver, ...options }) {
    const suggestions = defaultResolver({
      ...options,
      apiResolver: async ({ html, htmlChunks, rules }) => {
        const response = await yourCustomBackend({ html, htmlChunks, rules })
        return { format: 'replacements', content: response }
      },
    })
    return suggestions
  },
})
```

**Key Points from Official Docs**:
- ✅ Use `apiResolver` for maximum flexibility with custom backends
- ✅ Return suggestions in `'replacements'` format (recommended)
- ✅ TipTap handles suggestion display, conflict resolution, and position mapping
- ✅ You control how chunks are processed (individually or in batch)
- ✅ Built-in caching with `enableCache: true` (default)

---

## Related Documentation

### Official TipTap Resources
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms) - Official guide for custom backends
- [AI Suggestion API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference) - Complete API documentation
- [Configuration Options](https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure) - Extension configuration guide

### Internal Documentation
- **Implementation**: [Large Documents](../technical/large-documents.md) - Performance metrics and testing
- **Edge Function**: `supabase/functions/ai-suggestions-html/index.ts` - Server-side processing
- **Client Hook**: `src/hooks/useTiptapEditor.ts:116-236` - Client-side aggregation
- **TipTap Config**: `src/hooks/useTiptapEditor.ts:105-115` - Extension configuration
- **JWT Auth**: [TipTap JWT](../technical/tiptap-jwt.md) - Authentication setup
- **Phase 2 Plans**: [Product Roadmap](../product/roadmap.md) - v1.1 performance optimization

---

**Last Updated**: January 2025 - Clarified chunking vs batching distinction and how chunkSize works

## Tags
#architecture #ai-suggestions #tiptap #performance #parallel-processing #edge-functions #browser-freeze #phase2 #custom-llm #apiResolver
