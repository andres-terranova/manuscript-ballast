# Product Roadmap

## Mission Statement
Provide professional-grade AI-powered manuscript editing tools that help writers improve their work with intelligent, context-aware suggestions.

## Target Users
- **Editors** - Editorial agencies, freelance editors who manage manuscripts
- **Authors** - Fiction/non-fiction writers who receive and review editorial feedback

## Core Value Propositions (v1.0)

### 1. Editor ↔ Author Workflow
Enable seamless collaboration between editors and authors:
- Editors generate AI suggestions and send manuscripts to authors
- Authors review suggestions and return manuscripts to editors
- Role-based UI hides AI controls from authors (avoid confusion)

### 2. Large Document Capability
Handle full-length manuscripts (up to 85K words) with parallel batch processing.

### 3. Inline Real-Time Suggestions
See AI suggestions directly in the editor using TipTap Pro AI.

### 4. Version History with Snapshots
Track changes over time using TipTap's native snapshot API.

## User Personas (v1.0)

### Lisa - Professional Editor
- **Age**: 30-60
- **Experience**: 10+ years editing experience
- **Pain Points**: Repetitive tasks, managing author feedback cycles, tracking changes
- **Goals**: Generate AI suggestions quickly, send clean manuscripts to authors, track revisions
- **Usage**:
  1. Uploads manuscript (DOCX)
  2. Runs AI suggestions (Copy Editor, Line Editor, Style Editor)
  3. Reviews and accepts/rejects suggestions
  4. Adds manual comments for author
  5. Creates snapshot and sends to author
  6. Receives returned manuscript with author's decisions
  7. Exports to DOCX with track changes

### Sarah - Fiction Author (Receiving Edited Manuscript)
- **Age**: 35-50
- **Experience**: Writing for 5+ years
- **Pain Points**: Overwhelmed by editorial feedback, wants simple accept/reject workflow
- **Goals**: Review editor's suggestions efficiently, ask questions via comments
- **Usage**:
  1. Receives email notification from editor
  2. Opens manuscript (read-only AI controls)
  3. Reviews suggestions and editor comments
  4. Accepts/rejects suggestions
  5. Adds reply comments for clarification
  6. Returns manuscript to editor
  7. Receives final DOCX export

## v1.0 Roadmap (~10 weeks to functional release)

### Phase 1: Foundation ✅ (Complete - October 2025)
**Status**: Deployed to production

**Achievements**:
- ✅ Large document processing (up to 85K words, parallel batch)
- ✅ TipTap Pro AI integration with custom resolver
- ✅ JWT authentication (24-hour expiration)
- ✅ DOCX import via queue system
- ✅ Supabase Auth with role-based access

**Key Metrics**:
- 85,337 words / 488,451 characters tested
- 5,005 suggestions in ~15-20 minutes
- 99.9%+ position accuracy
- Zero rate limiting (313 requests, 0 × 429 errors)

### Phase 2: Editor ↔ Author Workflow (Weeks 1-4)
**Goal**: Enable Send/Return manuscript flow

**Features**:
- [ ] User role management (editor/author field in profiles table)
- [ ] Role-based UI components (hide AI controls for authors)
- [ ] Manuscript sharing (send to author, return to editor)
- [ ] Email notifications (invitation, return, activity)
- [ ] Activity feed (manuscript timeline)
- [ ] Basic comment system (TipTap comment extension)

**Database Changes**:
- Add `role` field to `profiles` table (editor | author)
- Add `shared_with` array to `manuscripts` table
- Add `activity_log` JSONB array to `manuscripts` table
- Add `comments` JSONB array to `manuscripts` table

**Technical Stack**:
- TipTap Comments extension: https://tiptap.dev/docs/editor/extensions/functionality/comments
- Supabase Auth policies for role-based access
- Email service (Resend or similar)

### Phase 3: Version History & Export (Weeks 5-8)
**Goal**: Track changes and export manuscripts

**Features**:
- [ ] TipTap snapshot API integration
- [ ] Snapshot creation (manual + automatic on send/return)
- [ ] Snapshot viewer (diff view optional - may defer)
- [ ] DOCX export with track changes
- [ ] Version restoration

**Database Changes**:
- Add `snapshots` JSONB array to `manuscripts` table
  ```typescript
  {
    id: string,
    version: number,
    timestamp: string,
    user_id: string,
    content: JSON,        // TipTap snapshot
    metadata: {
      trigger: 'manual' | 'send' | 'return' | 'auto',
      label?: string,
      stats: { wordCount, suggestionCount }
    }
  }
  ```

**Technical Stack**:
- TipTap Snapshot API: https://tiptap.dev/docs/collaboration/documents/snapshot
- DOCX library (docx.js) for export
- Track changes format (Word-compatible)

