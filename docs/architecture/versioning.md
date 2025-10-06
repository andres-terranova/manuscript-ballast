# Versioning Strategy

## Design Philosophy

**Use TipTap Native Snapshots**: Leverage TipTap's built-in snapshot API rather than building a custom versioning system.

**Simple JSON Storage**: Store snapshots as JSON objects in the manuscripts.snapshots JSONB array.

**Event-Based Captures**: Create snapshots at key lifecycle events, not on every edit.

**No Complex Diff Viewers**: Keep it simple without custom diff visualization (may add in future).

## TipTap Snapshot API

TipTap provides a native snapshot API for capturing document state:

**Documentation**: https://tiptap.dev/docs/collaboration/documents/snapshot

**What It Provides:**
- JSON representation of entire document structure
- Content and formatting captured together
- Compatible with TipTap's document restoration
- Vendor-supported and maintained

**What We Store:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Document content here..."
        }
      ]
    }
  ]
}
```

## Snapshot Storage

### manuscripts.snapshots JSONB Array

Snapshots stored in chronological array in manuscripts table:

```sql
ALTER TABLE manuscripts
ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;
```

### Snapshot Structure

```typescript
interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential: 1, 2, 3...
  event: SnapshotEvent;         // Event that triggered snapshot
  content: object;               // TipTap document JSON
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount: number;
    acceptedCount?: number;
    rejectedCount?: number;
  };
  createdAt: string;            // ISO timestamp
  createdBy: string;            // User ID who triggered event
}

type SnapshotEvent =
  | 'upload'              // Initial DOCX upload
  | 'send_to_author'      // Editor sends to author
  | 'return_to_editor';   // Author returns to editor
```

### Example Snapshot Array

```json
{
  "snapshots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "version": 1,
      "event": "upload",
      "content": {
        "type": "doc",
        "content": [...]
      },
      "metadata": {
        "wordCount": 85000,
        "characterCount": 488000,
        "suggestionCount": 0
      },
      "createdAt": "2025-10-05T10:00:00Z",
      "createdBy": "editor-user-id"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "version": 2,
      "event": "send_to_author",
      "content": {
        "type": "doc",
        "content": [...]
      },
      "metadata": {
        "wordCount": 85000,
        "characterCount": 488000,
        "suggestionCount": 5005,
        "acceptedCount": 0,
        "rejectedCount": 0
      },
      "createdAt": "2025-10-05T10:25:00Z",
      "createdBy": "editor-user-id"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "version": 3,
      "event": "return_to_editor",
      "content": {
        "type": "doc",
        "content": [...]
      },
      "metadata": {
        "wordCount": 84500,
        "characterCount": 485000,
        "suggestionCount": 5005,
        "acceptedCount": 4823,
        "rejectedCount": 182
      },
      "createdAt": "2025-10-06T14:30:00Z",
      "createdBy": "author-user-id"
    }
  ]
}
```

## Snapshot Events

### When Snapshots Are Captured

**1. Upload (version 1)**
- Trigger: DOCX file successfully processed
- Who: Editor
- State: Original manuscript before AI processing
- Purpose: Baseline for comparison

**2. Send to Author (version 2+)**
- Trigger: Editor clicks "Send to Author"
- Who: Editor
- State: Document with AI suggestions generated
- Purpose: What the author receives to review

**3. Return to Editor (version 3+)**
- Trigger: Author clicks "Return to Editor"
- Who: Author
- State: Document with suggestions accepted/rejected
- Purpose: Author's final decisions

### What's NOT Captured

❌ **Auto-save checkpoints**: Too frequent, storage inefficient
❌ **Every edit**: Would create massive arrays
❌ **Draft states**: Only milestone events
❌ **Intermediate saves**: User controls timing via workflow actions

## Implementation

### Creating a Snapshot

```typescript
// src/services/snapshotService.ts

import { Editor } from '@tiptap/core';
import { v4 as uuidv4 } from 'uuid';

