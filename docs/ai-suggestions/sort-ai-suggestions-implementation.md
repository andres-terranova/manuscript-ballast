# Sort AI Suggestions by Document Position - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing position-based sorting of AI suggestions in the changelist. Currently, AI suggestions from TipTap Pro may appear in the changelist in an arbitrary order. This feature will sort them by their position in the document (top to bottom).

**Difficulty**: Easy
**Files to modify**: 1
**Estimated time**: 10 minutes

---

## Background

### How AI Suggestions Work in Manuscript Ballast

1. **TipTap Pro AI Suggestion Extension** generates suggestions and stores them internally
2. **Editor.tsx** retrieves suggestions using `editor.extensionStorage.aiSuggestion.getSuggestions()`
3. **`convertAiSuggestionsToUI()`** function converts TipTap suggestions to our `UISuggestion` format
4. **ChangeList.tsx** displays the suggestions in the right sidebar

### The Problem

TipTap Pro's `getSuggestions()` returns suggestions in the order they were generated (which may be based on chunk processing order), not necessarily in document position order. This makes it difficult for users to review suggestions sequentially.

### The Solution

Add sorting to the `convertAiSuggestionsToUI()` function to ensure suggestions are always returned sorted by their position in the document (`pmFrom` → `pmTo`).

---

## Implementation Steps

### Step 1: Locate the Target Function

**File**: `src/components/workspace/Editor.tsx`
**Function**: `convertAiSuggestionsToUI`
**Line**: ~339-386

Open the file and find this function:

```typescript
const convertAiSuggestionsToUI = (editor: TiptapEditor): UISuggestion[] => {
  try {
    // ... code that retrieves and maps suggestions

    return aiSuggestions.map((suggestion: unknown, index: number) => {
      // ... mapping logic
      return {
        id: suggestion.id || `ai-suggestion-${index}`,
        type: ...,
        pmFrom: suggestion.deleteRange?.from || 0,
        pmTo: suggestion.deleteRange?.to || 0,
        // ... other properties
      };
    });
  } catch (error) {
    console.error('Error converting AI suggestions:', error);
    return [];
  }
};
```

### Step 2: Understand the Data Structure

Each `UISuggestion` has these key position properties:
- `pmFrom`: ProseMirror position where the suggestion starts
- `pmTo`: ProseMirror position where the suggestion ends

Lower numbers = earlier in the document.

**Example:**
```typescript
{
  id: "suggestion-1",
  pmFrom: 45,   // Starts at position 45
  pmTo: 52,     // Ends at position 52
  // ... other fields
}
```

### Step 3: Add Sorting Logic

**Location**: Line ~381 (at the end of the return statement in `convertAiSuggestionsToUI`)

**Current code:**
```typescript
return aiSuggestions.map((suggestion: unknown, index: number) => {
  // ... mapping logic
  return {
    id: suggestion.id || `ai-suggestion-${index}`,
    type: suggestion.replacementOptions && suggestion.replacementOptions.length > 0 ? 'replace' : 'delete' as SuggestionType,
    origin: 'server' as const,
    pmFrom: suggestion.deleteRange?.from || 0,
    pmTo: suggestion.deleteRange?.to || 0,
    before: suggestion.deleteText || '',
    after: suggestion.replacementOptions?.[0]?.addText || '',
    category: 'ai-suggestion' as SuggestionCategory,
    note: `${ruleTitle || 'AI'}: ${suggestion.replacementOptions?.[0]?.note || suggestion.note || 'Improvement suggestion'}`,
    actor: 'AI' as SuggestionActor,
    ruleId: ruleId,
    ruleTitle: ruleTitle
  };
});
```

