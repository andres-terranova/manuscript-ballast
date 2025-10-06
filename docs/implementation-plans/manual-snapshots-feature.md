# Manual Snapshots Feature - Implementation Plan

**Date**: January 2025
**Priority**: High (Phase 3 v1.0)
**Estimated Time**: 3-4 hours
**Approach**: Path 2 - Manual Snapshots in PostgreSQL

---

## Executive Summary

Implement version history using manual snapshots stored in PostgreSQL JSONB array. This is the quickest path to versioning, requiring no new dependencies and using familiar TipTap APIs.

**Decision**: Manual snapshots over TipTap Snapshot extension
- Faster implementation (3-4 hours vs 1-2 days)
- Full data ownership (PostgreSQL)
- No Y.js/collaboration provider setup needed
- Already planned in docs/architecture/versioning.md

---

## Feature Requirements

### Core Functionality

1. **Snapshot Creation**
   - Capture document state at workflow milestones
   - Store as JSONB in manuscripts.snapshots array
   - Include metadata (word count, character count, timestamp)
   - Support events: upload, send_to_author, return_to_editor, manual

2. **Snapshot Storage**
   - JSONB array in manuscripts table
   - Sequential version numbers (1, 2, 3...)
   - Each snapshot includes:
     - id (UUID)
     - version (number)
     - event (string)
     - label (optional string)
     - content (TipTap JSON from editor.getJSON())
     - metadata (wordCount, characterCount)
     - createdAt (ISO timestamp)
     - createdBy (user ID)

3. **Version History UI**
   - List all snapshots in sidebar/modal
   - Display version number, date, event type, word count
   - Restore button for each version
   - Confirmation dialog before restoring

4. **Snapshot Restoration**
   - Load snapshot content
   - Apply to editor using editor.commands.setContent()
   - Optionally update database content fields

---

## Technical Architecture

### Database Schema

**Current State** (from src/integrations/supabase/types.ts):
```typescript
manuscripts: {
  content_html: string | null
  content_text: string | null
  // NO snapshots field currently
}
```

**Target State**:
```typescript
manuscripts: {
  content_html: string | null
  content_text: string | null
  snapshots: Json | null  // NEW FIELD
}
```

**Migration SQL**:
```sql
ALTER TABLE manuscripts
ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;
```

**Snapshot JSON Structure**:
```json
{
  "snapshots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "version": 1,
      "event": "upload",
      "label": null,
      "content": {
        "type": "doc",
        "content": [
          { "type": "paragraph", "content": [...] }
        ]
      },
      "metadata": {
        "wordCount": 85000,
        "characterCount": 488000
      },
      "createdAt": "2025-01-06T10:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "version": 2,
      "event": "send_to_author",
      "label": "First editorial pass",
      "content": { /* TipTap JSON */ },
      "metadata": {
        "wordCount": 84500,
        "characterCount": 485000
      },
      "createdAt": "2025-01-06T14:30:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

---

## Implementation Steps

### Step 1: Database Migration (5 minutes)

**File**: `supabase/migrations/[timestamp]_add_snapshots_to_manuscripts.sql`

```sql
-- Add snapshots column to manuscripts table
ALTER TABLE manuscripts
ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;

-- Add index for snapshot queries (optional, for performance)
CREATE INDEX idx_manuscripts_snapshots
ON manuscripts USING gin ((snapshots::jsonb));
```

**Actions**:
1. Create migration file with timestamp
2. Run `supabase db reset` to apply
3. Verify column exists in Supabase dashboard

---

### Step 2: Snapshot Service Implementation (30 minutes)

**File**: `src/services/snapshotService.ts` (NEW FILE)

```typescript
import { Editor } from '@tiptap/core'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/integrations/supabase/client'

export type SnapshotEvent = 'upload' | 'send_to_author' | 'return_to_editor' | 'manual'

interface Snapshot {
  id: string
  version: number
  event: SnapshotEvent
  label?: string
  content: any  // TipTap JSON
  metadata: {
    wordCount: number
    characterCount: number
  }
  createdAt: string
  createdBy: string
}

/**
 * Create a snapshot of the current document state
 */
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string
): Promise<void> {
  // Get current document state
  const content = editor.getJSON()
  const text = editor.getText()
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const characterCount = text.length

  // Fetch existing snapshots
  const { data: manuscript, error: fetchError } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single()

  if (fetchError) {
    console.error('Error fetching snapshots:', fetchError)
    throw new Error(`Failed to fetch snapshots: ${fetchError.message}`)
  }

  const existingSnapshots = manuscript?.snapshots || []
  const version = existingSnapshots.length + 1

  // Create new snapshot
  const snapshot: Snapshot = {
    id: uuidv4(),
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
  }

  // Update database
  const { error: updateError } = await supabase
    .from('manuscripts')
    .update({ snapshots: [...existingSnapshots, snapshot] })
    .eq('id', manuscriptId)

  if (updateError) {
    console.error('Error creating snapshot:', updateError)
    throw new Error(`Failed to create snapshot: ${updateError.message}`)
  }

  console.log(`✅ Snapshot created: v${version} (${event})`)
}

