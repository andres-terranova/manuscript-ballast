# v1.0 Feature Specifications

## Overview

This document details the simplified v1.0 feature set focused on the Editor ↔ Author workflow. Features are organized by implementation phase.

**v1.0 Timeline**: ~10 weeks to functional release
**Core Focus**: Enable editors to send manuscripts to authors and receive them back with tracked changes

## Phase 1: Foundation ✅ (Complete - October 2025)

### 1.1 Large Document Processing ⭐
**Status**: ✅ Production Ready

**What it does**: Processes manuscripts up to 85K words with parallel batch AI suggestions

**Key Components**:
- Custom apiResolver in `src/hooks/useTiptapEditor.ts`
- Edge function: `supabase/functions/ai-suggestions-html/`
- Parallel batch processing (5 chunks concurrent)

**Performance**:
- Up to 85K words supported
- 5,005 suggestions in ~15-20 minutes
- 99.9%+ position accuracy
- Zero rate limiting (313 requests, 0 × 429 errors)

**Known Limitations**:
- Browser freeze on 5,000+ suggestions (functional but poor UX)
- High memory usage (1.5 GB) on large docs
- Background queue recommended for future optimization

**Documentation**: [Phase 1 UAT Findings](../02-technical/large-documents/UAT-PHASE1-FINDINGS.md)

---

### 1.2 DOCX Import via Queue
**Status**: ✅ Production Ready

**What it does**: Background processing of DOCX uploads without timeout errors

**Key Components**:
- `supabase/functions/queue-processor/`
- `processing_queue` table
- `useQueueProcessor.ts` hook

**Performance**:
- Small docs (189KB): ~1.5s
- Large docs (437KB): ~3s
- Auto-processing delay: Max 10s

---

### 1.3 AI-Powered Suggestions (TipTap Pro Extension) ⭐
**Status**: ✅ Production Ready

**What it does**: TipTap Pro AI Suggestion extension generates comprehensive inline suggestions using OpenAI GPT-4

