# Snapshots & Versioning Feature

## Overview

Production-ready manual versioning system for manuscripts using TipTap's native JSON document format. Users can save versions at any time via the "Save Version" button and restore previous versions through the Version History interface.

**Status**: ✅ Production-ready for manual snapshots
**Phase 2**: Auto-snapshots on workflow transitions (prepared hooks)

## Key Features

### Implemented (Production)
- ✅ Manual version saving via "Save Version" button
- ✅ Version history viewing with metadata
- ✅ Restore previous versions with confirmation
- ✅ Sequential versioning (v1, v2, v3...)
- ✅ JSONB storage in manuscripts table
- ✅ GIN index for performance
- ✅ Integration with TipTap's JSON APIs

### Prepared for Phase 2
- 🔮 Auto-snapshot on DOCX upload
- 🔮 Auto-snapshot on "Send to Author"
- 🔮 Auto-snapshot on "Return to Editor"
- 🔮 Snapshot comparison/diff view

## Technical Architecture

### TipTap Integration

The feature leverages TipTap's native document APIs:

```typescript
// Capture current document state
const content = editor.getJSON(); // Returns JSONContent

// Restore a previous version
editor.commands.setContent(snapshot.content); // Accepts JSONContent
```

**JSONContent Type**: TipTap's internal document format
- Hierarchical JSON structure
- Preserves all formatting and content
- Compatible with TipTap's restoration APIs
- Efficient storage and parsing

### Data Storage

**Location**: `manuscripts.snapshots` JSONB column

```sql
-- Migration: 20250106_add_snapshots_to_manuscripts.sql
ALTER TABLE manuscripts
ADD COLUMN IF NOT EXISTS snapshots JSONB DEFAULT '[]'::jsonb;

-- Performance index
CREATE INDEX idx_manuscripts_snapshots
ON manuscripts USING gin (snapshots);
```

**Storage Pattern**: JSONB array (no separate table)
- Simpler schema management
- Single query to fetch all versions
- Efficient for typical use (3-10 snapshots)
- Trade-off: Updates rewrite entire array

### Snapshot Data Structure

```typescript
interface Snapshot {
  id: string;                    // UUID for uniqueness
  version: number;               // Sequential: 1, 2, 3...
  event: SnapshotEvent;          // Event that triggered snapshot
  content: JSONContent;          // TipTap document JSON (content only, no AI suggestions)
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount: number;    // Count of AI suggestions at time of snapshot (for reference only)
    acceptedCount?: number;      // For workflow events
    rejectedCount?: number;      // For workflow events
  };
  createdAt: string;            // ISO timestamp
  createdBy: string;            // User ID from auth
}

type SnapshotEvent =
  | 'manual'              // User clicked "Save Version"
  | 'upload'              // DOCX upload completed (future)
  | 'send_to_author'      // Editor sends to author (future)
  | 'return_to_editor';   // Author returns to editor (future)
```

## How Snapshots and AI Suggestions Interact

### What Snapshots Capture

**Snapshots capture document content only.** They preserve:
- Document text via `editor.getJSON()` (TipTap JSONContent format)
- Applied text changes (including previously applied AI suggestions that are now permanent)
- Document structure, formatting, and marks
- Metadata about the document state (word count, character count)

### What Snapshots DON'T Capture

**Snapshots do NOT preserve unapplied AI suggestions.** They don't capture:
- Unapplied AI suggestions (stored in `editor.extensionStorage.aiSuggestion`)
- AI suggestion decorations (presentation layer only)
- Pending suggestions that haven't been accepted/rejected
- The AI suggestion UI state (popovers, highlights)

### Technical Separation

The two systems operate independently:
- **AI suggestions**: Stored in TipTap's extension storage (`editor.extensionStorage.aiSuggestion`)
- **Snapshots**: Capture document content via `editor.getJSON()`
- **No conflicts**: The systems work on different layers (content vs. extension storage)

### Key Behaviors

1. **When creating a snapshot**: Only the document content is saved. Any unapplied AI suggestions remain in extension storage but are not part of the snapshot.

