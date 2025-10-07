# Product Roadmap & Feature Specifications

**For Claude Code**: This is your ONE product reference. Everything about what we're building and why.

**Quick Facts**:
- **Current**: MVP v0.5 - Single-user editor (production-ready)
- **Next**: v1.0 - Editor-author collaboration (~10 weeks)
- **Mission**: Professional AI-powered manuscript editing with Word-style workflows

---

# 📌 v1.0 SCOPE (10 WEEKS)

## What We're Building

**Core Workflow**: Editor generates AI suggestions → Sends to author → Author reviews → Returns to editor → Export with track changes

**Must-Have**:
✅ Phase 1 (Complete): Large doc processing, AI suggestions, DOCX import
- [ ] Phase 2 (Weeks 1-4): Role-based UI, send/return, comments
- [ ] Phase 3 (Weeks 5-8): Snapshots, version history, DOCX export
- [ ] Phase 4 (Weeks 9-10): Polish, testing, launch

**NOT in v1.0**:
❌ PDF export, admin portal, production role, real-time collab, teams, advanced diff viewer

---

# USER PERSONAS

## Lisa - Professional Editor
- Uploads manuscripts (DOCX, up to 85K words)
- Runs AI passes (Copy Editor, Line Editor, Style Editor)
- Reviews/accepts/rejects suggestions
- Adds manual comments for author
- Creates snapshots and sends to author
- Receives returned manuscript
- Exports to DOCX with track changes

## Sarah - Fiction Author
- Receives email notification from editor
- Reviews suggestions (AI controls hidden)
- Accepts/rejects with one click
- Replies to editor comments
- Returns manuscript to editor

---

# PHASE BREAKDOWN

## Phase 1: Foundation ✅ (COMPLETE - October 2025)

**Deployed Features**:
- ✅ TipTap Pro AI Suggestion extension with custom resolver
- ✅ Dynamic configuration (10-40 chunkSize, 3-10 batchSize based on doc size)
- ✅ Parallel batch processing (up to 85K words)
- ✅ DOCX import via queue system
- ✅ JWT authentication (24hr expiration)
- ✅ Supabase Auth with RLS

**Metrics Achieved**:
- 85,337 words / 488,451 characters tested
- 5,005 suggestions in ~15-20 minutes
- 99.9%+ position accuracy
- Zero rate limiting (313 requests, 0 × 429 errors)
- 100% success rate across all document sizes

**Known Limitations**:
- Browser freeze on 5K+ suggestions (functional but poor UX)
- High memory usage (1.5 GB) on large docs
- Phase 2 virtualization will fix rendering freeze

## Phase 2: Editor ↔ Author Workflow (Weeks 1-4)

**Goal**: Enable send/return manuscript flow

**Features to Build**:
- [ ] User role management (editor/author field in profiles)
- [ ] Role-based UI (hide AI controls for authors)
- [ ] Manuscript sharing (shared_with array)
- [ ] Email notifications (invitation, return, activity)
- [ ] Activity feed (manuscript timeline)
- [ ] Basic comment system (TipTap comment extension)

**Database Changes**:
```sql
-- profiles table
ALTER TABLE profiles ADD COLUMN role TEXT CHECK (role IN ('editor', 'author'));

-- manuscripts table
ALTER TABLE manuscripts ADD COLUMN shared_with UUID[];
ALTER TABLE manuscripts ADD COLUMN status TEXT
  CHECK (status IN ('draft', 'sent_to_author', 'returned_to_editor', 'completed'));
ALTER TABLE manuscripts ADD COLUMN activity_log JSONB DEFAULT '[]';
ALTER TABLE manuscripts ADD COLUMN comments JSONB DEFAULT '[]';
```

**Technical Stack**:
- TipTap Comments: https://tiptap.dev/docs/editor/extensions/functionality/comments
- Email service: Resend or SendGrid
- RLS policies for role-based access

## Phase 3: Version History & Export (Weeks 5-8)

**Goal**: Track changes and export manuscripts

**Features to Build**:
- [ ] TipTap snapshot API integration
- [ ] Snapshot creation (manual + automatic on send/return)
- [ ] Snapshot viewer with version list
- [ ] DOCX export with track changes
- [ ] Version restoration with confirmation

**Database Changes**:
```sql
ALTER TABLE manuscripts ADD COLUMN snapshots JSONB DEFAULT '[]';

CREATE INDEX idx_manuscripts_snapshots
ON manuscripts USING gin (snapshots);
```

