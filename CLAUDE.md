# Manuscript Ballast - LLM Project Context

**10-Second Summary**: AI-powered collaborative manuscript editor with Word-style track changes, versioning, and role-based workflows. Built with TipTap Pro, handles 85K+ word documents. React + TypeScript + Supabase.

## 🎯 Project State

**Current**: MVP v0.5 - Single-user editor (functional, production-ready)
**Next**: v1.0 - Editor-author collaboration workflow (~10 weeks)
**Scope**: Send/Return workflow, role-based UI, snapshots, DOCX export, comments
**Out of Scope**: PDF export, diff viewer, admin portal, production role

## ⚙️ Architectural Constraints

### Hard Limits (Production-Ready with Constraints)
- **Large Docs**: Up to 85K words (optimal <30K) | Browser freeze on 5K+ suggestions, 15-20min processing, 1.5GB memory
- **TipTap JWT**: 24hr expiration, server-generated from edge function (docs/technical/tiptap-jwt.md)
- **Database**: JSONB-only (manuscripts.suggestions/comments/snapshots as arrays) - No separate tables

### Critical Don'ts
❌ Edit src/components/ui/ (shadcn managed)
❌ Use character offsets (use ProseMirror positions only)
❌ Bypass queue for DOCX processing
❌ Expose secrets client-side
❌ Use npm/yarn (pnpm only)

## 🎯 Quick Decision Tree

```
Fix something?
├── 📍 Wrong suggestion positions → docs/technical/troubleshooting.md
├── 🔧 Editor not working → docs/technical/editor-component.md
├── 📄 DOCX upload stuck → docs/architecture/queue-system.md
└── 🗄️ Database issues → docs/architecture/database.md

Build v1.0 feature?
├── 📖 Full roadmap → docs/product/roadmap.md
└── 📋 Feature specs → docs/product/features.md

Enhance MVP?
├── ➕ Add AI role → AIEditorRules.tsx (AI_EDITOR_RULES array)
├── 📏 Add style rule → styleRuleConstants.ts + styleValidator.ts
└── 🎨 Modify UI → docs/technical/editor-component.md
```

## 📚 Documentation Navigator

**Quick Start**: [docs/getting-started.md](docs/getting-started.md) - Setup, commands, core concepts
**Technical**: [docs/technical/](docs/technical/) - Implementation guides, troubleshooting
**Architecture**: [docs/architecture/](docs/architecture/) - System design, patterns
**Product**: [docs/product/](docs/product/) - Roadmap, features, v1.0 scope
**Full Index**: [docs/README.md](docs/README.md) - Complete documentation hub with tag-based navigation

## 🔑 Where to Make Changes

**Add AI editing role**
→ src/components/workspace/AIEditorRules.tsx (AI_EDITOR_RULES array)

**Add style rule**
→ src/lib/styleRuleConstants.ts + styleValidator.ts

**Modify editor UI**
→ src/components/workspace/Editor.tsx (see docs/technical/editor-component.md)

**Change DOCX processing**
→ supabase/functions/queue-processor/ (see docs/architecture/queue-system.md)

**Update AI suggestion logic**
→ src/hooks/useTiptapEditor.ts:116-188 (custom apiResolver, parallel processing)

## 🎬 Quick Commands

```bash
pnpm run dev                              # Start dev server (port 8080)
supabase functions logs queue-processor   # Check edge function logs
supabase db reset                         # Reset database (caution!)
```

---

**Stack**: React 18 + TypeScript + TipTap v3 Pro + Supabase
**Dev Port**: 8080
**Capacity**: 85K words tested (optimal <30K words)

**Last Updated**: October 5, 2025 (Optimized for LLM context loading)

## Tags

#triage #mvp #v1.0 #tiptap #supabase #AI #collaboration #workflow #CMOS #snapshot #simplified
- Always update "Last Updated" when modifying this file