**Updated code with sorting:**
```typescript
return aiSuggestions.map((suggestion: unknown, index: number) => {
  // ... mapping logic (same as above)
  return {
    id: suggestion.id || `ai-suggestion-${index}`,
    type: suggestion.replacementOptions && suggestion.replacementOptions.length > 0 ? 'replace' : 'delete' as SuggestionType,
    origin: 'server' as const,
    pmFrom: suggestion.deleteRange?.from || 0,
    pmTo: suggestion.deleteRange?.to || 0,
    before: suggestion.deleteText || '',
    after: suggestion.replacementOptions?.[0]?.addText || '',
    category: 'ai-suggestion' as SuggestionCategory,
    note: `${ruleTitle || 'AI'}: ${suggestion.replacementOptions?.[0]?.note || suggestion.note || 'Improvement suggestion'}`,
    actor: 'AI' as SuggestionActor,
    ruleId: ruleId,
    ruleTitle: ruleTitle
  };
}).sort((a, b) => {
  // Primary sort: by start position (pmFrom)
  if (a.pmFrom !== b.pmFrom) {
    return a.pmFrom - b.pmFrom;
  }
  // Secondary sort: by end position (pmTo) if start positions are equal
  return a.pmTo - b.pmTo;
});
```

### Step 4: Understand the Sort Logic

**Primary Sort** (`a.pmFrom - b.pmFrom`):
- Sorts suggestions by their starting position
- Earlier positions come first

**Secondary Sort** (`a.pmTo - b.pmTo`):
- If two suggestions start at the same position (rare but possible)
- Sorts by end position (shorter suggestions first)

**Example:**
```typescript
// Before sorting:
[
  { id: "s3", pmFrom: 150, pmTo: 160 },
  { id: "s1", pmFrom: 45, pmTo: 52 },
  { id: "s2", pmFrom: 100, pmTo: 110 },
]

// After sorting:
[
  { id: "s1", pmFrom: 45, pmTo: 52 },   // Earliest
  { id: "s2", pmFrom: 100, pmTo: 110 },
  { id: "s3", pmFrom: 150, pmTo: 160 }, // Latest
]
```

---

## Testing Steps

### Test Case 1: Generate AI Suggestions on a Multi-Paragraph Document

1. Open a manuscript with multiple paragraphs
2. Click "Run AI Pass" in the toolbar
3. Wait for suggestions to generate
4. Open the "Changes" tab in the right sidebar
5. **Expected**: Suggestions appear sorted from top to bottom of document
6. **Verify**: Click on each suggestion and confirm they highlight in document order

### Test Case 2: Verify No Regression with Empty Results

1. Open a document with no content or perfect content
2. Run AI Pass
3. **Expected**: No errors, empty changelist displays correctly

### Test Case 3: Multiple Rules/AI Editor Roles

1. Enable multiple AI editor rules (e.g., Copy Editor, Proofreader)
2. Run AI Pass
3. **Expected**: All suggestions from all rules appear sorted by position
4. **Verify**: Use role filter buttons, each filtered view should still be sorted

### Test Case 4: Large Documents

1. Open a large document (10K+ words)
2. Run AI Pass
3. **Expected**: Suggestions load and display in position order
4. **Note**: May take 10-20 minutes for processing on very large docs

---

## Code Reference

### Full Function After Modification

```typescript
// Convert AI suggestions to UISuggestion format for ChangeList
const convertAiSuggestionsToUI = (editor: TiptapEditor): UISuggestion[] => {
  try {
    // Use extensionStorage as documented in TipTap docs
    const aiStorage = editor.extensionStorage?.aiSuggestion;
    if (!aiStorage) {
      console.log('No AI suggestion extension storage found');
      return [];
    }

    // Use the getSuggestions function to get current suggestions
    const aiSuggestions = typeof aiStorage.getSuggestions === 'function'
      ? aiStorage.getSuggestions()
      : [];

    console.log(`📝 Converting ${aiSuggestions.length} AI suggestions to UI format`);

    return aiSuggestions.map((suggestion: unknown, index: number) => {
      // Extract rule information from the TipTap suggestion
      const ruleId = suggestion.rule?.id || suggestion.ruleId;
      const ruleTitle = suggestion.rule?.title || getRuleTitle(ruleId);

      console.log('Processing AI suggestion:', {
        id: suggestion.id,
        ruleId,
        ruleTitle,
        suggestion: suggestion
      });

      return {
        id: suggestion.id || `ai-suggestion-${index}`,
        type: suggestion.replacementOptions && suggestion.replacementOptions.length > 0 ? 'replace' : 'delete' as SuggestionType,
        origin: 'server' as const,
        pmFrom: suggestion.deleteRange?.from || 0,
        pmTo: suggestion.deleteRange?.to || 0,
        before: suggestion.deleteText || '',
        after: suggestion.replacementOptions?.[0]?.addText || '',
        category: 'ai-suggestion' as SuggestionCategory,
        note: `${ruleTitle || 'AI'}: ${suggestion.replacementOptions?.[0]?.note || suggestion.note || 'Improvement suggestion'}`,
        actor: 'AI' as SuggestionActor,
        ruleId: ruleId,
        ruleTitle: ruleTitle
      };
    }).sort((a, b) => {
      // Primary sort: by start position (pmFrom)
      if (a.pmFrom !== b.pmFrom) {
        return a.pmFrom - b.pmFrom;
      }
      // Secondary sort: by end position (pmTo) if start positions are equal
      return a.pmTo - b.pmTo;
    });
  } catch (error) {
    console.error('Error converting AI suggestions:', error);
    return [];
  }
};
```