2. **When restoring a snapshot**: The document content is replaced, and any pending AI suggestions are cleared (they're not preserved in the snapshot).

3. **When applying an AI suggestion**: The suggestion becomes permanent text in the document. Only then will it be captured in future snapshots.

4. **Metadata only**: The `suggestionCount` in snapshot metadata is informational only - it records how many suggestions existed at snapshot time but doesn't preserve the suggestions themselves.

### Example Workflow

```typescript
// AI suggestions are in extension storage, not document
const aiStorage = editor.extensionStorage?.aiSuggestion;
const suggestions = aiStorage?.getSuggestions() || []; // These are NOT in snapshots

// Create snapshot - captures document only
const content = editor.getJSON(); // Document content only
await createSnapshot({ content, metadata: { suggestionCount: suggestions.length } });

// Apply a suggestion - it becomes permanent text
editor.chain().applyAiSuggestion(suggestionId).run();
// Now this change IS part of the document and WILL be in future snapshots

// Restore snapshot - clears pending suggestions
editor.commands.setContent(snapshot.content);
// Any unapplied suggestions are gone - they weren't in the snapshot
```

## Implementation Details

### Core Service: `snapshotService.ts`

Located at `src/services/snapshotService.ts`

#### Key Functions

```typescript
// Create a new snapshot
async function createSnapshot({
  manuscriptId: string;
  event: SnapshotEvent;
  content: JSONContent;
  metadata: SnapshotMetadata;
}): Promise<Snapshot>

// Get all snapshots for a manuscript
async function getSnapshots(
  manuscriptId: string
): Promise<Snapshot[]>

// Restore a specific version
async function restoreSnapshot(
  manuscriptId: string,
  snapshotId: string,
  editor: Editor
): Promise<void>
```

#### Error Handling

```typescript
try {
  const snapshot = await createSnapshot({...});
  toast.success('Version saved successfully');
} catch (error) {
  console.error('Failed to create snapshot:', error);
  toast.error('Failed to save version');
  // Continue - snapshots are nice-to-have, not critical
}
```

### UI Components

#### 1. Save Version Button (`Editor.tsx`)

**Location**: Header toolbar (lines 1537-1552)

```tsx
<button
  onClick={handleSaveVersion}
  className="inline-flex items-center px-4 py-2 ..."
  disabled={!manuscript || isSaving}
>
  <Save className="w-4 h-4 mr-2" />
  {isSaving ? 'Saving...' : 'Save Version'}
</button>
```

**Handler** (lines 1198-1216):
```typescript
const createSnapshotSafe = useCallback(async (event) => {
  const editor = getGlobalEditor();
  if (!editor || !manuscript) return false;

  try {
    const content = editor.getJSON();
    const text = editor.state.doc.textContent;

    await snapshotService.createSnapshot({
      manuscriptId: manuscript.id,
      event,
      content,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        characterCount: text.length,
        suggestionCount: suggestions.length,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return false;
  }
}, [manuscript, suggestions]);
```

#### 2. Version History Component

**Location**: `src/components/workspace/VersionHistory.tsx`

**Features**:
- Displays all saved versions
- Shows metadata (word count, date, event type)
- Restore button with confirmation dialog
- Empty state when no versions exist
- Loading and error states

**Props**:
```typescript
interface VersionHistoryProps {
  manuscriptId: string;
  editor: Editor | null;
  onVersionRestored?: (version: number) => void;
}
```

**UI Structure**:
```
Version History
├── Version 3 (Current)
│   ├── Event: Manual Save
│   ├── Words: 85,234
│   ├── Date: Jan 6, 2025 2:30 PM
│   └── [Current Version]
├── Version 2
│   ├── Event: Manual Save
│   ├── Words: 85,100
│   ├── Date: Jan 6, 2025 10:00 AM
│   └── [Restore]
└── Version 1
    ├── Event: Manual Save
    ├── Words: 85,000
    ├── Date: Jan 6, 2025 9:00 AM
    └── [Restore]
```

## Event Types Explained

### Manual (Implemented)
- **Trigger**: User clicks "Save Version" button
- **Purpose**: User-controlled checkpointing
- **Metadata**: Current word count, character count, suggestion count
- **Use Case**: Save before major edits, create restore points

### Upload (Future)
- **Trigger**: DOCX processing completes
- **Purpose**: Capture original document state
- **Metadata**: Initial counts, zero suggestions
- **Use Case**: Baseline for all changes

### Send to Author (Future)
- **Trigger**: Editor clicks workflow button
- **Purpose**: Capture editor's completed work
- **Metadata**: All counts plus suggestion stats
- **Use Case**: Track what author receives

### Return to Editor (Future)
- **Trigger**: Author completes review
- **Purpose**: Capture author's decisions
- **Metadata**: Accepted/rejected suggestion counts
- **Use Case**: Track author's changes

## Testing Guide

### Manual Testing Checklist

1. **Save Version**
   - [ ] Click "Save Version" button
   - [ ] Verify success toast appears
   - [ ] Check version appears in history
   - [ ] Verify version number increments

2. **View History**
   - [ ] Click "Version History" button
   - [ ] Verify all versions listed
   - [ ] Check metadata is accurate
   - [ ] Verify current version marked

3. **Restore Version**
   - [ ] Click "Restore" on older version
   - [ ] Confirm in dialog
   - [ ] Verify document reverts
   - [ ] Check editor content matches
   - [ ] Verify success notification

4. **Edge Cases**
   - [ ] Save with no changes (should work)
   - [ ] Save during AI processing (should queue)
   - [ ] Restore with unsaved changes (warns user)
   - [ ] Large document (85K words)
   - [ ] Multiple rapid saves

5. **AI Suggestions Interaction**
   - [ ] Create snapshot with pending AI suggestions
   - [ ] Verify suggestionCount in metadata reflects current count
   - [ ] Restore snapshot and confirm pending suggestions are cleared
   - [ ] Apply AI suggestion, create snapshot, verify it's in content
   - [ ] Restore to version before AI suggestion was applied

### Automated Testing

```typescript
describe('Snapshot Service', () => {
  it('creates snapshot with sequential version', async () => {
    const snapshot1 = await createSnapshot({...});
    expect(snapshot1.version).toBe(1);

    const snapshot2 = await createSnapshot({...});
    expect(snapshot2.version).toBe(2);
  });

  it('restores content accurately', async () => {
    const original = editor.getJSON();
    await createSnapshot({...});

    // Make changes
    editor.commands.insertContent('New text');

    // Restore
    await restoreSnapshot(manuscriptId, snapshotId, editor);
    expect(editor.getJSON()).toEqual(original);
  });

  it('handles missing snapshots gracefully', async () => {
    const snapshots = await getSnapshots('invalid-id');
    expect(snapshots).toEqual([]);
  });
});
```

## Performance Considerations

### Current Performance
- **Small docs (10K words)**: ~50KB per snapshot
- **Medium docs (40K words)**: ~200KB per snapshot
- **Large docs (85K words)**: ~500KB-1MB per snapshot
- **Typical usage**: 3-10 snapshots = 150KB-10MB total

### GIN Index Benefits
- Fast lookups within JSONB array
- Efficient filtering by version or event
- Minimal overhead for writes
- Significant speedup for reads

### Optimization Strategies
If performance degrades with many snapshots:
1. Limit to 20 most recent versions
2. Archive old snapshots to separate storage
3. Implement lazy loading (fetch on demand)
4. Consider compression before storage

## Future Enhancements

### Phase 2: Auto-Snapshots
```typescript
// Hook into DOCX processing
onDocxProcessingComplete(() => {
  createSnapshotSafe('upload');
});

// Hook into workflow transitions
onSendToAuthor(() => {
  createSnapshotSafe('send_to_author');
});

onReturnToEditor(() => {
  createSnapshotSafe('return_to_editor');
});
```

### Potential Features
- **Diff Viewer**: Side-by-side version comparison
- **Snapshot Notes**: Add descriptions to versions
- **Named Versions**: Custom labels like "Final Draft"
- **Export Version**: Download specific version as DOCX
- **Auto-save Timer**: Periodic automatic snapshots
- **Branching**: Create alternate versions

### Not Planned
- Real-time collaboration (use Yjs/CRDT solution)
- Operational transforms (complex, unnecessary)
- Git-style merging (out of scope)
- Infinite version history (storage concerns)

## API Reference

### Snapshot Service API

```typescript
// Create snapshot
POST /api/snapshots
Body: {
  manuscriptId: string;
  event: SnapshotEvent;
  content: JSONContent;
  metadata: SnapshotMetadata;
}
Response: Snapshot

// Get snapshots
GET /api/manuscripts/:id/snapshots
Response: Snapshot[]

// Restore snapshot
POST /api/snapshots/:id/restore
Body: { manuscriptId: string }
Response: { success: boolean }
```

### Database Operations

```typescript
// Using Supabase client
const { data: manuscript } = await supabase
  .from('manuscripts')
  .select('snapshots')
  .eq('id', manuscriptId)
  .single();

const snapshots = manuscript?.snapshots || [];

// Add new snapshot
const updated = [...snapshots, newSnapshot];
await supabase
  .from('manuscripts')
  .update({ snapshots: updated })
  .eq('id', manuscriptId);
```

## Troubleshooting

### Common Issues

**Snapshot not saving**
- Check network tab for errors
- Verify user is authenticated
- Check manuscript exists
- Look for console errors

**Restore not working**
- Verify editor instance is ready
- Check content format is valid JSON
- Ensure snapshot exists in database
- Look for TipTap errors

**Version numbers wrong**
- Check for race conditions
- Verify sequential calculation
- Look for duplicate saves
- Check array ordering

**AI suggestions disappear after restore**
- This is expected behavior - snapshots don't preserve unapplied suggestions
- Only applied suggestions (permanent text) are preserved
- To preserve suggestions, apply them before creating snapshot
- Consider warning users about pending suggestions before restore

### Debug Helpers

```typescript
// Log snapshot creation
console.log('Creating snapshot:', {
  manuscriptId,
  event,
  contentSize: JSON.stringify(content).length,
  metadata
});

// Verify restoration
console.log('Before restore:', editor.getJSON());
await restoreSnapshot(...);
console.log('After restore:', editor.getJSON());

// Check storage
const { data } = await supabase
  .from('manuscripts')
  .select('snapshots')
  .eq('id', manuscriptId)
  .single();
console.log('Stored snapshots:', data.snapshots);
```

## Related Documentation

- [Database Architecture](../architecture/database.md) - JSONB storage design
- [Versioning Strategy](../architecture/versioning.md) - Architectural decisions
- [Editor Component](../technical/editor-component.md) - Integration details
- [TipTap Snapshot Docs](https://tiptap.dev/docs/collaboration/documents/snapshot) - Official API

---

**Last Updated**: January 6, 2025 - Clarified that snapshots capture document content only and do not preserve unapplied AI suggestions

## Tags

#snapshots #versioning #tiptap #feature #production #manual #JSONContent #JSONB #database #UI #restoration #history