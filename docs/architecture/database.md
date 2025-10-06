# Database Schema Architecture

## Design Philosophy

**JSON-First Approach**: Store complex, hierarchical data as JSONB in the manuscripts table rather than normalizing into separate relational tables.

**Why This Approach?**
- Faster iteration without complex migrations
- Simpler schema that's easier to understand
- Flexibility for evolving data structures
- Reduced join complexity
- Sufficient for current scale and requirements

**Trade-offs Accepted:**
- Less query flexibility vs. fully normalized schema
- Some denormalization of data
- Cannot easily query across suggestion types without JSONB operators

## Core Tables

### manuscripts

Primary table for all manuscript data with JSONB fields for flexible storage.

```sql
CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,                         -- Plain text or HTML content
  docx_path TEXT,                       -- Path to original DOCX in storage
  word_count INTEGER,
  character_count INTEGER,
  status TEXT DEFAULT 'draft',          -- 'draft', 'with_author', 'with_editor'

  -- JSONB fields for flexible data
  suggestions JSONB DEFAULT '[]'::jsonb,  -- AI suggestions array
  snapshots JSONB DEFAULT '[]'::jsonb,    -- Version snapshots (TipTap format)
  activity JSONB DEFAULT '[]'::jsonb,     -- Simple audit trail
  metadata JSONB DEFAULT '{}'::jsonb,     -- Additional flexible data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_manuscripts_user_id ON manuscripts(user_id);
CREATE INDEX idx_manuscripts_status ON manuscripts(status);
CREATE INDEX idx_manuscripts_updated_at ON manuscripts(updated_at);
```

### profiles

Simple user profiles with role-based access.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'author',           -- 'author' or 'editor' (no admin role)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
```

### processing_queue

Queue for async DOCX processing (see queue-system.md for details).

```sql
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID REFERENCES manuscripts,
  job_type TEXT NOT NULL,               -- 'process_docx', 'generate_suggestions'
  status TEXT DEFAULT 'pending',        -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  progress_data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_status ON processing_queue(status);
CREATE INDEX idx_queue_manuscript_id ON processing_queue(manuscript_id);
```

## JSONB Field Structures

### manuscripts.suggestions

Array of AI suggestion objects stored as JSONB.

```typescript
// TypeScript interface
interface Suggestion {
  id: string;                    // UUID
  type: string;                  // 'grammar', 'style', 'clarity', etc.
  ruleId: string;               // AI rule that generated it
  originalText: string;
  suggestedText: string;
  explanation: string;
  position: {
    from: number;               // ProseMirror position
    to: number;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;            // ISO timestamp
  createdBy: string;            // User ID
}

// Example JSON structure
{
  "suggestions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "grammar",
      "ruleId": "copy-editor-grammar-01",
      "originalText": "The dog bark loudly",
      "suggestedText": "The dog barks loudly",
      "explanation": "Subject-verb agreement: 'dog' is singular, requires 'barks'",
      "position": { "from": 245, "to": 264 },
      "status": "pending",
      "createdAt": "2025-10-05T10:30:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

**Note on AI Suggestions Architecture**: This structure is under active review. We may experiment with:
- Running one rule at a time instead of all rules together
- Separate storage mechanisms for performance
- Different suggestion organization patterns

The current all-rules-together approach works but may evolve based on performance testing.

### manuscripts.snapshots

Array of TipTap document snapshots for versioning.

```typescript
// TypeScript interface
interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential version number
  event: string;                 // 'upload', 'send_to_author', 'return_to_editor'
  content: object;               // TipTap document JSON
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount: number;
  };
  createdAt: string;            // ISO timestamp
  createdBy: string;            // User ID
}

// Example JSON structure
{
  "snapshots": [
    {
      "id": "snapshot-uuid",
      "version": 1,
      "event": "upload",
      "content": {
        "type": "doc",
        "content": [
          { "type": "paragraph", "content": [...] }
        ]
      },
      "metadata": {
        "wordCount": 85000,
        "characterCount": 488000,
        "suggestionCount": 0
      },
      "createdAt": "2025-10-05T10:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

**Snapshot Strategy**: Uses TipTap native snapshot API (https://tiptap.dev/docs/collaboration/documents/snapshot)
- No complex immutable snapshot tables
- No custom diff viewers (planned for future)
- Captured at key lifecycle events only

### manuscripts.activity

Simple audit trail of document actions.

```typescript
// TypeScript interface
interface ActivityEntry {
  id: string;                    // UUID
  action: string;                // 'uploaded', 'ai_pass_completed', 'sent_to_author', etc.
  userId: string;                // Who performed the action
  timestamp: string;             // ISO timestamp
  metadata?: object;             // Optional additional data
}

// Example JSON structure
{
  "activity": [
    {
      "id": "activity-uuid",
      "action": "uploaded",
      "userId": "user-uuid",
      "timestamp": "2025-10-05T10:00:00Z",
      "metadata": {
        "filename": "manuscript.docx",
        "wordCount": 85000
      }
    },
    {
      "id": "activity-uuid-2",
      "action": "ai_pass_completed",
      "userId": "user-uuid",
      "timestamp": "2025-10-05T10:20:00Z",
      "metadata": {
        "suggestionsGenerated": 5005,
        "processingTime": "15m 23s"
      }
    }
  ]
}
```

## Authentication & Authorization

### Simple Role-Based Access

**Two Roles Only:**
- `editor`: Can create suggestions, send to authors
- `author`: Can review suggestions, return to editors

**No Admin Role**: Keeping system simple without administrative infrastructure.

### Row Level Security (RLS)

Basic RLS policies for data isolation:

```sql
-- Manuscripts: Users can only access their own manuscripts
CREATE POLICY manuscripts_user_isolation ON manuscripts
  FOR ALL
  USING (auth.uid() = user_id);

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY profiles_read_all ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Processing Queue: Users can only access their manuscript jobs
CREATE POLICY queue_user_isolation ON processing_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM manuscripts
      WHERE manuscripts.id = processing_queue.manuscript_id
        AND manuscripts.user_id = auth.uid()
    )
  );
