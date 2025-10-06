# Getting Started with Manuscript Ballast

**Quick orientation for new developers and Claude Code sessions**

📌 **For project status, critical issues, and quick decisions** → [CLAUDE.md](../CLAUDE.md)

## System Overview

Manuscript Ballast is an AI-powered manuscript editor that handles 85K+ word documents using:
- **Frontend**: React 18 + TipTap v3 Pro
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: TipTap Pro AI (OpenAI integration)
- **Language**: TypeScript
- **Database**: JSON-based model (simple, flexible)

## 📋 Quick Reference

**Port**: 8080 (`pnpm run dev`)
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

### 1. Primary Editor Component
- **Editor** (src/components/workspace/Editor.tsx): Production-ready TipTap Pro AI editor
- Handles all manuscript editing, AI suggestions, and track changes UI

### 2. Document Processing (RESOLVED ✅)
- **Up to 85K words**: Fully working with parallel batch processing
- Custom apiResolver bypasses browser timeout
- Processes 5 chunks concurrently for 3-5x speedup
- 99.9%+ position accuracy across all document sizes

### 3. Queue-Based DOCX Import
- Upload → Storage → Queue → Edge Function → Processed
- Auto-polling every 10s
- Handles full-length manuscripts

### 4. AI Suggestion Workflow
1. User clicks "Run AI Pass"
2. Custom apiResolver chunks document (5 chunks concurrent)
3. AI analyzes each chunk in parallel
4. Suggestions mapped to ProseMirror positions
5. Rendered as decorations + ChangeList

### 5. Technical Stack
- **React 18** + **TypeScript**
- **TipTap v3 Pro** (editor + AI)
- **Supabase** (database + auth + edge functions)
- **JSON database model** (flexible, no migrations needed)

## 📚 Next Steps

- **Full documentation hub**: [docs/README.md](./README.md)
- **Technical details**: [technical/](./technical/)
- **Architecture guides**: [architecture/](./architecture/)
- **Product roadmap**: [product/](./product/)

---

## Tags

#getting_started #quick_start #react #typescript #tiptap #supabase #development #commands #architecture #queue #authentication #editor #AI #deployment #mvp #v1.0 #collaboration

---

**Last Updated**: October 5, 2025 - Removed duplication, streamlined for new developers
