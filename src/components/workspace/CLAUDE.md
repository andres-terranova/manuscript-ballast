# Workspace Components Documentation

## Overview

This directory contains all components related to the manuscript editing workspace, including the main editors, suggestion management, and style checking interfaces.

## Component Hierarchy

```
ExperimentalEditor.tsx (Default Editor)
├── DocumentCanvas.tsx (TipTap wrapper)
├── ChangeList.tsx (Suggestion review panel)
│   └── ChangeCard.tsx (Individual suggestion)
├── ChecksList.tsx (Style check panel)
│   └── CheckCard.tsx (Individual check)
├── AIEditorRuleSelector.tsx (Rule configuration)
├── ProcessingStatus.tsx (Upload/processing status)
└── SuggestionPopover.tsx (Inline suggestion UI)

ManuscriptWorkspace.tsx (Legacy Editor - Deprecated)
├── DocumentViewer.tsx (Markdown display)
├── ChangeList.tsx (Shared component)
└── ChecksList.tsx (Shared component)
```

## Core Components

### ExperimentalEditor.tsx ⭐ (Main Editor)

**Purpose**: Default manuscript editor using TipTap Pro AI for real-time suggestions.

**Key Responsibilities**:
- Initialize TipTap editor with AI extension
- Manage JWT authentication for TipTap API
- Handle "Run AI Pass" workflow
- Coordinate between editor, suggestions, and checks
- Manage style rule configuration
- Handle auto-save

**State Management**:
```typescript
- manuscript: Manuscript | null           // Current document
- suggestions: UISuggestion[]            // AI suggestions
- checks: CheckItem[]                    // Style checks
- activeTab: "changes" | "checks"        // Right panel tab
- showSuggestions: boolean               // Toggle suggestion highlights
- showChecks: boolean                    // Toggle check highlights
- processingStatus: string | null        // AI processing state
```

**Key Hooks Used**:
- `useTiptapJWT()` - JWT token management (production-ready, auto-refreshing)
- `useManuscripts()` - Manuscript CRUD operations
- `useActiveStyleRules()` - Style rule configuration
- `useToast()` - User notifications

**Important Functions**:
```typescript
handleRunAI() {
  // Triggers TipTap AI suggestion generation
  // Handles large document detection
  // Shows processing status
  // Maps AI responses to UI format
}

handleAcceptSuggestion(suggestionId) {
  // Accepts a suggestion
  // Updates editor content
  // Removes suggestion from list
  // Triggers auto-save
}

handleRejectSuggestion(suggestionId) {
  // Rejects a suggestion
  // Removes from list
  // Preserves original text
}
```

**TipTap Configuration**:
```typescript
AiSuggestion.configure({
  appId: tiptapAppId,
  token: tiptapToken,         // Auto-refreshing JWT from useTiptapJWT
  enableCache: true,
  chunkSize: 10,              // 10 HTML nodes per chunk
  loadOnStart: false,         // Manual trigger only
  reloadOnUpdate: false,      // Don't auto-reload
})
```

**Loading State**:
- Editor shows "Initializing editor..." spinner while JWT loads
- Prevents race conditions by waiting for valid token before initialization
- Error state with retry button if JWT fetch fails

**File Location**: `src/components/workspace/ExperimentalEditor.tsx` (1397 lines)

**Dependencies**:
- TipTap editor hooks (`useTiptapEditor.ts`)
- Suggestion mapper (`lib/suggestionMapper.ts`)
- Style validator (`lib/styleValidator.ts`)
- JWT management (`hooks/useTiptapJWT.ts`)

---

### DocumentCanvas.tsx (TipTap Wrapper)

**Purpose**: Wraps TipTap editor with ProseMirror plugins for suggestions and checks.

**Key Responsibilities**:
- Render TipTap editor instance
- Apply suggestion decorations
- Apply check decorations
- Handle editor events (focus, blur, update)
- Manage editor ref for parent access

**Props**:
```typescript
interface DocumentCanvasProps {
  content: string;                    // Initial HTML content
  onUpdate: (html: string) => void;  // Content change callback
  editorRef?: React.MutableRefObject<Editor | null>;
  className?: string;
}
```

