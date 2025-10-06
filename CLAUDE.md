# Manuscript Ballast - Claude Code Triage Guide

**10-Second Summary**: AI-powered collaborative manuscript editor with Word-style track changes, versioning, and role-based workflows. Built with TipTap Pro, handles 85K+ word documents. React + TypeScript + Supabase.

## 🎯 Project Vision & Status

**Vision**: AI-assisted manuscript editor with editor-author collaboration, CMOS compliance, and Word-style track changes.

**Current Status: MVP (v0.5)** - Functional single-user editor
- ✅ AI suggestions (Copy Editor, Line Editor, Proofreader)
- ✅ Track changes UI with accept/reject
- ✅ CMOS style rules configuration
- ✅ Large document support (85K+ words)
- ✅ DOCX upload & processing
- ✅ TipTap Pro + 24hr JWT

**v1.0 Goals** (Simplified from PRD):
- 🚧 Editor ↔ Author workflow (Send/Return)
- 🚧 Role-based UI (hide AI from authors)
- 🚧 TipTap snapshot versioning
- 🚧 Basic comments & activity feed
- 🚧 DOCX export with track changes
- 🚧 Email notifications

**Not in v1.0**: PDF export, diff viewer, admin portal, production role, organization settings

## 🔴 Critical Issues (Fix These First)

### 1. ✅ Large Document Processing - RESOLVED (Phase 1 Deployed)
- **Status**: ✅ **PRODUCTION-READY** with documented limits
- **Solution**: Parallel batch processing with custom resolver (October 2025)
- **Capacity**:
  - **Optimal**: < 30K words (2-40 min processing, < 200 MB memory)
  - **Supported**: Up to 85K words (~15-20 min, 1.5 GB memory)
  - **Tested**: 85,337 words / 488,451 characters
- **Key Achievements**:
  - ✅ Parallel processing (5 chunks concurrent) - 3-5x faster than sequential
  - ✅ Error tolerance via Promise.allSettled() - 98.7% success rate
  - ✅ Zero rate limiting (313 requests, 0 × 429 errors)
  - ✅ 99.9%+ position accuracy across all document sizes
  - ✅ JWT extended to 24 hours (prevents suggestion loss during reload)
- **Known Limitations**:
  - ⚠️ Browser freeze: Multi-minute freeze when rendering 5,000+ suggestions (functional but poor UX)
  - ⚠️ High memory: 1,575 MB (73.5% browser limit) on large docs
  - ⚠️ Processing time: ~15-20 min for 85K words (acceptable for batch, not interactive)
- **Implementation**:
  - Custom apiResolver in `src/hooks/useTiptapEditor.ts` (lines 116-188)
  - Edge function: `supabase/functions/ai-suggestions-html/`
- **Test Results**: docs/technical/large-documents.md
- **Next Steps**: Phase 2 background queue recommended for production scale (better UX)

### 2. ✅ TipTap JWT Authentication - RESOLVED
- **Status**: ✅ Fixed - server-generated JWT working in production
- **Solution**: Extended JWT expiration from 1hr → 24hr (prevents editor reload)
- **Critical Fix**: Prevents suggestion loss when JWT refreshes during rendering
- **Key Discovery**: TipTap accepts any valid JWT signed with Content AI Secret
- **Docs**: docs/technical/tiptap-jwt.md

## 👥 User Roles (v1.0 Simplified)

**Editors** (Primary - MVP functional)
- ✅ Run AI, configure style rules, accept/reject suggestions
- 🚧 Send to Author (v1.0)

**Authors** (v1.0 - Pending)
- 🚧 Review changes, add comments
- 🚧 Cannot access AI tools
- 🚧 Return to Editor

**Current MVP**: Single-user, editor-only mode

## 🎯 Quick Decision Tree

```
Fix something?
├── 📍 Wrong suggestion positions → `/prosemirror` → docs/technical/troubleshooting.md
├── 🔧 Editor not working → `/tiptap` → docs/technical/editor-component.md
├── 📄 DOCX upload stuck → `/queue` → docs/architecture/queue-system.md
└── 🗄️ Database issues → `/supabase` → docs/architecture/database.md

Build v1.0 features?
├── 🚧 See "Immediate Next Steps" below
└── 📖 Full PRD → /Users/andresterranova/manuscript-ballast/Ballast-original-PRD.md

Enhance MVP?
├── ➕ Add AI editor role → AIEditorRules.tsx (AI_EDITOR_RULES array)
├── 📏 Add style rule → src/lib/styleRuleConstants.ts + styleValidator.ts
└── 🎨 Modify UI → docs/technical/ (component docs)

Documentation?
├── 📚 Full docs structure → docs/README.md
├── 🚀 New developer guide → docs/getting-started.md
└── 📋 Complete PRD → Ballast-original-PRD.md
```

## 📚 Documentation Hub

