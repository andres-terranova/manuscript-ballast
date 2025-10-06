# Feature: Virtualized AI Suggestion Rendering

## Overview

- **Goal**: Eliminate browser freeze when rendering 5,000+ AI suggestions by implementing viewport-based virtualized rendering
- **Status**: Planning
- **Owner**: Engineering Team
- **Target Release**: Phase 2 (Post v1.0)
- **Priority**: High (Performance Critical)

## Problem Statement

### Current Issue
When the AI Pass generates 5,000+ suggestions (e.g., 85K word documents), the browser freezes for multiple minutes during the rendering phase, creating a poor user experience despite the feature being functionally correct.

### Root Cause Analysis
The freeze occurs AFTER our processing completes successfully:
1. **TipTap's Position Mapping** (~30-40% of freeze): `defaultResolver` synchronously maps 5,000+ HTML positions → ProseMirror positions
2. **React Rendering** (~60-70% of freeze): React synchronously renders 5,000+ decoration components in the DOM

**Key Insight**: The queue system does NOT solve this problem. The freeze happens during client-side rendering, not during AI processing.

### Current Performance Metrics
| Document Size | Suggestions | Freeze Duration | Memory Usage | User Impact |
|--------------|-------------|-----------------|--------------|-------------|
| Small (1K words) | 265 | None | 50 MB | ✅ Excellent |
| Medium (28K words) | 2,326 | ~10-15s | 172 MB | ⚠️ Noticeable |
| Large (85K words) | 5,005 | **3-5 minutes** | 1,575 MB | ❌ Unacceptable |

## Requirements

### Functional Requirements

1. **Must Have**:
   - [ ] Render only viewport-visible suggestions in the editor (decorations)
   - [ ] Virtualize ChangeList to show 25-50 items per viewport
   - [ ] Maintain suggestion position accuracy (99.9%+)
   - [ ] Support accept/reject actions without re-rendering all suggestions
   - [ ] Preserve existing popover functionality for AI suggestions
   - [ ] Handle dynamic document changes (position remapping)

2. **Should Have**:
   - [ ] Progressive loading (load 500 suggestions at a time)
   - [ ] Smooth scrolling experience with 60 FPS
   - [ ] Visual loading indicators during progressive load
   - [ ] Keyboard navigation for viewport-visible suggestions

3. **Nice to Have**:
   - [ ] Suggestion preview/thumbnail for off-screen items
   - [ ] Virtual scrollbar with suggestion density heatmap
   - [ ] Configurable virtualization settings (batch size, viewport overscan)

### Non-Functional Requirements

- **Performance**:
  - Initial render: <500ms for any number of suggestions
  - Scroll performance: 60 FPS sustained
  - Memory usage: <500 MB for 10K suggestions
  - Accept/Reject action: <50ms

- **Scale**:
  - Support up to 10,000 suggestions without performance degradation
  - Viewport should handle rapid scrolling without flicker

- **Compatibility**:
  - Chrome 90+, Firefox 88+, Safari 14+
  - Preserve existing functionality for <1,000 suggestion documents

- **Accessibility**:
  - Keyboard navigation for visible suggestions
  - Screen reader support for suggestion context

## Architecture

### Approach Evaluation

#### Option A: Virtualize ChangeList Only ❌
**Status**: Already implemented, insufficient
- ChangeList uses pagination (25 items/page) ✅
- **Problem**: Editor still renders ALL decorations
- **Verdict**: Partial solution, doesn't solve core freeze

#### Option B: Limit Editor Decorations to Viewport ✅ **RECOMMENDED**
**Status**: Feasible with ProseMirror plugin modification
- Only render decorations for suggestions visible in viewport
- Use Intersection Observer to track viewport bounds
- Update decorations on scroll events (debounced)
- **Pros**: Solves root cause, minimal React changes
- **Cons**: Complex position tracking, needs careful testing

#### Option C: Progressive Loading (UI Layer) ⚠️
**Status**: Complementary to Option B
- Load suggestions in batches (500 at a time)
- Show "Load More" or auto-load on scroll
- **Pros**: Gradual UX, perceived performance
- **Cons**: Doesn't solve initial position mapping freeze

#### Option D: Hybrid (Viewport Decorations + Progressive Loading) ✅ **OPTIMAL**
**Status**: Combines best of B + C
- Progressive loading for initial suggestion set (500 suggestions)
- Viewport-based decorations for rendered suggestions
- Auto-load more as user scrolls through ChangeList
- **Pros**: Best UX, solves all freeze issues
- **Cons**: Most complex to implement

