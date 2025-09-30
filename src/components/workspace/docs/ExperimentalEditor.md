# ExperimentalEditor Component

**File**: src/components/workspace/ExperimentalEditor.tsx
**Lines**: 1397
**Status**: ⭐ Production (Default Editor)

## Overview

Main manuscript editor using TipTap Pro AI for real-time suggestions. Handles document editing, AI suggestion generation, style checking, and auto-save.

## Key Responsibilities

1. Initialize TipTap editor with AI extension
2. Manage JWT authentication for TipTap API
3. Handle "Run AI Pass" workflow
4. Coordinate between editor, suggestions, and checks
5. Manage style rule configuration
6. Handle auto-save

## Component Props

```typescript
interface ExperimentalEditorProps {
  manuscript: Manuscript;
  onUpdate?: (manuscript: Manuscript) => void;
  className?: string;
}
```

## State Management

```typescript
// Core state
const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
const [checks, setChecks] = useState<CheckItem[]>([]);
const [activeTab, setActiveTab] = useState<'changes' | 'checks'>('changes');

// UI state
const [showSuggestions, setShowSuggestions] = useState(true);
const [showChecks, setShowChecks] = useState(true);
const [processingStatus, setProcessingStatus] = useState<string | null>(null);

// Editor state
const [isSaving, setIsSaving] = useState(false);
const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
```

## Critical Functions

### handleRunAI() - Line ~890
Triggers AI suggestion generation with timeout protection.

```typescript
const handleRunAI = async () => {
  // Check for large document
  if (manuscript.word_count > 50000) {
    // Warning for timeout risk
  }

  // Execute AI pass
  editor.chain().loadAiSuggestions({
    actor: activeAIRules.join(','),
    language: 'en'
  }).run();

  // Map responses to UI format
  const uiSuggestions = responses.map(mapServerSuggestionToUI);
  setSuggestions(uiSuggestions);
};
```

### TipTap Configuration - Line ~1068

**⚠️ CRITICAL FOR TIMEOUT ISSUE**

```typescript
AiSuggestion.configure({
  appId: tiptapAppId,
  token: tiptapToken,
  enableCache: true,
  chunkSize: 10,          // Reduce to 5 for large docs!
  loadOnStart: false,
  reloadOnUpdate: false,
  onResponse: (response) => {
    // Process suggestions
  },
  onError: (error) => {
    // Handle timeout/auth errors
  }
})
```

### handleAcceptSuggestion() - Line ~1150
Accepts a suggestion and updates editor content.

```typescript
const handleAcceptSuggestion = (suggestionId: string) => {
  const suggestion = suggestions.find(s => s.id === suggestionId);

  editor.chain()
    .focus()
    .setTextSelection({ from: suggestion.from, to: suggestion.to })
    .insertContent(suggestion.suggestedText)
    .run();

  // Remove from state
  setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

  // Trigger auto-save
  debouncedSave();
};
```

## Hooks Used

```typescript
// JWT management
const { token: tiptapToken, loading: tokenLoading } = useTiptapJWT();

// Manuscript operations
const { updateManuscript } = useManuscripts();

// Style rules
const { activeRules } = useActiveStyleRules(manuscript.id);

// Editor instance
const editor = useTiptapEditor({
  content: manuscript.content_html,
  onUpdate: handleContentChange,
  extensions: [/* ... */]
});
```

## Auto-save Logic

```typescript
// Debounced save (500ms after last change)
const debouncedSave = useMemo(
  () => debounce(async (content: string) => {
    setIsSaving(true);
    await updateManuscript(manuscript.id, {
      content_html: content,
      updated_at: new Date().toISOString()
    });
    setIsSaving(false);
    setLastSavedAt(new Date());
  }, 500),
  [manuscript.id]
);
```

## Error Handling

```typescript
// JWT authentication errors
if (error.message.includes('401')) {
  toast({
    title: "Authentication Error",
    description: "TipTap JWT expired. Check docs/guides/TIPTAP_JWT_GUIDE.md",
    variant: "destructive",
  });
}

// Timeout errors
if (error.message.includes('timeout')) {
  toast({
    title: "Processing Timeout",
    description: "Document too large. Try reducing chunk size.",
    variant: "destructive",
  });
}
```

## Performance Optimizations

1. **Memoized callbacks** - Prevent unnecessary re-renders
2. **Debounced save** - Reduce API calls
3. **Lazy loading** - AI extension loads on demand
4. **Decoration capping** - Max 200 visible suggestions

## Component Structure

```tsx
return (
  <div className="flex h-screen">
    {/* Left: Editor */}
    <div className="flex-1">
      <DocumentCanvas
        editor={editor}
        suggestions={showSuggestions ? suggestions : []}
        checks={showChecks ? checks : []}
      />
    </div>

    {/* Right: Panels */}
    <div className="w-96">
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="changes">Changes ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="checks">Checks ({checks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="changes">
          <ChangeList
            suggestions={suggestions}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
          />
        </TabsContent>

        <TabsContent value="checks">
          <ChecksList
            checks={checks}
            onResolve={handleResolveCheck}
          />
        </TabsContent>
      </Tabs>
    </div>
  </div>
);
```

## Known Issues

1. **JWT Token Rejection** - Server-generated tokens fail (401)
   - Using temporary dashboard token
   - See: docs/guides/TIPTAP_JWT_GUIDE.md

2. **Large Document Timeout** - 500+ suggestions timeout at ~2 min
   - Reduce chunkSize to 5
   - See: docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md

3. **Memory Usage** - 1000+ decorations can exhaust browser memory
   - Cap decorations at 200
   - Implement pagination

## Testing Scenarios

```typescript
// Test timeout mitigation
describe('Large document handling', () => {
  it('should process 85K word document without timeout', async () => {
    // Set chunkSize to 5
    // Run AI pass
    // Verify completion within 2 minutes
  });

  it('should paginate 500+ suggestions', () => {
    // Generate 500 suggestions
    // Verify only 100 visible initially
    // Test "Show All" button
  });
});
```

## Related Files

- hooks/useTiptapEditor.ts - Editor initialization
- lib/suggestionMapper.ts - AI response mapping
- lib/suggestionsPlugin.ts - Decoration rendering
- components/workspace/DocumentCanvas.tsx - Editor wrapper

---

**Critical Lines**:
- Line 1068: TipTap configuration (adjust chunkSize here!)
- Line 890: handleRunAI function
- Line 1150: handleAcceptSuggestion
- Line 421: JWT token usage