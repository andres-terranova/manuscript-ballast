# React-Based AI Suggestion Rendering Strategy

## ⚠️ Status Note (October 2025)

**Not Currently Needed**: The large document rate limiting issue was fixed by using `chunkSize: 2`.

**This Document's Purpose**: UI rendering optimization for 1000+ suggestions (different from rate limiting).

**When to Use This**: If you encounter browser performance issues when rendering many suggestions, not for API rate limiting.

**Status**: Available for future implementation if needed. Not deprecated, just not urgently needed.

---

## Executive Summary

This document outlines a high-performance React-based rendering system for handling 1000+ AI suggestions in the Manuscript Ballast editor, replacing the current ProseMirror decoration-based approach that causes performance degradation with 500+ suggestions.

## Current Architecture Problems

### Performance Bottlenecks
1. **ProseMirror Decorations**: Creating 500+ decorations causes browser rendering lag
2. **DOM Manipulation**: Each decoration creates DOM elements, overwhelming the browser
3. **Memory Usage**: All suggestions kept in memory simultaneously
4. **Re-render Cascades**: Any document edit triggers full decoration recalculation

### Current Implementation (suggestionsPlugin.ts)
```typescript
// Current: Creates DOM decorations for each suggestion
decos.push(Decoration.inline(from, to, {
  class: "suggest-replace",
  "data-suggestion-id": s.id,
  title: s.note
}));
```

## Proposed Solution: React Component Views

### Architecture Overview

```
┌─────────────────────────────────────────┐
│           TipTap Editor                  │
│  ┌─────────────────────────────────┐    │
│  │   Document Content (HTML)        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│      React Suggestion Layer              │
│  ┌─────────────────────────────────┐    │
│  │  Virtual Scrolling Container     │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │  Windowed Suggestion List  │  │    │
│  │  │  - Only renders visible    │  │    │
│  │  │  - React.memo components   │  │    │
│  │  │  - Intersection Observer   │  │    │
│  │  └───────────────────────────┘  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Implementation Components

## 1. Virtual Scrolling with TanStack Virtual

```typescript
// src/components/workspace/VirtualSuggestionList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef, useMemo, useCallback } from 'react';

interface VirtualSuggestionListProps {
  suggestions: UISuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (id: string) => void;
}

