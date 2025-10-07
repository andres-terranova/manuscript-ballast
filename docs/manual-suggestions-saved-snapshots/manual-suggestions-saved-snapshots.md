# Implementation Plan: Save Manual Suggestions in Snapshots

**Status**: Not implemented (AI-only snapshots in MVP)
**Complexity**: Medium
**Estimated effort**: 4-6 hours

---

## Current State

**What snapshots save today**:
- ✅ Document content (`editor.getJSON()`)
- ✅ AI suggestions from TipTap extension (`editor.extensionStorage.aiSuggestion.getSuggestions()`)
- ✅ Metadata (word count, character count, suggestion count)

**What's missing**:
- ❌ Manual suggestions (created via "Add Suggestion" in editor)
- ❌ These live only in React state: `suggestions` (line 170 in Editor.tsx)

**Why it matters**:
- Manual suggestions are lost when restoring a snapshot
- No way to version control editor-added changes
- Inconsistent UX: AI suggestions persist, manual ones don't

---

## Implementation Plan

### 1. Update Snapshot Type
**File**: `src/services/snapshotService.ts`

```typescript
export interface Snapshot {
  id: string;
  version: number;
  event: SnapshotEvent;
  label?: string;
  content: JSONContent;
  aiSuggestions?: Suggestion[];      // From TipTap AI extension
  manualSuggestions?: UISuggestion[]; // NEW: From React state
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount?: number;         // Total: AI + manual
    aiSuggestionCount?: number;       // NEW: Breakdown
    manualSuggestionCount?: number;   // NEW: Breakdown
  };
  createdAt: string;
  createdBy: string;
}
```

### 2. Update `createSnapshot` Function
**File**: `src/services/snapshotService.ts`

**Current signature**:
```typescript
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string
): Promise<void>
```

**New signature**:
```typescript
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string,
  manualSuggestions?: UISuggestion[]  // NEW: Pass from Editor.tsx
): Promise<void>
```

**Changes**:
```typescript
// After line 64 (after capturing AI suggestions)
const manualSuggestionsToSave = manualSuggestions || [];
console.log(`📸 Capturing ${manualSuggestionsToSave.length} manual suggestions with snapshot`);

// Update metadata calculation (around line 94)
metadata: {
  wordCount,
  characterCount,
  suggestionCount: aiSuggestions.length + manualSuggestionsToSave.length,
  aiSuggestionCount: aiSuggestions.length,
  manualSuggestionCount: manualSuggestionsToSave.length
}

// Update snapshot object (line 93)
manualSuggestions: manualSuggestionsToSave.length > 0 ? manualSuggestionsToSave : undefined,
```

### 3. Update `restoreSnapshot` Function
**File**: `src/services/snapshotService.ts`

**Current**: Only restores AI suggestions (line 168-186)

**Add after line 186**:
```typescript
// Step 3c: Return manual suggestions to caller
// (Can't restore directly to React state - must be done in component)
const manualSuggestionsToRestore = snapshot.manualSuggestions || [];
console.log(`ℹ️ ${manualSuggestionsToRestore.length} manual suggestions available for restore`);

// Return value instead of Promise<void>
return {
  manualSuggestions: manualSuggestionsToRestore
};
```

**Update signature**:
```typescript
export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<{ manualSuggestions: UISuggestion[] }>  // NEW: Return manual suggestions
```

### 4. Update All `createSnapshot` Calls in Editor.tsx
**File**: `src/components/workspace/Editor.tsx`

**Find all calls** (search for `createSnapshot(`):
- Line 127: `createSnapshotSafe` - manual snapshots
- Line 783: After "Apply All" suggestions
- Line 980: Before AI Pass (new feature)
- Line 1058: After AI Pass complete

**Add `suggestions` parameter to each**:
```typescript
// Example from line 127 (createSnapshotSafe)
await createSnapshot(editor, manuscript.id, event, userId, label, suggestions);

// Example from line 980 (before AI Pass)
await createSnapshot(editor, manuscript.id, 'ai_pass_start', userId, `Before AI Pass (${roleLabel})`, suggestions);
```

### 5. Update Restore Logic in VersionHistory
**File**: `src/components/workspace/VersionHistory.tsx`

**Current**: Calls `restoreSnapshot()`, doesn't handle manual suggestions

