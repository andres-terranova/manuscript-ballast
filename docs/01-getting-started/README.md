# Getting Started with Manuscript Ballast

**Quick orientation for new developers and Claude Code sessions**

## System Overview

Manuscript Ballast is an AI-powered manuscript editor that handles 85K+ word documents using:
- **Frontend**: React 18 + TipTap v3 Pro
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: TipTap Pro AI (OpenAI integration)
- **Language**: TypeScript

## 📋 Quick Reference

**Port**: 8080 (`pnpm run dev`)

**Current Branch**: cleanup/docs (check `git status` for actual branch)

**Main Branch**: main (for PRs)

## 🎯 Start Here

For a comprehensive quick-start guide, see the main [CLAUDE.md](../../CLAUDE.md) in the project root.

That guide includes:
- 🔴 Critical issues and their status
- 🎯 Quick decision tree (what do you need?)
- 📊 System specs and capacity
- 🚨 Critical don'ts
- 📂 Claude Code agents reference
- 🎬 Quick start commands

## ⚡ Common Commands

```bash
# Development
pnpm run dev                 # Start dev server (port 8080)
pnpm run type-check          # TypeScript checks
pnpm run lint                # Lint code

# Database
supabase db reset            # Reset database (caution!)
supabase functions logs      # View edge function logs

# Git
git status                   # Check current state
/commit-merge main           # Commit and merge to main
```

## 🔑 Key Concepts

### 1. Primary Editor
- **ManuscriptEditor** (Editor): Production editor, uses TipTap Pro AI
- **Standard Editor**: Deprecated, legacy OpenAI integration

### 2. Document Processing Limits
- ✅ **Up to 27K words**: Working (console.log fix applied)
- 🟡 **27K-85K words**: Untested (may hit browser timeout)
- ❌ **85K+ words**: Needs custom resolver (Chrome 2-min timeout)

### 3. Queue-Based DOCX Processing
- Upload → Storage → Queue → Edge Function → Processed
- Auto-polling every 10s
- Handles 60K+ word documents

### 4. AI Suggestion Workflow
1. User clicks "Run AI Pass"
2. TipTap chunks document (chunkSize: 5)
3. AI analyzes each chunk
4. Suggestions mapped to ProseMirror positions
5. Rendered as decorations + ChangeList

## 📍 Current Status (October 2, 2025)

**Recently Resolved**:
- ✅ TipTap JWT authentication (Oct 1)
- ✅ Console.log CPU load fix (Oct 1) - enabled 27K word processing

**Active Work**:
- 🟡 Custom resolver for 85K+ word documents (browser timeout bypass)
- 🟡 Deprecate Standard Editor (migration complete for primary editor)

## 🏷️ Documentation by Tag

Find documentation by topic using these tag-based groupings:

### #authentication #JWT #token
- [TipTap JWT Authentication](../02-technical/authentication/tiptap-jwt.md) - Server-generated JWT, 24hr expiration
- [Technical README](../02-technical/README.md) - Authentication overview
- [Edge Functions](../04-backend/edge-functions.md) - JWT handling in edge functions
- [Features](../06-product/features.md) - Authentication features

### #supabase #backend #database #edge_function
- [Backend README](../04-backend/README.md) - Backend services overview
- [Edge Functions](../04-backend/edge-functions.md) - Complete edge function guide
- [Queue System](../04-backend/queue-system.md) - Background job processing
- [Supabase Logs](../02-technical/large-documents/supabase-logs.md) - Debugging with logs

### #tiptap #editor #prosemirror
- [Manuscript Editor](../03-components/editors/manuscript-editor.md) - Primary editor component
- [Components README](../03-components/README.md) - Component architecture
- [TipTap JWT](../02-technical/authentication/tiptap-jwt.md) - Editor authentication
- [Debug Suggestion Positions](../02-technical/troubleshooting/debug-suggestion-positions.md) - ProseMirror position mapping
- [Archive: Debug Positions](../archive/debug-suggestion-positions.md) - Historical reference

