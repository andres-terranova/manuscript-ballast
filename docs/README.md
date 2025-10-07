# Manuscript Ballast Documentation

**Welcome!** This is the human-friendly documentation hub for Manuscript Ballast.

---

## 🎯 For Claude Code (Start Here)

**Root Context**: [/CLAUDE.md](../CLAUDE.md)
- 10-second summary, project state, quick decision tree
- Where to make changes (file paths)
- Links to detailed docs below

**Detailed Documentation** (3 core files):
1. **[TECHNICAL.md](./TECHNICAL.md)** - ALL technical & implementation details
   - AI Suggestions System
   - Architecture (database, queue, versioning)
   - Editor & Components
   - Debugging guides

2. **[ROADMAP.md](./ROADMAP.md)** - ALL product & planning details
   - v1.0 Scope (10 weeks)
   - Phase Breakdown
   - Feature Specifications
   - User Journeys

3. **[TESTING.md](./TESTING.md)** - ALL testing details
   - UAT Templates
   - Token Overflow Prevention
   - Common Patterns
   - Git Worktrees Testing

---

## 📚 For Humans (Getting Started)

### Quick Orientation

**What is Manuscript Ballast?**
AI-powered manuscript editor for professional editors and authors. Handles up to 85K word documents with AI suggestions, version history, and Word-style workflows.

**Tech Stack**:
- Frontend: React 18 + TypeScript + TipTap v3 Pro
- Backend: Supabase (PostgreSQL + Edge Functions)
- AI: TipTap Pro AI with OpenAI GPT-4
- Database: JSON-based (JSONB arrays, no complex migrations)

**Current State**:
- ✅ Phase 1 Complete: Large document processing, AI suggestions, DOCX import
- 🚧 Phase 2-4: Building editor-author collaboration workflow (~10 weeks)

### Common Commands

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

### Architecture Overview

```
React App (Port 8080)
├── Editor (TipTap Pro + AI Suggestions)
│   ├── Dynamic Config (10-40 chunkSize based on doc size)
│   ├── Parallel Batching (3-10 concurrent chunks)
│   └── Edge Function (ai-suggestions-html)
│
├── Queue System (Background DOCX processing)
│   └── Edge Function (queue-processor)
│
└── Database (Supabase PostgreSQL)
    ├── manuscripts (JSONB for suggestions/comments/snapshots)
    ├── processing_queue (Background jobs)
    └── profiles (User data with roles)
```

---

## 📖 Documentation Structure

**Old Structure** (17 files, 7 folders):
```
❌ architecture/ (3 files)
❌ technical/ (3 files)
❌ product/ (2 files)
❌ features/ (1 file)
❌ claude/ (2 files)
❌ ai-suggestions/ (4 files)
❌ backlog/ (empty)
```

**New Structure** (4 files, 1 folder):
```
✅ /CLAUDE.md (Root context for Claude Code)
✅ /docs/
    ├── TECHNICAL.md (ALL implementation docs)
    ├── ROADMAP.md (ALL product/planning docs)
    ├── TESTING.md (ALL testing docs)
    └── README.md (This file - human navigation)
```

**Benefits**:
- 76% fewer files to maintain
- Everything Claude needs in 4 scannable files
- No more hunting across folders
- Easier to keep in sync

---

## 🔍 Finding Information

### "How do I...?"