---

## Why This Works

### 1. **Single Source of Truth**
The `convertAiSuggestionsToUI()` function is called every time we need to display AI suggestions:
- After AI Pass completes: `src/components/workspace/Editor.tsx:948`
- After applying all suggestions: `src/components/workspace/Editor.tsx:699`

By adding sorting here, all suggestions are always sorted regardless of how they're retrieved.

### 2. **No Side Effects**
JavaScript's `.sort()` returns a new sorted array (when chained with `.map()`), so we don't mutate TipTap's internal suggestion storage.

### 3. **Performance**
The sort operation is O(n log n), but:
- Typical suggestion counts: 50-500 suggestions
- Large documents: up to 5,000 suggestions
- Modern browsers handle this instantly (<1ms)

---

## Alternative Approaches Considered

### ❌ Sort in ChangeList Component
**Why not**: ChangeList already does filtering and pagination. Adding sorting there would complicate the component and wouldn't help other consumers of the suggestions data.

### ❌ Sort in TipTap Extension
**Why not**: We use TipTap Pro's AI Suggestion extension as-is. Modifying its internals would break upgrades and isn't necessary.

### ✅ Sort in convertAiSuggestionsToUI (Selected)
**Why**: Single location, clean separation of concerns, affects all display contexts.

---

## Related Files

- **`src/components/workspace/Editor.tsx`** - Main editor component, contains conversion function
- **`src/components/workspace/ChangeList.tsx`** - Displays suggestions (no changes needed)
- **`src/lib/types.ts`** - Type definitions for `UISuggestion`
- **`src/hooks/useTiptapEditor.ts`** - TipTap configuration

---

## Troubleshooting

### Suggestions Still Not Sorted?

1. **Check browser console** for errors in `convertAiSuggestionsToUI`
2. **Verify the change was saved** - check line ~381 in Editor.tsx
3. **Hard refresh the browser** - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
4. **Check dev server reloaded** - Should see "page reloaded" in terminal

### TypeScript Errors?

The function signature doesn't change, so there should be no type errors. If you see errors:
- Ensure the closing parenthesis of `.map()` is before `.sort()`
- Ensure `.sort()` comes before the final semicolon

### Suggestions Appear in Reverse Order?

You may have accidentally reversed the sort:
```typescript
// ❌ Wrong - shows suggestions backwards
.sort((a, b) => b.pmFrom - a.pmFrom)

// ✅ Correct - shows suggestions in document order
.sort((a, b) => a.pmFrom - b.pmFrom)
```

---

## Future Enhancements

### Option 1: User-Controlled Sort Order
Add a dropdown in ChangeList.tsx to allow users to choose sort order:
- By position (default)
- By rule/AI editor role
- By type (insert/delete/replace)
- By severity (if we add severity ratings)

### Option 2: Persist Sort Preference
Store user's preferred sort order in localStorage or user preferences.

---

**Last Updated**: January 2025
**Status**: Ready for implementation
**Complexity**: Low
**Breaking Changes**: None

## Tags
#feature #sorting #ai-suggestions #tiptap #changelist #ux #implementation-guide