### #performance #large_documents #timeout #browser
- [Timeout Guide](../02-technical/large-documents/timeout-guide.md) - Large document processing
- [UAT Phase 1 Findings](../02-technical/large-documents/UAT-PHASE1-FINDINGS.md) - Performance test results
- [Implementation Guide](../02-technical/large-documents/implementation-guide-phased-approach.md) - Phased approach
- [Action Plan Phase 1](../02-technical/large-documents/ACTION-PLAN-PHASE1.md) - Implementation roadmap
- [React Suggestions](../02-technical/integrations/react-suggestions.md) - Virtual scrolling optimization

### #queue #DOCX #processing
- [Queue System (Backend)](../04-backend/queue-system.md) - Queue troubleshooting
- [Queue System (Architecture)](../05-architecture/queue-system.md) - System design
- [Edge Functions](../04-backend/edge-functions.md) - Queue processor implementation

### #AI #suggestions #position_mapping
- [React Suggestions](../02-technical/integrations/react-suggestions.md) - Rendering architecture
- [React Suggestion Rendering](../05-architecture/react-suggestion-rendering.md) - System flow
- [Debug Suggestion Positions](../02-technical/troubleshooting/debug-suggestion-positions.md) - Position debugging
- [UAT Phase 1](../02-technical/large-documents/UAT-PHASE1.md) - AI testing protocol
- [Manuscript Editor](../03-components/editors/manuscript-editor.md) - Editor AI integration

### #troubleshooting #debug #bug
- [Debug Suggestion Positions](../02-technical/troubleshooting/debug-suggestion-positions.md) - Position issues
- [Queue System](../04-backend/queue-system.md) - Queue debugging
- [Supabase Logs](../02-technical/large-documents/supabase-logs.md) - Log analysis
- [Timeout Guide](../02-technical/large-documents/timeout-guide.md) - Timeout resolution

### #deployment #vercel #CI_CD
- [Vercel Deployment](../02-technical/integrations/vercel-deployment.md) - Frontend deployment
- [Edge Functions](../04-backend/edge-functions.md) - Edge function deployment
- [Technical README](../02-technical/README.md) - Deployment overview

### #testing #UAT
- [UAT Phase 1](../02-technical/large-documents/UAT-PHASE1.md) - Testing protocol
- [UAT Phase 1 Findings](../02-technical/large-documents/UAT-PHASE1-FINDINGS.md) - Test results

### #architecture #react #typescript #component
- [Architecture README](../05-architecture/README.md) - System architecture
- [Components README](../03-components/README.md) - Component structure
- [Queue System Architecture](../05-architecture/queue-system.md) - Queue design
- [React Suggestion Rendering](../05-architecture/react-suggestion-rendering.md) - Rendering flow

### #product #roadmap #features
- [Product README](../06-product/README.md) - Product overview
- [Roadmap](../06-product/roadmap.md) - Future plans
- [Features](../06-product/features.md) - Feature list

### #claude_code #agents #command
- [Claude README](../07-claude/README.md) - Claude Code workflows
- [Agents](../07-claude/agents.md) - Agent reference guide
- [CLAUDE.md](../../CLAUDE.md) - Triage guide

### #archived
- [Archive README](../archive/README.md) - Archived documentation
- [Archive: Debug Positions](../archive/debug-suggestion-positions.md) - Historical debugging
- [Archive: Current Approach](../02-technical/large-documents/archive/current-approach.md) - Previous implementation
- [Archive: Strategic Evaluation](../02-technical/large-documents/archive/strategic-evaluation-synthesis.md) - Decision analysis

## 📚 Next Steps

- **Technical details**: [02-technical](../02-technical/README.md)
- **Component docs**: [03-components](../03-components/README.md)
- **Architecture**: [05-architecture](../05-architecture/README.md)
- **Product roadmap**: [06-product](../06-product/README.md)

---

## Tags

#getting_started #quick_start #react #typescript #tiptap #supabase #development #commands #architecture #queue #authentication #editor #AI #deployment

---

**Last Updated**: October 5, 2025
