# Manuscript Ballast - Claude Code Triage Guide

**10-Second Summary**: AI-powered manuscript editor using TipTap Pro. Handles 85K+ word documents. React + TypeScript + Supabase.

## 🔴 Critical Issues (Fix These First)

### 1. ❌ Large Documents Rate Limiting - ACTIVE ISSUE
- **Symptom**: AI Pass fails with 429 rate limit error at ~27 seconds on 85K+ word docs
- **Attempted Fix**: Changed `chunkSize: 10` to `chunkSize: 2` in src/hooks/useTiptapEditor.ts:116
- **Result**: Fix did NOT work - error occurs even faster now (27s vs 54s)
- **Status**: BROKEN - chunkSize change made rate limiting worse
- **Test Date**: 2025-10-01 via Playwright MCP
- **Evidence**: Console shows 429 from https://api.tiptap.dev/v1/ai/suggestions after 27s
- **Next Steps**: Investigate TipTap API rate limits, consider request throttling/batching
- **Docs**: docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md

### 2. ✅ TipTap JWT Authentication - RESOLVED
- **Status**: Fixed - server-generated JWT working in production
- **Solution**: Simplified JWT payload structure
- **Key Discovery**: TipTap accepts any valid JWT signed with Content AI Secret
- **Docs**: docs/guides/TIPTAP_JWT_GUIDE.md

## 🎯 Quick Decision Tree - What Do You Need?

```
Need to fix something?
├── ❌ Large docs (BROKEN - 429 rate limit at 27s) → docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md
├── ✅ JWT authentication (RESOLVED) → docs/guides/TIPTAP_JWT_GUIDE.md
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

1. **❌ CRITICAL: Fix 429 rate limit on large docs** (85K words fails at 27s - chunkSize fix made it worse)
2. ✅ ~~**Resolve TipTap JWT rejection**~~ (RESOLVED - simplified JWT structure works)
3. **Complete ExperimentalEditor migration** (deprecate ManuscriptWorkspace)

---

**Need detailed documentation?** → DOCUMENTATION_INDEX.md
**Working on components?** → src/components/workspace/docs/
**Working on utilities?** → src/lib/docs/
**Previous comprehensive guide?** → Git history has 300+ line version