- 📖 **Comprehensive Docs**: [docs/README.md](docs/README.md) - Full documentation structure, technical guides, architecture
- 🚀 **Getting Started**: [docs/getting-started.md](docs/getting-started.md) - New developer onboarding, commands, workflow
- 📋 **Full PRD**: [Ballast-original-PRD.md](Ballast-original-PRD.md) - Complete product vision

## 📊 System Specs

- **Capacity**: 85,337 words / 488,451 characters tested ✅
- **Document Limits**:
  - Optimal: < 30K words (2-40 min, < 200 MB memory)
  - Supported: Up to 85K words (~15-20 min, 1.5 GB memory)
- **Performance**: 5,005 suggestions generated in ~15-20 min (85K words)
- **Stack**: React 18 + TipTap v3 Pro + Supabase + TypeScript
- **Port**: 8080 (`pnpm run dev`)
- **Branch**: main (Phase 1 deployed)

## 🔑 Key Concepts

### Primary Editor Component
- **Editor.tsx** (`src/components/workspace/Editor.tsx`) - Production-ready TipTap Pro AI editor
- Handles manuscript editing, AI suggestions, track changes UI

### Document Processing
- **Parallel batch processing** - 5 chunks processed concurrently for 3-5x speedup
- Custom apiResolver bypasses browser timeout for large documents (up to 85K words)

### Queue-Based DOCX Import
- **Workflow**: Upload → Storage → Queue → Edge Function → Processed
- Auto-polling every 10s, handles full-length manuscripts

### AI Suggestion Workflow
1. User triggers "Run AI Pass" 2. Custom apiResolver chunks document (5 concurrent)
3. AI analyzes each chunk in parallel 4. Suggestions mapped to ProseMirror positions
5. Rendered as decorations + ChangeList UI

### Technical Stack
- **Frontend**: React 18 + TypeScript + TipTap v3 Pro
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Database**: JSON-based model (flexible, no migrations needed)

## 🗄️ Database Architecture

**Current & v1.0 Approach**: Keep JSON model (it works!)
- `manuscripts` table with JSONB fields
- `suggestions`, `comments`, `style_rules` as JSONB arrays
- Add `snapshots` JSONB array for versioning (TipTap native snapshots)
- Add `activity` JSONB array for simple audit trail
- Supabase Auth for users with role field (editor/author)
- Simple RLS policies by role

**No separate tables needed** - JSON approach handles current scale efficiently

## 🚨 Critical Don'ts

❌ Edit src/components/ui/ (shadcn managed)
❌ Use character offsets (use ProseMirror positions)
❌ Bypass queue for DOCX processing
❌ Expose secrets client-side
❌ Use npm/yarn (pnpm only)

## 🏗️ Architecture Notes

**TipTap Snapshots**: Using native TipTap snapshot API for versioning (https://tiptap.dev/docs/collaboration/documents/snapshot)
- Stored as JSON in `manuscripts.snapshots` array
- Capture on: Upload, Send to Author, Return to Editor

**AI Suggestions** (Under Review):
- Current: All rules run together, stored in manuscripts.suggestions JSONB
- Exploring: One rule at a time, separate storage, performance optimization
- May experiment with different approaches for better memory/speed

## 🎬 Quick Start Commands

```bash
pnpm run dev                              # Start dev server (port 8080)
supabase functions logs queue-processor   # Check edge function logs
supabase db reset                         # Reset database (caution!)
```

## 🎯 Immediate Next Steps (v1.0)

### 1. Send to Author Flow (2-3 weeks)
- Add `role` field to Supabase Auth users (editor/author)
- Implement "Send to Author" action:
  - Create TipTap snapshot, save to `manuscripts.snapshots`
  - Set `ball_in_court = 'author'`
  - Lock editor controls (UI only visible to authors)
  - Send email notification (hardcoded template)

### 2. Return to Editor (1-2 weeks)
- "Return to Editor" button for authors
- Create snapshot on return
- Increment `round` counter
- Flip `ball_in_court = 'editor'`
- Send email notification

### 3. Basic Export & Comments (2-3 weeks)
- DOCX export with track changes (leverage existing DOCX processing)
- Activate Comments tab with flat comments
- Simple activity feed in `manuscripts.activity` JSONB

**Total: ~10 weeks to functional v1.0**

**Not in v1.0**: PDF export, diff viewer, admin portal, organization settings, production role

## 📝 Key Files

**Primary Editor**: `src/components/workspace/Editor.tsx` (production-ready)
**AI Rules**: `src/components/workspace/AIEditorRules.tsx` (AI_EDITOR_RULES array)
**PRD Reference**: `/Users/andresterranova/manuscript-ballast/Ballast-original-PRD.md` (full vision)

---

**Last Updated**: October 5, 2025 (Enhanced with Key Concepts + Documentation Hub)

## Tags

#triage #mvp #v1.0 #tiptap #supabase #AI #collaboration #workflow #CMOS #snapshot #simplified
- Always update "Last Updated" when modifying this file