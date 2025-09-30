# Quick Start: Debug Position Mapping Issues

**Time**: 5 minutes
**Difficulty**: Medium
**When to use**: Suggestions appear in wrong places

## Symptoms

- ❌ Suggestions underline wrong text
- ❌ Popover shows incorrect original text
- ❌ Accept/reject affects wrong position
- ❌ Decorations drift after edits

## Step 1: Enable Debug Logging (30 sec)

**File**: `src/lib/suggestionMapper.ts`

```typescript
// Add at top of mapServerSuggestionToUI function
console.log('Mapping suggestion:', {
  id: serverSugg.id,
  from: serverSugg.from,
  to: serverSugg.to,
  original: serverSugg.original,
  replacement: serverSugg.replacement
});
```

## Step 2: Use Diagnostic Tools (1 min)

**File**: Browser console

```javascript
// Get current editor instance
const editor = document.querySelector('.ProseMirror').__editor;

// Check document structure
console.log('Doc structure:', editor.state.doc.toJSON());

// Get text at position
function getTextAtPosition(from, to) {
  return editor.state.doc.textBetween(from, to);
}

// Test a suggestion position
const sugg = suggestions[0];  // First suggestion
const actualText = getTextAtPosition(sugg.from, sugg.to);
console.log('Expected:', sugg.originalText);
console.log('Actual:', actualText);
console.log('Match:', actualText === sugg.originalText);
```

## Step 3: Run Position Diagnostics (1 min)

**File**: `src/lib/mappingDiagnostics.ts`

```typescript
import { diagnoseSuggestionMapping } from '@/lib/mappingDiagnostics';

// In ExperimentalEditor.tsx, after receiving suggestions
suggestions.forEach(sugg => {
  const diagnostic = diagnoseSuggestionMapping(
    sugg,
    editor.state.doc.toString()
  );

  if (!diagnostic.isValid) {
    console.warn('Position mismatch:', {
      suggestion: sugg.id,
      expected: diagnostic.expectedText,
      actual: diagnostic.actualText,
      drift: diagnostic.positionDrift
    });
  }
});
```

## Step 4: Check for Common Issues (2 min)

### Issue 1: Character Offset vs ProseMirror Position

```javascript
// ❌ WRONG - Character offset
const wrongPos = plainText.indexOf('search text');

// ✅ CORRECT - ProseMirror position
const correctPos = editor.state.doc.resolve(pmPosition).pos;

// Verify positions are ProseMirror positions
console.log('Position check:', {
  from: sugg.from,
  to: sugg.to,
  isPMPosition: sugg.from <= editor.state.doc.content.size
});
```

### Issue 2: Document Mutations

```javascript
// Track position changes after edits
const originalPos = { from: 100, to: 110 };
editor.on('update', ({ editor, transaction }) => {
  const mappedPos = {
    from: transaction.mapping.map(originalPos.from),
    to: transaction.mapping.map(originalPos.to)
  };
  console.log('Position mapped:', originalPos, '→', mappedPos);
});
```

### Issue 3: HTML vs Plain Text

```javascript
// Check content format
console.log('Content formats:', {
  html: editor.getHTML(),
  text: editor.getText(),
  json: editor.getJSON()
});

// Ensure using correct format
const htmlLength = editor.getHTML().length;
const textLength = editor.getText().length;
console.log('Lengths:', { html: htmlLength, text: textLength });
```

## Step 5: Quick Fixes (30 sec)

### Fix 1: Recalculate All Positions

```javascript
// In ExperimentalEditor.tsx
const recalculateSuggestions = () => {
  const recalculated = suggestions.map(sugg => {
    const searchText = sugg.originalText;
    const content = editor.state.doc.textContent;
    const index = content.indexOf(searchText);

    if (index !== -1) {
      return {
        ...sugg,
        from: index,
        to: index + searchText.length
      };
    }
    return sugg;
  });

  setSuggestions(recalculated);
};
```

### Fix 2: Clear and Regenerate

```javascript
// Nuclear option - regenerate all suggestions
const resetSuggestions = () => {
  setSuggestions([]);
  setTimeout(() => {
    handleRunAI();  // Regenerate
  }, 100);
};
```

## Verification Checklist

```javascript
// Run this to verify fix worked
function verifyPositions() {
  const results = suggestions.map(sugg => {
    const actual = editor.state.doc.textBetween(sugg.from, sugg.to);
    return {
      id: sugg.id,
      valid: actual === sugg.originalText,
      expected: sugg.originalText.slice(0, 20),
      actual: actual.slice(0, 20)
    };
  });

  const validCount = results.filter(r => r.valid).length;
  console.table(results);
  console.log(`Valid: ${validCount}/${results.length}`);
}

verifyPositions();
```

## Still Not Working?

1. **Check TipTap response format**
   ```javascript
   // In AiSuggestion onResponse callback
   console.log('Raw TipTap response:', response);
   ```

2. **Verify editor state consistency**
   ```javascript
   console.log('Editor state:', {
     docSize: editor.state.doc.content.size,
     nodeCount: editor.state.doc.nodeSize,
     textContent: editor.state.doc.textContent.slice(0, 100)
   });
   ```

3. **Use `/prosemirror` agent for deep debugging**

## Prevention Tips

- Always use ProseMirror positions
- Map positions after document changes
- Test with documents containing formatting
- Add position validation before rendering

---

**Need help?** Use `/prosemirror` agent for position expertise