interface CreateSnapshotParams {
  editor: Editor;
  manuscriptId: string;
  event: 'upload' | 'send_to_author' | 'return_to_editor';
  userId: string;
  suggestionCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
}

export async function createSnapshot({
  editor,
  manuscriptId,
  event,
  userId,
  suggestionCount = 0,
  acceptedCount,
  rejectedCount
}: CreateSnapshotParams): Promise<void> {
  // Get TipTap document JSON
  const content = editor.getJSON();

  // Calculate metadata
  const text = editor.getText();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const characterCount = text.length;

  // Get current snapshots
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single();

  const existingSnapshots = manuscript?.snapshots || [];
  const version = existingSnapshots.length + 1;

  // Create new snapshot
  const snapshot = {
    id: uuidv4(),
    version,
    event,
    content,
    metadata: {
      wordCount,
      characterCount,
      suggestionCount,
      ...(acceptedCount !== undefined && { acceptedCount }),
      ...(rejectedCount !== undefined && { rejectedCount })
    },
    createdAt: new Date().toISOString(),
    createdBy: userId
  };

  // Append to snapshots array
  const updatedSnapshots = [...existingSnapshots, snapshot];

  // Update database
  await supabase
    .from('manuscripts')
    .update({ snapshots: updatedSnapshots })
    .eq('id', manuscriptId);
}
```

### Restoring from Snapshot

```typescript
// src/services/snapshotService.ts

export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<void> {
  // Fetch manuscript with snapshots
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single();

  if (!manuscript?.snapshots) {
    throw new Error('No snapshots found');
  }

  // Find requested version
  const snapshot = manuscript.snapshots.find(
    (s: any) => s.version === version
  );

  if (!snapshot) {
    throw new Error(`Snapshot version ${version} not found`);
  }

  // Restore content to editor
  editor.commands.setContent(snapshot.content);

  // Optionally restore to database as well
  await supabase
    .from('manuscripts')
    .update({
      content: editor.getHTML(),
      word_count: snapshot.metadata.wordCount,
      character_count: snapshot.metadata.characterCount
    })
    .eq('id', manuscriptId);
}
```

### Listing Snapshots

```typescript
// src/services/snapshotService.ts

export async function getSnapshotHistory(
  manuscriptId: string
): Promise<Snapshot[]> {
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single();

  return manuscript?.snapshots || [];
}
```

## UI Components

### Version History View

Simple list of snapshots with restore capability:

```typescript
// src/components/workspace/VersionHistory.tsx

interface VersionHistoryProps {
  manuscriptId: string;
  editor: Editor;
}