```

## What's NOT in This Architecture

**Deliberately Avoided Complexity:**

❌ **Separate Relational Tables For:**
- Suggestions (stored in manuscripts.suggestions JSONB)
- Comments (future: will use JSONB)
- Versions (using snapshots JSONB array)
- Activity log (using activity JSONB array)

❌ **Complex Role Management:**
- No admin role
- No RBAC system
- No permission matrices
- Just simple editor/author roles

❌ **Production Editor Infrastructure:**
- No multi-editor workflows
- No approval chains
- No production scheduling
- Simple one-to-one editor-author model

❌ **Database Migrations for Refactoring:**
- Keeping JSON model for flexibility
- No plans to normalize into relational tables
- Add fields to JSONB as needed

## When to Reconsider This Architecture

**Consider separate tables if:**
- Need complex querying across suggestions by type
- Suggestion count exceeds 10,000+ per document regularly
- Need to analyze suggestion patterns across multiple documents
- Performance degrades significantly with large JSONB arrays

**Consider RBAC if:**
- Need more than two user roles
- Require fine-grained permissions
- Building admin features
- Multi-tenant requirements emerge

**Consider normalization if:**
- JSONB queries become performance bottleneck
- Need referential integrity across complex relationships
- Team grows and schema clarity becomes critical

## Performance Considerations

### JSONB Performance

**Strengths:**
- Fast for document retrieval (single query)
- Efficient for reading entire suggestion/snapshot arrays
- Good for hierarchical data
- Supports indexing with GIN indexes if needed

**Limitations:**
- Slower for filtering/searching within arrays
- Updates require rewriting entire JSONB field
- Less efficient for complex joins across documents

### Recommended Indexes

```sql
-- If JSONB querying becomes common
CREATE INDEX idx_suggestions_status
  ON manuscripts USING gin ((suggestions::jsonb));

CREATE INDEX idx_snapshots_version
  ON manuscripts USING gin ((snapshots::jsonb));

-- Only add if performance testing shows benefit
```

## Migration Notes

**Current Status**: No migrations planned to separate tables.

**If Migration Becomes Necessary:**
1. JSONB data can be extracted to tables without data loss
2. Consider gradual migration (keep JSONB, sync to tables)
3. Maintain backward compatibility during transition
4. Extensive testing required for position mapping integrity

## Related Documentation

- **Versioning Strategy**: [versioning-strategy.md](versioning-strategy.md)
- **Queue System**: [queue-system.md](queue-system.md)
- **Backend Overview**: [../04-backend/README.md](../04-backend/README.md)

---

**Last Updated**: October 5, 2025

## Tags

#database #schema #JSONB #architecture #supabase #postgresql #RLS #authentication #suggestions #versioning #snapshots #activity #simplicity #design_decisions
