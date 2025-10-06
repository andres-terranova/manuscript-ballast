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

### Research Findings

After reviewing TipTap Pro AI Suggestion extension documentation and codebase:

1. **Confirmed API**: `editor.commands.setAiSuggestions(suggestions)` exists and allows setting which suggestions to render
2. **Storage Access**: `editor.storage.aiSuggestion.getSuggestions()` retrieves all suggestions
3. **Current Implementation**: All suggestions load at once in Editor.tsx after processing completes
4. **Critical Discovery**: The freeze happens when TipTap's `defaultResolver` maps 5K+ HTML positions to ProseMirror positions

### Approach Evaluation

#### Option A: Virtualize ChangeList Only ❌
**Status**: Already implemented, insufficient
- ChangeList uses pagination (25 items/page) ✅
- **Problem**: Editor still renders ALL decorations
- **Verdict**: Partial solution, doesn't solve core freeze

#### Option B: Limit Editor Decorations to Viewport ✅ **RECOMMENDED**
**Status**: Feasible with TipTap's `setAiSuggestions()` command
- Use `setAiSuggestions(subset)` to render only viewport-visible suggestions
- Use Intersection Observer to track viewport bounds
- Update on scroll events (debounced)
- **Pros**: Uses native TipTap API, solves root cause, clean implementation
- **Cons**: Requires viewport position tracking

#### Option C: Progressive Loading (UI Layer) ⚠️
**Status**: Complementary to Option B
- Load suggestions in batches (500 at a time)
- Show "Load More" or auto-load on scroll
- **Pros**: Gradual UX, perceived performance
- **Cons**: Doesn't solve initial position mapping freeze

#### Option D: Hybrid (Viewport Rendering + Progressive Loading) ✅ **OPTIMAL**
**Status**: Combines best of B + C using TipTap APIs
- Progressive loading for initial suggestion set (500 suggestions)
- Viewport-based rendering using `setAiSuggestions()` for visible subset
- Auto-load more as user scrolls through ChangeList
- **Pros**: Best UX, uses native TipTap APIs, solves all freeze issues
- **Cons**: Most complex to implement

### Selected Approach: **Option D - Hybrid Virtualization with TipTap APIs**

### Data Model

**No database changes required** - all optimizations are client-side rendering.

### Component Architecture

```
src/components/workspace/
├── Editor.tsx                        # Modified: Add viewport filtering logic
├── ChangeList.tsx                    # Already virtualized (pagination)
└── virtualization/
    ├── ViewportTracker.tsx           # NEW: Tracks editor viewport bounds
    └── ProgressiveLoader.tsx         # NEW: Manages progressive suggestion loading

src/hooks/
└── useViewportAiSuggestions.ts       # NEW: Hook for viewport-based suggestion filtering

Note: DO NOT modify src/lib/suggestionsPlugin.ts - that's for MANUAL suggestions!
```

### Key Implementation Details

#### 1. Viewport Tracking (ViewportTracker.tsx)
```typescript
// Track visible portion of editor using Intersection Observer
export const ViewportTracker: React.FC<{
  editorRef: RefObject<HTMLElement>;
  onViewportChange: (bounds: { fromPos: number; toPos: number }) => void;
}> = ({ editorRef, onViewportChange }) => {
  // Use Intersection Observer or scroll events to detect visible editor region
  // Convert viewport pixels to ProseMirror positions
  // Emit viewport bounds (ProseMirror positions) on scroll (debounced)
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

#### 3. Viewport-Based Suggestion Filtering (useViewportAiSuggestions.ts)
```typescript
// Hook to filter AI suggestions to viewport-visible subset using TipTap's native API
export const useViewportAiSuggestions = (
  editor: TiptapEditor | null,
  allSuggestions: UISuggestion[]
) => {
  const [viewportBounds, setViewportBounds] = useState<{ fromPos: number; toPos: number } | null>(null);
  const OVERSCAN = 1000; // Render suggestions 1000 positions above/below viewport

  useEffect(() => {
    if (!editor || !viewportBounds || allSuggestions.length === 0) return;

    // Filter AI suggestions to viewport bounds
    const visibleSubset = allSuggestions.filter(s =>
      s.pmFrom <= viewportBounds.toPos + OVERSCAN &&
      s.pmTo >= viewportBounds.fromPos - OVERSCAN
    );

    console.log(`Rendering ${visibleSubset.length} of ${allSuggestions.length} AI suggestions`);

    // Use TipTap's native command to set which suggestions to render
    // This prevents the freeze by limiting decorations to viewport-visible items
    editor.commands.setAiSuggestions(visibleSubset);
  }, [editor, viewportBounds, allSuggestions]);

  return { setViewportBounds };
};
```

**Key Difference**: This uses TipTap Pro AI Suggestion extension's `setAiSuggestions()` command, NOT the manual suggestionsPlugin.ts!

#### 4. Integration Flow

```
1. AI Pass Completes → 5,000 suggestions returned from TipTap
                    ↓