**Plugin Integration**:
```typescript
// Suggestions plugin (from lib/suggestionsPlugin.ts)
const suggestionsPlugin = createSuggestionsPlugin({
  suggestions,
  onSelect: handleSuggestionSelect,
  onAccept: handleSuggestionAccept,
  onReject: handleSuggestionReject,
});

// Checks plugin (from lib/checksPlugin.ts)
const checksPlugin = createChecksPlugin({
  checks,
  onSelect: handleCheckSelect,
  onResolve: handleCheckResolve,
});
```

**File Location**: `src/components/workspace/DocumentCanvas.tsx`

---

### ChangeList.tsx (Suggestion Review Panel)

**Purpose**: Displays list of AI suggestions for review and action.

**Key Responsibilities**:
- Render suggestions in organized list
- Group by suggestion type/category
- Provide accept/reject actions
- Show suggestion details (original, replacement, explanation)
- Handle bulk actions (accept all, reject all)
- Filter and search suggestions

**Props**:
```typescript
interface ChangeListProps {
  suggestions: UISuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (id: string) => void;    // Scroll to suggestion in editor
  busyIds?: Set<string>;               // Suggestions being processed
}
```

**UI Features**:
- Tabs by suggestion type (Grammar, Clarity, Tone, Style)
- Search/filter bar
- Bulk selection checkboxes
- Keyboard shortcuts (Enter = accept, Delete = reject)
- Empty state messaging

**File Location**: `src/components/workspace/ChangeList.tsx`

---

### ChangeCard.tsx (Individual Suggestion)

**Purpose**: Renders a single suggestion with before/after text and actions.

**Props**:
```typescript
interface ChangeCardProps {
  suggestion: UISuggestion;
  onAccept: () => void;
  onReject: () => void;
  onNavigate: () => void;
  isBusy?: boolean;
}
```

**UI Elements**:
- Suggestion ID badge
- Category/type indicator
- Original text (with strikethrough)
- Replacement text (highlighted)
- Explanation/reasoning
- Accept/Reject buttons
- Navigate to location button

**Styling**:
- Color-coded by type (grammar=red, clarity=blue, tone=green)
- Hover effects
- Loading state during processing
- Disabled state after action

**File Location**: `src/components/workspace/ChangeCard.tsx`

---

### ChecksList.tsx (Style Check Panel)

**Purpose**: Displays deterministic style rule violations.

**Key Responsibilities**:
- Render style check results
- Group by rule category
- Provide fix/ignore actions
- Show check details and suggestions

**Props**:
```typescript
interface ChecksListProps {
  checks: CheckItem[];
  onResolve: (id: string) => void;     // Mark as resolved
  onIgnore: (id: string) => void;      // Ignore this instance
  onNavigate: (id: string) => void;    // Scroll to check in editor
  busyIds?: Set<string>;
}
```

**Check Types**:
- Grammar violations
- Punctuation errors
- Spelling mistakes
- Style inconsistencies
- Formatting issues

**File Location**: `src/components/workspace/ChecksList.tsx`

---

### CheckCard.tsx (Individual Check)

**Purpose**: Renders a single style check result.

**Props**:
```typescript
interface CheckCardProps {
  check: CheckItem;
  onResolve: () => void;
  onIgnore: () => void;
  onNavigate: () => void;
  isBusy?: boolean;
}
```

**UI Elements**:
- Rule name badge
- Severity indicator (error, warning, info)
- Problematic text
- Suggested fix
- Rule explanation
- Resolve/Ignore buttons

**File Location**: `src/components/workspace/CheckCard.tsx`

---

### AIEditorRuleSelector.tsx (Rule Configuration)

**Purpose**: UI for selecting active AI editorial roles and rules.

**Key Responsibilities**:
- Display available AI editor roles
- Allow enabling/disabling specific roles
- Save configuration to local storage
- Show role descriptions and examples

