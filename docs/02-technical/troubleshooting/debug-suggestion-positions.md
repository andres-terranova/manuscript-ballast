# Debug Suggestion Position Issues

**When to use**: Suggestions appear in wrong places or decorations drift after edits

## Position Sources in Current Architecture

Manuscript Ballast uses **three position sources**, all working with ProseMirror positions (not character offsets):

### 1. TipTap AI Suggestions (Run AI Pass)
- **Pre-calculated** by TipTap Pro extension (`api.tiptap.dev`)
- Returns suggestions with ProseMirror positions already computed
- Conversion: `convertAiSuggestionsToUI()` in ExperimentalEditor.tsx:292-339
- **No mapping needed** - positions are ready to use

### 2. Style Checks (Run Checks)
- **Computed natively** during ProseMirror document traversal
- `runDeterministicChecks()` walks the document structure directly
- Positions extracted during node iteration
- **No mapping needed** - already in ProseMirror format

### 3. Manual Suggestions
- Created from editor selection state
- Uses `editor.state.selection.from` and `.to`
- **Already in ProseMirror format** from selection API

## Common Symptoms

- Suggestions underline wrong text
- Popover shows incorrect original text
- Accept/reject affects wrong position
- Decorations drift after document edits

## Browser Console Debugging

Quick diagnostic commands to run in browser console:

```javascript
// 1. Get editor instance
const editor = document.querySelector('.ProseMirror').__editor;

// 2. Check document structure
console.log('Doc structure:', editor.state.doc.toJSON());
console.log('Doc size:', editor.state.doc.content.size);

// 3. Test a suggestion position
const sugg = suggestions[0];  // First suggestion
const actualText = editor.state.doc.textBetween(sugg.from, sugg.to);
console.log('Expected:', sugg.originalText);
console.log('Actual:', actualText);
console.log('Match:', actualText === sugg.originalText);

// 4. Create helper function
function getTextAtPosition(from, to) {
  return editor.state.doc.textBetween(from, to);
}
```

## Common Issues to Check

### Issue 1: Character Offset vs ProseMirror Position

```javascript
// ❌ WRONG - Character offset (never use this)
const wrongPos = plainText.indexOf('search text');

// ✅ CORRECT - ProseMirror position
const correctPos = editor.state.doc.resolve(pmPosition).pos;

// Verify positions are valid ProseMirror positions
console.log('Position check:', {
  from: sugg.from,
  to: sugg.to,
  isValid: sugg.from <= editor.state.doc.content.size
});
```

### Issue 2: HTML vs Plain Text Length Mismatch

```javascript
// Check content formats to identify issues
console.log('Content formats:', {
  html: editor.getHTML(),
  text: editor.getText(),
  json: editor.getJSON()
});

// Compare lengths
const htmlLength = editor.getHTML().length;
const textLength = editor.getText().length;
console.log('Lengths:', { html: htmlLength, text: textLength });

// Note: ProseMirror positions work with text content, not HTML
```

### Issue 3: Position Drift After Edits

When users edit the document, old positions may no longer be accurate. TipTap handles this internally, but if you see drift:

```javascript
// Check if editor is properly mapping positions through transactions
editor.on('update', ({ editor, transaction }) => {
  console.log('Transaction mapping:', {
    steps: transaction.steps.length,
    mapping: transaction.mapping
  });
});
```

## Verification Process

Run this to verify all suggestion positions are accurate:

```javascript
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

  return results;
}

// Run verification
const results = verifyPositions();

// Find problematic suggestions
const invalid = results.filter(r => !r.valid);
console.log('Invalid suggestions:', invalid);
```

## Still Not Working?

Position issues are rare in the current architecture since all three sources provide ProseMirror positions natively. If you still encounter issues:

1. **Verify TipTap AI response format**
   ```javascript
   // Check raw response from TipTap extension
   const aiStorage = editor.extensionStorage?.aiSuggestion;
   console.log('AI suggestions:', aiStorage?.getSuggestions());
   ```

2. **Check editor state consistency**
   ```javascript
   console.log('Editor state:', {
     docSize: editor.state.doc.content.size,
     nodeCount: editor.state.doc.nodeSize,
     textPreview: editor.state.doc.textContent.slice(0, 100)
   });
   ```

3. **Use `/prosemirror` agent**

   For deep position debugging and expert ProseMirror assistance:
   ```
   /prosemirror I'm seeing position issues with [describe problem]
   ```

## Prevention Tips

- Always use ProseMirror positions, never character offsets
- Test with formatted documents (bold, italic, etc.) - not just plain text
- Validate positions before creating decorations
- Remember: Current architecture handles position calculation automatically

---

**Related Documentation**:
- `/Users/andresterranova/manuscript-ballast/.claude/agents/prosemirror.md` - ProseMirror position specialist
- `/Users/andresterranova/manuscript-ballast/docs/03-components/editors/manuscript-editor.md` - ExperimentalEditor details
- `/Users/andresterranova/manuscript-ballast/src/lib/styleValidator.ts` - Style check position computation
