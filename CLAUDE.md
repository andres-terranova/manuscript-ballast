# Manuscript Ballast - Claude Code Triage Guide

**10-Second Summary**: AI-powered manuscript editor using TipTap Pro. Handles 85K+ word documents. React + TypeScript + Supabase.

## 🔴 Critical Issues (Fix These First)

### 1. 🟡 Large Documents Rate Limiting - PARTIALLY RESOLVED
- **Symptom**: AI Pass fails with 429 rate limit error on 85K+ word docs
- **Root Cause Discovery**: Console.log() CPU load was disrupting TipTap's internal request throttling
- **Solution**: Reduced polling log frequency from 1s → 5s in `waitForAiSuggestions()`
- **Current Status**: 🟡 **IMPROVED** - Can now process 27,782 words (155K chars), previously impossible
- **How It Works**:
  - JavaScript is single-threaded - frequent console.log() blocks main thread
  - Each log: formats string, writes buffer, updates DevTools UI
  - Main thread contention → TipTap throttling timing disrupted → chunks sent too fast → 429
  - Reducing logs 80% (36 logs → 7 logs per 36s) freed main thread
  - TipTap's built-in throttling now works correctly
- **Evidence Pattern**:
  - chunkSize: 2 → Failed at 27s (faster failure, MORE chunks)
  - chunkSize: 10 → Failed at 54s
  - chunkSize: 35 → Failed at 74s (slower failure, FEWER chunks)
  - **Issue was request RATE, not total requests or chunk size**
- **Test Results**:
  - ✅ 27,782 words / 155K chars now succeeds
  - ⏳ "Runs for longer" = proper throttling slowing chunk sends
  - 🔴 85K+ word docs still untested
- **Next Steps**: Test with logging completely disabled, test on full 85K word docs
- **Location**: ExperimentalEditor.tsx:325-333
- **Commit**: fc1735b (2025-10-01)
- **Docs**: docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md

### 2. ✅ TipTap JWT Authentication - RESOLVED
- **Status**: Fixed - server-generated JWT working in production
- **Solution**: Simplified JWT payload structure
- **Key Discovery**: TipTap accepts any valid JWT signed with Content AI Secret
- **Docs**: docs/guides/TIPTAP_JWT_GUIDE.md

## 🎯 Quick Decision Tree - What Do You Need?

```
Need to fix something?
├── 🟡 Large docs (PARTIALLY RESOLVED - console.log CPU load fix, 27K words working) → docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md
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
- **Branch**: feature/noPolling

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

1. **🟡 IMPROVED: Large document 429 rate limiting** (PARTIALLY RESOLVED - console.log fix enables 27K words, testing 85K+ next)
2. ✅ ~~**Resolve TipTap JWT rejection**~~ (RESOLVED - simplified JWT structure works)
3. **Test removing polling loop entirely** (branch: feature/noPolling - investigate if polling is even necessary)
4. **Complete ExperimentalEditor migration** (deprecate ManuscriptWorkspace)

---

**Need detailed documentation?** → DOCUMENTATION_INDEX.md
**Working on components?** → src/components/workspace/docs/
**Working on utilities?** → src/lib/docs/
**Previous comprehensive guide?** → Git history has 300+ line version