2. Store All Suggestions → const allSuggestions = editor.storage.aiSuggestion.getSuggestions()
                    ↓
3. Progressive Loader → Load first 500 suggestions to state
                    ↓
4. Viewport Tracker → Identifies visible editor region (e.g., positions 0-5000)
                    ↓
5. Viewport Filter → Filter to viewport subset (e.g., 50 suggestions)
                    ↓
6. setAiSuggestions() → editor.commands.setAiSuggestions(visibleSubset)
                    ↓
7. TipTap Renders → Creates decorations for only 50 suggestions (fast!)
                    ↓
8. User Scrolls Editor → Viewport updates → setAiSuggestions() with new subset
                    ↓
9. User Scrolls ChangeList → Auto-load next 500 batch to state
```

### API Design

No backend changes required. All optimizations are client-side.

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Research TipTap `setAiSuggestions()` API behavior (replace vs merge?) ✅
- [ ] Create `ViewportTracker` component with scroll events or Intersection Observer
- [ ] Implement `useViewportAiSuggestions` hook using `setAiSuggestions()`
- [ ] Add viewport bounds tracking to Editor.tsx
- [ ] Test viewport detection accuracy with various scroll positions
- [ ] **Deliverable**: Viewport bounds correctly identified and tracked

### Phase 2: Viewport-Based Rendering (Week 3-4)
- [ ] Integrate `useViewportAiSuggestions` hook into Editor.tsx
- [ ] Connect viewport bounds to `setAiSuggestions()` command
- [ ] Add debounced scroll handler for smooth updates
- [ ] Test with 5,000 suggestions - verify freeze eliminated
- [ ] Verify TipTap correctly updates decorations on `setAiSuggestions()` calls
- [ ] **Deliverable**: Only viewport-visible suggestions render in editor

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
  - `src/components/workspace/Editor.tsx` - Add viewport filtering and progressive loading
  - NO changes to `src/lib/suggestionsPlugin.ts` (manual suggestions system)
  - NO changes to `src/hooks/useTiptapEditor.ts` (extension config is fine)

- **New Files**:
  - `src/components/workspace/virtualization/ViewportTracker.tsx`
  - `src/components/workspace/virtualization/ProgressiveLoader.tsx`
  - `src/hooks/useViewportAiSuggestions.ts` (uses `setAiSuggestions()`)

### Blockers
- [ ] **None** - All dependencies available, no external blockers
- [ ] **Risk**: Must verify `setAiSuggestions()` behavior (does it replace or merge?)
- [ ] **Risk**: Viewport position calculation must be accurate across document sizes

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Viewport calculation inaccurate for complex layouts** | High | Medium | Use ProseMirror's native position-to-coords API; Add comprehensive tests with various scroll positions |
| **setAiSuggestions() causes re-render jank** | High | Medium | Debounce scroll events (100-200ms); Use `requestAnimationFrame` for smooth updates; Test with React DevTools |
| **setAiSuggestions() doesn't replace suggestions** | Critical | Low | Test API behavior first; If merge-only, clear suggestions before setting; Document actual behavior |
| **TipTap's position mapping still freezes** | Critical | Low | Progressive loading limits initial render (500); Viewport rendering prevents rendering all 5K at once |
| **Breaking existing accept/reject flow** | High | Low | setAiSuggestions() should preserve TipTap's native commands; Test thoroughly; Feature flag for gradual rollout |
| **Browser compatibility issues** | Medium | Low | Polyfill Intersection Observer for older browsers; Graceful degradation to full rendering |
| **Modifying wrong system (manual suggestions)** | Critical | Medium | Code review catches suggestionsPlugin.ts changes; Clear documentation; Use correct file paths |

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
- **AI Suggestions Quick Reference**: `/Users/andresterranova/manuscript-ballast/docs/ai-suggestions/ai-suggestions-quick-reference.md` ⭐
- **Current Implementation**: `/Users/andresterranova/manuscript-ballast/src/components/workspace/Editor.tsx`
- **Extension Config**: `/Users/andresterranova/manuscript-ballast/src/hooks/useTiptapEditor.ts`
- **Large Document Processing**: `/Users/andresterranova/manuscript-ballast/docs/technical/large-documents.md`

### TipTap Resources
- **AI Suggestion API Reference**: [https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference) ⭐
- **Configure When to Load**: [https://tiptap.dev/docs/content-ai/capabilities/suggestion/features/configure-when-to-load-suggestions](https://tiptap.dev/docs/content-ai/capabilities/suggestion/features/configure-when-to-load-suggestions)
- **Performance Guide**: [https://tiptap.dev/docs/guides/performance](https://tiptap.dev/docs/guides/performance)

---

## Research Findings & API Verification

### TipTap `setAiSuggestions()` Command

**Status**: ✅ Confirmed to exist via TipTap documentation

**Purpose**: Programmatically set which AI suggestions to display without calling the API

**Signature**: `editor.commands.setAiSuggestions(suggestions: Suggestion[])`

**Behavior** (requires testing):
- ⚠️ **Unknown**: Does it replace existing suggestions or merge?
- ⚠️ **Unknown**: Does it trigger position re-mapping?
- ⚠️ **Unknown**: Performance characteristics with frequent updates

**Use Cases** (per TipTap docs):
1. Display pre-prepared suggestion lists
2. Clear existing suggestions (`setAiSuggestions([])`)
3. Use alternative suggestion sources (our viewport filtering!)

**Testing Priority**: HIGH - Must verify before implementation

### Current Implementation Analysis

**File**: `src/components/workspace/Editor.tsx`

**How suggestions are retrieved**:
```typescript
const allSuggestions = editor.storage.aiSuggestion.getSuggestions()
```

**How suggestions are currently applied**:
```typescript
editor.commands.applyAiSuggestion({ suggestionId, replacementOptionId, format: 'plain-text' })
editor.commands.rejectAiSuggestion(suggestionId)
```

**Conversion to UI format**:
- Function: `convertAiSuggestionsToUI()`
- Sorts by position: `.sort((a, b) => a.pmFrom - b.pmFrom)`
- Already converts TipTap format → our UISuggestion format

### Implementation Strategy

**Phase 1 Prototype**:
```typescript
// In Editor.tsx, after AI pass completes
const allSuggestions = editor.storage.aiSuggestion.getSuggestions();