### Phase 4: Polish & Launch (Weeks 9-10)
**Goal**: Production-ready v1.0

**Features**:
- [ ] UI/UX polish (loading states, error handling)
- [ ] Documentation (user guides, help center)
- [ ] Testing (E2E, manual QA)
- [ ] Performance optimization (memory, rendering)
- [ ] Analytics tracking (PostHog or similar)

**Launch Checklist**:
- [ ] Error monitoring (Sentry)
- [ ] Usage limits per role
- [ ] Onboarding flow
- [ ] Privacy policy & Terms of Service
- [ ] Backup & recovery procedures

## User Journeys (v1.0)

### Journey 1: Editor Uploads and Edits Manuscript

```
1. Editor signs up with email/password (role: editor)
   └─> Lands on Dashboard

2. Clicks "Upload Manuscript" button
   └─> Selects 200-page novel DOCX file

3. File processes in background (~10s)
   └─> Status: "Uploaded" → "Processing" → "Ready"

4. Clicks manuscript title to open Editor
   └─> Full manuscript loaded

5. Clicks "Run AI Pass" button
   └─> Selects AI rules: Copy Editor, Line Editor, Style Editor
   └─> Processing (30K words: ~2-5 min, 85K words: ~15-20 min)

6. Reviews suggestions in ChangeList
   └─> 500+ suggestions organized by type
   └─> Accepts/rejects individual suggestions

7. Adds manual comments for author
   └─> Uses TipTap comment extension
   └─> "Please clarify this character's motivation"

8. Creates snapshot
   └─> Automatic snapshot created
   └─> Labels version: "First editorial pass"

9. Sends manuscript to author
   └─> Enters author's email
   └─> Author receives notification email
   └─> Manuscript status: "Sent to Author"

10. Receives returned manuscript
    └─> Email notification when author returns
    └─> Reviews author's acceptances/rejections
    └─> Sees author's reply comments

11. Exports to DOCX
    └─> Downloads with track changes
    └─> Ready for final delivery
```

### Journey 2: Author Reviews and Returns Manuscript

```
1. Author receives email notification
   └─> "Lisa has sent you a manuscript for review"
   └─> Clicks link to create account (role: author)

2. Author logs in
   └─> Dashboard shows 1 manuscript (shared by Lisa)

3. Opens manuscript in Editor
   └─> AI controls hidden (author role)
   └─> Sees suggestions and editor comments

4. Reviews suggestions
   └─> Accepts most grammar/clarity suggestions
   └─> Rejects some style suggestions (voice preference)
   └─> Total: 450 accepted, 50 rejected

5. Responds to editor comments
   └─> Adds reply: "I want to keep the ambiguity here"
   └─> Asks clarifying questions

6. Returns manuscript to editor
   └─> Clicks "Return to Editor" button
   └─> Automatic snapshot created
   └─> Editor receives notification email
   └─> Manuscript status: "Returned to Editor"
```

## What's NOT in v1.0

These features were in the original PRD but deferred to future releases:

### Deferred Features
- ❌ PDF export (DOCX only for v1.0)
- ❌ Advanced diff viewer (basic snapshot comparison may be included)
- ❌ Admin portal (manual database management for now)
- ❌ Production Editor role (only Editor and Author for v1.0)
- ❌ Organization settings (single-user accounts only)
- ❌ Email template configuration (hardcoded templates)
- ❌ Contradiction/repetition AI detection (Copy/Line/Style only)
- ❌ Complex database migrations (simple JSONB arrays)
- ❌ Real-time collaboration (sequential editing only)
- ❌ Team features (1-on-1 editor-author only)

### Architecture Simplifications
- **JSON Database Model**: Keep JSONB arrays (suggestions, comments, snapshots) instead of separate tables
- **TipTap Native Snapshots**: Use TipTap's snapshot API instead of custom versioning
- **Simple Role System**: Single `role` field (editor/author) instead of complex permissions
- **Email Service**: Simple transactional emails (invitation, return) only

### AI Suggestions Under Review
The AI suggestion system may be refactored in v1.1+:
- Experiment with one rule at a time (instead of multiple concurrent)
- Separate storage for suggestions (instead of JSONB array)
- Performance optimizations for 100K+ word documents
- Background queue for AI processing (instead of synchronous)

## Pricing Strategy (Post-v1.0)

Pricing to be determined after v1.0 launch and usage validation. Initial focus: prove value and gather data.

### Potential Tiers (TBD)
- **Free Tier**: Limited manuscripts, basic AI suggestions
- **Editor Tier**: Unlimited manuscripts, all AI roles, author collaboration
- **Enterprise Tier**: Team features, priority support, custom integrations

