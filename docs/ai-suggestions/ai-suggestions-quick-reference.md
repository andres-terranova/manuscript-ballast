# AI Suggestions Quick Reference

## 🚨 Critical Information for Developers

### The Right Location
✅ **CORRECT**: `src/components/workspace/Editor.tsx`
❌ **WRONG**: `src/components/workspace/ManuscriptWorkspace.tsx` (legacy, different system)

### The Extension
- **Name**: TipTap Pro AI Suggestion Extension
- **License**: Commercial (requires JWT authentication)
- **Docs**: [https://tiptap.dev/docs/content-ai/capabilities/suggestion](https://tiptap.dev/docs/content-ai/capabilities/suggestion)

---

## Common Misconceptions (MUST READ)

### ❌ Misconception #1: "I need to implement progressive loading"
**Reality**: TipTap loads ALL suggestions at once when processing completes
```typescript
// All suggestions are available immediately after processing
const suggestions = editor.storage.aiSuggestion.getSuggestions()
```

### ❌ Misconception #2: "I'll work with ManuscriptWorkspace.tsx"
**Reality**: That's a DIFFERENT system using ProseMirror decorations
- ManuscriptWorkspace = Manual suggestions with Supabase
- Editor.tsx = AI suggestions with TipTap Pro

### ❌ Misconception #3: "Suggestions load one by one"
**Reality**: Parallel batch processing, ALL results return together
- 5 chunks process simultaneously
- Results aggregate and return as a single array

### ❌ Misconception #4: "Need virtualization for loading"
**Reality**: Virtualization is only for RENDERING 5K+ items
- Loading = All at once (no virtualization needed)
- Rendering = Browser freezes at 5K+ (virtualization helps)

---

## Key Files & Functions

### Primary Implementation
**File**: `src/components/workspace/Editor.tsx`

#### Key Functions:
```typescript
// Convert TipTap suggestions to our UI format (sorted by position)
convertAiSuggestionsToUI(editor: TiptapEditor): UISuggestion[]

// Monitor for completion (uses extensionStorage)
waitForAiSuggestions(editor: TiptapEditor): Promise<UISuggestion[]>

// Handle popover interactions
handlePopoverAccept(suggestionId: string, replacementOptionId: string)
handlePopoverReject(suggestionId: string)
```

### Extension Configuration
**File**: `src/hooks/useTiptapEditor.ts:85-236`

#### Custom apiResolver:
```typescript
// Processes chunks in parallel batches
apiResolver: async ({ html, htmlChunks, rules }) => {
  const BATCH_SIZE = 5; // Process 5 chunks at once
  // ... sends to edge function
  // ... aggregates results
  // Returns ALL suggestions together
}
```

### Edge Function
**File**: `supabase/functions/ai-suggestions-html/`
- Processes ONE chunk at a time
- Returns suggestions for that chunk
- Client aggregates all chunks

---

## How It Actually Works

### 1. Triggering
```typescript
// User clicks "Run AI Pass"
editor.chain().loadAiSuggestions().run()
```

### 2. Chunking
- TipTap chunks document (~10 nodes per chunk)
- Chunks sent to custom apiResolver

### 3. Processing
- apiResolver sends chunks to edge function
- Parallel batches of 5 chunks
- Edge function uses OpenAI GPT-4

### 4. Loading
```typescript
// Monitor completion
const storage = editor.extensionStorage.aiSuggestion
// Check storage.isLoading === false
```

### 5. Retrieval
```typescript
// Get ALL suggestions at once
const suggestions = storage.getSuggestions()
// Returns array of TipTap suggestion objects
```

### 6. Display
- `convertAiSuggestionsToUI()` transforms format
- Sorts by `pmFrom` position
- Displays in ChangeList and editor

---

## TipTap Storage API

### Get Suggestions
```typescript
editor.storage.aiSuggestion.getSuggestions() // All suggestions
editor.storage.aiSuggestion.getSelectedSuggestion() // Current selection
editor.storage.aiSuggestion.getRejections() // Rejected suggestions
```

### Commands
```typescript
editor.commands.loadAiSuggestions() // Trigger processing
editor.commands.applyAiSuggestion(id, replacementId) // Accept
editor.commands.rejectAiSuggestion(id) // Reject
editor.commands.applyAllAiSuggestions() // Accept all
```

### Events
```typescript
// Via extension config
onPopoverElementCreate: (element) => {} // Popover DOM element
onSelectedSuggestionChange: (suggestion) => {} // Selection change
onProgressUpdate: (progress) => {} // Processing progress
```

---

## Performance Characteristics

### Processing Time
- **Small** (<10K words): ~2 min, 200-500 suggestions
- **Medium** (10-30K words): ~5-10 min, 1,000-2,000 suggestions
- **Large** (30-85K words): ~15-20 min, 3,000-5,000 suggestions

### Known Issues
- **5K+ suggestions**: Browser freezes during position mapping
- **Memory**: Large docs use ~1.5GB
- **Solution**: Phase 2 will add progressive rendering

---

## Essential Documentation

### TipTap Official
- [AI Suggestion Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms)
- [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)
- [Configuration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/configure)

### Internal
- [AI Suggestions Flow](./ai-suggestions-flow.md) - Complete architecture
- [Editor Component](../technical/editor-component.md) - Editor implementation
- [Large Documents](../technical/large-documents.md) - Performance testing

---

## Debugging Tips

### Check Extension Storage
```javascript
// In browser console
const editor = window.editor // If exposed
console.log(editor.extensionStorage.aiSuggestion)
console.log(editor.storage.aiSuggestion.getSuggestions())
```

### Monitor Processing
```javascript
// Check loading state
editor.extensionStorage.aiSuggestion.isLoading
editor.extensionStorage.aiSuggestion.error
```

### Verify JWT
```javascript
// Check auth config
editor.extensionManager.extensions
  .find(e => e.name === 'aiSuggestion')
  .options
```

---

## Common Tasks

### Add New AI Editor Role
1. Edit `src/components/workspace/AIEditorRules.tsx`
2. Add to `AI_EDITOR_RULES` array
3. Include prompt, color, title

### Sort Suggestions by Position
Already implemented in `convertAiSuggestionsToUI()`:
```typescript
.sort((a, b) => a.pmFrom - b.pmFrom)
```

### Handle Large Documents
- Reduce `chunkSize` in `useTiptapEditor.ts`
- Currently set to 10 (was 20, caused timeouts)
- Smaller chunks = more API calls but better reliability

---

**Last Updated**: January 2025

## Tags
#ai-suggestions #tiptap #quick-reference #developer-guide #implementation