// Test setAiSuggestions with first 100 suggestions
const testSubset = allSuggestions.slice(0, 100);
editor.commands.setAiSuggestions(testSubset);

// Verify:
// 1. Only 100 suggestions render in editor
// 2. All 5K suggestions still available via storage.getSuggestions()
// 3. Accept/reject commands still work
```

**Phase 2 Integration**:
```typescript
// Add viewport tracking
const { setViewportBounds } = useViewportAiSuggestions(editor, allSuggestions);

// On scroll, update visible subset
const visibleSubset = allSuggestions.filter(s => isInViewport(s, viewportBounds));
editor.commands.setAiSuggestions(visibleSubset);
```

### Key Differences from Original Spec

| Original Spec | Corrected Spec |
|---------------|----------------|
| Modify `suggestionsPlugin.ts` | Use TipTap's `setAiSuggestions()` ✅ |
| Create custom decoration logic | Let TipTap handle decorations ✅ |
| Complex ProseMirror plugin | Simple React hook with TipTap command ✅ |
| Manual suggestions system | AI suggestions system (different!) ✅ |

---

**Last Updated**: January 2025 (Corrected to use TipTap Pro AI Suggestion APIs)

## Tags
#performance #virtualization #phase2 #react #tiptap #prosemirror #optimization #large-documents