**Update** (around where `restoreSnapshot` is called):
```typescript
const { manualSuggestions } = await restoreSnapshot(editor, manuscriptId, snapshot.version);

// Call onRestore callback with both version AND manual suggestions
onRestore(snapshot.version, manualSuggestions);
```

**Update callback in Editor.tsx** (line 1719):
```typescript
onRestore={(restoredVersion, manualSuggestions) => {
  setShowVersionHistory(false);

  const editor = getGlobalEditor();
  if (editor) {
    try {
      // Restore AI suggestions (existing code)
      const uiSuggestions = convertAiSuggestionsToUI(editor);

      // Merge with manual suggestions
      const allSuggestions = [...uiSuggestions, ...manualSuggestions];
      setSuggestions(allSuggestions);

      console.log(`✅ Restored ${uiSuggestions.length} AI + ${manualSuggestions.length} manual suggestions`);

      setCurrentVersion(restoredVersion);
    } catch (error) {
      console.error('Failed to restore suggestions:', error);
    }
  }

  toast({
    title: "Document restored",
    description: "The document has been restored from the selected version"
  });
}}
```

### 6. Update VersionHistory Component Type
**File**: `src/components/workspace/VersionHistory.tsx`

**Current props**:
```typescript
interface VersionHistoryProps {
  manuscriptId: string;
  currentVersion?: number;
  onRestore: (version: number) => void;
}
```

**New props**:
```typescript
interface VersionHistoryProps {
  manuscriptId: string;
  currentVersion?: number;
  onRestore: (version: number, manualSuggestions: UISuggestion[]) => void;
}
```

### 7. Position Remapping Consideration
**Challenge**: Manual suggestions use ProseMirror positions (`pmFrom`, `pmTo`). When restoring an old snapshot, these positions might not align with current document structure.

**Solutions**:
1. **Simple (MVP)**: Restore positions as-is, let existing remapping logic handle it (Editor.tsx line 918-946)
2. **Robust**: Store character offsets alongside PM positions, recalculate on restore
3. **Advanced**: Use ProseMirror's mapping system to track position changes

**Recommendation for v1.0**: Use solution #1 (simple). The existing remapping on document changes should handle most cases.

---

## Testing Checklist

**Snapshot Creation**:
- [ ] Create manual suggestion → Save snapshot → Verify saved in DB
- [ ] Create AI + manual suggestions → Save snapshot → Verify both saved
- [ ] No suggestions → Save snapshot → Verify empty arrays

**Snapshot Restoration**:
- [ ] Restore snapshot with manual suggestions → Verify appear in ChangeList
- [ ] Restore snapshot with AI + manual → Verify both appear
- [ ] Restore empty snapshot → Verify no suggestions

**Position Accuracy**:
- [ ] Create manual suggestion → Edit document → Restore → Verify position correct
- [ ] Create suggestion → Accept it → Restore → Verify not present

**Edge Cases**:
- [ ] Restore old snapshot (before manual suggestions feature) → No errors
- [ ] Multiple restores in sequence → State doesn't duplicate
- [ ] Cancel restore mid-operation → No partial state

---

## Database Impact

**No schema migration needed** - snapshots are stored as JSONB arrays, so adding `manualSuggestions` field is backward-compatible.

**Storage estimate**:
- Manual suggestion: ~300 bytes (JSON)
- 100 manual suggestions: ~30KB
- Negligible compared to document content

---

## Future Enhancements

**Phase 2 (v1.0 scope)**:
- Track suggestion author (editor vs. specific user)
- Add suggestion status (pending/accepted/rejected) to snapshots
- Snapshot diff viewer showing which suggestions changed between versions

**Phase 3 (post-v1.0)**:
- Suggestion-level versioning (track edits to suggestions)
- Merge conflicts when restoring (if current state has newer suggestions)
- Selective restore (choose which suggestions to restore)

---

## Related Files

**Modified**:
- `src/services/snapshotService.ts` (core logic)
- `src/components/workspace/Editor.tsx` (all createSnapshot calls + restore handler)
- `src/components/workspace/VersionHistory.tsx` (restore callback)

**Unchanged**:
- `src/lib/suggestionMapper.ts` (suggestion type definitions)
- `supabase/migrations/*` (no schema changes)
- Database (JSONB backward-compatible)

---

**Notes**:
- This is a **backward-compatible** change (old snapshots still work)
- **No breaking changes** to existing snapshot functionality
- Can be implemented incrementally (add field first, then restore logic)
- Aligns with v1.0 roadmap goal: "Complete version control system"