**🚨 Implementation Details** (Critical for Developers):
- **Extension**: TipTap Pro AI Suggestion (commercial license, JWT auth required)
- **Main File**: `src/components/workspace/Editor.tsx` (NOT ManuscriptWorkspace.tsx)
- **Configuration**: `src/hooks/useTiptapEditor.ts:85-236`
- **Documentation**:
  - [TipTap AI Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
  - [Custom LLMs Guide](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms)
  - [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)

**How It Works**:
1. User clicks "Run AI Pass" in toolbar
2. `editor.chain().loadAiSuggestions().run()` triggers processing
3. TipTap chunks document into ~10 nodes per chunk
4. Custom apiResolver sends chunks to edge function in parallel batches of 5
5. Edge function (`ai-suggestions-html`) processes each chunk with selected AI rules
6. ALL suggestions loaded at once when complete (NOT progressive)
7. `convertAiSuggestionsToUI()` transforms and sorts by document position
8. Suggestions display in editor with popovers and in ChangeList sidebar

**Key Functions**:
- `waitForAiSuggestions()` - Monitors completion via `editor.extensionStorage.aiSuggestion`
- `convertAiSuggestionsToUI()` - Transforms TipTap format to our UISuggestion type
- `editor.storage.aiSuggestion.getSuggestions()` - Retrieves all loaded suggestions
- `editor.commands.applyAiSuggestion()` - Accepts a suggestion
- `editor.commands.rejectAiSuggestion()` - Rejects a suggestion

**Available Roles** (v1.0):
- **Copy Editor** - Grammar, spelling, punctuation (Crimson)
- **Line Editor** - Sentence structure, clarity, flow (Orange)
- **Proofreader** - Final polish, consistency (Purple)
- **CMOS Formatter** - Chicago Manual of Style rules (Blue)

**Configuration**:
- `AIEditorRules.tsx` - Rule definitions with prompts
- `AIEditorRuleSelector.tsx` - UI for selecting active rules
- `ChangeList.tsx` - Suggestion review panel (sorted by position)

**Performance**:
- Small docs (<10K words): ~2 min, 200-500 suggestions
- Medium docs (10-30K words): ~5-10 min, 1,000-2,000 suggestions
- Large docs (30-85K words): ~15-20 min, 3,000-5,000 suggestions
- Note: 5K+ suggestions cause browser freeze during rendering (not loading)

**Deferred to v1.1+**:
- Fact Checker role
- Manuscript Evaluator role
- Developmental Editor role
- Progressive rendering for 5K+ suggestions

---

### 1.4 TipTap Pro Editor
**Status**: ✅ Production Ready

**What it does**: Modern editing experience with real-time AI suggestions

**Path**: `/manuscript/:id`
**Engine**: TipTap Pro AI with custom resolver
**Features**: JWT auth, native chunking, suggestion tracking

**Legacy Editor**: Deprecated, maintenance mode only

---

## Phase 2: Editor ↔ Author Workflow (Weeks 1-4)

### 2.1 User Role Management
**Status**: 📋 Planned

**What it does**: Role-based access control for editors and authors

**Database Changes**:
```sql
-- Add role field to profiles
ALTER TABLE profiles ADD COLUMN role TEXT CHECK (role IN ('editor', 'author'));
```

**User Stories**:
- As an **editor**, I sign up and my role is set to "editor"
- As an **author**, I receive an invitation and my role is set to "author"
- The system shows/hides features based on my role

---

### 2.2 Role-Based UI
**Status**: 📋 Planned

**What it does**: Hides AI controls from authors to avoid confusion

**Conditional Features**:
- **Editors see**: "Run AI Pass" button, AI rule selector, manuscript upload
- **Authors see**: Read-only suggestions, accept/reject buttons, comment replies

**Implementation**:
```typescript
const { role } = useProfile();

{role === 'editor' && <RunAIPassButton />}
{role === 'author' && <ReadOnlyBanner />}
```

---

### 2.3 Manuscript Sharing (Send/Return)
**Status**: 📋 Planned

**What it does**: Editors send manuscripts to authors; authors return them

**Database Changes**:
```sql
-- Add sharing fields to manuscripts
ALTER TABLE manuscripts ADD COLUMN shared_with UUID[];
ALTER TABLE manuscripts ADD COLUMN status TEXT
  CHECK (status IN ('draft', 'sent_to_author', 'returned_to_editor', 'completed'));
```

**User Stories**:
- As an **editor**, I click "Send to Author" and enter author's email
- Author receives email notification with manuscript link
- As an **author**, I click "Return to Editor" when done reviewing
- Editor receives email notification that manuscript is returned

**UI Components**:
- `SendToAuthorModal.tsx` - Email input, send button
- `ReturnToEditorButton.tsx` - Confirm return action
- Status badge on Dashboard showing manuscript state

---

### 2.4 Email Notifications
**Status**: 📋 Planned

**What it does**: Transactional emails for send/return events

**Email Types**:
1. **Invitation Email** - "Lisa has sent you a manuscript for review"
2. **Return Notification** - "Sarah has returned the manuscript to you"
3. **Activity Summary** - Weekly digest of manuscript activity (optional)

**Technical Stack**:
- Email service: Resend or SendGrid
- Templates: Hardcoded HTML (no template configuration in v1.0)

**Implementation**:
- Edge function: `supabase/functions/send-email/`
- Triggered by manuscript status changes

---

### 2.5 Basic Comment System
**Status**: 📋 Planned

**What it does**: Editors and authors leave comments on manuscript text

**Database Changes**:
```sql
-- Add comments array to manuscripts
ALTER TABLE manuscripts ADD COLUMN comments JSONB DEFAULT '[]';
```

**Comment Schema**:
```typescript
{
  id: string,
  user_id: string,
  position: number,      // ProseMirror position
  text: string,
  timestamp: string,
  replies: [{
    id: string,
    user_id: string,
    text: string,
    timestamp: string
  }]
}
```

**Technical Stack**:
- TipTap Comments extension: https://tiptap.dev/docs/editor/extensions/functionality/comments
- Store comments in JSONB array (no separate table)

**User Stories**:
- As an **editor**, I select text and add comment: "Please clarify motivation"
- As an **author**, I see comment and add reply: "Will expand this section"

---

### 2.6 Activity Feed
**Status**: 📋 Planned

**What it does**: Timeline of manuscript events (sent, returned, comments added)

**Database Changes**:
```sql
-- Add activity log to manuscripts
ALTER TABLE manuscripts ADD COLUMN activity_log JSONB DEFAULT '[]';
```

**Activity Schema**:
```typescript
{
  id: string,
  type: 'sent' | 'returned' | 'comment_added' | 'snapshot_created' | 'export',
  user_id: string,
  timestamp: string,
  metadata: {
    recipient_email?: string,
    comment_text?: string,
    snapshot_version?: number
  }
}
```

**UI Component**:
- `ActivityFeed.tsx` - Sidebar showing recent events
- "2 hours ago - Lisa sent manuscript to Sarah"
- "1 day ago - Sarah returned manuscript to Lisa"

---

## Phase 3: Version History & Export (Weeks 5-8)

### 3.1 TipTap Snapshot Integration
**Status**: 📋 Planned

**What it does**: Creates version snapshots using TipTap's native API

**Documentation**: https://tiptap.dev/docs/collaboration/documents/snapshot

**Database Changes**:
```sql
-- Add snapshots array to manuscripts
ALTER TABLE manuscripts ADD COLUMN snapshots JSONB DEFAULT '[]';
```

**Snapshot Schema**:
```typescript
{
  id: string,
  version: number,
  timestamp: string,
  user_id: string,
  content: JSON,        // Full TipTap snapshot
  metadata: {
    trigger: 'manual' | 'send' | 'return' | 'auto',
    label?: string,
    stats: {
      wordCount: number,
      suggestionCount: number,
      acceptedCount: number,
      rejectedCount: number
    }
  }
}
```

**User Stories**:
- As an **editor**, I click "Create Snapshot" and label it "First pass"
- System auto-creates snapshot when I send manuscript to author
- System auto-creates snapshot when author returns manuscript
- I can view snapshot list and restore previous versions

---

### 3.2 Snapshot Viewer
**Status**: 📋 Planned (Basic version)

**What it does**: View and restore previous versions

**UI Components**:
- `SnapshotList.tsx` - List of versions with labels and timestamps
- `RestoreSnapshotButton.tsx` - Restore previous version
- Optional: Basic diff view (may defer to v1.1)

**User Stories**:
- As an **editor**, I open "Version History" sidebar
- I see list: "v3 - Returned by Sarah (2 days ago)", "v2 - First pass (5 days ago)"
- I click "Restore v2" to revert to that version

---

### 3.3 DOCX Export with Track Changes
**Status**: 📋 Planned

**What it does**: Export manuscript to Word format with tracked changes

**Technical Stack**:
- Library: docx.js (https://docx.js.org/)
- Track changes format: Word-compatible

**Export Logic**:
- Accepted suggestions: Applied to final text (no markup)
- Rejected suggestions: Not included
- Pending suggestions: Shown as tracked changes in Word
- Comments: Exported as Word comments

**User Stories**:
- As an **editor**, I click "Export to DOCX"
- Download includes all accepted changes and pending suggestions as track changes
- Author can open in Word and see familiar track changes interface

---

### 3.4 Version Restoration
**Status**: 📋 Planned

**What it does**: Restore manuscript to previous snapshot

**Implementation**:
- Load snapshot content from JSONB
- Replace editor content with snapshot
- Optionally create new snapshot before restoring (safety)

**User Stories**:
- As an **editor**, I accidentally accepted wrong suggestions
- I open Version History and restore "v2 - Before author review"
- Manuscript reverts to that state

---

## Phase 4: Polish & Launch (Weeks 9-10)

### 4.1 UI/UX Polish
**Status**: 📋 Planned

**Focus Areas**:
- Loading states (spinners, skeletons)
- Error handling (friendly error messages)
- Empty states (no manuscripts, no suggestions)
- Toast notifications (success, error, info)
- Responsive design (mobile-friendly)

---

### 4.2 Testing & QA
**Status**: 📋 Planned

**Test Coverage**:
- E2E tests (Playwright) for critical user journeys
- Manual QA checklist for all features
- Load testing (large documents, multiple users)
- Cross-browser testing (Chrome, Safari, Firefox)

---

### 4.3 Documentation & Help
**Status**: 📋 Planned

**User-Facing Docs**:
- Getting started guide
- Editor workflow tutorial
- Author workflow tutorial
- FAQ (common questions)
- Video walkthroughs (optional)

---

### 4.4 Analytics & Monitoring
**Status**: 📋 Planned

**Tools**:
- Analytics: PostHog or Plausible
- Error monitoring: Sentry
- Performance monitoring: Vercel Analytics

**Key Events**:
- Manuscript uploaded
- AI pass run
- Manuscript sent to author
- Manuscript returned to editor
- Export to DOCX

---

## Features NOT in v1.0

### Deferred to v1.1+
- **Fact Checker AI role** - Verify claims, check sources
- **Manuscript Evaluator** - Holistic document analysis
- **Developmental Editor** - Plot, structure, pacing analysis
- **PDF export** - DOCX only for v1.0
- **Advanced diff viewer** - Basic snapshot comparison only
- **Production Editor role** - Only Editor and Author in v1.0
- **Organization settings** - Single-user accounts
- **Email template configuration** - Hardcoded templates
- **Contradiction/repetition detection** - Advanced AI analysis
- **Real-time collaboration** - Sequential editing only
- **Team features** - 1-on-1 editor-author only
- **Admin portal** - Manual database management

### Architecture Simplifications
- JSON database model (JSONB arrays, no separate tables)
- Simple role system (single `role` field)
- TipTap native snapshots (no custom versioning)
- Transactional emails only (no digest, no templates)

## Related Documentation

- [Product Roadmap](./roadmap.md) - v1.0 timeline and priorities
- [Phase 1 UAT Findings](../02-technical/large-documents/UAT-PHASE1-FINDINGS.md) - Large document testing results
- [TipTap Snapshot API](https://tiptap.dev/docs/collaboration/documents/snapshot) - Version history
- [TipTap Comments Extension](https://tiptap.dev/docs/editor/extensions/functionality/comments) - Comment system
- [Component Documentation](../03-components/editors/manuscript-editor.md) - Editor implementation
- [Supabase Functions](../04-backend/edge-functions.md) - Backend services

---

**Last Updated**: October 5, 2025

## Tags

#features #v1.0 #editor-author-workflow #role-based-access #snapshots #comments #DOCX-export #email-notifications #activity-feed #phase-breakdown
