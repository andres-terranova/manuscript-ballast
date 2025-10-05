# Large Document AI Processing: Current Approach & Learning Journey

> **⚠️ ARCHIVED**: This document has been superseded by UAT-PHASE1-FINDINGS.md (October 2025)
>
> **Historical Value**: Chronicles the learning journey from rate limiting issues to browser timeout diagnosis
>
> **For Current Information**: See:
> - [UAT-PHASE1-FINDINGS.md](../UAT-PHASE1-FINDINGS.md) - Actual Phase 1 test results
> - [implementation-guide-phased-approach.md](../implementation-guide-phased-approach.md) - Current implementation details

## Document Purpose

This file documents the **complete journey** from initial rate limiting issues through to the current browser timeout challenge. It serves as an educational resource showing:

1. How we identified and solved rate limiting for medium documents (< 27K words)
2. Why early custom resolver attempts failed (targeting wrong problem)
3. The current challenge: browser timeout for large documents (85K+ words)
4. The path forward: job queue pattern vs. custom resolver

**For implementation details**, see `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md`

---

## 📊 Current State (October 3, 2025)

### Two Separate Problems, Two Different Solutions

#### 1. ✅ RESOLVED: Rate Limiting (Medium Documents)

- **Scope**: Documents up to 27K words (~155K characters)
- **Problem**: 429 Too Many Requests errors from TipTap Content AI
- **Root Cause**: Console.log() CPU load blocking main thread, disrupting TipTap's internal request throttling
- **Solution**: Reduced polling log frequency from 1s → 5s in `waitForAiSuggestions()`
- **Result**: Native TipTap now handles 27,782 words successfully
- **Status**: Production-ready with `chunkSize: 5`
- **Commit**: fc1735b (2025-10-01)

**How It Works**:
- JavaScript is single-threaded - excessive console.log() creates CPU contention
- Each log: formats strings, writes buffers, updates DevTools UI
- Main thread contention → TipTap throttling timing disrupted → chunks sent too fast → 429
- Reducing logs 80% (36 logs → 7 logs per 36s) freed main thread
- TipTap's built-in throttling now works correctly

#### 2. ❌ ACTIVE: Browser Timeout (Large Documents 85K+)

- **Scope**: Documents over 85K words (~488K+ characters)
- **Problem**: Chrome's hard 2-minute timeout kills long-running HTTP requests
- **Root Cause**: Browser timeout is not configurable via JavaScript (security limitation)
- **Impact**: AI Pass fails mid-processing, no results returned
- **Proposed Solution**: Job queue pattern (recommended) or custom apiResolver
- **Status**: Design complete, implementation pending

**Job Queue Pattern** (Recommended):
- Reuses existing DOCX queue infrastructure (`/Users/andresterranova/manuscript-ballast/supabase/functions/queue-processor/`)
- Moves processing entirely to edge functions (no browser timeout)
- Client polls for job completion status
- Completely bypasses browser limitations
- See `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md` for implementation details

**Custom apiResolver Pattern** (Alternative):
- Breaks long request into many short requests (< 2 min each)
- Processes chunks sequentially in client
- More complex state management
- Still subject to browser constraints
- Only needed if real-time progress feedback is critical

### Key Insight

**The early custom resolvers documented below failed because they targeted RATE LIMITING** (wrong problem). We now know:

- **Rate limiting** = Too many requests too fast → Fixed by console.log reduction → Native TipTap works
- **Browser timeout** = Single request too long → Requires job queue or chunked custom resolver → New approach needed

These are fundamentally different problems requiring different solutions.

---

## ✅ Updated Implementation: TipTap Native System

### Executive Summary

After extensive research and multiple implementation attempts, we determined that **TipTap's built-in chunking and caching system** is the optimal solution for large document processing. Custom resolver implementations were causing more problems than they solved.

### Key Discovery

**The root cause of issues was fighting against TipTap's architecture instead of leveraging it.**

- **Previous approach**: Custom resolver with manual chunking and rate limiting
- **Current approach**: Native TipTap features (`enableCache`, `chunkSize`)
- **Result**: Simplified, more reliable implementation

### Research Findings

#### What We Learned the Hard Way

1. **TipTap's API is designed for their chunking system** - Custom chunking interferes with their internal rate limiting
2. **HTML structure matters** - Converting to plain text loses important context
3. **Native caching is crucial** - TipTap's caching reduces redundant API calls
4. **Custom resolvers are for different LLMs** - Not for chunking the same API

#### Failed Approaches

1. **❌ Custom Resolver with Text Chunking**
   - Converted HTML to plain text
   - Lost document structure
   - Caused 429 rate limit errors
   - Complex position adjustment logic

2. **❌ Dynamic Resolver Override**
   - Attempted runtime override of `editor.storage.aiSuggestion.resolver`
   - This property doesn't exist/isn't writable
   - Configuration must happen at extension initialization

3. **❌ Content Replacement Strategy**
   - Temporarily replaced editor content with chunks
   - Destroyed document formatting and paragraph breaks
   - Caused infinite loading loops

### ✅ Current Implementation

**Simple, native TipTap configuration:**

```typescript
// File: src/hooks/useTiptapEditor.ts
AiSuggestion.configure({
  enableCache: true,    // Use TipTap's built-in caching
  chunkSize: 5,         // Works for 27K words (post console.log fix)
  // No custom resolver needed!
})
```

**User experience logic:**