export const VirtualSuggestionList: React.FC<VirtualSuggestionListProps> = React.memo(({
  suggestions,
  onAccept,
  onReject,
  onNavigate
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration
  const rowVirtualizer = useVirtualizer({
    count: suggestions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 120, []), // Estimated height per suggestion
    overscan: 5, // Render 5 items outside viewport
    gap: 8,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }} // CSS containment for performance
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const suggestion = suggestions[virtualRow.index];
          return (
            <div
              key={suggestion.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SuggestionCard
                suggestion={suggestion}
                onAccept={() => onAccept(suggestion.id)}
                onReject={() => onReject(suggestion.id)}
                onNavigate={() => onNavigate(suggestion.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
```

## 2. React Node Views for In-Editor Suggestions

```typescript
// src/extensions/ReactSuggestionExtension.tsx
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React, { useState, useCallback, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

// React component for suggestion highlight
const SuggestionHighlight: React.FC<{
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
}> = React.memo(({ node, updateAttributes, deleteNode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const handleAccept = useCallback(() => {
    // Apply suggestion
    updateAttributes({ accepted: true });
    // Trigger editor command to replace text
    deleteNode();
  }, [updateAttributes, deleteNode]);

  const handleReject = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  return (
    <NodeViewWrapper
      className="suggestion-highlight"
      contentEditable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setShowPopover(!showPopover)}
    >
      <span
        className={`
          relative inline-block
          ${isHovered ? 'bg-yellow-100' : 'bg-yellow-50'}
          border-b-2 border-yellow-400
          transition-colors duration-150
        `}
      >
        {node.attrs.originalText}

        {showPopover && (
          <SuggestionPopover
            original={node.attrs.originalText}
            replacement={node.attrs.replacementText}
            explanation={node.attrs.explanation}
            onAccept={handleAccept}
            onReject={handleReject}
            onClose={() => setShowPopover(false)}
          />
        )}
      </span>
    </NodeViewWrapper>
  );
});

// TipTap extension
export const ReactSuggestionExtension = Node.create({
  name: 'reactSuggestion',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      originalText: { default: '' },
      replacementText: { default: '' },
      explanation: { default: '' },
      type: { default: 'grammar' },
      accepted: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'react-suggestion' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['react-suggestion', HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SuggestionHighlight);
  },
});
```

## 3. Optimized Suggestion Card with React.memo

```typescript
// src/components/workspace/SuggestionCard.tsx
import React, { useMemo } from 'react';
import { UISuggestion } from '@/lib/types';

interface SuggestionCardProps {
  suggestion: UISuggestion;
  onAccept: () => void;
  onReject: () => void;
  onNavigate: () => void;
}

export const SuggestionCard = React.memo<SuggestionCardProps>(({
  suggestion,
  onAccept,
  onReject,
  onNavigate
}) => {
  // Memoize expensive computations
  const diffView = useMemo(() => {
    return generateDiffView(suggestion.originalText, suggestion.suggestedText);
  }, [suggestion.originalText, suggestion.suggestedText]);

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className={`badge badge-${suggestion.type}`}>
          {suggestion.type}
        </span>
        <button onClick={onNavigate} className="text-blue-500 hover:text-blue-700">
          Navigate →
        </button>
      </div>

      <div className="diff-view mb-3">
        {diffView}
      </div>

      {suggestion.explanation && (
        <p className="text-sm text-gray-600 mb-3">{suggestion.explanation}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reject
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.suggestion.id === nextProps.suggestion.id &&
         prevProps.suggestion.originalText === nextProps.suggestion.originalText;
});
```

## 4. React 18 Concurrent Features

```typescript
// src/hooks/useSuggestionProcessor.ts
import { useState, useTransition, useDeferredValue, useCallback } from 'react';

export function useSuggestionProcessor() {
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [isPending, startTransition] = useTransition();

  // Defer non-critical updates
  const deferredSuggestions = useDeferredValue(suggestions);

  const processSuggestions = useCallback((newSuggestions: UISuggestion[]) => {
    // Use transition for non-blocking updates
    startTransition(() => {
      // Heavy processing in background
      const processed = newSuggestions.map(s => ({
        ...s,
        // Add any expensive computations here
        diffTokens: tokenizeDiff(s.originalText, s.suggestedText),
        similarity: calculateSimilarity(s.originalText, s.suggestedText),
      }));

      setSuggestions(processed);
    });
  }, []);

  return {
    suggestions: deferredSuggestions,
    isProcessing: isPending,
    processSuggestions,
  };
}
```

## 5. Intersection Observer for Lazy Rendering

```typescript
// src/components/workspace/LazyLoadedSuggestion.tsx
import React, { useRef, useEffect, useState } from 'react';

export const LazyLoadedSuggestion: React.FC<{
  suggestion: UISuggestion;
  onVisible?: () => void;
}> = ({ suggestion, onVisible }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <SuggestionCard suggestion={suggestion} />
      ) : (
        <div className="h-32 bg-gray-100 animate-pulse" />
      )}
    </div>
  );
};
```

## 6. Web Worker for Heavy Processing

```typescript
// src/workers/suggestionWorker.ts
self.addEventListener('message', (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'PROCESS_SUGGESTIONS':
      const processed = payload.map((s: any) => ({
        ...s,
        // Heavy computations off main thread
        levenshtein: calculateLevenshtein(s.original, s.replacement),
        contextAnalysis: analyzeContext(s),
      }));

      self.postMessage({
        type: 'SUGGESTIONS_PROCESSED',
        payload: processed,
      });
      break;
  }
});

// Hook to use worker
export function useSuggestionWorker() {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker('/workers/suggestionWorker.ts');
    return () => workerRef.current?.terminate();
  }, []);

  const processSuggestionsInWorker = useCallback((suggestions: any[]) => {
    return new Promise((resolve) => {
      if (!workerRef.current) return resolve(suggestions);

      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'SUGGESTIONS_PROCESSED') {
          resolve(e.data.payload);
        }
      };

      workerRef.current.postMessage({
        type: 'PROCESS_SUGGESTIONS',
        payload: suggestions,
      });
    });
  }, []);

  return { processSuggestionsInWorker };
}
```

## Performance Optimizations

### 1. CSS Containment
```css
.suggestion-container {
  contain: layout style paint;
  will-change: transform;
}

