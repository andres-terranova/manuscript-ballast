# Quick Start: Add New Suggestion Type

**Time**: 5 minutes
**Difficulty**: Easy
**Files to modify**: 3

## Steps

### 1. Add Type Definition (1 min)

**File**: `src/lib/types.ts`

```typescript
// Line ~35 - Add to SuggestionType union
export type SuggestionType =
  | 'grammar'
  | 'spelling'
  | 'clarity'
  | 'tone'
  | 'style'
  | 'consistency'
  | 'YOUR_NEW_TYPE';  // Add here

// Line ~45 - Add to category mapping
export type SuggestionCategory =
  | 'grammar'
  | 'clarity'
  | 'tone'
  | 'style'
  | 'YOUR_CATEGORY';  // Add if new category needed
```

### 2. Update Mapper Logic (2 min)

**File**: `src/lib/suggestionMapper.ts`

```typescript
// Line ~50 - Add to mapTypeToCategory function
function mapTypeToCategory(type: SuggestionType): SuggestionCategory {
  switch(type) {
    case 'grammar':
    case 'spelling':
      return 'grammar';
    case 'YOUR_NEW_TYPE':  // Add mapping
      return 'YOUR_CATEGORY';
    // ...
  }
}

// Line ~80 - Add color mapping
function getColorForType(type: SuggestionType): string {
  switch(type) {
    case 'YOUR_NEW_TYPE':
      return '#your-color';  // Hex color
    // ...
  }
}
```

### 3. Update UI Rendering (2 min)

**File**: `src/components/workspace/ChangeCard.tsx`

```typescript
// Line ~45 - Add icon/badge for new type
function getIconForType(type: SuggestionType) {
  switch(type) {
    case 'YOUR_NEW_TYPE':
      return <YourIcon className="w-4 h-4" />;
    // ...
  }
}

// Line ~120 - Add custom styling if needed
const typeStyles = {
  'YOUR_NEW_TYPE': 'border-your-color bg-your-color/10',
  // ...
};
```

## Testing

```bash
# 1. Start dev server
pnpm run dev

# 2. Test with mock suggestion
# In browser console:
const mockSuggestion = {
  id: 'test-1',
  type: 'YOUR_NEW_TYPE',
  from: 0,
  to: 10,
  originalText: 'test text',
  suggestedText: 'improved text',
  explanation: 'Test explanation'
};

# 3. Verify rendering
# - Check ChangeCard shows correct icon/color
# - Verify category grouping works
# - Test accept/reject functionality
```

## Common Issues

**TypeScript errors?**
- Ensure type is added to union in types.ts
- Run `pnpm run type-check`

**Suggestion not appearing?**
- Check mapTypeToCategory returns valid category
- Verify TipTap API returns your new type

**Wrong color/icon?**
- Check getColorForType in suggestionMapper.ts
- Verify ChangeCard.tsx has styling for your type

## Next Steps

- Add AI prompt for new type in `AIEditorRules.tsx`
- Configure TipTap to generate this type
- Add filter in ChangeList for new category

## Related Docs

- [Suggestion System](../../lib/docs/suggestion-system.md)
- [Types Documentation](../../lib/types.ts)
- [Change Card Component](../../components/workspace/docs/ChangeCard.md)

---

**Need help?** Use `/suggestions` agent