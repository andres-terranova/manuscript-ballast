# Workspace Components Documentation

## Overview

This directory contains all components related to the manuscript editing workspace, including the main editors, suggestion management, and style checking interfaces.

## Component Hierarchy

```
Editor.tsx (Default Editor)
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

### Editor.tsx ⭐ (Main Editor)

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
  chunkSize: 5,              // 5 HTML nodes per chunk
  loadOnStart: false,         // Manual trigger only
  reloadOnUpdate: false,      // Don't auto-reload
})
```

**Loading State**:
- Editor shows "Initializing editor..." spinner while JWT loads
- Prevents race conditions by waiting for valid token before initialization
- Error state with retry button if JWT fetch fails

**File Location**: `src/components/workspace/Editor.tsx` (1397 lines)

**Dependencies**:
- TipTap editor hooks (`useTiptapEditor.ts`)
- **TipTap Pro AI Suggestion extension** - Handles AI suggestion generation, API communication, chunking, and caching
  - Returns suggestions with ProseMirror positions already calculated
  - Conversion to `UISuggestion` format happens inline via `convertAiSuggestionsToUI()` (Editor.tsx:292-339)
  - **Note**: `lib/suggestionMapper.ts` is NOT used for TipTap AI suggestions - it's only for the legacy ManuscriptWorkspace that uses Supabase edge functions
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
- Tabs by suggestion type - Based on **configurable TipTap AI Suggestion Rules** ([TipTap docs](https://tiptap.dev/docs/content-ai/capabilities/suggestion/features/define-rules))
  - These rules act as our "AI Editor Roles" and are dynamically configured
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
- Roles are **dynamically configurable** via TipTap AI Suggestion Rules
- Each role maps to a specific rule configuration with custom prompts and categories
- See `AIEditorRules.tsx` for current active role definitions
- **Note**: Roles can be added/modified without updating this documentation

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
- Direct new users to Editor
- Migrate existing users gradually
- Fully deprecated in favor of Editor

**File Location**: `src/components/workspace/ManuscriptWorkspace.tsx`

---

## Data Flow Patterns

```
1. User clicks "Run AI Pass"
   ↓
2. Editor calls editor.chain().loadAiSuggestions().run()
   ↓
3. TipTap AI extension sends HTML to TipTap API (with JWT)
   ↓
4. TipTap API returns suggestions with ProseMirror positions already calculated
   ↓
5. Conversion to `UISuggestion` format happens inline via `convertAiSuggestionsToUI()`
   ↓
6. Editor updates suggestions state
   ↓
7. DocumentCanvas applies suggestion decorations (underlines)
   ↓
8. ChangeList displays suggestions in panel
   ↓
9. User clicks Accept/Reject
   ↓
10. Editor calls editor commands
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
2. Editor debounced onChange fires
   ↓
3. styleValidator.runDeterministicChecks(content, rules)
   ↓
4. Validator returns CheckItem[] with positions
   ↓
5. Editor updates checks state
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

## Position Mapping Architecture

**CRITICAL**: Understanding how different features handle text positions is essential for debugging and extending the editor.

### Overview: Three Different Strategies

The application uses **three completely independent approaches** for position mapping, depending on the feature:

1. **TipTap AI Suggestions** - Positions pre-calculated by TipTap Pro
2. **Style Checks** - Positions computed during PM document traversal
3. **Manual Suggestions** - Positions from editor selection state

**IMPORTANT**: The `lib/suggestionMapper.ts` library is **NOT** used by any current features - it's only for the deprecated ManuscriptWorkspace.

---

### 1. TipTap AI Suggestions (Run AI Pass)

**File**: `Editor.tsx:292-339` (`convertAiSuggestionsToUI()`)

**How it works**:
```typescript
// TipTap Pro extension makes API call to api.tiptap.dev
editor.chain().loadAiSuggestions().run();

// Extension returns suggestions with PM positions already calculated
const aiStorage = editor.extensionStorage?.aiSuggestion;
const aiSuggestions = aiStorage.getSuggestions(); // Already has deleteRange.from/to

// Convert to UI format inline (no mapping library needed)
const uiSuggestion = {
  pmFrom: suggestion.deleteRange?.from || 0,  // Already PM position
  pmTo: suggestion.deleteRange?.to || 0,      // Already PM position
  before: suggestion.deleteText || '',
  after: suggestion.replacementOptions?.[0]?.addText || '',
  // ... other fields
};
```

**Key Points**:
- ✅ **TipTap Pro handles all position calculations**
- ✅ **No text-to-PM mapping needed**
- ✅ **Direct API communication** with `api.tiptap.dev`
- ⚠️ **NOT using suggestionMapper.ts**

**Evidence**: Network logs show POST to `https://api.tiptap.dev/v1/ai/suggestions`

---

### 2. Style Checks (Run Checks)

**File**: `lib/styleValidator.ts:16-42` (`runDeterministicChecks()`)

**How it works**:
```typescript
export function runDeterministicChecks(editor: any, enabled: StyleRuleKey[]): CheckItem[] {
  const { state } = editor;
  const doc = state.doc;
  const out: CheckItem[] = [];

  let globalTextOffset = 0;

  // Walk the ProseMirror document directly
  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return true;

    const text = node.text;
    const nodeStart = pos;  // PM position from traversal

    // Apply rules and compute PM positions natively
    applyRulesToTextNode(text, globalTextOffset, nodeStart, enabled, out);

    globalTextOffset += text.length;
    return true;
  });

  return out; // Returns CheckItem[] with both plain-text and PM positions
}
```

**Key Points**:
- ✅ **Walks ProseMirror document natively**
- ✅ **PM positions computed during traversal** (no separate mapping step)
- ✅ **Both plain-text indices AND PM positions** included in CheckItem
- ⚠️ **NOT using suggestionMapper.ts**

**CheckItem Structure**:
```typescript
type CheckItem = {
  start: number;    // Plain-text index
  end: number;      // Plain-text index
  pmFrom?: number;  // ProseMirror position (computed natively)
  pmTo?: number;    // ProseMirror position (computed natively)
  rule: StyleRuleKey;
  message: string;
};
```

---

### 3. Manual Suggestions (Right-click "Suggest...")

**File**: `Editor.tsx:727-769` (`createManualSuggestion()`)

**How it works**:
```typescript
const createManualSuggestion = useCallback((data: { mode, after, note }) => {
  const editor = getGlobalEditor();
  const { state } = editor;

  // Get selection positions - already PM positions from editor state
  const { from, to } = state.selection;  // Native PM positions
  const before = state.doc.textBetween(from, to, "\n", "\n");

  const suggestion: UISuggestion = {
    pmFrom: from,  // Already PM position
    pmTo: to,      // Already PM position
    before,
    after: data.mode === "delete" ? "" : data.after,
    origin: "manual",
    // ... other fields
  };

  setSuggestions(prev => [...prev, suggestion]);
}, []);
```

**Key Points**:
- ✅ **Uses editor.state.selection.from/to directly**
- ✅ **Selection positions are native PM positions**
- ✅ **No mapping or calculation needed**
- ⚠️ **NOT using suggestionMapper.ts**

**User Flow**:
1. User selects text in editor
2. Right-clicks → sees "Suggest..." in context menu
3. Fills out SuggestDialog (mode, replacement text, note)
4. `createManualSuggestion()` uses selection positions directly

---

### 4. Legacy System (Deprecated)

**File**: `lib/suggestionMapper.ts`

**ONLY used by**: `ManuscriptWorkspace.tsx` (deprecated component)

**Why it exists**:
- ManuscriptWorkspace uses **Supabase edge functions** instead of TipTap AI
- Edge functions return **plain-text character indices** (not PM positions)
- `suggestionMapper.ts` converts plain-text → ProseMirror positions

**Architecture**:
```typescript
// ManuscriptWorkspace (deprecated) flow:
1. User clicks "Run AI Pass"
2. Calls Supabase edge function `suggest`
3. Edge function returns: { start: 100, end: 120, original: "...", replacement: "..." }
4. suggestionMapper.mapPlainTextToPM() converts indices to PM positions
5. Render suggestions
```

**⚠️ IMPORTANT**:
- Editor **NEVER** calls suggestionMapper
- All current features have PM positions built-in
- suggestionMapper only kept for backward compatibility

---

### Position Mapping Comparison Table

| Feature | Method | Library Used | Position Source |
|---------|--------|--------------|-----------------|
| **TipTap AI Suggestions** | Pre-calculated | None (inline conversion) | TipTap Pro API response |
| **Style Checks** | Native traversal | None (computed inline) | ProseMirror document walk |
| **Manual Suggestions** | Selection state | None | `editor.state.selection` |
| **Legacy (ManuscriptWorkspace)** | Text mapping | `suggestionMapper.ts` | Supabase edge function |

---

### Why No Mapping is Needed (Current System)

**Problem solved**: Position mapping is complex and error-prone because:
- Plain text loses formatting information (HTML tags, special chars)
- Character offsets shift with edits
- ProseMirror uses document positions, not character offsets

**Our solutions**:
1. **TipTap AI**: Let TipTap Pro handle it (they're experts at this)
2. **Style Checks**: Calculate positions during document traversal (single pass)
3. **Manual**: Use native selection positions (already PM positions)

**Result**: No fragile text-to-PM mapping code in the critical path!

---

### Debugging Position Issues

**If suggestions appear in wrong locations**:

1. **TipTap AI Suggestions**:
   - Check TipTap API response in Network tab
   - Verify `deleteRange.from/to` values are reasonable
   - Issue likely in TipTap Pro, not our code

2. **Style Checks**:
   - Add logs in `applyRulesToTextNode()`
   - Verify `pmNodeStart + localOffset` calculation
   - Check document traversal order

3. **Manual Suggestions**:
   - Log `editor.state.selection.from/to`
   - Verify selection is non-empty
   - Check if text was selected correctly

**Common mistake**: Trying to use `suggestionMapper.ts` for current features - it's not needed!

## Performance Considerations

### Large Suggestion Lists
- **Problem**: many suggestions can slow rendering
- **Solution**: Decoration capping (max 200 visible)
- **Future**: Virtualized list, pagination

### Render Optimization
- **Current Approach**: No debouncing or polling used
- **Optimizations**: React.memo() for ChangeCard, CheckCard
- **Note**: Previous debounce-based approach was removed for simpler event-driven architecture

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

**Last Updated**: October 5, 2025

## Tags

#editor #tiptap #react #component #JWT #authentication #prosemirror #suggestions #AIpass #performance #user_flow #typescript #frontend