```typescript
// File: src/components/workspace/ExperimentalEditor.tsx
// Detect large documents for user feedback only
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

### Implementation Phases

#### Phase 1: Native TipTap - Completed ✅
- Removed all custom resolver logic
- Configured native TipTap chunking
- Fixed TypeScript errors
- Updated documentation
- **Result**: Clean baseline for medium documents

#### Phase 2: Rate Limiting Resolution - Completed ✅
- ✅ Console.log fix applied (Oct 1, 2025) - Reduced from 1s → 5s polling
- ✅ Identified CPU contention as root cause
- ✅ Enabled 27,782 word / 155K character processing
- ✅ Native TipTap with `chunkSize: 5` production-ready
- **Result**: Medium documents (< 27K words) fully operational

#### Phase 3: Large Document Solution - Design Complete, Pending Implementation

**Recommended: Job Queue Pattern**
- Reuses existing DOCX processing infrastructure
- No browser timeout (processing in edge functions)
- Simpler client code (just poll for status)
- Better scalability and error recovery
- Implementation guide: `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md`

**Alternative: Custom apiResolver Pattern**
- Only if real-time progress feedback is critical
- Complex state management in client
- Still constrained by browser limitations
- Implementation guide: `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md`

**Use Cases for Either Approach**:
- ✅ **85K+ word documents** - Browser timeout bypass (PRIMARY USE CASE)
- Different LLM integration (non-TipTap APIs)
- Business-specific suggestion logic
- Specialized document types

### Performance Expectations

**With Native Chunking:**
- TipTap handles rate limiting internally
- Caching reduces redundant processing
- HTML structure preserved throughout
- Simplified error handling

### Key Learnings

1. **Trust the vendor's expertise** - TipTap knows their API best
2. **Native features first** - Always try built-in options before custom solutions
3. **Simplicity wins** - Complex custom logic often creates more problems
4. **Read the docs thoroughly** - TipTap has extensive chunking documentation we initially missed

### Next Steps & Research Priorities

1. ✅ **COMPLETED**: Console.log CPU load fix enabled 27K word processing
2. ✅ **COMPLETED**: Identified browser timeout as blocker for 85K+ docs
3. **NEXT**: Implement job queue pattern for 85K+ word documents
   - Leverage existing DOCX processing infrastructure
   - Bypass browser timeout entirely
   - See `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md`
4. **POTENTIAL**: Dynamic chunkSize adjustment based on document size
   - Small docs (< 10K words): `chunkSize: 3-5`
   - Medium docs (10K-27K): `chunkSize: 5-10`
   - Large docs (27K+): Route to job queue
5. **MONITOR**: Cache effectiveness with current `chunkSize: 5` in production

## Conclusion: Learning Journey & Current State

This document chronicles the evolution from rate limiting issues to browser timeout challenges, demonstrating how proper problem diagnosis leads to appropriate solutions.

### What We Learned

**Rate Limiting (Medium Docs)**:
- **Problem**: 429 errors on 27K word documents
- **Failed Approach**: Custom resolvers with manual chunking (fought against TipTap's architecture)
- **Success**: Console.log CPU fix + native TipTap features
- **Lesson**: Trust the framework, identify root causes (CPU contention, not API design)

**Browser Timeout (Large Docs)**:
- **Problem**: Chrome's 2-minute hard timeout on 85K+ word documents
- **Key Discovery**: This is a fundamentally different problem than rate limiting
- **Solution**: Job queue pattern (moves processing to edge functions, no browser constraints)
- **Lesson**: Early custom resolvers weren't wrong in concept, they targeted the wrong problem

### Current Production Recommendations

#### Medium Documents (< 27K words): ✅ Production Ready
```typescript
// Native TipTap configuration
AiSuggestion.configure({
  enableCache: true,
  chunkSize: 5,
})

// Polling with reduced log frequency
waitForAiSuggestions() {
  const pollInterval = setInterval(() => {
    // Log every 5s instead of 1s (CPU optimization)
  }, 5000);
}
```

**Status**: Fully operational, tested up to 27,782 words / 155K characters

#### Large Documents (85K+ words): 🔄 Implementation Pending

**Recommended: Job Queue Pattern**
- Reuses existing DOCX queue infrastructure
- Completely bypasses browser timeout
- Simpler client implementation (poll for status)
- Better error recovery and scalability

**Alternative: Custom apiResolver**
- Only if real-time progress feedback is critical
- Complex state management required
- Still subject to browser constraints

**Implementation Guide**: `/Users/andresterranova/manuscript-ballast/docs/02-technical/large-documents/timeout-guide.md`

### The Path Forward

1. ✅ **Solved**: Rate limiting for medium documents via CPU optimization
2. ✅ **Identified**: Browser timeout as the true blocker for large documents
3. 🔄 **Next**: Implement job queue pattern for 85K+ word documents
4. 📊 **Monitor**: Production performance with current configuration

**Key Insight**: The failed custom resolvers documented in this file were not failures in design - they were correctly identifying that TipTap's native approach had limitations. They failed because they targeted rate limiting (wrong diagnosis) instead of browser timeout (correct diagnosis). Now that we understand the real problem, a custom approach (job queue or apiResolver) makes sense for large documents, while native TipTap remains optimal for medium documents.

## Tags

#archived #learning #troubleshooting #rate_limiting #timeout #browser #tiptap #custom_resolver #CPU #console_log #performance #implementation #phase1 #AI #OpenAI #job_queue #edge_function