/**
 * Restore a specific snapshot version
 */
export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<void> {
  // Fetch snapshots
  const { data: manuscript, error: fetchError } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single()

  if (fetchError) {
    console.error('Error fetching snapshots:', fetchError)
    throw new Error(`Failed to fetch snapshots: ${fetchError.message}`)
  }

  // Find requested version
  const snapshot = manuscript?.snapshots?.find((s: Snapshot) => s.version === version)

  if (!snapshot) {
    throw new Error(`Snapshot version ${version} not found`)
  }

  // Restore to editor
  editor.commands.setContent(snapshot.content)

  // Optionally update database content fields
  const { error: updateError } = await supabase
    .from('manuscripts')
    .update({
      content_html: editor.getHTML(),
      word_count: snapshot.metadata.wordCount,
      character_count: snapshot.metadata.characterCount
    })
    .eq('id', manuscriptId)

  if (updateError) {
    console.error('Error updating manuscript after restore:', updateError)
    // Don't throw - editor content is already restored
  }

  console.log(`✅ Restored to version ${version}`)
}

/**
 * Get all snapshots for a manuscript
 */
export async function getSnapshots(manuscriptId: string): Promise<Snapshot[]> {
  const { data: manuscript, error } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single()

  if (error) {
    console.error('Error fetching snapshots:', error)
    return []
  }

  return manuscript?.snapshots || []
}
```

**Testing**:
- Create snapshot with mock editor
- Verify snapshot appears in database
- Restore snapshot and verify editor content updates

---

### Step 3: Version History UI Component (1 hour)

**File**: `src/components/workspace/VersionHistory.tsx` (NEW FILE)

```tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { getSnapshots, restoreSnapshot, type Snapshot } from '@/services/snapshotService'
import { getGlobalEditor } from '@/lib/editorUtils'
import { useToast } from '@/hooks/use-toast'
import { RotateCcw, Clock } from 'lucide-react'

interface VersionHistoryProps {
  manuscriptId: string
}

