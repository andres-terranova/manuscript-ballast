# AI Suggestions + Snapshots Integration - Implementation Plan

**Version**: 1.0
**Date**: 2025-01-07
**Estimated Time**: 4-6 hours
**Risk Level**: LOW

---

## Executive Summary

This plan implements the ability to save AI suggestions alongside snapshots and restore them programmatically when a snapshot is loaded. This allows users to preserve the complete editing state (document + suggestions) at any point in time.

**Key Insight**: TipTap's `Suggestion` objects are fully JSON-serializable and can be stored in JSONB. Positions remain valid because the document is restored to its exact state when the snapshot was saved.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Action: Save Snapshot                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Capture document content: editor.getJSON()                   │
│  2. Capture AI suggestions: editor.storage.aiSuggestion          │
│     .getSuggestions()                                            │
│  3. Serialize suggestions (already JSON-safe!)                   │
│  4. Save to database: manuscripts.snapshots JSONB array          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│         Database: snapshots array in manuscripts table           │
│  {                                                               │
│    content: JSONContent,                                         │
│    aiSuggestions: Suggestion[],  ← NEW                          │
│    metadata: { suggestionCount: number }  ← NEW                 │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   User Action: Restore Snapshot                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Fetch snapshot from database                                 │
│  2. Restore document: editor.commands.setContent(content)        │
│  3. Restore suggestions: editor.commands.setAiSuggestions(...)   │
│  4. UI updates automatically (popovers + ChangeList)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

**Before starting, verify:**

1. ✅ TipTap Pro AI Suggestion extension is configured (`src/hooks/useTiptapEditor.ts`)
2. ✅ Snapshot service exists (`src/services/snapshotService.ts`)
3. ✅ Database has `manuscripts.snapshots` JSONB column
4. ✅ Editor uses `getSuggestions()` API (`src/components/workspace/Editor.tsx:391`)

**Research findings:**
- TipTap `Suggestion` objects ARE JSON-serializable (confirmed in research)
- `setAiSuggestions()` command exists and accepts full suggestion objects
- Position mapping is safe when document is fully restored

---

## Step-by-Step Implementation

### STEP 1: Update TypeScript Types

**File**: `src/services/snapshotService.ts`
**Location**: Lines 1-21 (interface definitions)
**Risk**: LOW (additive change)

**Action**: Add `aiSuggestions` field to `Snapshot` interface

```typescript
// BEFORE:
export interface Snapshot {
  id: string;
  version: number;
  event: SnapshotEvent;
  label?: string;
  content: JSONContent;
  metadata: {
    wordCount: number;
    characterCount: number;
  };
  createdAt: string;
  createdBy: string;
}

// AFTER:
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';

export interface Snapshot {
  id: string;
  version: number;
  event: SnapshotEvent;
  label?: string;
  content: JSONContent;
  aiSuggestions?: Suggestion[];  // 🆕 NEW: Array of AI suggestions
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount?: number;     // 🆕 NEW: Track count for UI
  };
  createdAt: string;
  createdBy: string;
}
```

**Import needed**: Add at top of file:
```typescript
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';
```

**Why optional (`?`)**: Not all snapshots will have AI suggestions (e.g., created before this feature, or saved without running AI pass)

---

### STEP 2: Modify createSnapshot() to Capture AI Suggestions

**File**: `src/services/snapshotService.ts`
**Function**: `createSnapshot()`
**Location**: Lines 34-104
**Risk**: LOW (additive change, existing snapshots unchanged)

**Action**: Capture AI suggestions from editor storage before saving

**Find this section** (around line 42):
```typescript
// Step 1: Capture current document state from editor
const content = editor.getJSON();
const text = editor.getText();
```

**Add immediately after**:
```typescript
// Step 1b: Capture AI suggestions if available
let aiSuggestions: Suggestion[] = [];
try {
  const aiStorage = editor.extensionStorage?.aiSuggestion;
  if (aiStorage && typeof aiStorage.getSuggestions === 'function') {
    const suggestions = aiStorage.getSuggestions();
    // Filter out rejected suggestions (optional - keep if you want full state)
    aiSuggestions = suggestions.filter((s: Suggestion) => !s.isRejected);
    console.log(`📸 Capturing ${aiSuggestions.length} AI suggestions with snapshot`);
  } else {
    console.log('📸 No AI suggestions found (extension not loaded or no suggestions)');
  }
} catch (error) {
  console.error('Error capturing AI suggestions:', error);
  // Continue without suggestions - don't fail snapshot creation
}
```

**Then find the snapshot object creation** (around line 67):
```typescript
const snapshot: Snapshot = {
  id: crypto.randomUUID(),
  version,
  event,
  label,
  content,
  metadata: {
    wordCount,
    characterCount
  },
  createdAt: new Date().toISOString(),
  createdBy: userId
};
```

**Modify to**:
```typescript
const snapshot: Snapshot = {
  id: crypto.randomUUID(),
  version,
  event,
  label,
  content,
  aiSuggestions: aiSuggestions.length > 0 ? aiSuggestions : undefined,  // 🆕 NEW
  metadata: {
    wordCount,
    characterCount,
    suggestionCount: aiSuggestions.length  // 🆕 NEW
  },
  createdAt: new Date().toISOString(),
  createdBy: userId
};
```

**Update console log** (around line 92):
```typescript
// BEFORE:
console.log(`✅ Snapshot created: v${version} (${event})`, {
  manuscriptId,
  version,
  event,
  wordCount,
  characterCount
});

// AFTER:
console.log(`✅ Snapshot created: v${version} (${event})`, {
  manuscriptId,
  version,
  event,
  wordCount,
  characterCount,
  suggestionCount: aiSuggestions.length  // 🆕 NEW
});
```

---

### STEP 3: Modify restoreSnapshot() to Restore AI Suggestions

**File**: `src/services/snapshotService.ts`
**Function**: `restoreSnapshot()`
**Location**: Lines 115-172
**Risk**: MEDIUM (modifies critical restoration logic)

**Action**: Add suggestion restoration after content restoration

**Find this section** (around line 142):
```typescript
// Step 3: Restore content to editor (TipTap setContent command)
editor.commands.setContent(snapshot.content);
```

**Add immediately after**:
```typescript
// Step 3b: Restore AI suggestions if present
if (snapshot.aiSuggestions && snapshot.aiSuggestions.length > 0) {
  try {
    // CRITICAL: Suggestions must be restored AFTER content
    // to ensure positions are valid
    const success = editor.commands.setAiSuggestions(snapshot.aiSuggestions);

    if (success) {
      console.log(`✅ Restored ${snapshot.aiSuggestions.length} AI suggestions`);
    } else {
      console.warn('⚠️ setAiSuggestions returned false - suggestions may not be restored');
    }
  } catch (error) {
    console.error('Error restoring AI suggestions:', error);
    // Don't fail the entire restore - document is already restored
    // User can run AI pass again if needed
  }
} else {
  console.log('ℹ️ No AI suggestions to restore');
}
```

**Update success log** (around line 161):
```typescript
// BEFORE:
console.log(`✅ Restored to version ${version}`, {
  manuscriptId,
  version,
  event: snapshot.event,
  wordCount: snapshot.metadata.wordCount
});

// AFTER:
console.log(`✅ Restored to version ${version}`, {
  manuscriptId,
  version,
  event: snapshot.event,
  wordCount: snapshot.metadata.wordCount,
  suggestionsRestored: snapshot.aiSuggestions?.length || 0  // 🆕 NEW
});
```

---

### STEP 4: Update VersionHistory UI to Show Suggestion Count

**File**: `src/components/workspace/VersionHistory.tsx`
**Location**: Lines 15-213 (full component)
**Risk**: LOW (UI-only change)

**Action**: Display suggestion count badge on snapshots that have suggestions

**Find the snapshot rendering section** (look for where you map over snapshots):

**Search for**: The section that renders each snapshot item in the list

**Modify to add suggestion count badge**:

```typescript
// Find the existing snapshot rendering code (around line 100-150)
// Add this after the version/event display:

{snapshot.metadata?.suggestionCount && snapshot.metadata.suggestionCount > 0 && (
  <Badge variant="secondary" className="ml-2 text-xs">
    {snapshot.metadata.suggestionCount} suggestion{snapshot.metadata.suggestionCount !== 1 ? 's' : ''}
  </Badge>
)}
```

**Example full section**:
```typescript
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <Badge variant="outline">v{snapshot.version}</Badge>
    <Badge variant="secondary">{snapshot.event}</Badge>
    {/* 🆕 NEW: Suggestion count badge */}
    {snapshot.metadata?.suggestionCount && snapshot.metadata.suggestionCount > 0 && (
      <Badge variant="secondary" className="ml-2 text-xs">
        {snapshot.metadata.suggestionCount} suggestion{snapshot.metadata.suggestionCount !== 1 ? 's' : ''}
      </Badge>
    )}
  </div>
  <Button
    size="sm"
    variant="outline"
    onClick={() => handleRestore(snapshot.version)}
    disabled={restoring === snapshot.version}
  >
    <RotateCcw className="h-4 w-4 mr-1" />
    Restore
  </Button>
</div>
```

---

### STEP 5: Update Database Schema (TypeScript Only)

**File**: `src/types/manuscript.ts`
**Location**: Find `Snapshot` type references
**Risk**: LOW (types only, no runtime changes)

**Action**: Ensure TypeScript types are aligned

**If `Snapshot` is imported from `@/services/snapshotService`**:
- ✅ No changes needed (we already updated it in Step 1)

**If `Snapshot` is redefined in this file**:
- Update to match the definition from Step 1

---

### STEP 6: Add Import Statement to snapshotService.ts

**File**: `src/services/snapshotService.ts`
**Location**: Top of file (imports section)
**Risk**: LOW

**Action**: Add TipTap Suggestion type import

**Add this import**:
```typescript
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';
```

**Full imports section should look like**:
```typescript
import { Editor } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import { JSONContent } from '@tiptap/core';
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';  // 🆕 NEW

// Snapshot event types matching workflow milestones
export type SnapshotEvent = 'upload' | 'send_to_author' | 'return_to_editor' | 'manual';
```

---

## Testing Plan

### Phase 1: Manual Testing (Required)

#### Test Case 1: Save Snapshot with AI Suggestions ✅
1. Open a manuscript
2. Run AI pass (wait for completion)
3. Verify suggestions appear in sidebar
4. Click "Save" button to create snapshot
5. **Verify**:
   - Console shows: `📸 Capturing X AI suggestions with snapshot`
   - Console shows: `✅ Snapshot created: v1 (manual)` with `suggestionCount: X`
   - No errors in console

#### Test Case 2: Save Snapshot without AI Suggestions ✅
1. Open a manuscript
2. Do NOT run AI pass
3. Click "Save" button to create snapshot
4. **Verify**:
   - Console shows: `📸 No AI suggestions found`
   - Console shows: `suggestionCount: 0`
   - No errors in console

#### Test Case 3: Restore Snapshot with AI Suggestions ✅
1. Use snapshot from Test Case 1
2. Make changes to document (edit text)
3. Open Version History
4. Click "Restore" on the snapshot
5. **Verify**:
   - Document reverts to original content
   - AI suggestions appear in editor (yellow highlights)
   - Suggestions appear in ChangeList sidebar
   - Console shows: `✅ Restored X AI suggestions`
   - Can accept/reject suggestions normally

#### Test Case 4: Restore Snapshot without AI Suggestions ✅
1. Use snapshot from Test Case 2
2. Open Version History
3. Click "Restore"
4. **Verify**:
   - Document restores correctly
   - Console shows: `ℹ️ No AI suggestions to restore`
   - No errors

#### Test Case 5: Large Suggestion Count (5K+) ✅
1. Use 85K word document
2. Run AI pass (wait ~15-20 min)
3. Save snapshot
4. Restore snapshot
5. **Verify**:
   - All suggestions restore
   - No browser freeze during save
   - May freeze during restore (known limitation - Phase 2)

#### Test Case 6: Position Validation ✅
1. Open manuscript, run AI pass
2. Note a specific suggestion (e.g., "Change 'Chapter' to heading")
3. Save snapshot
4. Edit document (add/remove paragraphs)
5. Restore snapshot
6. **Verify**:
   - Restored suggestion points to correct text
   - Original text at same position
   - Suggestion can be applied correctly

### Phase 2: Database Verification (Required)

**Check database directly** using Supabase dashboard or SQL:

```sql
-- View snapshots with AI suggestions
SELECT
  id,
  title,
  jsonb_array_length(snapshots) as snapshot_count,
  snapshots->0->'metadata'->>'suggestionCount' as first_snapshot_suggestions
FROM manuscripts
WHERE jsonb_array_length(snapshots) > 0;

-- View full snapshot with suggestions
SELECT
  snapshots->>0 as latest_snapshot
FROM manuscripts
WHERE id = 'YOUR_MANUSCRIPT_ID';
```

**Verify**:
- `aiSuggestions` array exists in snapshot JSON
- `metadata.suggestionCount` matches array length
- Suggestions have all required fields: `id`, `deleteRange`, `rule`, etc.

### Phase 3: Edge Case Testing (Optional)

#### Edge Case 1: Rejected Suggestions
1. Run AI pass
2. Reject some suggestions
3. Save snapshot
4. **Decision Point**: Should rejected suggestions be saved?
   - Current implementation: Filters out rejected (`!s.isRejected`)
   - Alternative: Save all suggestions to preserve full state

#### Edge Case 2: Multiple Snapshots
1. Create snapshot v1 with suggestions
2. Accept some suggestions
3. Create snapshot v2 with remaining suggestions
4. Restore v1
5. **Verify**: v1 suggestions restore (not v2)

#### Edge Case 3: Backward Compatibility
1. Open manuscript with old snapshots (pre-feature)
2. Restore old snapshot
3. **Verify**: No errors, gracefully handles missing `aiSuggestions`

---

## Rollback Strategy

If issues occur after deployment:

### Quick Rollback (No Data Loss)
```typescript
// In snapshotService.ts, comment out restoration:
// if (snapshot.aiSuggestions && snapshot.aiSuggestions.length > 0) {
//   editor.commands.setAiSuggestions(snapshot.aiSuggestions);
// }
```

### Full Rollback (Revert All Changes)
```bash
git revert <commit-hash>
git push
```

**Data is safe**: Old snapshots don't have `aiSuggestions`, new ones have it as optional field.

---

## Success Criteria

✅ **Must Have**:
1. Snapshots capture AI suggestions when present
2. Restoring snapshot restores both content AND suggestions
3. Suggestions are clickable/actionable after restore
4. No errors in console during save/restore
5. UI shows suggestion count in Version History

✅ **Should Have**:
1. Large suggestion counts (5K+) work without crashes
2. Positions remain valid after restore
3. Console logs are informative for debugging

✅ **Nice to Have**:
1. Visual indicator in UI for snapshots with suggestions
2. Preview of suggestions before restore
3. Option to restore content without suggestions

---

## Performance Considerations

### Storage
- **Per Suggestion**: ~500-1000 bytes
- **5K Suggestions**: ~2.5-5 MB
- **JSONB Compression**: Supabase compresses efficiently

### Network
- Snapshots are fetched on-demand (not on page load)
- Large snapshots (5K+ suggestions) may take 1-2 seconds to fetch

### Memory
- 5K suggestions = ~5 MB in browser memory
- Known limitation: Browser freeze when rendering 5K+ items (Phase 2 fix)

---

## Known Limitations

1. **Browser Freeze**: 5K+ suggestions cause UI freeze during position mapping (existing issue, not introduced by this feature)
2. **Position Drift**: If user manually edits snapshot JSON in database, positions may become invalid (edge case)
3. **Rejected State**: Currently filters out rejected suggestions (design decision)

---

## Future Enhancements

**Phase 2** (Not in scope):
- Virtualization for 5K+ suggestions to prevent freeze
- Diff viewer to compare snapshot suggestions
- Bulk operations (accept/reject all from snapshot)

**Phase 3** (Not in scope):
- Separate `snapshot_suggestions` table for better scalability
- Suggestion versioning (track which suggestions were accepted/rejected)
- Export snapshots with suggestions to DOCX

---

## Validation Checklist

Before marking complete, verify:

- [ ] All TypeScript files compile without errors (`pnpm run type-check`)
- [ ] All imports are correct
- [ ] Console logs are informative (not verbose)
- [ ] Error handling is graceful (no crashes)
- [ ] UI updates reflect new data
- [ ] Database schema supports optional fields
- [ ] Backward compatibility maintained
- [ ] Test Case 1-4 pass (minimum)
- [ ] Test Case 5 attempted (if large document available)
- [ ] Code follows existing patterns in codebase
- [ ] No breaking changes to existing snapshot functionality

---

## Questions for Product Owner

Before implementing, confirm:

1. **Rejected Suggestions**: Should rejected suggestions be saved with snapshot?
   - Current: NO (filtered out)
   - Alternative: YES (preserve full state)

2. **UI Behavior**: When restoring snapshot with suggestions, should we:
   - Immediately show suggestions in editor ✅ (current plan)
   - Show preview first, let user choose to restore suggestions
   - Auto-apply suggestions vs. show as pending

3. **Storage Strategy**:
   - JSONB array in snapshots ✅ (current plan)
   - Separate table (better for very large suggestion counts)

---

## Contact & Support

**Questions during implementation?**
- Review research findings in previous conversation
- Check TipTap docs: https://tiptap.dev/docs/content-ai/capabilities/suggestion
- Reference existing snapshot code: `src/services/snapshotService.ts`

**Issues?**
- Check console for error messages
- Verify TipTap AI extension is loaded: `editor.extensionStorage?.aiSuggestion`
- Test with small document first (< 5K words)

---

## Appendix: Code Reference

### Key Files Modified
1. `src/services/snapshotService.ts` - Core logic
2. `src/components/workspace/VersionHistory.tsx` - UI updates

### Key APIs Used
- `editor.extensionStorage.aiSuggestion.getSuggestions()` - Get suggestions
- `editor.commands.setAiSuggestions(suggestions)` - Restore suggestions
- `editor.commands.setContent(content)` - Restore document

### TipTap Suggestion Structure (Reference)
```typescript
interface Suggestion {
  id: string;
  deleteRange: { from: number; to: number };
  deleteText: string;
  deleteSlice: {
    content: JSONContent[];
    openStart: number;
    openEnd: number;
  };
  replacementOptions: [{
    id: string;
    addText: string;
    addSlice: {
      content: JSONContent[];
      openStart: number;
      openEnd: number;
    };
  }];
  rule: {
    id: string;
    title: string;
    prompt: string;
    color: string;
    backgroundColor: string;
  };
  isRejected: boolean;
  metadata?: any;
}
```

---

**End of Implementation Plan**

**Next Steps**: Hand off this document to implementation team. Execute steps 1-6 sequentially, test thoroughly, then deploy.