### Selected Approach: **Option D - Hybrid Virtualization**

### Data Model

**No database changes required** - all optimizations are client-side rendering.

### Component Architecture

```
src/components/workspace/
├── Editor.tsx                        # Modified: Progressive loading logic
├── ChangeList.tsx                    # Already virtualized (pagination)
└── virtualization/
    ├── ViewportTracker.tsx           # NEW: Tracks editor viewport bounds
    ├── ProgressiveLoader.tsx         # NEW: Manages progressive suggestion loading
    └── useViewportSuggestions.ts     # NEW: Hook for viewport-visible suggestions

src/lib/
├── suggestionsPlugin.ts              # Modified: Viewport-aware decoration rendering
├── viewportDecorations.ts            # NEW: Viewport-based decoration logic
└── suggestionBatcher.ts              # NEW: Progressive loading batches
```

### Key Implementation Details

#### 1. Viewport Tracking (ViewportTracker.tsx)
```typescript
// Track visible portion of editor using Intersection Observer
export const ViewportTracker: React.FC<{
  editorRef: RefObject<HTMLElement>;
  onViewportChange: (bounds: { top: number; bottom: number }) => void;
}> = ({ editorRef, onViewportChange }) => {
  // Use Intersection Observer to detect visible editor region
  // Emit viewport bounds (ProseMirror positions) on scroll
};
```

#### 2. Progressive Loader (ProgressiveLoader.tsx)
```typescript
// Load suggestions in batches
export const useProgressiveSuggestions = (
  allSuggestions: UISuggestion[],
  batchSize: number = 500
) => {
  const [loadedSuggestions, setLoadedSuggestions] = useState<UISuggestion[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);

  // Load next batch on demand
  const loadNextBatch = () => {
    const start = currentBatch * batchSize;
    const end = start + batchSize;
    setLoadedSuggestions(prev => [
      ...prev,
      ...allSuggestions.slice(start, end)
    ]);
    setCurrentBatch(prev => prev + 1);
  };

  return { loadedSuggestions, loadNextBatch, hasMore: currentBatch * batchSize < allSuggestions.length };
};
```

#### 3. Viewport-Aware Decorations (Modified suggestionsPlugin.ts)
```typescript
// Only render decorations for viewport-visible suggestions
export const SuggestionsExtension = Extension.create({
  addOptions() {
    return {
      getUISuggestions: () => [] as UISuggestion[],
      viewportBounds: null as { fromPos: number; toPos: number } | null,
      overscan: 200, // Render 200px above/below viewport for smooth scrolling
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          apply(tr, pluginState, _oldState, newState) {
            // ... existing logic ...

            // Filter suggestions to viewport bounds
            const allSuggestions = getUISuggestions();
            const { viewportBounds, overscan } = this.options;

            const visibleSuggestions = viewportBounds
              ? allSuggestions.filter(s =>
                  s.pmFrom <= viewportBounds.toPos + overscan &&
                  s.pmTo >= viewportBounds.fromPos - overscan
                )
              : allSuggestions.slice(0, 200); // Fallback: first 200

            // Render decorations only for visible suggestions
            const decos = visibleSuggestions.map(s => /* create decoration */);

            return {
              decorations: DecorationSet.create(tr.doc, decos),
              positions: visibleSuggestions.map(/* position tracking */)
            };
          }
        }
      })
    ];
  }
});
```

#### 4. Integration Flow

```
1. AI Pass Completes → 5,000 suggestions returned
                    ↓
2. Progressive Loader → Load first 500 suggestions
                    ↓
3. Viewport Tracker → Identifies visible editor region (e.g., positions 0-5000)
                    ↓
4. Viewport Filter → Shows only suggestions in viewport (e.g., 50 suggestions)
                    ↓
5. Plugin Renders → Creates decorations for 50 suggestions (fast!)
                    ↓
6. User Scrolls → Viewport updates → Re-render new visible suggestions
                    ↓
7. User Scrolls ChangeList → Auto-load next 500 batch
```

### API Design

No backend changes required. All optimizations are client-side.

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `ViewportTracker` component with Intersection Observer
- [ ] Implement `useViewportSuggestions` hook for position filtering
- [ ] Add viewport bounds tracking to Editor.tsx
- [ ] Test viewport detection accuracy with various scroll positions
- [ ] **Deliverable**: Viewport bounds correctly identified and tracked

