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

### 1. Dual Editor System
- **ManuscriptEditor** (ExperimentalEditor): Default, uses TipTap Pro AI
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
- 🟡 Deprecate Standard Editor (migration to ManuscriptEditor)

## 📚 Next Steps

- **Technical details**: [02-technical](../02-technical/README.md)
- **Component docs**: [03-components](../03-components/README.md)
- **Architecture**: [05-architecture](../05-architecture/README.md)
- **Product roadmap**: [06-product](../06-product/README.md)

---

**Last Updated**: October 2, 2025
