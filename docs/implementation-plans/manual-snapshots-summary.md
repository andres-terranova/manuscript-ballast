# Manual Snapshots - Implementation Summary

**Quick Reference for Step-by-Step Execution**

---

## At a Glance

- **Total Time**: 3-4 hours
- **Complexity**: LOW-MEDIUM
- **Dependencies**: None (all existing)
- **Risk**: LOW (non-breaking, additive feature)

---

## File Changes

### New Files (3)
1. `supabase/migrations/[TIMESTAMP]_add_snapshots_to_manuscripts.sql`
2. `src/services/snapshotService.ts`
3. `src/components/workspace/VersionHistory.tsx`

### Modified Files (2)
1. `src/components/workspace/Editor.tsx` (add button, modal, hooks)
2. `src/integrations/supabase/types.ts` (regenerate from DB)

---

## Execution Order

### Phase 1: Database (10 min)
```bash
# 1. Create migration file
cd supabase/migrations
touch "$(date +%Y%m%d%H%M%S)_add_snapshots_to_manuscripts.sql"

# 2. Add SQL:
ALTER TABLE manuscripts ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_manuscripts_snapshots ON manuscripts USING gin ((snapshots::jsonb));

# 3. Apply
cd ../.. && supabase migration up

# 4. Verify
psql postgresql://postgres:postgres@localhost:54322/postgres -c "\d manuscripts" | grep snapshots
```

### Phase 2: Service Layer (30 min)
```bash
# 1. Create file
touch src/services/snapshotService.ts

# 2. Implement (see action plan for full code):
# - createSnapshot(editor, manuscriptId, event, userId, label?)
# - restoreSnapshot(editor, manuscriptId, version)
# - getSnapshots(manuscriptId)
# - getLatestSnapshot(manuscriptId)

# 3. Use crypto.randomUUID() for IDs (already in codebase)
```

### Phase 3: UI Component (45 min)
```bash
# 1. Create file
touch src/components/workspace/VersionHistory.tsx

# 2. Implement (see action plan for full code):
# - List snapshots (reverse chronological)
# - Restore button with confirmation
# - Loading/empty states
# - Format dates ("Today", "Yesterday", "3 days ago")
```

### Phase 4: Integration (60 min)
**File**: `src/components/workspace/Editor.tsx`

```typescript
// 1. Add imports
import { createSnapshot } from '@/services/snapshotService';
import { VersionHistory } from './VersionHistory';
import { History } from 'lucide-react';

// 2. Add state
const [showVersionHistory, setShowVersionHistory] = useState(false);

// 3. Add History button in header
<Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
  <History className="mr-2 h-4 w-4" />
  History
</Button>

// 4. Add Sheet at end of JSX
<Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
  <SheetContent className="w-96">
    <SheetHeader><SheetTitle>Version History</SheetTitle></SheetHeader>
    <VersionHistory manuscriptId={manuscript.id} />
  </SheetContent>
</Sheet>

// 5. Add snapshot creation helper
const createSnapshotSafe = useCallback(async (event, label?) => {
  const editor = getGlobalEditor();
  if (!editor || !manuscript) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await createSnapshot(editor, manuscript.id, event, user?.id || 'system', label);
  } catch (error) {
    console.error('Failed to create snapshot:', error);
  }
}, [manuscript]);

// 6. Hook to upload completion (find in polling/subscription logic)
// await createSnapshotSafe('upload', 'Initial upload');
```

### Phase 5: Types (15 min)
```bash
# Regenerate types from database
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Verify snapshots field added
grep -A 5 "snapshots" src/integrations/supabase/types.ts

# Fix any TypeScript errors
npx tsc --noEmit
```

### Phase 6: Testing (45 min)
```bash
# Start dev server
pnpm run dev

# Manual tests:
# 1. Create snapshot → Check console for "✅ Snapshot created"
# 2. View history → Verify list displays
# 3. Restore version → Verify content reverts
# 4. Test edge cases → Large doc, empty doc, latest version

# Database validation
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
  SELECT id, title, jsonb_array_length(snapshots) as count
  FROM manuscripts
  WHERE snapshots != '[]'::jsonb;
"
```

---

## Key Design Decisions

1. **UUID Generation**: Use `crypto.randomUUID()` (browser native, already in codebase)
2. **Storage**: JSONB array in `manuscripts.snapshots` (simple, no new tables)
3. **Versioning**: Sequential numbers (1, 2, 3...)
4. **Events**: upload, send_to_author, return_to_editor, manual
5. **UI Pattern**: Sheet component (matches Editor.tsx style)
6. **Error Handling**: Graceful failures, toasts for user feedback

---

## Testing Checklist

- [ ] Migration applied (column exists)
- [ ] Snapshot service compiles (no TS errors)
- [ ] VersionHistory renders (no console errors)
- [ ] History button opens modal
- [ ] Create snapshot → Appears in list
- [ ] Restore snapshot → Content reverts
- [ ] Confirmation dialog works
- [ ] Empty state displays correctly
- [ ] Latest version restore disabled
- [ ] Large doc (85K words) performs well
- [ ] Database updated on restore
- [ ] Types regenerated successfully

---

## Success Criteria

Feature is **COMPLETE** when:

✅ User can click "History" button
✅ Version list displays with dates, word counts
✅ User can restore previous versions
✅ Confirmation dialog prevents accidental restore
✅ Snapshots created on workflow events
✅ No TypeScript errors
✅ No runtime errors
✅ Database queries return snapshots correctly

---

## Common Issues & Fixes

### Issue: Editor not available on restore
**Fix**: Check `getGlobalEditor()` returns valid editor

### Issue: Snapshots not saving
**Fix**: Check database logs, verify user auth, check RLS policies

### Issue: TypeScript errors on snapshots field
**Fix**: Cast as `Snapshot[]` or update interface

### Issue: Large doc freeze
**Fix**: Defer setContent with setTimeout, or optimize later

---

## File Locations Reference

| File | Purpose | Lines to Add/Modify |
|------|---------|---------------------|
| Migration SQL | Add snapshots column | New file, ~10 lines |
| snapshotService.ts | Business logic | New file, ~200 lines |
| VersionHistory.tsx | UI component | New file, ~250 lines |
| Editor.tsx | Integration | ~50 lines (imports, state, button, sheet, helper) |
| types.ts | Type definitions | Regenerate (auto) |

---

## Next Steps After Completion

**Immediate (v1.0 Phase 2)**:
1. Hook snapshots to DOCX upload completion
2. Add send_to_author snapshot on workflow transition
3. Add return_to_editor snapshot on workflow transition

**Future (v1.1+)**:
1. Diff viewer (side-by-side comparison)
2. Manual "Create Snapshot" button with label input
3. Snapshot cleanup (delete old versions)
4. Export snapshot as DOCX
5. Snapshot on AI Pass completion

---

## Quick Commands

```bash
# Complete setup in one go
cd /Users/andresterranova/manuscript-ballast

# 1. Migration
cd supabase/migrations && \
  touch "$(date +%Y%m%d%H%M%S)_add_snapshots_to_manuscripts.sql" && \
  cd ../..

# 2. Service
touch src/services/snapshotService.ts

# 3. Component
touch src/components/workspace/VersionHistory.tsx

# 4. Types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# 5. Test
pnpm run dev
```

---

**Full Details**: See `/docs/implementation-plans/manual-snapshots-action-plan.md`

**Last Updated**: January 6, 2025
