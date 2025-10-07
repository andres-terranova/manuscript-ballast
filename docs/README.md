# Manuscript Ballast Documentation

**Welcome to Manuscript Ballast** - An AI-powered manuscript editor built with TipTap Pro, React, and Supabase.

---

## 🎯 Start Here

**New to the project?** Start with [CLAUDE.md](../CLAUDE.md) for:
- Quick triage and decision tree
- Current critical issues and their status
- System specs and immediate next steps

**Working with AI Suggestions?** ⭐
- **Main Implementation**: `src/components/workspace/Editor.tsx` (NOT ManuscriptWorkspace)
- **Architecture Guide**: [AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md)
- **TipTap Docs**: [AI Suggestion Extension](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
- **Key Point**: Suggestions load ALL at once when processing completes (not progressively)

**Then use this hub** to navigate to detailed documentation by topic.

---

## 📚 Documentation Structure

### [Getting Started](./getting-started.md)
Quick orientation and core concepts - **start here**

### [Technical](./technical/)
Implementation guides, troubleshooting, and deep dives
- **[AI Suggestions Quick Reference](./ai-suggestions/ai-suggestions-quick-reference.md)** ⭐ - Essential developer guide
- **[Large Documents](./technical/large-documents.md)** - Processing up to 85K+ words
- **[TipTap JWT](./technical/tiptap-jwt.md)** - Authentication configuration
- **[Edge Functions](./technical/edge-functions.md)** - Supabase edge functions
- **[React Integration](./technical/react-integration.md)** - React patterns
- **[Troubleshooting](./technical/troubleshooting.md)** - Debug guides
- **[Editor Component](./technical/editor-component.md)** - Primary editor docs

### [Architecture](./architecture/)
System design and architectural decisions
- **[Database](./architecture/database.md)** - JSON-first database design
- **[Versioning](./architecture/versioning.md)** - TipTap snapshot strategy
- **[Queue System](./architecture/queue-system.md)** - Background job processing

### [AI Suggestions](./ai-suggestions/)
AI-powered suggestion system documentation
- **[AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md)** ⭐ - TipTap Pro AI extension implementation
- **[Quick Reference](./ai-suggestions/ai-suggestions-quick-reference.md)** - Essential developer guide
- **[Suggestion Rendering](./ai-suggestions/suggestion-rendering.md)** - React rendering patterns
- **[Sort Implementation](./ai-suggestions/sort-ai-suggestions-implementation.md)** - Position-based sorting guide
- **[Debug Guide](./ai-suggestions/debug-suggestion-positions.md)** - Troubleshooting positions
- **[Virtualized Suggestions](./ai-suggestions/virtualized-ai-suggestions/)** - Performance optimization (Phase 2)

### [Features](./features/)
Feature documentation and specifications
- **[Snapshots & Versioning](./features/snapshots-versioning.md)** ⭐ - Manual versioning system (Production-ready)

### [Product](./product/)
Product strategy, roadmap, and features
- **[Roadmap](./product/roadmap.md)** - v1.0 timeline (~10 weeks)

### [Claude](./claude/)
Claude Code agent reference
- **[Agents](./claude/agents.md)** - Specialized agent descriptions
- **[UAT Template](./claude/uat-template.md)** - Testing template

### [Archive](./archive/)
Historical documentation and deprecated guides

---


## 🔍 Finding Documentation

**By Topic:**
- Large documents: [`technical/large-documents.md`](./technical/large-documents.md)
- JWT authentication: [`technical/tiptap-jwt.md`](./technical/tiptap-jwt.md)
- Database schema: [`architecture/database.md`](./architecture/database.md)
- **Snapshots & Versioning**: [`features/snapshots-versioning.md`](./features/snapshots-versioning.md) ⭐ NEW
- Versioning strategy: [`architecture/versioning.md`](./architecture/versioning.md)
- Queue system: [`architecture/queue-system.md`](./architecture/queue-system.md)

**By Task:**
- Debugging: [`technical/troubleshooting.md`](./technical/troubleshooting.md)
- Adding features: [`product/roadmap.md`](./product/roadmap.md)
- Understanding architecture: [`architecture/`](./architecture/)

---

## 🏷️ Documentation by Tag

### Core Technologies
- **TipTap**: [Editor Component](./technical/editor-component.md) · [JWT Auth](./technical/tiptap-jwt.md) · [Versioning](./architecture/versioning.md) · [Snapshots](./features/snapshots-versioning.md) · [Suggestion Rendering](./ai-suggestions/suggestion-rendering.md)
- **React**: [Editor Component](./technical/editor-component.md) · [Integration Patterns](./technical/react-integration.md) · [Suggestion Rendering](./ai-suggestions/suggestion-rendering.md) · [Getting Started](./getting-started.md)
- **Supabase**: [Database](./architecture/database.md) · [Edge Functions](./technical/edge-functions.md) · [Queue System](./architecture/queue-system.md) · [JWT Auth](./technical/tiptap-jwt.md)
- **ProseMirror**: [Editor Component](./technical/editor-component.md) · [Troubleshooting](./technical/troubleshooting.md) · [Suggestion Rendering](./ai-suggestions/suggestion-rendering.md) · [Agents](./claude/agents.md)

### Architecture Topics
- **Database & Schema**: [Database Design](./architecture/database.md) · [Versioning](./architecture/versioning.md) · [Edge Functions](./technical/edge-functions.md)
- **Queue System**: [Queue Architecture](./architecture/queue-system.md) · [Edge Functions](./technical/edge-functions.md)
- **Versioning & Snapshots**: [Snapshots Feature](./features/snapshots-versioning.md) · [Versioning Strategy](./architecture/versioning.md) · [Database](./architecture/database.md) · [Editor Integration](./technical/editor-component.md)
- **AI Architecture & Processing**: [AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md) · [Large Documents](./technical/large-documents.md) · [Editor Component](./technical/editor-component.md)
- **Suggestions & AI**: [AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md) · [Editor Component](./technical/editor-component.md) · [Suggestion Rendering](./ai-suggestions/suggestion-rendering.md) · [Troubleshooting](./technical/troubleshooting.md)

### Performance & Optimization
- **Large Documents**: [Large Document Processing](./technical/large-documents.md) · [AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md) · [React Integration](./technical/react-integration.md)
- **Parallel Processing**: [AI Suggestions Flow](./ai-suggestions/ai-suggestions-flow.md) · [Large Documents](./technical/large-documents.md) · [Edge Functions](./technical/edge-functions.md)
- **Memory & Rendering**: [React Integration](./technical/react-integration.md) · [Suggestion Rendering](./ai-suggestions/suggestion-rendering.md) · [Editor Component](./technical/editor-component.md)

### Authentication & Security
- **JWT**: [TipTap JWT](./technical/tiptap-jwt.md) · [Editor Component](./technical/editor-component.md) · [Edge Functions](./technical/edge-functions.md)
- **RLS & Security**: [Database](./architecture/database.md) · [Edge Functions](./technical/edge-functions.md)

### Troubleshooting & Debugging
- **Debug Guides**: [Troubleshooting](./technical/troubleshooting.md) · [Edge Functions](./technical/edge-functions.md) · [Queue System](./architecture/queue-system.md)
- **Testing**: [Large Documents](./technical/large-documents.md) · [UAT Template](./claude/uat-template.md) · [Queue System](./architecture/queue-system.md)

### Product & Planning
- **v1.0 & Roadmap**: [Roadmap](./product/roadmap.md) · [Features](./product/features.md) · [Getting Started](./getting-started.md) · [README](./README.md)
- **Workflow & Collaboration**: [Features](./product/features.md) · [Roadmap](./product/roadmap.md) · [Getting Started](./getting-started.md)

### Development
- **Getting Started**: [Quick Start Guide](./getting-started.md) · [README](./README.md)
- **Claude Code**: [Agents](./claude/agents.md) · [UAT Template](./claude/uat-template.md)
- **Deployment**: [Edge Functions](./technical/edge-functions.md) · [TipTap JWT](./technical/tiptap-jwt.md) · [Getting Started](./getting-started.md)

---

## 📝 Quick Links

**New to the project?** → [Getting Started](./getting-started.md)
**Main Project Guide** → [CLAUDE.md](../CLAUDE.md) (quick-start triage guide)

---

**Last Updated**: January 6, 2025 - Added Snapshots & Versioning feature documentation

## Tags
#documentation #mvp #v1.0 #streamlined
