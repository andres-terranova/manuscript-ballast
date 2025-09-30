# TipTap AI Rate Limiting Guide

## ⚠️ IMPORTANT: Previous Approaches Deprecated

**This document previously contained extensive custom chunking strategies that have been replaced with TipTap's native system.**

## ✅ Current Implementation: TipTap Native Chunking

### Executive Summary

After multiple implementation attempts, we discovered that **TipTap's built-in chunking and caching features** are the correct solution for rate limiting issues. All custom resolver approaches have been deprecated.

### The Problem (SOLVED)

- **Issue**: Large documents (>100K characters) caused 429 rate limit errors
- **Root Cause**: We were fighting against TipTap's internal system with custom chunking
- **Solution**: Use TipTap's native `enableCache` and `chunkSize` options

### ✅ Final Implementation

**Simple TipTap configuration:**

```typescript
// File: src/hooks/useTiptapEditor.ts
AiSuggestion.configure({
  enableCache: true,      // Use TipTap's built-in caching
  chunkSize: 10,         // 10 HTML nodes per chunk
  // No custom resolver needed for chunking!
})
```

**User experience enhancements:**

```typescript
// File: src/components/workspace/ExperimentalEditor.tsx
const isLargeDocument = documentLength > 100000;

if (isLargeDocument) {
  toast({
    title: "Processing large document",
    description: "TipTap will process in chunks with native caching.",
  });
}

// Standard TipTap AI loading
editor.chain().loadAiSuggestions().run();
```

### Key Benefits

1. **TipTap handles rate limiting internally** - They know their API best
2. **Built-in caching** - Reduces redundant API calls
3. **HTML structure preservation** - No plain text conversion needed
4. **Simplified maintenance** - No custom logic to maintain
5. **Vendor support** - Uses officially supported features

### Configuration Options

**Tunable Parameters:**
- `chunkSize: 5-20` - Number of HTML nodes per chunk
- `enableCache: true/false` - Toggle caching behavior
- Large document threshold (100K chars) for user feedback

### What We Learned

#### ❌ Failed Approaches (Don't Repeat)

1. **Custom Resolver with Manual Chunking**
   - Converted HTML to plain text (lost structure)
   - Manual position adjustment logic
   - Interfered with TipTap's internal rate limiting

2. **Runtime Resolver Override**
   - Attempted `editor.storage.aiSuggestion.resolver = ...`
   - This property doesn't exist/isn't writable
   - Configuration must happen at extension initialization

3. **Content Replacement Strategy**
   - Temporarily replaced editor content with chunks
   - Destroyed document formatting
   - Caused infinite loading loops

#### ✅ Correct Approach

**Use TipTap's native features first:**
- Configure chunking at extension initialization
- Let TipTap handle API communication
- Trust vendor expertise over custom implementations

### Files Modified

**Current Implementation:**
- `src/hooks/useTiptapEditor.ts` - Native chunking configuration
- `src/components/workspace/ExperimentalEditor.tsx` - User feedback only

**Removed:**
- All custom resolver logic
- Manual chunking functions
- Rate limiting delays
- Position adjustment code

### Performance Expectations

**With Native Chunking:**
- TipTap manages API rate limits internally
- Caching reduces processing time
- HTML structure maintained throughout
- Simplified error handling

### Testing Checklist

- [ ] Small documents (<100K chars) work without regression
- [ ] Large documents (>100K chars) process without 429 errors
- [ ] User sees appropriate feedback for large documents
- [ ] Suggestions appear correctly in editor

### Future Considerations

**Only consider custom solutions if:**
- Integrating non-TipTap LLMs
- Adding business-specific suggestion logic
- TipTap's native features prove insufficient

**Always try native approach first.**

## Deprecated Implementation Strategies

The following sections describe previous approaches that **should not be used**:

### ❌ Strategy 1: Enhanced Backend Chunking
- Modified `supabase/functions/suggest/index.ts`
- Manual chunk size and limit adjustments
- **Problem**: Still uses wrong approach for TipTap AI

### ❌ Strategy 2: Hybrid TipTap/Backend
- Size-based routing between TipTap and backend
- **Problem**: Overcomplicated, maintained two systems

### ❌ Strategy 3: Client-Side Custom Chunking
- Custom resolver override with manual chunking
- **Problem**: Fought against TipTap's architecture

### ❌ Strategy 4: Queue-Based Processing
- Backend queue system for AI processing
- **Problem**: Unnecessary for TipTap's cloud API

### ❌ Strategy 5: Progressive Loading
- Custom progress tracking and UI feedback
- **Problem**: Complex solution to simple configuration issue

## Important Reminders

1. **Read TipTap documentation thoroughly** before implementing custom solutions
2. **Native features first** - Always try vendor options before custom code
3. **Trust vendor expertise** - TipTap designed their chunking for their API
4. **Keep it simple** - Complex custom logic often creates more problems
5. **Document mistakes** - Learn from failed approaches

## Key Lesson

**The most sophisticated solution was the simplest: using TipTap's native chunking.**

All the complex strategies documented in previous versions of this file were solved by a simple configuration change:

```diff
AiSuggestion.configure({
  // ... other config
+ enableCache: true,
+ chunkSize: 10,
})
```

This serves as a reminder that sometimes the best engineering solution is to use the tools as they were designed, rather than building elaborate workarounds.