export function VersionHistory({ manuscriptId, editor }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    getSnapshotHistory(manuscriptId).then(setSnapshots);
  }, [manuscriptId]);

  const handleRestore = async (version: number) => {
    if (confirm(`Restore to version ${version}? Current changes will be lost.`)) {
      await restoreSnapshot(editor, manuscriptId, version);
    }
  };

  return (
    <div className="version-history">
      <h3>Version History</h3>
      {snapshots.map(snapshot => (
        <div key={snapshot.id} className="snapshot-item">
          <div className="snapshot-header">
            <span className="version">Version {snapshot.version}</span>
            <span className="event">{formatEvent(snapshot.event)}</span>
          </div>
          <div className="snapshot-meta">
            <span>{snapshot.metadata.wordCount.toLocaleString()} words</span>
            <span>{formatDate(snapshot.createdAt)}</span>
          </div>
          <button onClick={() => handleRestore(snapshot.version)}>
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}

function formatEvent(event: string): string {
  const eventLabels = {
    upload: 'Initial Upload',
    send_to_author: 'Sent to Author',
    return_to_editor: 'Returned to Editor'
  };
  return eventLabels[event] || event;
}
```

## Storage Considerations

### Size Management

**Snapshot Size Estimates:**
- Small doc (10K words): ~50-100KB per snapshot
- Medium doc (40K words): ~200-500KB per snapshot
- Large doc (85K words): ~500KB-1MB per snapshot

**Total Storage Per Manuscript:**
- 3-5 snapshots typical (upload + 2-4 round trips)
- Max ~5MB per manuscript for large docs
- Acceptable for PostgreSQL JSONB storage

### Cleanup Strategy

**No Automatic Deletion**: Keep all snapshots for audit trail.

**Manual Cleanup (Future):**
- Archive old manuscripts to separate storage
- Export snapshots to file system
- Only if storage becomes concern

## What's NOT in This Design

**Deliberately Simple:**

❌ **Complex Diff Viewers**: No side-by-side comparison UI (may add later)
❌ **Immutable Snapshot Tables**: No separate version control tables
❌ **Change Tracking Between Snapshots**: No diff calculation or storage
❌ **Branch/Merge Workflows**: Linear version history only
❌ **Collaborative Editing**: Single-user snapshots
❌ **Real-time Sync**: Snapshots created manually at events

## Future Enhancements

**Possible Additions:**

🔮 **Diff Visualization**: Side-by-side snapshot comparison
🔮 **Snapshot Comments**: Add notes to snapshots
🔮 **Branching**: Create alternate versions
🔮 **Merge Conflicts**: Handle concurrent edits
🔮 **Export**: Download snapshot as DOCX

**Not Planned:**
- Real-time collaboration (complex, out of scope)
- Operational transforms (use vendor solution if needed)
- Time-travel debugging (over-engineering)

## Performance Considerations

### JSONB Performance

**Pros:**
- Fast retrieval of entire snapshot array
- Single query to get all versions
- Efficient JSON parsing in PostgreSQL

**Cons:**
- Must load entire array to access one snapshot
- Updates rewrite entire JSONB field
- Large arrays (10+ snapshots) may slow down

### Optimization Strategies

**If performance becomes an issue:**

1. **Limit Snapshot Count**: Cap at 10 most recent
2. **Archive Old Snapshots**: Move to separate storage
3. **Lazy Loading**: Only fetch latest snapshot initially
4. **Compression**: Gzip snapshot content before storing
5. **Separate Table** (last resort): Normalize to snapshots table

### Recommended Indexes

```sql
-- Only add if querying snapshots frequently
CREATE INDEX idx_manuscripts_snapshots
  ON manuscripts USING gin ((snapshots::jsonb));
```

## Testing Strategy

### Unit Tests

```typescript
describe('Snapshot Service', () => {
  it('creates snapshot with correct version number', async () => {
    // Test sequential versioning
  });

  it('restores content from snapshot', async () => {
    // Test restoration preserves content
  });

  it('handles missing snapshots gracefully', async () => {
    // Test error cases
  });
});
```

### Integration Tests

- Create snapshot on upload event
- Create snapshot on send to author
- Create snapshot on return to editor
- Restore snapshot and verify editor state
- List snapshot history

## Error Handling

```typescript
// Handle snapshot creation failures
try {
  await createSnapshot({ ... });
} catch (error) {
  console.error('Failed to create snapshot:', error);
  // Continue workflow - snapshot is nice-to-have, not critical
  // Log error for monitoring
  analytics.track('snapshot_creation_failed', { error });
}

// Handle restoration failures
try {
  await restoreSnapshot(editor, manuscriptId, version);
} catch (error) {
  console.error('Failed to restore snapshot:', error);
  toast.error('Could not restore version. Please try again.');
}
```

## Related Documentation

- **Database Schema**: [database-schema.md](database-schema.md)
- **Architecture Overview**: [README.md](README.md)
- **TipTap Snapshot API**: https://tiptap.dev/docs/collaboration/documents/snapshot

---

**Last Updated**: October 5, 2025

## Tags

#versioning #snapshots #tiptap #architecture #JSONB #database #document_history #workflow #simple_design #JSON
