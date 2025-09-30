# Large Document Timeout Mitigation Guide

## Problem Statement

Documents over 50K words generating 500-1000+ suggestions fail with timeout errors at ~2 minutes.

**Tested Limits**:
- ✅ Successfully processed: 85,337 words / 488,451 characters
- ⚠️ Timeout threshold: ~500 suggestions
- 🔴 Failure point: ~2 minutes (120 seconds)

## Root Causes

1. **TipTap API Timeout** - Server processing takes too long for massive suggestion sets
2. **Browser Memory** - Rendering 1000+ decorations exhausts memory
3. **React Re-renders** - State updates with huge arrays cause performance degradation
4. **Network Payload** - Large response bodies may timeout or fail

## Immediate Solutions

### 1. Reduce Chunk Size (Quick Fix)

```typescript
// In src/components/workspace/ExperimentalEditor.tsx
// Line ~1068

// Current configuration (may timeout)
AiSuggestion.configure({
  appId: tiptapAppId,
  token: tiptapToken,
  chunkSize: 10,  // 10 HTML nodes per chunk
})

// For large documents (50K+ words)
AiSuggestion.configure({
  appId: tiptapAppId,
  token: tiptapToken,
  chunkSize: 5,   // Reduce to 5 nodes
  enableCache: true,
  loadOnStart: false,
})
```

### 2. Section-Based Processing (Recommended)

```typescript
// Process manuscript in sections to avoid timeout
const SECTION_SIZE = 20000; // words

async function processLargeDocument(content: string, wordCount: number) {
  if (wordCount < 50000) {
    // Process normally
    return await processFullDocument(content);
  }

  // Split into sections
  const sections = splitIntoSections(content, SECTION_SIZE);
  const allSuggestions: UISuggestion[] = [];

  for (let i = 0; i < sections.length; i++) {
    // Update UI with progress
    setProcessingStatus(`Processing section ${i + 1} of ${sections.length}...`);

    // Process section
    const sectionSuggestions = await processSectionWithDelay(sections[i], i);
    allSuggestions.push(...sectionSuggestions);

    // Delay between sections to avoid rate limiting
    if (i < sections.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return allSuggestions;
}

function splitIntoSections(content: string, maxWords: number): string[] {
  // Split at paragraph boundaries to maintain context
  const paragraphs = content.split(/\n\n+/);
  const sections: string[] = [];
  let currentSection = '';
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.split(/\s+/).length;

    if (currentWordCount + paragraphWords > maxWords && currentSection) {
      sections.push(currentSection);
      currentSection = paragraph;
      currentWordCount = paragraphWords;
    } else {
      currentSection += (currentSection ? '\n\n' : '') + paragraph;
      currentWordCount += paragraphWords;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
```

### 3. Suggestion Pagination (UI Performance)

```typescript
// In src/components/workspace/ChangeList.tsx
const SUGGESTIONS_PER_PAGE = 100;

export function ChangeList({ suggestions, ...props }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Only show first 100 by default
  const visibleSuggestions = showAll
    ? suggestions
    : suggestions.slice(0, SUGGESTIONS_PER_PAGE);

  if (suggestions.length > SUGGESTIONS_PER_PAGE && !showAll) {
    return (
      <>
        <div className="p-2 bg-yellow-50 border-b">
          <p className="text-sm">
            Showing {SUGGESTIONS_PER_PAGE} of {suggestions.length} suggestions
          </p>
          <Button
            size="sm"
            onClick={() => setShowAll(true)}
            className="mt-2"
          >
            Show All (May Impact Performance)
          </Button>
        </div>
        {/* Render visible suggestions */}
        {visibleSuggestions.map(suggestion => (
          <ChangeCard key={suggestion.id} suggestion={suggestion} {...props} />
        ))}
      </>
    );
  }

  // Normal rendering for small lists
  return suggestions.map(suggestion => (
    <ChangeCard key={suggestion.id} suggestion={suggestion} {...props} />
  ));
}
```

### 4. Virtual Scrolling (Long-term Solution)

```typescript
// Install: pnpm add react-window

import { FixedSizeList } from 'react-window';

export function VirtualizedChangeList({ suggestions, ...props }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ChangeCard
        suggestion={suggestions[index]}
        {...props}
      />
    </div>
  );

  return (
    <FixedSizeList
      height={600}        // Container height
      itemCount={suggestions.length}
      itemSize={120}      // Estimated height of each ChangeCard
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 5. Decoration Capping (Memory Management)

```typescript
// In src/lib/suggestionsPlugin.ts
const MAX_VISIBLE_DECORATIONS = 200;

