# Manuscript Ballast - Claude Code Triage Guide

**10-Second Summary**: AI-powered manuscript editor using TipTap Pro. Handles 85K+ word documents. React + TypeScript + Supabase.

## 🔴 Critical Issues (Fix These First)

### 1. Large Documents Timeout (~2 minutes)
- **Symptom**: AI Pass fails on 50K+ word docs generating 500+ suggestions
- **Root Cause**: TipTap API timeout + browser memory limits
- **Solution**: See `/chunking` agent or docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md

### 2. TipTap JWT Authentication Broken
- **Symptom**: Server-generated tokens rejected (401 auth_cloud_failed)
- **Workaround**: Using temporary dashboard token
- **Docs**: https://tiptap.dev/docs/content-ai/capabilities/suggestion/use-with-content-ai-cloud

## 🎯 Quick Decision Tree - What Do You Need?

```
Need to fix something?
├── 💥 Timeout on large docs → `/chunking` → docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md
├── 🔐 Auth/JWT errors → `/auth` → docs/guides/TIPTAP_JWT_GUIDE.md
├── 📍 Wrong suggestion positions → `/prosemirror` → src/lib/suggestionMapper.ts
├── 🔧 Editor not working → `/tiptap` → src/components/workspace/ExperimentalEditor.tsx
├── 📄 DOCX upload stuck → `/queue` → processing_queue table + edge function logs
└── 🗄️ Database/RLS issues → `/supabase` → Use Supabase MCP tools

Need to build something?
├── ➕ Add suggestion type → src/lib/types.ts + suggestionMapper.ts
├── 📏 Add style rule → src/lib/styleRuleConstants.ts + styleValidator.ts
├── 🎨 Modify UI → src/components/workspace/ (use shadcn/ui)
├── ⚡ Add edge function → supabase/functions/ + deploy command
└── 🏗️ Major feature → `/architecture` → docs/architecture/README.md

Need to understand something?
├── 📖 Complete documentation → DOCUMENTATION_INDEX.md (meta-documentation guide)
├── 🧩 Component details → src/components/workspace/docs/
├── 🔧 Utilities → src/lib/docs/
└── ☁️ Backend → supabase/functions/CLAUDE.md
```

## 📊 System Specs

- **Capacity**: 85,337 words / 488,451 characters tested
- **Timeout Risk**: 500+ suggestions at ~2 minutes
- **Stack**: React 18 + TipTap v3 Pro + Supabase + TypeScript
- **Port**: 8080 (`pnpm run dev`)
- **Branch**: feature/manuscriptsTableActions

## 🚨 Critical Don'ts

❌ Edit src/components/ui/ (shadcn managed)
❌ Use character offsets (use ProseMirror positions)
❌ Bypass queue for DOCX processing
❌ Expose secrets client-side
❌ Use npm/yarn (pnpm only)

## 📂 Claude Code Agents (docs/CLAUDE_AGENTS.md)

```
Performance & Scale
├── /chunking - Large document timeout mitigation
└── /performance - Profiling & optimization

Core Systems
├── /tiptap - Editor, JWT, extensions
├── /queue - DOCX processing, background jobs
├── /supabase - Database, edge functions, RLS
└── /architecture - System design, data flow

Domain Experts
├── /prosemirror - Position calculations, decorations
├── /auth - Dual auth (Supabase + TipTap JWT)
├── /suggestions - Mapping & rendering
└── /ui - React components, shadcn/ui

Meta & Debug
├── /product - Roadmap, requirements
├── /debug - General troubleshooting
└── /mcp - MCP tool operations
```

## 🎬 Quick Start Commands

```bash
pnpm run dev                              # Start dev server (port 8080)
supabase functions logs queue-processor   # Check edge function logs
supabase db reset                         # Reset database (caution!)
```

## 🎯 Current Priorities

1. **Fix timeout on large docs** (500+ suggestions hit ~2 min limit)
2. **Resolve TipTap JWT rejection** (server tokens fail, using dashboard token)
3. **Complete ExperimentalEditor migration** (deprecate ManuscriptWorkspace)

---

**Need detailed documentation?** → DOCUMENTATION_INDEX.md
**Working on components?** → src/components/workspace/docs/
**Working on utilities?** → src/lib/docs/
**Previous comprehensive guide?** → Git history has 300+ line version