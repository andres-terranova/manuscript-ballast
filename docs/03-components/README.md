# Component Documentation

Frontend component architecture and implementation details.

## 📂 Component Categories

### [Editors](./editors/)
Main editor components
- **manuscript-editor.md** - ManuscriptEditor (ExperimentalEditor) implementation

### [Suggestions](./suggestions/)
AI suggestion UI components
- **change-list.md** - ChangeList and ChangeCard components
- Suggestion rendering and interaction

## 🏗️ Component Architecture

### Editor Hierarchy
```
ManuscriptEditor (ExperimentalEditor)
├── TipTap Editor Core
│   ├── AiSuggestion Extension
│   ├── Collaboration Extension
│   └── Custom Extensions
├── ChangeList Panel
│   └── ChangeCard (per suggestion)
├── AIEditorRuleSelector
└── Style Validator
```

### Key Technologies
- **TipTap v3 Pro**: Editor framework
- **React 18**: UI library
- **shadcn/ui**: Component library
- **Tailwind CSS**: Styling
- **ProseMirror**: Document model

## 🔑 Core Concepts

### ProseMirror Positions
- Use PM positions, not character offsets
- Positions map to document nodes
- Decorations use PM position ranges

### Suggestion Flow
1. AI generates suggestions with PM positions
2. `convertAiSuggestionsToUI()` maps to UI format
3. Decorations render inline highlights
4. ChangeList displays in panel
5. Accept/reject updates document

### State Management
- Editor state: TipTap/ProseMirror
- UI state: React hooks
- Suggestions: Local state in ManuscriptEditor

## 📍 File Locations

**Components**: `/src/components/workspace/`
- `ExperimentalEditor.tsx` - Main editor
- `ChangeList.tsx` - Suggestion panel
- `ChangeCard.tsx` - Individual suggestion
- `AIEditorRuleSelector.tsx` - Rule configuration
- `ManuscriptWorkspace.tsx` - Legacy standard editor (deprecated)

**Utilities**: `/src/lib/`
- `types.ts` - Type definitions
- `styleValidator.ts` - Style rule checks

## 🎯 Common Tasks

**Add new suggestion type** → See AI_EDITOR_RULES in `AIEditorRules.tsx`

**Modify suggestion UI** → See `ChangeCard.tsx` and `ChangeList.tsx`

**Debug position issues** → [../02-technical/troubleshooting/debug-suggestion-positions.md](../02-technical/troubleshooting/debug-suggestion-positions.md)

**Customize editor** → See `useTiptapEditor.ts` hook

---

**Last Updated**: October 2, 2025