**...understand AI suggestions?**
→ [TECHNICAL.md](./TECHNICAL.md#ai-suggestions-system)

**...work with the database?**
→ [TECHNICAL.md](./TECHNICAL.md#architecture)

**...add a new feature?**
→ [ROADMAP.md](./ROADMAP.md#phase-breakdown)

**...write a UAT test?**
→ [TESTING.md](./TESTING.md#uat-testing-with-chrome-devtools-mcp)

**...debug position issues?**
→ [TECHNICAL.md](./TECHNICAL.md#position-debugging)

**...understand v1.0 scope?**
→ [ROADMAP.md](./ROADMAP.md#v10-scope-10-weeks)

### "What is...?"

**...TipTap Pro AI Suggestion?**
→ [TECHNICAL.md](./TECHNICAL.md#ai-suggestions-system)

**...the Queue System?**
→ [TECHNICAL.md](./TECHNICAL.md#queue-system-background-job-processing)

**...EXPERIMENT 8?**
→ [TECHNICAL.md](./TECHNICAL.md#dynamic-configuration-experiment-8)

**...Version Snapshots?**
→ [TECHNICAL.md](./TECHNICAL.md#versioning-strategy-tiptap-snapshots)
→ [ROADMAP.md](./ROADMAP.md#snapshot--versioning-details)

---

## 🚀 Common Tasks

### Adding Features

1. **Plan the feature**
   - Check [ROADMAP.md](./ROADMAP.md) for v1.0 scope
   - Identify which phase it belongs to

2. **Understand the architecture**
   - Read relevant section in [TECHNICAL.md](./TECHNICAL.md)
   - Review database schema if needed

3. **Implement**
   - Follow patterns in [TECHNICAL.md](./TECHNICAL.md)
   - Update documentation as you go

4. **Test**
   - Create UAT using templates in [TESTING.md](./TESTING.md)
   - Run existing tests

### Debugging Issues

1. **AI Suggestions Problems**
   - Check [TECHNICAL.md](./TECHNICAL.md#debugging-tips)
   - Look at edge function logs: `supabase functions logs ai-suggestions-html`

2. **Position/Mapping Issues**
   - Review [TECHNICAL.md](./TECHNICAL.md#position-debugging)
   - Remember: Use ProseMirror positions, not character offsets

3. **Queue/Background Jobs**
   - Check queue table: `processing_queue`
   - View logs: `supabase functions logs queue-processor`

### Maintaining Documentation

**When to update**:
- After implementing new features
- When changing architecture/patterns
- After discovering new insights
- When fixing bugs (document root cause)

**What to update**:
- [TECHNICAL.md](./TECHNICAL.md) for implementation changes
- [ROADMAP.md](./ROADMAP.md) for scope/feature changes
- [TESTING.md](./TESTING.md) for new test patterns
- [/CLAUDE.md](../CLAUDE.md) for high-level context changes

---

## 🏷️ Tags & Search

**By Technology**:
- TipTap: [TECHNICAL.md](./TECHNICAL.md) (AI Suggestions, Editor sections)
- React: [TECHNICAL.md](./TECHNICAL.md) (React Integration Patterns)
- Supabase: [TECHNICAL.md](./TECHNICAL.md) (Database, Edge Functions)
- PostgreSQL: [TECHNICAL.md](./TECHNICAL.md) (Database Schema)

**By Feature**:
- AI Suggestions: [TECHNICAL.md](./TECHNICAL.md#ai-suggestions-system)
- Versioning: [TECHNICAL.md](./TECHNICAL.md#versioning-strategy-tiptap-snapshots), [ROADMAP.md](./ROADMAP.md#snapshot--versioning-details)
- Queue System: [TECHNICAL.md](./TECHNICAL.md#queue-system-background-job-processing)
- Editor: [TECHNICAL.md](./TECHNICAL.md#editortsx-primary-editor-component)

**By Task**:
- Testing: [TESTING.md](./TESTING.md)
- Debugging: [TECHNICAL.md](./TECHNICAL.md#debugging-tips)
- Planning: [ROADMAP.md](./ROADMAP.md)

---

## 📞 Getting Help

**For Claude Code**:
- Start with [/CLAUDE.md](../CLAUDE.md) for quick context
- Use decision tree to find relevant detailed doc
- All technical details in [TECHNICAL.md](./TECHNICAL.md)

**For Humans**:
- This README provides overview and navigation
- Detailed docs are optimized for LLMs but human-readable
- Use "Finding Information" section above

---

**Last Updated**: January 2025 - Radical documentation consolidation

**Tags**: #documentation #readme #navigation #getting-started
