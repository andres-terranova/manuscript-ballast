# Manuscript Ballast - Claude Code Triage Guide

**10-Second Summary**: AI-powered manuscript editor using TipTap Pro. Handles 85K+ word documents. React + TypeScript + Supabase.

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
- **Test Results**: docs/02-technical/large-documents/UAT-PHASE1-FINDINGS.md
- **Next Steps**: Phase 2 background queue recommended for production scale (better UX)

### 2. ✅ TipTap JWT Authentication - RESOLVED
- **Status**: ✅ Fixed - server-generated JWT working in production
- **Solution**: Extended JWT expiration from 1hr → 24hr (prevents editor reload)
- **Critical Fix**: Prevents suggestion loss when JWT refreshes during rendering
- **Key Discovery**: TipTap accepts any valid JWT signed with Content AI Secret
- **Docs**: docs/02-technical/authentication/tiptap-jwt.md

## 🎯 Quick Decision Tree - What Do You Need?

```
Need to fix something?
├── ✅ Large docs (RESOLVED - Phase 1 deployed, up to 85K words) → docs/02-technical/large-documents/
├── ✅ JWT authentication (RESOLVED - 24hr expiration) → docs/02-technical/authentication/tiptap-jwt.md
├── 📍 Wrong suggestion positions → `/prosemirror` → docs/02-technical/troubleshooting/
├── 🔧 Editor not working → `/tiptap` → docs/03-components/editors/
├── 📄 DOCX upload stuck → `/queue` → docs/04-backend/queue-system.md
└── 🗄️ Database/RLS issues → `/supabase` → Use Supabase MCP tools

Need to build something?
├── ➕ Add suggestion type → AIEditorRules.tsx (add to AI_EDITOR_RULES array)
├── 📏 Add style rule → src/lib/styleRuleConstants.ts + styleValidator.ts
├── 🎨 Modify UI → docs/03-components/ (use shadcn/ui)
├── ⚡ Add edge function → docs/04-backend/edge-functions.md
└── 🏗️ Major feature → `/architecture` → docs/05-architecture/

Need to understand something?
├── 📖 Complete documentation → docs/README.md (documentation hub)
├── 🧩 Component details → docs/03-components/
├── 🔧 Backend & edge functions → docs/04-backend/
└── ☁️ Architecture & system design → docs/05-architecture/
```

## 📊 System Specs

- **Capacity**: 85,337 words / 488,451 characters tested ✅
- **Document Limits**:
  - Optimal: < 30K words (2-40 min, < 200 MB memory)
  - Supported: Up to 85K words (~15-20 min, 1.5 GB memory)
- **Performance**: 5,005 suggestions generated in ~15-20 min (85K words)
- **Stack**: React 18 + TipTap v3 Pro + Supabase + TypeScript
- **Port**: 8080 (`pnpm run dev`)
- **Branch**: main (Phase 1 deployed)

## 🚨 Critical Don'ts

❌ Edit src/components/ui/ (shadcn managed)
❌ Use character offsets (use ProseMirror positions)
❌ Bypass queue for DOCX processing
❌ Expose secrets client-side
❌ Use npm/yarn (pnpm only)

## 📂 Claude Code Agents (docs/07-claude/agents.md)

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

1. ✅ ~~**Large document processing**~~ (RESOLVED - Phase 1 deployed October 2025)
2. ✅ ~~**TipTap JWT authentication**~~ (RESOLVED - 24hr expiration prevents reload)
3. ✅ ~~**Editor component naming**~~ (RESOLVED - ExperimentalEditor renamed to Editor, October 2025)
4. **📋 Phase 2 Planning**: Background queue system for production-scale UX
   - Address browser freeze on 5,000+ suggestions
   - Improve memory efficiency beyond 85K words
   - Add progress tracking and resumability
   - Timeline: 12-week implementation estimate
5. **📊 Production Monitoring**: Track Phase 1 usage patterns
   - Document size distribution
   - Processing times and memory usage
   - User feedback on browser freeze UX
6. **🎨 UI Optimization**: Progressive rendering for large suggestion sets

---

**Need detailed documentation?** → docs/README.md (documentation hub)
**Working on components?** → docs/03-components/
**Working on backend?** → docs/04-backend/
**Understanding architecture?** → docs/05-architecture/
**Product planning?** → docs/06-product/

## 📝 Component Structure

**Primary Editor**: `src/components/workspace/Editor.tsx` (production-ready, handles all manuscript editing)
**Legacy Editor**: `src/components/workspace/ManuscriptWorkspace.tsx` (deprecated, maintained for backward compatibility)

---

**Last Updated**: October 5, 2025

## Tags

#triage #documentation #quick_start #architecture #tiptap #supabase #edge_function #AI #large_documents #phase1 #JWT #authentication #performance #troubleshooting #deployment #command #react #typescript #prosemirror
- always update the "Last updated" date whenever you update an .md doc