**Snapshot Schema**:
```typescript
interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential: 1, 2, 3...
  event: 'manual' | 'upload' | 'send_to_author' | 'return_to_editor';
  content: JSONContent;          // Full TipTap document
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount: number;
    acceptedCount?: number;
    rejectedCount?: number;
  };
  createdAt: string;            // ISO timestamp
  createdBy: string;            // User ID
}
```

**Technical Stack**:
- TipTap Snapshot API: https://tiptap.dev/docs/collaboration/documents/snapshot
- DOCX library: docx.js for export
- Track changes: Word-compatible format

## Phase 4: Polish & Launch (Weeks 9-10)

**Goal**: Production-ready v1.0

**Tasks**:
- [ ] UI/UX polish (loading states, error handling, empty states)
- [ ] User documentation (guides, tutorials, FAQ)
- [ ] E2E testing (Playwright for critical flows)
- [ ] Manual QA checklist
- [ ] Performance optimization (memory, rendering)
- [ ] Analytics setup (PostHog or similar)
- [ ] Error monitoring (Sentry)
- [ ] Backup & recovery procedures
- [ ] Privacy policy & Terms of Service

---

# SNAPSHOT & VERSIONING DETAILS

## Overview

Manual versioning system using TipTap's native JSON document format.

**Status**: ✅ Production-ready for manual snapshots

**Implemented**:
- ✅ Manual version saving via "Save Version" button
- ✅ Version history viewing with metadata
- ✅ Restore previous versions with confirmation
- ✅ Sequential versioning (v1, v2, v3...)
- ✅ JSONB storage in manuscripts table
- ✅ GIN index for performance

**Prepared for Phase 3**:
- 🔮 Auto-snapshot on "Send to Author"
- 🔮 Auto-snapshot on "Return to Editor"
- 🔮 Snapshot comparison/diff view (optional)

## TipTap Integration

```typescript
// Capture current document state
const content = editor.getJSON(); // Returns JSONContent

// Restore a previous version
editor.commands.setContent(snapshot.content);
```

## What Snapshots Capture

**YES** - Snapshots capture:
- ✅ Document content via `editor.getJSON()`
- ✅ Applied text changes (including accepted AI suggestions)
- ✅ Document structure, formatting, marks
- ✅ Manual edits and insertions

**NO** - Snapshots do NOT capture:
- ❌ Pending AI suggestions (those are separate)
- ❌ UI state (selection, scroll position)
- ❌ Comments (stored separately in `manuscripts.comments`)

## Snapshot Workflow

### Manual Snapshot
```typescript
// User clicks "Save Version" button
const snapshot = {
  id: uuid(),
  version: currentVersion + 1,
  event: 'manual',
  content: editor.getJSON(),
  metadata: {
    wordCount: getWordCount(editor),
    characterCount: getCharCount(editor),
    suggestionCount: suggestions.length
  },
  createdAt: new Date().toISOString(),
  createdBy: userId
};

// Append to snapshots array
await supabase
  .from('manuscripts')
  .update({ snapshots: [...existing, snapshot] })
  .eq('id', manuscriptId);
```

### Auto-Snapshot (Phase 3)
```typescript
// Triggered automatically on workflow transitions
const triggers = {
  send_to_author: () => createSnapshot('send_to_author'),
  return_to_editor: () => createSnapshot('return_to_editor')
};
```

### Version Restoration
```typescript
// Load snapshot by version number
const snapshot = snapshots.find(s => s.version === targetVersion);

// Optional: Create safety snapshot before restoring
await createSnapshot('manual', 'Before restore');

// Restore content
editor.commands.setContent(snapshot.content);
```

---

# USER JOURNEYS

## Journey 1: Editor Uploads and Edits Manuscript

```
1. Editor signs up → role: 'editor'
2. Uploads 200-page DOCX → Queue processes (~10s)
3. Opens Editor → Manuscript loaded
4. Runs AI Pass → Selects Copy Editor, Line Editor, Style Editor
5. Processing → 30K words: ~5-10 min
6. Reviews 500+ suggestions → Accepts/rejects
7. Adds manual comments → "Please clarify motivation"
8. Creates snapshot → "First editorial pass"
9. Sends to author → Enters author email
10. Author receives email → Creates account
11. Author reviews → Accepts/rejects suggestions
12. Author returns → Editor notified
13. Editor exports DOCX → Track changes included
```