export function createSuggestionsPlugin({ suggestions, ...options }) {
  return new Plugin({
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, set) {
        // Cap decorations to prevent memory issues
        const visibleSuggestions = suggestions.slice(0, MAX_VISIBLE_DECORATIONS);

        // Create decorations only for visible suggestions
        const decorations = visibleSuggestions.map(suggestion =>
          Decoration.inline(
            suggestion.from,
            suggestion.to,
            {
              class: 'suggestion',
              'data-suggestion-id': suggestion.id
            }
          )
        );

        return DecorationSet.create(tr.doc, decorations);
      }
    }
  });
}
```

## Implementation Priority

1. **Immediate** (Can deploy today):
   - Reduce chunkSize to 5 for documents > 50K words
   - Add suggestion count warning in UI

2. **Short-term** (This week):
   - Implement suggestion pagination (show 100 at a time)
   - Add decoration capping (max 200 visible)

3. **Medium-term** (Next sprint):
   - Section-based processing with progress indicator
   - Virtual scrolling for ChangeList

4. **Long-term** (Future):
   - Background processing with Web Workers
   - Streaming suggestions as they're generated
   - Server-side caching of suggestions

## Testing Checklist

- [ ] Test with 85K word document (current maximum)
- [ ] Verify timeout doesn't occur with chunkSize: 5
- [ ] Check memory usage stays under 2GB
- [ ] Confirm UI remains responsive with 500+ suggestions
- [ ] Test pagination controls work correctly
- [ ] Verify decorations cap at 200
- [ ] Check section processing maintains context

## Monitoring

Add these metrics to track timeout issues:

```typescript
// Log processing metrics
console.log('Document processing metrics:', {
  wordCount: manuscript.word_count,
  characterCount: manuscript.character_count,
  processingTime: Date.now() - startTime,
  suggestionsGenerated: suggestions.length,
  chunkSize: editor.extensionManager.extensions
    .find(ext => ext.name === 'aiSuggestion')?.options.chunkSize,
});

// Alert on potential timeout
if (suggestions.length > 400) {
  console.warn('Large suggestion count may cause timeout:', suggestions.length);
  toast({
    title: "Large Document Detected",
    description: "Processing may take longer than usual. Consider processing in sections.",
    variant: "warning",
  });
}
```

## User Communication

When detecting large documents, show clear messaging:

```typescript
// In ExperimentalEditor.tsx handleRunAI()
if (wordCount > 50000) {
  const proceed = confirm(
    `This document has ${wordCount.toLocaleString()} words and may take ` +
    `several minutes to process. For best results, consider:\n\n` +
    `1. Processing a smaller section first\n` +
    `2. Saving your work before proceeding\n` +
    `3. Keeping this tab active during processing\n\n` +
    `Continue with full document?`
  );

  if (!proceed) return;
}
```

## Related Files

- src/components/workspace/ExperimentalEditor.tsx:1068 - TipTap configuration
- src/lib/suggestionsPlugin.ts - Decoration management
- src/components/workspace/ChangeList.tsx - Suggestion UI
- src/hooks/useTiptapEditor.ts - Editor initialization

## Known Limitations

1. **Browser Limits**: Chrome tabs have ~4GB memory limit
2. **TipTap API**: May have undocumented suggestion count limits
3. **React State**: Large arrays can cause React to slow down
4. **Network**: Large payloads may fail on slow connections

## Emergency Fallback

If all else fails, provide manual chunking UI:

```typescript
// Allow users to select document sections
<div className="border-2 border-dashed p-4 mb-4">
  <h3>Process Document in Sections</h3>
  <p>For very large documents, process sections separately:</p>
  <Button onClick={() => processSection(0, 20000)}>
    Process First 20,000 Words
  </Button>
  <Button onClick={() => processSection(20000, 40000)}>
    Process Words 20,001-40,000
  </Button>
  {/* etc. */}
</div>
```

---

**Last Updated**: September 30, 2025
**Priority**: 🔴 CRITICAL - Production Issue
**Affects**: Documents > 50K words generating 500+ suggestions