**Props**:
```typescript
interface AIEditorRuleSelectorProps {
  manuscriptId: string;
  activeRules: StyleRuleKey[];
  onRulesChange: (rules: StyleRuleKey[]) => void;
}
```

**AI Editor Roles** (from `AIEditorRules.tsx`):
```typescript
1. Copy Editor - Grammar, spelling, punctuation
2. Line Editor - Sentence structure, clarity, flow
3. Style Editor - Tone, voice, consistency
4. Fact Checker - Verify claims, check sources (planned)
5. Manuscript Evaluator - Holistic analysis (planned)
6. Developmental Editor - Plot, structure, pacing (planned)
```

**UI Features**:
- Role cards with descriptions
- Toggle switches
- "Select All" / "Deselect All"
- Save/cancel buttons
- Visual indicators for active roles

**File Location**: `src/components/workspace/AIEditorRuleSelector.tsx`

---

### AIEditorRules.tsx (Rule Definitions)

**Purpose**: Defines AI editorial roles with prompts and configuration.

**Structure**:
```typescript
export interface AIEditorRule {
  id: string;
  title: string;
  description: string;
  prompt: string;              // AI instruction prompt
  category: SuggestionCategory;
  color: string;
  backgroundColor: string;
  enabled: boolean;            // Default enabled state
}

export const AI_EDITOR_RULES: AIEditorRule[] = [
  {
    id: 'copy-editor',
    title: 'Copy Editor',
    description: 'Fixes grammar, spelling, and punctuation errors',
    prompt: 'You are a professional copy editor...',
    category: 'grammar',
    color: '#dc143c',
    backgroundColor: '#ffe0e0',
    enabled: true,
  },
  // ... more roles
];
```

**File Location**: `src/components/workspace/AIEditorRules.tsx`

---

### ProcessingStatus.tsx (Upload Status)

**Purpose**: Shows DOCX processing status during upload.

**Props**:
```typescript
interface ProcessingStatusProps {
  manuscriptId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    step: string;              // e.g., "extracting_text"
    percentage: number;        // 0-100
  };
}
```

**UI States**:
- 📝 Uploaded (pending)
- ⏳ Queued (animated pulse)
- ⚡ Processing with step name (e.g., "extracting_text 50%")
- ✅ Ready (completed)
- ❌ Failed (with error message)

**File Location**: `src/components/workspace/ProcessingStatus.tsx`

---

### SuggestionPopover.tsx (Inline Suggestion UI)

**Purpose**: Shows popover when user clicks a suggested text in editor.

**Props**:
```typescript
interface SuggestionPopoverProps {
  suggestion: UISuggestion;
  anchorEl: HTMLElement;         // Position relative to this element
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}
```

**UI Features**:
- Positioned near clicked text
- Original → Replacement preview
- Explanation text
- Quick accept/reject buttons
- Keyboard shortcuts (a = accept, r = reject, Esc = close)

**File Location**: `src/components/workspace/SuggestionPopover.tsx`

---

### ManuscriptWorkspace.tsx (Legacy Editor - Deprecated)

**Purpose**: Original editor using Supabase edge functions for AI suggestions.

**Status**: 🟡 Maintenance mode, will be deprecated

**Differences from ExperimentalEditor**:
- Uses `suggest` edge function instead of TipTap Pro AI
- No JWT authentication required
- Plain text suggestion mapping (less accurate)
- No built-in chunking or caching
- Simpler implementation

**Migration Plan**:
- Keep for backwards compatibility
- Direct new users to ExperimentalEditor
- Migrate existing users gradually
- Deprecate once ExperimentalEditor stable

**File Location**: `src/components/workspace/ManuscriptWorkspace.tsx`

---

## Data Flow Patterns

### Suggestion Lifecycle