## Journey 2: Author Reviews and Returns Manuscript

```
1. Author receives email → "Lisa sent you a manuscript"
2. Creates account → role: 'author'
3. Opens manuscript → AI controls hidden
4. Reviews suggestions → 450 accepted, 50 rejected
5. Responds to comments → "I want to keep the ambiguity"
6. Returns to editor → Auto-snapshot created
7. Editor notified → Reviews author decisions
```

---

# FEATURES NOT IN v1.0

## Deferred to Future Releases
- ❌ PDF export (DOCX only for v1.0)
- ❌ Advanced diff viewer (basic snapshot comparison only)
- ❌ Admin portal (manual database management)
- ❌ Production Editor role (only Editor and Author)
- ❌ Organization settings (single-user accounts)
- ❌ Email template configuration (hardcoded templates)
- ❌ Contradiction/repetition detection (Copy/Line/Style only)
- ❌ Real-time collaboration (sequential editing only)
- ❌ Team features (1-on-1 editor-author only)
- ❌ Complex database migrations (JSONB arrays)

## Architecture Simplifications

**JSON Database Model**:
- Keep JSONB arrays for suggestions, comments, snapshots, activity
- No separate tables (simpler, faster development)
- Trade-off: Less queryable than relational tables
- Sufficient for v1.0 scale (<1000 users)

**TipTap Native Snapshots**:
- Use TipTap's built-in snapshot API (proven by Notion, GitBook)
- Handles ProseMirror document structure correctly
- No custom position tracking needed

**Simple Role System**:
- Single `role` field (editor | author)
- Simple RLS policies
- Easy to extend later

---

# POST-v1.0 ROADMAP

## v1.1 - Performance Optimization (Future)
- Background queue for AI processing
- Progressive rendering for 5K+ suggestions
- Memory optimization for 100K+ word documents
- Virtualized list rendering

## v1.2 - Enhanced Collaboration (Future)
- Multiple authors per manuscript
- Team workspaces
- Advanced commenting (threads, mentions)
- Real-time presence indicators

## v2.0 - Enterprise Features (Future)
- Organization settings
- Admin portal
- Custom email templates
- Advanced analytics dashboard
- PDF export
- API access

---

# SUCCESS METRICS

## Primary Metrics (v1.0)
- **Editor-Author Pairs Created**: # of successful collaborations
- **Manuscripts Sent/Returned**: Completion rate of full cycle
- **Suggestion Acceptance Rate**: % of AI suggestions accepted
- **Time to Complete Cycle**: Upload → send → return → export

## Secondary Metrics
- **Active Users**: Weekly/monthly active (by role)
- **Manuscripts Uploaded**: Total uploads per week
- **AI Passes Run**: Total AI processing jobs
- **DOCX Exports**: Successful track changes exports

## Quality Metrics
- **Processing Success Rate**: % successful uploads
- **AI Processing Time**: P50/P95 by document size
- **Error Rate**: Failed uploads, stuck jobs, export failures
- **User Satisfaction**: NPS, feedback submissions

---

# TECHNICAL DECISIONS (v1.0)

## 1. JSON Database Model
**Decision**: JSONB arrays for suggestions/comments/snapshots

**Rationale**:
- Simpler schema (no JOINs)
- Faster development (no migrations)
- Easier to evolve (add fields without schema changes)
- Sufficient for v1.0 scale

## 2. TipTap Native Snapshots
**Decision**: Use TipTap's snapshot API

**Rationale**:
- Proven solution (Notion, GitBook use it)
- Handles ProseMirror structure correctly
- Built-in diff/restore capabilities

## 3. Simple Role-Based Access
**Decision**: Single `role` field (editor | author)

**Rationale**:
- v1.0 only needs 2 roles
- Simple RLS policies
- Easy to extend later

## 4. Large Document Processing
**Status**: ✅ Resolved (October 2025)

**Solution**: Custom apiResolver with parallel batch processing

**Limitations**:
- Browser freeze on 5K+ suggestions (Phase 2 will fix)
- High memory usage (Phase 2 will optimize)

---

**Last Updated**: January 2025 - Radical consolidation (4 files → 1)

**Tags**: #roadmap #v1.0 #features #snapshots #workflow #planning
