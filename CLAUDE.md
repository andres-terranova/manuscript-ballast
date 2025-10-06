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

### Key Architectural Decisions

**🚨 CRITICAL: TipTap Pro AI Suggestion Extension Implementation**
→ **LOCATION**: `src/components/workspace/Editor.tsx` (NOT ManuscriptWorkspace.tsx!)
→ **EXTENSION**: TipTap Pro AI Suggestion extension (commercial, requires JWT auth)
→ **KEY DOCS**:
  • [TipTap AI Suggestion Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
  • [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms)
  • [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)
  • Internal: `docs/ai-suggestions/ai-suggestions-flow.md`

**How It Actually Works:**
1. **Initialization**: Extension configured in `useTiptapEditor.ts:85-236` with custom apiResolver
2. **Triggering**: User clicks "Run AI Pass" → `editor.chain().loadAiSuggestions().run()`
3. **Processing**: TipTap chunks document → Our apiResolver sends to edge function in parallel batches of 5
4. **Loading**: `waitForAiSuggestions()` monitors `editor.extensionStorage.aiSuggestion` for completion
5. **Storage**: ALL suggestions loaded at once into `editor.storage.aiSuggestion.getSuggestions()`
6. **Display**: `convertAiSuggestionsToUI()` transforms to our format, sorted by position
7. **Interaction**: Popover system via `onPopoverElementCreate` + `onSelectedSuggestionChange` callbacks

**Common Misconceptions to Avoid:**
❌ Suggestions are NOT loaded progressively - they ALL load when processing completes
❌ Manual suggestions in ManuscriptWorkspace.tsx are DIFFERENT - those use ProseMirror decorations
❌ You DON'T need to implement virtualization for loading - only for rendering 5K+ items
❌ The freeze is NOT during processing - it's AFTER, during position mapping

**AI Suggestions Processing Pattern** (follows [TipTap's recommended approach](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms))
→ Edge function processes ONE chunk at a time (not batch) - see supabase/functions/ai-suggestions-html/
→ Client-side apiResolver loops through chunks in parallel batches of 5 - see src/hooks/useTiptapEditor.ts:116-236
→ WHY: Simpler edge function, better error handling per chunk, controlled parallelization
→ Both batch and individual approaches are valid per TipTap's architecture
→ Details: docs/ai-suggestions/ai-suggestions-flow.md

**Browser Freeze Root Cause (5K+ suggestions)**
→ Freeze happens AFTER our code completes successfully
→ TipTap's defaultResolver maps 5K+ HTML positions → ProseMirror (synchronous, blocks UI)
→ React renders 5K+ decorations (synchronous, blocks UI)
→ Queue won't fix this - need progressive loading + virtualization (Phase 2)

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

**Work with TipTap AI Suggestions** ⭐
→ src/components/workspace/Editor.tsx (Main implementation - convertAiSuggestionsToUI, waitForAiSuggestions)
→ src/hooks/useTiptapEditor.ts:85-236 (Extension config, custom apiResolver)
→ supabase/functions/ai-suggestions-html/ (Edge function for processing chunks)

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

**Last Updated**: January 2025 (Enhanced AI Suggestion documentation for clarity)

## Tags

#triage #mvp #v1.0 #tiptap #supabase #AI #collaboration #workflow #CMOS #snapshot #simplified
- Always update "Last Updated" when modifying this file