### Phase 2: Viewport-Based Decorations (Week 3-4)
- [ ] Modify `suggestionsPlugin.ts` to accept viewport bounds
- [ ] Implement decoration filtering based on viewport
- [ ] Add debounced scroll handler for decoration updates
- [ ] Test with 5,000 suggestions - verify freeze eliminated
- [ ] **Deliverable**: Decorations only render for viewport-visible suggestions

### Phase 3: Progressive Loading (Week 5-6)
- [ ] Create `ProgressiveLoader` component/hook
- [ ] Implement batch loading (500 suggestions per batch)
- [ ] Add loading indicators and "Load More" UI
- [ ] Connect to ChangeList scroll events for auto-loading
- [ ] Test with 10,000 suggestion dataset
- [ ] **Deliverable**: Suggestions load progressively as user scrolls

### Phase 4: Performance Optimization (Week 7-8)
- [ ] Implement React.memo for suggestion cards
- [ ] Use requestIdleCallback for non-critical updates
- [ ] Add CSS containment for performance
- [ ] Optimize viewport calculation (use IntersectionObserver v2)
- [ ] Memory leak testing and profiling
- [ ] **Deliverable**: 60 FPS scrolling, <500 MB memory for 10K suggestions

### Phase 5: Testing & Rollout (Week 9-10)
- [ ] Unit tests for viewport calculations
- [ ] Integration tests for progressive loading
- [ ] Performance regression tests (100, 1K, 5K, 10K suggestions)
- [ ] Browser compatibility testing
- [ ] Feature flag rollout (A/B test with 10% users)
- [ ] **Deliverable**: Production-ready virtualization system

## Dependencies

### Technical Dependencies
- **Existing Libraries** (already installed):
  - `@tanstack/react-virtual` - Already researched, proven pattern
  - React 18 - `useTransition`, `useDeferredValue` for concurrent features

- **Browser APIs**:
  - Intersection Observer API (Chrome 51+, Firefox 55+, Safari 12.1+) ✅
  - ResizeObserver API (Chrome 64+, Firefox 69+, Safari 13.1+) ✅
  - CSS Containment (`contain: strict`) ✅

### Code Dependencies
- **Modified Files**:
  - `src/components/workspace/Editor.tsx` - Add progressive loading logic
  - `src/lib/suggestionsPlugin.ts` - Add viewport filtering
  - `src/hooks/useTiptapEditor.ts` - Pass viewport bounds to extension

- **New Files**:
  - `src/components/workspace/virtualization/ViewportTracker.tsx`
  - `src/components/workspace/virtualization/ProgressiveLoader.tsx`
  - `src/hooks/useViewportSuggestions.ts`
  - `src/lib/viewportDecorations.ts`

### Blockers
- [ ] **None** - All dependencies available, no external blockers
- [ ] **Risk**: Must maintain TipTap AI Suggestion extension compatibility

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Viewport calculation inaccurate for complex layouts** | High | Medium | Use ProseMirror's native position-to-coords API; Add comprehensive tests with various scroll positions |
| **Decoration re-rendering causes new jank** | High | Medium | Debounce scroll events (100ms); Use `requestAnimationFrame` for smooth updates; Profile with React DevTools |
| **TipTap's position mapping still freezes** | Critical | Low | Progressive loading limits initial suggestions (500); Consider Web Worker for position mapping if needed |
| **Memory leaks from decoration churn** | Medium | Medium | Aggressive cleanup on scroll; Use WeakMap for decoration refs; Memory profiling with Chrome DevTools |
| **Breaking existing accept/reject flow** | High | Low | Maintain existing suggestion data structure; Extensive integration testing; Feature flag for gradual rollout |
| **Browser compatibility issues** | Medium | Low | Polyfill Intersection Observer for older browsers; Graceful degradation to full rendering |

## Success Metrics

### Performance Targets
- [ ] **Initial Render**: <500ms for 10,000 suggestions (currently 3-5 min for 5,000)
- [ ] **Scroll Performance**: 60 FPS sustained (currently 15-20 FPS)
- [ ] **Memory Usage**: <500 MB for 10,000 suggestions (currently 1,575 MB for 5,005)
- [ ] **Time to Interactive**: <1 second (currently 3-5 minutes)
- [ ] **Accept/Reject Action**: <50ms (currently 200-300ms)

### User Experience Metrics
- [ ] **Perceived Load Time**: <2 seconds to show first suggestions
- [ ] **Scroll Smoothness**: No visible jank or stutter
- [ ] **Action Responsiveness**: Immediate visual feedback on accept/reject

