# Library Utilities Index

**Quick Summary**: Core business logic and utilities. No React dependencies. Pure TypeScript modules.

## Module Map

```
Core Types & Mapping
├── types.ts                    # Type definitions
├── suggestionMapper.ts         # AI → UI mapping
└── mappingDiagnostics.ts       # Position debugging

ProseMirror Plugins
├── suggestionsPlugin.ts        # Suggestion decorations
└── checksPlugin.ts             # Style check decorations

Style & Validation
├── styleValidator.ts           # Deterministic checks
├── styleRuleConstants.ts       # Rule definitions
└── AIEditorRules.tsx          # AI role definitions

Document Processing
├── docxUtils.ts               # DOCX extraction
├── segmentMapper.ts           # Text chunking
└── markdownUtils.ts           # MD conversion

Editor Utilities
├── editorUtils.ts             # Editor state management
└── utils.ts                   # General utilities (cn)
```

## Quick Navigation

| Working on... | Go to... |
|--------------|----------|
| Suggestion mapping | [docs/suggestion-system.md](docs/suggestion-system.md) |
| Position calculations | [docs/position-mapping.md](docs/position-mapping.md) |
| Style validation | [docs/style-validation.md](docs/style-validation.md) |
| Editor utilities | [docs/editor-utils.md](docs/editor-utils.md) |
| Document processing | [docs/document-processing.md](docs/document-processing.md) |

## Critical Modules

### types.ts
```typescript
// Core types used everywhere
export interface UISuggestion {
  id: string;
  from: number;        // ProseMirror position
  to: number;          // ProseMirror position
  originalText: string;
  suggestedText: string;
  category: SuggestionCategory;
  actor: SuggestionActor;
}
```

### suggestionMapper.ts ⭐
**Critical for position accuracy**
```typescript
// Maps TipTap API response to UI format
mapServerSuggestionToUI(serverSugg) → UISuggestion

// ⚠️ Always use ProseMirror positions!
// ❌ WRONG: text.indexOf(searchString)
// ✅ RIGHT: state.doc.resolve(offset).pos
```

### suggestionsPlugin.ts
**Renders decorations in editor**
```typescript
// Cap decorations to prevent memory issues
const MAX_VISIBLE_DECORATIONS = 200;

// Creates inline decorations for suggestions
Decoration.inline(from, to, {
  class: 'suggestion suggestion-grammar',
  'data-suggestion-id': suggestion.id
})
```

## Data Flow Patterns

```
TipTap API Response
    ↓
suggestionMapper.mapServerSuggestionToUI()
    ↓
UISuggestion objects
    ↓
suggestionsPlugin creates decorations
    ↓
Editor renders underlines
    ↓
User clicks → popover shows
```

## Common Patterns

### Position Mapping
```typescript
// ✅ Good: Use ProseMirror positions
const from = editor.state.doc.resolve(pmPosition).pos;

// ❌ Bad: Use character offsets
const from = plainText.indexOf(searchText);
```

### Type Guards
```typescript
// Check suggestion types
export function isSuggestionType(value: string): value is SuggestionType {
  return SUGGESTION_TYPES.includes(value);
}
```

### Immutable Updates
```typescript
// ✅ Good: Return new array
return suggestions.filter(s => s.id !== id);

// ❌ Bad: Mutate array
suggestions.splice(index, 1);
```

## Performance Considerations

1. **Large suggestion arrays** - Use pagination
2. **Decoration rendering** - Cap at 200
3. **Position calculations** - Cache results
4. **Validation functions** - Debounce 500ms

## Testing Utilities

```typescript
// mappingDiagnostics.ts - Debug position issues
diagnoseSuggestionMapping(suggestion, editorContent)
→ { isValid, actualText, expectedText, positionDrift }

// Visualize suggestion positions
visualizeSuggestionPositions(suggestions, content)
→ ASCII diagram showing overlaps
```

## Module Dependencies

```
types.ts
  ↓
suggestionMapper.ts ← Uses types
  ↓
suggestionsPlugin.ts ← Creates decorations
  ↓
ExperimentalEditor ← Applies to editor
```

## Common Issues & Solutions

| Issue | Module | Solution |
|-------|--------|----------|
| Wrong positions | suggestionMapper.ts | Use ProseMirror positions |
| Too many decorations | suggestionsPlugin.ts | Cap at 200 |
| Validation too slow | styleValidator.ts | Debounce 500ms |
| Type errors | types.ts | Check discriminated unions |

---

**Need detailed module docs?** → Check `docs/` subdirectory
**Previous 723-line version?** → See CLAUDE.md (being phased out)