.virtual-list {
  contain: strict;
  overflow: hidden;
}
```

### 2. Request Idle Callback for Non-Critical Updates
```typescript
function scheduleIdleWork(callback: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 0);
  }
}
```

### 3. Batch DOM Updates
```typescript
import { unstable_batchedUpdates } from 'react-dom';

function batchSuggestionUpdates(updates: Array<() => void>) {
  unstable_batchedUpdates(() => {
    updates.forEach(update => update());
  });
}
```

## Migration Strategy

### Phase 1: Parallel Implementation (Week 1-2)
1. Implement virtual scrolling for ChangeList component
2. Keep existing decoration system as fallback
3. Add feature flag for new rendering

### Phase 2: React Node Views (Week 3-4)
1. Create ReactSuggestionExtension
2. Test with small documents (<100 suggestions)
3. Measure performance improvements

### Phase 3: Performance Tuning (Week 5)
1. Implement Web Worker processing
2. Add React 18 concurrent features
3. Optimize with React DevTools Profiler

### Phase 4: Rollout (Week 6)
1. A/B test with power users
2. Monitor performance metrics
3. Full rollout with fallback option

## Performance Targets

| Metric | Current (500+ suggestions) | Target |
|--------|---------------------------|--------|
| Initial Render | 2-3 seconds | <500ms |
| Scroll Performance | 15-20 FPS | 60 FPS |
| Memory Usage | 500MB+ | <200MB |
| Time to Interactive | 3-4 seconds | <1 second |
| Suggestion Accept/Reject | 200-300ms | <50ms |

## Monitoring & Metrics

```typescript
// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      analytics.track('suggestion_performance', {
        name: entry.name,
        duration: entry.duration,
        suggestionCount: suggestions.length,
      });
    }
  }
});

performanceObserver.observe({ entryTypes: ['measure'] });
```

## Browser Compatibility

- **Required**: Chrome 90+, Firefox 88+, Safari 14+
- **Features Used**:
  - Intersection Observer API
  - ResizeObserver API
  - CSS Containment
  - React 18 Concurrent Features
  - Web Workers

## Fallback Strategy

```typescript
// Graceful degradation for older browsers
const SupportsVirtualization =
  'IntersectionObserver' in window &&
  'ResizeObserver' in window &&
  CSS.supports('contain', 'strict');

export const SuggestionRenderer = SupportsVirtualization
  ? VirtualSuggestionList
  : StandardSuggestionList;
```

## Testing Strategy

### Unit Tests
- Virtual list rendering with different counts
- Suggestion card interactions
- React node view lifecycle

### Integration Tests
- Editor + suggestion layer interaction
- Accept/reject flow with document updates
- Performance regression tests

### Load Tests
- 100, 500, 1000, 5000 suggestions
- Scroll performance measurement
- Memory leak detection

## Conclusion

This React-based rendering strategy addresses the core performance issues by:

1. **Reducing DOM nodes**: Virtual scrolling renders only visible items
2. **Optimizing React renders**: Memoization and concurrent features
3. **Offloading work**: Web Workers for heavy processing
4. **Lazy loading**: Intersection Observer for on-demand rendering
5. **Better architecture**: Separation of concerns between editor and UI

Expected outcome: Handle 5000+ suggestions with smooth 60 FPS performance and sub-second interaction response times.

## References

- [TipTap React Node Views](https://tiptap.dev/docs/examples/advanced/interactive-react-and-vue-views)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [React 18 Concurrent Features](https://react.dev/blog/2022/03/29/react-v18#new-feature-concurrent-features)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)

---

## Tags

#react #performance #tiptap #prosemirror #component #architecture #typescript #editor #optimization #virtualization