### Scale Targets
- [ ] Support 10,000 suggestions without freeze
- [ ] Support 100,000-word documents (estimated 12K suggestions)
- [ ] <3% error rate on viewport position calculations

## Testing Strategy

### Unit Tests
- [ ] Viewport bounds calculation with various scroll positions
- [ ] Progressive loading batch logic (edge cases: 0, 1, 500, 5000 suggestions)
- [ ] Decoration filtering accuracy (suggestions in/out of viewport)
- [ ] Position remapping on document edits

### Integration Tests
- [ ] Editor + viewport tracker interaction
- [ ] ChangeList pagination + progressive loading
- [ ] Accept/reject flow with virtualized decorations
- [ ] Scroll behavior with progressive batch loading

### Performance Tests
- [ ] **Load Test**: 100, 1,000, 5,000, 10,000 suggestion datasets
- [ ] **Memory Test**: Check for memory leaks after 100 scroll events
- [ ] **FPS Test**: Measure frame rate during rapid scrolling
- [ ] **Stress Test**: 50,000 suggestions (beyond normal use case)

### Browser Compatibility
- [ ] Chrome 90+ (primary target)
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge (Chromium)

## Open Questions

- [ ] **Q**: Should we use TanStack Virtual for ChangeList or keep current pagination?
  - **A**: Keep pagination for now - it's working. TanStack Virtual is optional enhancement.

- [ ] **Q**: What's the optimal batch size for progressive loading?
  - **A**: Start with 500, tune based on performance testing. Consider adaptive batching.

- [ ] **Q**: Should viewport overscan be configurable by users?
  - **A**: No - keep as internal constant (200px). Adjust if performance issues arise.

- [ ] **Q**: How to handle suggestions spanning viewport boundary?
  - **A**: Include suggestion if ANY part overlaps viewport (from <= viewportEnd && to >= viewportStart).

- [ ] **Q**: Should we virtualize checksPlugin.ts as well?
  - **A**: Yes, if checks exhibit same freeze issue. Use same pattern (viewport-based decorations).

## Monitoring & Observability

### Performance Metrics
```typescript
// Track viewport rendering performance
window.requestIdleCallback(() => {
  const metrics = {
    totalSuggestions: allSuggestions.length,
    visibleSuggestions: viewportSuggestions.length,
    renderTime: performance.now() - renderStart,
    memoryUsage: performance.memory?.usedJSHeapSize,
    fps: calculateFPS(),
  };

  analytics.track('virtualization_performance', metrics);
});
```

### Error Tracking
- Monitor viewport calculation failures
- Track progressive loading errors
- Alert on FPS drops below 30

## Fallback Strategy

### Graceful Degradation
```typescript
// Feature detection for virtualization support
const supportsVirtualization =
  'IntersectionObserver' in window &&
  'ResizeObserver' in window &&
  CSS.supports('contain', 'strict');

// Use viewport virtualization if supported, else cap at 200 suggestions
const decorationStrategy = supportsVirtualization
  ? ViewportBasedDecorations
  : CappedDecorations;
```

### Feature Flag
```typescript
// Progressive rollout with feature flag
const useVirtualization =
  featureFlags.virtualizedSuggestions &&
  suggestions.length > 1000;
```

## Related Documentation

### Research References
- **TanStack Virtual**: [https://tanstack.com/virtual/latest](https://tanstack.com/virtual/latest) - Virtual scrolling library
- **Intersection Observer API**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- **React Performance**: [https://react.dev/learn/render-and-commit](https://react.dev/learn/render-and-commit)
- **CSS Containment**: [web.dev article](https://web.dev/articles/content-visibility)

### Internal Documentation
- **Current Implementation**: `/Users/andresterranova/manuscript-ballast/docs/ai-suggestions/suggestion-rendering.md`
- **Large Document Processing**: `/Users/andresterranova/manuscript-ballast/docs/technical/large-documents.md`
- **AI Suggestions Flow**: `/Users/andresterranova/manuscript-ballast/docs/ai-suggestions/ai-suggestions-flow.md`

### TipTap Resources
- **Performance Guide**: [https://tiptap.dev/docs/guides/performance](https://tiptap.dev/docs/guides/performance)
- **Decorations API**: ProseMirror [https://prosemirror.net/docs/ref/#view.Decorations](https://prosemirror.net/docs/ref/#view.Decorations)

---

**Last Updated**: October 6, 2025

## Tags
#performance #virtualization #phase2 #react #tiptap #prosemirror #optimization #large-documents
