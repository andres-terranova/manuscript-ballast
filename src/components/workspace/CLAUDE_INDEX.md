# Workspace Components Index

**Quick Summary**: All manuscript editor UI components. Main entry point is ExperimentalEditor.tsx.

## Component Map

```
ExperimentalEditor.tsx (⭐ Main Editor - 1397 lines)
├── DocumentCanvas.tsx (TipTap wrapper)
├── ChangeList.tsx (Suggestion panel)
│   └── ChangeCard.tsx (Individual suggestion)
├── ChecksList.tsx (Style checks panel)
│   └── CheckCard.tsx (Individual check)
├── AIEditorRuleSelector.tsx (Rule configuration)
├── ProcessingStatus.tsx (Upload status)
└── SuggestionPopover.tsx (Inline UI)

ManuscriptWorkspace.tsx (🟡 Legacy - Deprecated)
```

## Quick Navigation

| Need to work on... | Go to... |
|-------------------|----------|
| Main editor logic | [ExperimentalEditor.md](docs/ExperimentalEditor.md) |
| AI suggestions UI | [ChangeList.md](docs/ChangeList.md) |
| Style checks UI | [ChecksList.md](docs/ChecksList.md) |
| TipTap integration | [DocumentCanvas.md](docs/DocumentCanvas.md) |
| Suggestion rendering | [SuggestionPopover.md](docs/SuggestionPopover.md) |
| Processing status | [ProcessingStatus.md](docs/ProcessingStatus.md) |
| AI rules config | [AIEditorRules.md](docs/AIEditorRules.md) |

## Critical Files

### ExperimentalEditor.tsx (Default Editor)
- **Lines**: 1397
- **Purpose**: Main editor with TipTap Pro AI
- **Key function**: `handleRunAI()` - triggers suggestion generation
- **Timeout issue**: Line 1068 - adjust `chunkSize` for large docs
- **State**: suggestions, checks, manuscript, activeTab

### DocumentCanvas.tsx
- **Purpose**: Wraps TipTap editor with decorations
- **Key integration**: ProseMirror plugins for suggestions/checks
- **Props**: content, onUpdate, editorRef

### ChangeList.tsx & ChangeCard.tsx
- **Purpose**: Display and manage AI suggestions
- **Performance**: Consider pagination for 500+ suggestions
- **Actions**: Accept, Reject, Navigate to position

## Data Flow

```
User Action: "Run AI Pass"
    ↓
ExperimentalEditor.handleRunAI()
    ↓
TipTap AI Extension (JWT auth)
    ↓
Response with ProseMirror positions
    ↓
suggestionMapper.mapServerSuggestionToUI()
    ↓
State update: setSuggestions()
    ↓
DocumentCanvas renders decorations
    ↓
ChangeList displays suggestions
    ↓
User accepts/rejects via ChangeCard
```

## Component Dependencies

```typescript
// Core imports used everywhere
import { Editor } from '@tiptap/react'
import { UISuggestion, CheckItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

## Performance Gotchas

1. **500+ suggestions** → Implement pagination
2. **1000+ decorations** → Cap at 200 visible
3. **Large state arrays** → Use React.memo()
4. **Frequent re-renders** → Debounce onChange

## Testing Checklist

- [ ] Upload DOCX → ProcessingStatus shows progress
- [ ] Run AI Pass → Suggestions appear in ~30s
- [ ] Click suggestion in text → SuggestionPopover opens
- [ ] Accept suggestion → Text updates, suggestion removed
- [ ] Toggle highlights → Decorations show/hide
- [ ] 85K word document → Doesn't timeout (adjust chunkSize)

## Common Issues & Solutions

| Issue | Solution | File |
|-------|----------|------|
| Timeout on large docs | Reduce chunkSize to 5 | ExperimentalEditor.tsx:1068 |
| Too many suggestions | Add pagination | ChangeList.tsx |
| JWT auth fails | Check token in .env | ExperimentalEditor.tsx:421 |
| Positions wrong | Use ProseMirror positions | DocumentCanvas.tsx |

---

**Need detailed component docs?** → Check `docs/` subdirectory
**Previous 586-line version?** → See CLAUDE.md (being phased out)