export function VersionHistory({ manuscriptId }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSnapshots()
  }, [manuscriptId])

  const loadSnapshots = async () => {
    setLoading(true)
    try {
      const history = await getSnapshots(manuscriptId)
      // Reverse to show most recent first
      setSnapshots(history.reverse())
    } catch (error) {
      console.error('Error loading snapshots:', error)
      toast({
        title: 'Failed to load version history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (version: number) => {
    const editor = getGlobalEditor()
    if (!editor) {
      toast({
        title: 'Editor not available',
        variant: 'destructive'
      })
      return
    }

    const confirmed = confirm(
      `Restore to version ${version}? Current changes will be lost.`
    )

    if (!confirmed) return

    setRestoring(version)
    try {
      await restoreSnapshot(editor, manuscriptId, version)
      toast({
        title: 'Version restored successfully',
        description: `Document restored to version ${version}`
      })
    } catch (error) {
      console.error('Error restoring snapshot:', error)
      toast({
        title: 'Failed to restore version',
        description: error.message || 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setRestoring(null)
    }
  }

  const formatEvent = (event: string): string => {
    const labels = {
      upload: 'Initial Upload',
      send_to_author: 'Sent to Author',
      return_to_editor: 'Returned to Editor',
      manual: 'Manual Snapshot'
    }
    return labels[event] || event
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading version history...</p>
        </div>
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No version history yet</p>
          <p className="text-xs text-muted-foreground mt-2">
            Versions are created when you send to author or create manual snapshots
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">Version History</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {snapshots.length} {snapshots.length === 1 ? 'version' : 'versions'}
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Version {snapshot.version}</span>
                  {snapshot.version === snapshots[0].version && (
                    <Badge variant="secondary" className="text-xs">Latest</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(snapshot.createdAt)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                {formatEvent(snapshot.event)}
                {snapshot.label && (
                  <span className="text-foreground"> - {snapshot.label}</span>
                )}
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                {snapshot.metadata.wordCount.toLocaleString()} words
                {' · '}
                {snapshot.metadata.characterCount.toLocaleString()} characters
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestore(snapshot.version)}
                disabled={restoring !== null}
              >
                {restoring === snapshot.version ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Restore
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Testing**:
- Verify list displays correctly
- Test restore functionality
- Verify loading and empty states

---

### Step 4: Integrate with Editor Component (1 hour)

**File**: `src/components/workspace/Editor.tsx` (MODIFY)

**Changes needed**:

1. **Add imports** (top of file):
```typescript
import { createSnapshot } from '@/services/snapshotService'
import { VersionHistory } from './VersionHistory'
```

2. **Add state** (around line 66):
```typescript
const [showVersionHistory, setShowVersionHistory] = useState(false)
```

3. **Add History button to header** (around line 1157, next to other buttons):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowVersionHistory(true)}
  className="hidden lg:flex"
>
  <RotateCcw className="mr-2 h-4 w-4" />
  History
</Button>
```

4. **Create snapshots at workflow events**:

   a. **On upload** (in upload success handler - needs to be added):
   ```typescript
   // After DOCX processing completes
   await createSnapshot(
     editor,
     manuscript.id,
     'upload',
     userId,
     'Original upload'
   )
   ```

   b. **When sending to author** (add to send handler when implemented):
   ```typescript
   const handleSendToAuthor = async () => {
     // ... existing send logic

     await createSnapshot(
       editor,
       manuscript.id,
       'send_to_author',
       userId,
       'Sent to author'
     )
   }
   ```

   c. **When returning to editor** (add to return handler when implemented):
   ```typescript
   const handleReturnToEditor = async () => {
     // ... existing return logic

     await createSnapshot(
       editor,
       manuscript.id,
       'return_to_editor',
       userId,
       'Returned from author'
     )
   }
   ```

5. **Add Version History Sheet/Modal** (at end of component, around line 1540):
```tsx
{/* Version History Sheet */}
<Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
  <SheetContent className="w-96">
    <SheetHeader>
      <SheetTitle>Version History</SheetTitle>
    </SheetHeader>
    <VersionHistory manuscriptId={manuscript.id} />
  </SheetContent>
</Sheet>
```

**Testing**:
- Click History button, verify modal opens
- Verify version list displays
- Test restore from UI

---

### Step 5: Update TypeScript Types (30 minutes)

**Actions**:

1. **Regenerate Supabase types**:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

2. **Verify snapshots field appears**:
```typescript
manuscripts: {
  Row: {
    // ...
    snapshots: Json | null  // ← Should be added
  }
}
```

3. **Fix any TypeScript errors** that appear from the new field

---

### Step 6: Testing & Validation (30 minutes)

**Test Cases**:

1. ✅ Create snapshot manually
   - Open manuscript
   - Trigger snapshot creation
   - Verify appears in database

2. ✅ View version history
   - Click History button
   - Verify list displays
   - Check formatting of dates, word counts

3. ✅ Restore version
   - Select older version
   - Click Restore
   - Verify editor content updates
   - Check confirmation dialog works

4. ✅ Sequential versioning
   - Create multiple snapshots
   - Verify version numbers increment (1, 2, 3...)

5. ✅ Empty state
   - New manuscript with no snapshots
   - Verify empty state message displays

6. ✅ Error handling
   - Test with invalid manuscript ID
   - Verify error toasts display

---

## File Structure

**New Files**:
```
src/services/snapshotService.ts              (NEW)
src/components/workspace/VersionHistory.tsx  (NEW)
supabase/migrations/[timestamp]_add_snapshots_to_manuscripts.sql  (NEW)
```

**Modified Files**:
```
src/components/workspace/Editor.tsx          (MODIFY - add button, modal, snapshot calls)
src/integrations/supabase/types.ts           (REGENERATE)
```

---

## Success Criteria

✅ Database migration applied successfully
✅ Snapshots created at workflow events
✅ Version history displays in UI
✅ Restore functionality works
✅ No TypeScript errors
✅ All test cases pass

---

## Future Enhancements (v1.1+)

- 🔮 Manual "Create Snapshot" button with custom label
- 🔮 Diff viewer (side-by-side comparison)
- 🔮 Export snapshot as DOCX
- 🔮 Delete old snapshots (cleanup)
- 🔮 Snapshot on AI Pass completion

---

## Dependencies

**Existing**:
- `@tiptap/core` - Already installed
- `uuid` - Already installed
- Supabase client - Already configured
- UI components (Button, ScrollArea, Sheet) - Already available

**No new dependencies required** ✅

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large snapshots (85K words) | Database bloat | Monitor size, add cleanup in v1.1 |
| Concurrent snapshot creation | Race condition | Use database transactions |
| Editor not initialized | Restore fails | Check editor availability before restore |
| User cancels restore | Wasted API call | Confirm before fetching snapshot |

---

## Related Documentation

- `docs/architecture/versioning.md` - Original versioning strategy
- `docs/product/roadmap.md` - Phase 3 timeline
- `docs/architecture/database.md` - Database architecture

---

**Ready for handoff to feature-planner agent**
