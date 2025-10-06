# Manuscript Ballast Documentation

**Welcome to Manuscript Ballast** - An AI-powered manuscript editor built with TipTap Pro, React, and Supabase.

**Current Status**: MVP v0.5 (Production-ready core features)
**Next Milestone**: v1.0 (Streamlined Editor ↔ Author workflow)

---

## 📚 Documentation Structure

### [Getting Started](./getting-started.md)
Quick orientation and core concepts - **start here**

### [Technical](./technical/)
Implementation guides, troubleshooting, and deep dives
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
- **[Suggestion Rendering](./architecture/suggestion-rendering.md)** - React rendering patterns

### [Product](./product/)
Product strategy, roadmap, and features
- **[Roadmap](./product/roadmap.md)** - v1.0 timeline (~10 weeks)
- **[Features](./product/features.md)** - Feature specifications

### [Claude](./claude/)
Claude Code agent reference
- **[Agents](./claude/agents.md)** - Specialized agent descriptions
- **[UAT Template](./claude/uat-template.md)** - Testing template

### [Archive](./archive/)
Historical documentation and deprecated guides

---

## 🚀 Quick Navigation

### Current State (v0.5 - MVP)
- ✅ Large document processing (up to 85K words)
- ✅ TipTap Pro editor with AI suggestions
- ✅ JSON-based database model (simple, flexible)
- ✅ TipTap snapshots for versioning
- ✅ Queue-based DOCX processing

### v1.0 Goals (Streamlined Approach)
- Focus on Editor ↔ Author workflow (Send/Return)
- Role-based UI (hide AI from authors)
- Basic comments & activity feed
- DOCX export with track changes
- **Not in v1.0**: PDF export, admin portal, diff viewer

---

## 🔍 Finding Documentation

**By Topic:**
- Large documents: [`technical/large-documents.md`](./technical/large-documents.md)
- JWT authentication: [`technical/tiptap-jwt.md`](./technical/tiptap-jwt.md)
- Database schema: [`architecture/database.md`](./architecture/database.md)
- Versioning: [`architecture/versioning.md`](./architecture/versioning.md)
- Queue system: [`architecture/queue-system.md`](./architecture/queue-system.md)

**By Task:**
- Debugging: [`technical/troubleshooting.md`](./technical/troubleshooting.md)
- Adding features: [`product/roadmap.md`](./product/roadmap.md)
- Understanding architecture: [`architecture/`](./architecture/)

---

## 📝 Quick Links

**New to the project?** → [Getting Started](./getting-started.md)
**Main Project Guide** → [CLAUDE.md](../CLAUDE.md) (quick-start triage guide)

---

**Last Updated**: October 5, 2025 - Streamlined structure

## Tags
#documentation #mvp #v1.0 #streamlined
