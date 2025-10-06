# Virtualized AI Suggestion Rendering - Implementation Plan

## 📋 Quick Summary

**Problem**: Browser freezes for 3-5 minutes when rendering 5,000+ AI suggestions on large documents (85K words).

**Root Cause**: Synchronous position mapping (TipTap) + synchronous React rendering of 5,000+ DOM decorations.

**Solution**: Hybrid virtualization approach combining viewport-based decoration rendering with progressive suggestion loading.

---

## 🎯 Selected Approach: Hybrid Virtualization (Option D)

### Why This Approach?

After researching TanStack Virtual, ProseMirror decoration optimization, and viewport-based rendering patterns, the optimal solution combines:

1. **Viewport-Based Decorations** (Primary fix for freeze)
   - Only render decorations for suggestions visible in editor viewport
   - Use Intersection Observer API to track visible editor region
   - Update decorations on scroll (debounced)
   - **Impact**: Reduces 5,000 decorations → ~50-100 decorations

2. **Progressive Loading** (UX enhancement)
   - Load suggestions in batches of 500
   - Auto-load next batch when user scrolls ChangeList
   - **Impact**: Initial load <500ms instead of 3-5 min freeze

### Architecture Decisions

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| **Viewport-based decorations** | Solves root cause (too many DOM nodes) | React virtualization (doesn't solve ProseMirror decorations) |
| **Progressive loading (500/batch)** | Prevents initial position mapping freeze | Load all at once (current behavior - freezes) |
| **Keep ChangeList pagination** | Already works well (25 items/page) | Replace with TanStack Virtual (unnecessary complexity) |
| **Client-side only** | No backend changes needed | Queue system (doesn't solve rendering freeze) |

---

## 📁 Implementation Overview

### New Components

```
src/components/workspace/virtualization/
├── ViewportTracker.tsx           # Tracks editor viewport bounds using Intersection Observer
├── ProgressiveLoader.tsx         # Manages batch loading of suggestions (500 at a time)
└── useViewportSuggestions.ts     # Hook to filter suggestions by viewport bounds
```

### Modified Components

```
src/lib/suggestionsPlugin.ts      # Add viewport filtering to decoration rendering
src/components/workspace/Editor.tsx # Integrate progressive loading + viewport tracking
src/hooks/useTiptapEditor.ts       # Pass viewport bounds to extension
```

### Core Algorithm

```typescript
// Viewport-based decoration rendering
const visibleSuggestions = allSuggestions.filter(s =>
  s.pmFrom <= viewportBounds.toPos + overscan &&
  s.pmTo >= viewportBounds.fromPos - overscan
);

// Only render decorations for visible suggestions (50-100 instead of 5,000)
const decorations = visibleSuggestions.map(s => createDecoration(s));
```

---

## 📊 Expected Performance Improvements

### Before (Current State)
- **Initial Load**: 3-5 min freeze for 5,000 suggestions
- **Memory**: 1,575 MB for 5,005 suggestions
- **Scroll FPS**: 15-20 FPS (janky)
- **User Experience**: ❌ Unacceptable

### After (With Virtualization)
- **Initial Load**: <500ms for any number of suggestions
- **Memory**: <500 MB for 10,000 suggestions (67% reduction)
- **Scroll FPS**: 60 FPS (smooth)
- **User Experience**: ✅ Excellent

### Performance Targets
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Initial Render | 3-5 min | <500ms | **360-600x faster** |
| Memory Usage | 1,575 MB | <500 MB | **68% reduction** |
| Scroll FPS | 15-20 | 60 | **3-4x smoother** |
| Time to Interactive | 3-5 min | <1 sec | **180-300x faster** |

---

## 🛠️ Implementation Phases (10 Weeks)

### Phase 1: Foundation (Week 1-2)
**Goal**: Viewport tracking infrastructure
- Create ViewportTracker component with Intersection Observer
- Implement useViewportSuggestions hook
- Test viewport bounds accuracy

### Phase 2: Viewport Decorations (Week 3-4)
**Goal**: Eliminate freeze with viewport-based rendering
- Modify suggestionsPlugin.ts for viewport filtering
- Implement debounced scroll updates
- **Milestone**: 5,000 suggestions render without freeze

### Phase 3: Progressive Loading (Week 5-6)
**Goal**: Smooth initial load experience
- Implement batch loading (500 suggestions/batch)
- Add loading indicators
- Auto-load on ChangeList scroll

### Phase 4: Optimization (Week 7-8)
**Goal**: Achieve 60 FPS and <500 MB memory
- Add React.memo for suggestion cards
- Implement CSS containment
- Memory leak testing

### Phase 5: Testing & Rollout (Week 9-10)
**Goal**: Production-ready feature
- UAT testing (10 scenarios)
- Browser compatibility (4 browsers)
- Feature flag A/B test (10% rollout)

---

## 🔬 Research Findings

### Libraries Evaluated
1. **TanStack Virtual** ✅ Proven pattern, used for inspiration
2. **Intersection Observer API** ✅ Native browser API, excellent performance
3. **React 18 Concurrent Features** ✅ `useTransition`, `useDeferredValue` for smooth UX

### Patterns Researched
- **Virtual Scrolling**: Only render visible items in a list (TanStack Virtual pattern)
- **Viewport-Based Rendering**: ProseMirror decoration optimization (custom implementation)
- **Progressive Loading**: Batch loading with Intersection Observer triggers
- **CSS Containment**: `contain: strict` for rendering performance

### TipTap-Specific Insights
- TipTap decorations are synchronous (can't be async)
- ProseMirror position mapping is synchronous (can't avoid)
- **Solution**: Reduce number of decorations, not optimize single decoration rendering
- Viewport filtering is the only way to reduce decoration count

---

## 📝 Key Implementation Details

### 1. Viewport Tracking
```typescript
// Use Intersection Observer to detect visible editor region
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const viewportBounds = {
        fromPos: calculatePMPosition(entry.boundingClientRect.top),
        toPos: calculatePMPosition(entry.boundingClientRect.bottom),
      };
      onViewportChange(viewportBounds);
    }
  });
}, { threshold: 0.1, rootMargin: '200px' }); // 200px overscan
```

### 2. Progressive Loading
```typescript
// Load suggestions in batches
const loadNextBatch = () => {
  const start = currentBatch * 500;
  const end = start + 500;
  setLoadedSuggestions(prev => [
    ...prev,
    ...allSuggestions.slice(start, end)
  ]);
};

// Auto-load on scroll
useEffect(() => {
  if (scrollNearBottom && hasMore) {
    loadNextBatch();
  }
}, [scrollPosition]);
```

### 3. Viewport-Based Decorations
```typescript
// Filter suggestions to viewport
const visibleSuggestions = allSuggestions.filter(s =>
  s.pmFrom <= viewportBounds.toPos + overscan &&
  s.pmTo >= viewportBounds.fromPos - overscan
);

// Render only visible decorations (50-100 instead of 5,000)
return DecorationSet.create(tr.doc, visibleSuggestions.map(createDecoration));
```

---

## ✅ UAT Testing Strategy

### 10 Critical Test Scenarios
1. **Large Document Initial Load** - No freeze on 5,000 suggestions
2. **Viewport Decoration Rendering** - Only ~50-100 decorations in DOM
3. **Progressive Loading UX** - Smooth batch loading (500 at a time)
4. **Scroll Performance** - 60 FPS sustained
5. **Accept/Reject Flow** - Actions work with virtualization
6. **Memory Leak Detection** - No leaks after 100 scrolls
7. **Boundary Cases** - Suggestions at start/end of document
8. **Fallback Mode** - Graceful degradation on old browsers
9. **Dynamic Editing** - Position remapping with virtualization
10. **Stress Test** - 50,000 suggestions (extreme edge case)

### Performance Benchmarks
- Initial render: <500ms for 10,000 suggestions
- Memory: <500 MB for 10,000 suggestions
- Scroll FPS: >55 FPS
- Accept/Reject: <50ms

---

## 🚨 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Viewport calculation inaccurate | High | Use ProseMirror's native position-to-coords API |
| Decoration re-rendering causes jank | High | Debounce scroll events (100ms), use requestAnimationFrame |
| TipTap position mapping still freezes | Critical | Progressive loading limits initial batch to 500 |
| Memory leaks from decoration churn | Medium | Aggressive cleanup, WeakMap for refs |
| Breaking accept/reject flow | High | Extensive integration testing, feature flag |

---

## 📚 Documentation Structure

```
docs/product/features/virtualized-ai-suggestions/
├── README.md         # This file - implementation plan summary
├── SPEC.md           # Full technical specification (17.8 KB)
└── UAT.md            # User acceptance testing script (13.7 KB)
```

### Additional Resources
- **Research**: `/docs/ai-suggestions/suggestion-rendering.md` (existing virtualization exploration)
- **Current State**: `/docs/technical/large-documents.md` (Phase 1 results)
- **TipTap Integration**: `/docs/ai-suggestions/ai-suggestions-flow.md`

---

## 🚀 Next Steps

### For Product Manager
1. Review SPEC.md for feature scope and timeline
2. Review UAT.md for acceptance criteria
3. Approve 10-week timeline or adjust scope

### For Engineering Lead
1. Review technical approach in SPEC.md
2. Validate architecture decisions
3. Assign team members to phases

### For QA Team
1. Review UAT.md test scenarios
2. Prepare test manuscripts (1K, 30K, 85K, 100K words)
3. Set up performance testing environment

### For Developers (When Ready)
1. Start with Phase 1: ViewportTracker component
2. Follow implementation phases in SPEC.md
3. Use UAT.md for validation at each phase

---

## 🎯 Success Criteria

**Feature is successful if**:
- ✅ Zero browser freeze on 10,000 suggestions
- ✅ 60 FPS scroll performance
- ✅ <500 MB memory for 10,000 suggestions
- ✅ <500ms initial render time
- ✅ No regressions on existing features
- ✅ Passes all 10 UAT scenarios

**Ready for production when**:
- All UAT scenarios pass
- 4 browsers tested and compatible
- Performance benchmarks met
- Feature flag A/B test shows no regressions

---

**Created**: October 6, 2025
**Status**: Planning
**Estimated Effort**: 10 weeks
**Priority**: High (Performance Critical)

## Tags
#virtualization #performance #phase2 #implementation-plan