Revenue model decision deferred until post-launch analytics available.

## Success Metrics (v1.0)

### Primary Metrics
- **Editor-Author Pairs Created**: Number of successful editor-author collaborations
- **Manuscripts Sent/Returned**: Completion rate of full workflow cycle
- **Suggestion Acceptance Rate**: % of AI suggestions accepted by authors
- **Time to Complete Cycle**: Average time from upload → send → return → export

### Secondary Metrics
- **Active Editors**: Weekly/monthly active users (editor role)
- **Active Authors**: Weekly/monthly active users (author role)
- **Manuscripts Uploaded**: Total uploads per week
- **AI Passes Run**: Total AI processing jobs
- **DOCX Exports**: Successful track changes exports

### Quality Metrics
- **Processing Success Rate**: % of uploads that complete successfully
- **AI Processing Time**: P50/P95 for different document sizes
- **Error Rate**: Failed uploads, stuck jobs, export failures
- **User Satisfaction**: NPS, feedback submissions

## Technical Architecture Decisions (v1.0)

### 1. JSON Database Model
**Decision**: Keep JSONB arrays for suggestions, comments, snapshots, activity logs

**Rationale**:
- Simpler schema (no JOIN queries)
- Faster development (no migrations)
- Easier to evolve (add fields without schema changes)
- Sufficient for v1.0 scale (< 1000 users)

**Trade-offs**:
- Less queryable than relational tables
- May need refactor at scale (10K+ users)

### 2. TipTap Native Snapshot API
**Decision**: Use TipTap's built-in snapshot API instead of custom versioning

**Documentation**: https://tiptap.dev/docs/collaboration/documents/snapshot

**Rationale**:
- Proven solution (used by Notion, GitBook, etc.)
- Handles ProseMirror document structure correctly
- Built-in diff/restore capabilities
- No custom position tracking needed

**Implementation**:
```typescript
// Store snapshots in manuscripts.snapshots JSONB array
{
  id: string,
  version: number,
  timestamp: string,
  user_id: string,
  content: JSON,  // Full TipTap snapshot
  metadata: { trigger, label, stats }
}
```

### 3. Simple Role-Based Access
**Decision**: Single `role` field (editor | author) instead of complex permissions

**Rationale**:
- v1.0 only needs 2 roles
- Simple RLS policies in Supabase
- Easy to extend later (add more roles)

**Implementation**:
- Add `role` to profiles table
- RLS: Editors can CRUD their manuscripts
- RLS: Authors can READ manuscripts shared with them

### 4. Large Document Processing (Resolved)
**Status**: ✅ Production-ready (October 2025)

**Solution**: Custom apiResolver with parallel batch processing

**Performance**:
- Up to 85K words supported
- ~15-20 min for 85K words
- 99.9%+ position accuracy
- Zero rate limiting

**Known Limitations**:
- Browser freeze on 5,000+ suggestions (functional but poor UX)
- High memory usage (1.5 GB) on large docs
- Phase 2 background queue recommended for better UX

## Timeline Summary

- **Phase 1** (Complete): Foundation, large document processing
- **Phase 2** (Weeks 1-4): Editor ↔ Author workflow
- **Phase 3** (Weeks 5-8): Version history & DOCX export
- **Phase 4** (Weeks 9-10): Polish & launch
- **Total**: ~10 weeks to functional v1.0

## Post-v1.0 Roadmap (Future)

### v1.1 - Performance Optimization
- Background queue for AI processing
- Progressive rendering for 5,000+ suggestions
- Memory optimization for 100K+ word documents
- One-rule-at-a-time AI processing experiment

### v1.2 - Enhanced Collaboration
- Multiple authors per manuscript
- Team workspaces
- Advanced commenting (threads, mentions)
- Real-time presence indicators

### v2.0 - Enterprise Features
- Organization settings
- Admin portal
- Custom email templates
- Advanced analytics dashboard
- PDF export
- API access

## Related Documentation

- [Feature Documentation](./features.md) - Detailed feature specifications
- [TipTap Snapshot API](https://tiptap.dev/docs/collaboration/documents/snapshot) - Version history implementation
- [TipTap Comments Extension](https://tiptap.dev/docs/editor/extensions/functionality/comments) - Commenting system
- [Phase 1 Technical Achievements](../02-technical/large-documents/UAT-PHASE1-FINDINGS.md) - Large document processing

---

**Last Updated**: October 5, 2025

## Tags

#product #roadmap #v1.0 #editor-author-workflow #snapshots #comments #DOCX-export #role-based-access #simplified-scope #10-week-timeline