```
1. User clicks "Run AI Pass"
   ↓
2. ExperimentalEditor calls editor.chain().loadAiSuggestions().run()
   ↓
3. TipTap AI extension sends HTML to TipTap API (with JWT)
   ↓
4. TipTap API returns suggestions with ProseMirror positions
   ↓
5. suggestionMapper.ts converts to UISuggestion format
   ↓
6. ExperimentalEditor updates suggestions state
   ↓
7. DocumentCanvas applies suggestion decorations (underlines)
   ↓
8. ChangeList displays suggestions in panel
   ↓
9. User clicks Accept/Reject
   ↓
10. ExperimentalEditor calls editor commands
    ↓
11. Editor updates content, removes decoration
    ↓
12. Suggestion removed from list
    ↓
13. Auto-save triggers
```

### Check Lifecycle

```
1. User edits document
   ↓
2. ExperimentalEditor debounced onChange fires
   ↓
3. styleValidator.runDeterministicChecks(content, rules)
   ↓
4. Validator returns CheckItem[] with positions
   ↓
5. ExperimentalEditor updates checks state
   ↓
6. DocumentCanvas applies check decorations (highlights)
   ↓
7. ChecksList displays checks in panel
   ↓
8. User clicks Resolve/Ignore
   ↓
9. Check removed from list and decorations
```

## State Management Patterns

### Local Component State
- Editor content (managed by TipTap)
- UI state (tabs, modals, popovers)
- Temporary selections and interactions

### Context State
- Manuscript data (ManuscriptsContext)
- User authentication (AuthContext)

### Server State (TanStack Query)
- Manuscript list
- Processing queue status
- User profile

### Local Storage
- Active style rules per manuscript
- User preferences
- Draft content (auto-save backup)

## Performance Considerations

### Large Suggestion Lists
- **Problem**: 1000+ suggestions can slow rendering
- **Solution**: Decoration capping (max 200 visible)
- **Future**: Virtualized list, pagination

### Frequent Re-renders
- **Problem**: Editor onChange triggers on every keystroke
- **Solution**: Debounce check validation (500ms)
- **Optimization**: React.memo() for ChangeCard, CheckCard

### Memory Management
- **Problem**: Large documents consume browser memory
- **Solution**: TipTap chunking, lazy loading
- **Monitoring**: Check browser DevTools memory profiler

## Common Patterns & Best Practices

### Editor Command Pattern
```typescript
// ✅ Good: Chain commands
editor.chain()
  .focus()
  .setTextSelection({ from, to })
  .insertContent(replacement)
  .run();

// ❌ Bad: Separate commands
editor.commands.focus();
editor.commands.setTextSelection({ from, to });
editor.commands.insertContent(replacement);
```

### Suggestion Mapping
```typescript
// ✅ Good: Use ProseMirror positions
const uiSuggestion = {
  from: aiSuggestion.from,  // PM position
  to: aiSuggestion.to,      // PM position
  original: editor.state.doc.textBetween(from, to),
  replacement: aiSuggestion.replacement,
};

// ❌ Bad: Use character offsets
const offset = plainText.indexOf(original);
// Breaks with formatting, special characters
```

### State Updates
```typescript
// ✅ Good: Immutable updates
setSuggestions(prev => prev.filter(s => s.id !== id));

// ❌ Bad: Mutating state
suggestions.splice(index, 1);
setSuggestions(suggestions);
```

## Testing Checklist

### Manual Testing
- [ ] Upload small doc → suggestions appear
- [ ] Upload large doc → chunking works
- [ ] Accept suggestion → editor updates
- [ ] Reject suggestion → removed from list
- [ ] Toggle highlights → decorations hide/show
- [ ] Switch tabs → correct content displays
- [ ] Navigate from ChangeCard → scrolls to location

### Edge Cases
- [ ] Empty document → no suggestions
- [ ] Very large document (500K+ chars) → doesn't crash
- [ ] Network failure during AI call → error shown
- [ ] JWT expires during session → refresh works
- [ ] Overlapping suggestions → handles gracefully

## Related Documentation

- [Library Documentation](../../lib/CLAUDE.md) - Core utilities
- [TipTap JWT Guide](../../../docs/guides/TIPTAP_JWT_GUIDE.md) - Authentication
- [Feature Documentation](../../../docs/features/README.md) - Feature specs
- [Architecture Overview](../../../docs/architecture/README.md) - System design

---

**Last Updated**: September 30, 2025
