# Manuscript Ballast - LLM Project Context

**10-Second Summary**: AI-powered collaborative manuscript editor with Word-style track changes, versioning, and role-based workflows. Built with TipTap Pro, handles 85K+ word documents. React + TypeScript + Supabase.

---

## 🎯 Project State

**Current**: MVP v0.5 - Single-user editor (functional, production-ready)
**Next**: v1.0 - Editor-author collaboration workflow (~10 weeks)
**Scope**: Send/Return workflow, role-based UI, snapshots, DOCX export, comments
**Out of Scope**: PDF export, diff viewer, admin portal, production role

---

## 🚨 Critical Don'ts

❌ Edit `src/components/ui/` (shadcn managed)
❌ Use character offsets (use ProseMirror positions only)
❌ Bypass queue for DOCX processing
❌ Expose secrets client-side
❌ Use npm/yarn (pnpm only)

---

## 🎯 Quick Decision Tree

```
Fix something?
├── 📍 AI suggestions issue → docs/TECHNICAL.md (AI Suggestions section)
├── 🔧 Editor not working → docs/TECHNICAL.md (Editor & Components section)
├── 📄 DOCX upload stuck → docs/TECHNICAL.md (Architecture → Queue System)
└── 🗄️ Database issues → docs/TECHNICAL.md (Architecture → Database)

Build v1.0 feature?
├── 📖 Full roadmap → docs/ROADMAP.md
└── 📋 Feature specs → docs/ROADMAP.md (Phase Breakdown)

Enhance MVP?
├── ➕ Add AI role → src/components/workspace/AIEditorRules.tsx (AI_EDITOR_RULES array)
├── 🎨 Modify editor UI → docs/TECHNICAL.md (Editor & Components)
└── 🧪 Write UAT tests → docs/TESTING.md

Need documentation?
├── 📚 Technical details → docs/TECHNICAL.md (ALL implementation docs)
├── 🗺️ Product planning → docs/ROADMAP.md (ALL feature/roadmap docs)
├── 🧪 Testing guides → docs/TESTING.md (UAT templates, patterns)
└── 📖 Human-friendly nav → docs/README.md
```

---

## 🔑 Where to Make Changes

**Work with AI Suggestions** ⭐
```
src/components/workspace/Editor.tsx
├─ convertAiSuggestionsToUI()     # Transform TipTap → UI format
├─ waitForAiSuggestions()         # Monitor completion
└─ handlePopoverAccept/Reject()   # User interactions

src/hooks/useTiptapEditor.ts:95-260
├─ Lines 95-116: Dynamic config   # EXPERIMENT 8
└─ Lines 137-260: Custom resolver  # Parallel batching

supabase/functions/ai-suggestions-html/
└─ Edge function for AI processing
```

**Add AI editing role**
```
src/components/workspace/AIEditorRules.tsx → AI_EDITOR_RULES array
```

**Modify editor UI**
```
src/components/workspace/Editor.tsx → See docs/TECHNICAL.md
```

**Change DOCX processing**
```
supabase/functions/queue-processor/ → See docs/TECHNICAL.md
```

**Update database schema**
```
supabase/migrations/ → See docs/TECHNICAL.md (Database section)
```

---

## 📚 Documentation Hub

**For Claude Code** (start here):
- **[docs/TECHNICAL.md](docs/TECHNICAL.md)** - ALL technical/implementation details
  - AI Suggestions System (complete reference)
  - Architecture (database, queue, versioning)
  - Editor & Components (TipTap, edge functions, React)

- **[docs/ROADMAP.md](docs/ROADMAP.md)** - ALL product/planning details
  - v1.0 Scope & Timeline (10 weeks)
  - Phase Breakdown (1-4)
  - Feature Specifications
  - User Journeys

- **[docs/TESTING.md](docs/TESTING.md)** - ALL testing details
  - UAT Templates & Structure
  - Token Overflow Prevention
  - Git Worktrees Testing
  - Common Patterns

**For Humans**:
- **[docs/README.md](docs/README.md)** - Human-friendly documentation navigator

---

## 🎬 Quick Commands

```bash
# Development
pnpm run dev                              # Start dev server (port 8080)
pnpm run type-check                       # TypeScript checks
pnpm run lint                             # Lint code

# Database & Functions
supabase db reset                         # Reset database (caution!)
supabase functions logs queue-processor   # Check edge function logs
supabase functions logs ai-suggestions-html

# Git
git status                                # Check current state
/commit-merge main                        # Commit and merge to main
/new-branch [name]                        # Create new branch
```

---

## ⚙️ System Specs

**Stack**: React 18 + TypeScript + TipTap v3 Pro + Supabase
**Dev Port**: 8080
**Capacity**: 85K words tested (optimal <30K words)
**Database**: JSONB-only (manuscripts.suggestions/comments/snapshots as arrays)

**Performance** (EXPERIMENT 8 - Dynamic Config):
- Small (<20K words): ~2 min, 200-500 suggestions
- Medium (20-50K words): ~5-10 min, 1K-2K suggestions
- Large (80K+ words): ~15-20 min, 3K-5K suggestions

**Known Limitation**: Browser freeze on 5K+ suggestions (Phase 2 will fix with virtualization)

---

## 🚨 Critical: AI Suggestions Implementation

**LOCATION**: `src/components/workspace/Editor.tsx` (NOT ManuscriptWorkspace.tsx!)
**EXTENSION**: TipTap Pro AI Suggestion (commercial, requires JWT auth)

**How It Works**:
1. User clicks "Run AI Pass" → `editor.chain().loadAiSuggestions().run()`
2. TipTap Pro chunks document (dynamic chunkSize: 10-40 based on doc size)
3. Custom apiResolver batches chunks (dynamic batchSize: 3-10)
4. ALL suggestions load at once when complete (not progressively)
5. `convertAiSuggestionsToUI()` transforms to UI format, sorted by position
6. Display in editor popovers + ChangeList sidebar

**Common Mistakes** (READ THIS):
❌ Suggestions are NOT loaded progressively - they ALL load when processing completes
❌ Manual suggestions in ManuscriptWorkspace.tsx are DIFFERENT - those use ProseMirror decorations
❌ You DON'T need to implement virtualization for loading - only for rendering 5K+ items
❌ The freeze is NOT during processing - it's AFTER, during position mapping

**Details**: See `docs/TECHNICAL.md` (AI Suggestions section)

---

## 📖 External Resources

**TipTap Official**:
- [AI Suggestion Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms)
- [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)
- [Snapshot API](https://tiptap.dev/docs/collaboration/documents/snapshot)

**Stack Docs**:
- React 18: https://react.dev
- TypeScript: https://www.typescriptlang.org
- Supabase: https://supabase.com/docs
- ProseMirror: https://prosemirror.net/docs

---

**Last Updated**: January 2025 - Radical documentation consolidation (17 files → 4 files)

## Tags
#triage #mvp #v1.0 #tiptap #supabase #AI #collaboration #workflow #CMOS #snapshot #simplified
