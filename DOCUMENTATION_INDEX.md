# Documentation Index

> **Created**: September 30, 2025  
> **Purpose**: Complete guide to the hierarchical documentation structure

## 📖 Quick Start for AI Assistants

1. **Start here**: [CLAUDE.md](./CLAUDE.md) - Main navigation hub
2. **Understand system**: [docs/architecture/README.md](./docs/architecture/README.md)
3. **Choose your specialty**: Use slash commands in [.cursorrules](./.cursorrules)

## 📁 Documentation Structure

### Root Level
```
/
├── CLAUDE.md                          ⭐ Main navigation hub & quick reference
├── README.md                          Project overview (for humans)
├── .cursorrules                       🤖 Subagents & slash commands
└── DOCUMENTATION_INDEX.md             This file
```

### Documentation Directory
```
docs/
├── architecture/
│   ├── README.md                      System architecture overview
│   └── QUEUE_SYSTEM_ARCHITECTURE.md   Queue processing deep dive
│
├── features/
│   ├── README.md                      Feature catalog & specs
│   ├── LARGE_DOCUMENT_AI_PROCESSING_TODO.md
│   ├── LARGE_DOCUMENT_AI_PROCESSING_FEATURES.md
│   ├── LARGE_DOCUMENT_AI_PROCESSING_RESEARCH_AND_IMPLEMENTATION_PLAN.md
│   └── POPOVER_FROM_CHANGELIST_PLAN.md
│
├── guides/
│   ├── README.md                      Development guides & troubleshooting
│   ├── EXPERIMENTAL_AI_SETUP.md       TipTap Pro setup guide
│   ├── TIPTAP_JWT_GUIDE.md           JWT authentication guide (✅ RESOLVED)
│   ├── TIPTAP_AI_RATE_LIMITING_GUIDE.md
│   └── static_jwt_online_tool.md     JWT breakthrough discovery
│
├── api/
│   └── README.md                      External API documentation
│
└── product/
    ├── README.md                      Product strategy & roadmap
    └── Future_Cleanup_Checklist.md    Technical debt tracker
```

### Code Documentation
```
src/
├── components/workspace/
│   └── CLAUDE.md                      🤖 Workspace components guide
│
└── lib/
    └── CLAUDE.md                      🤖 Core utilities guide

supabase/
└── functions/
    └── CLAUDE.md                      🤖 Edge functions guide
```

## 🎭 Subagent System (.cursorrules)

The `.cursorrules` file defines specialized AI subagents for different domains:

### Available Slash Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/tiptap` | TipTap Integration Specialist | Editor issues, JWT auth, AI suggestions |
| `/queue` | Queue System Specialist | DOCX processing, stuck jobs, background tasks |
| `/supabase` | Supabase & Database Specialist | Schema, edge functions, RLS policies |
| `/architecture` | System Architecture Specialist | Design questions, major features, data flow |
| `/suggestions` | Suggestion System Specialist | Position mapping, decorations, UI |
| `/product` | Product & Planning Specialist | Feature planning, roadmap, user needs |
| `/debug` | Debugging Specialist | Complex bugs, performance issues |

### Example Usage
```
User: "AI suggestions aren't appearing after Run AI Pass"
→ Use: /tiptap

User: "DOCX processing stuck at extracting_text"
→ Use: /queue

User: "Need to add version history feature"
→ Use: /architecture
```

## 📚 Documentation by Use Case

### I need to understand the system
1. Start: [CLAUDE.md](./CLAUDE.md)
2. Architecture: [docs/architecture/README.md](./docs/architecture/README.md)
3. Features: [docs/features/README.md](./docs/features/README.md)

### I'm working on the editor
1. Workspace components: [src/components/workspace/CLAUDE.md](./src/components/workspace/CLAUDE.md)
2. Core utilities: [src/lib/CLAUDE.md](./src/lib/CLAUDE.md)
3. TipTap guide: [docs/guides/EXPERIMENTAL_AI_SETUP.md](./docs/guides/EXPERIMENTAL_AI_SETUP.md)
4. Use: `/tiptap` or `/suggestions`

### I'm working on document processing
1. Queue system: [docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md](./docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md)
2. Edge functions: [supabase/functions/CLAUDE.md](./supabase/functions/CLAUDE.md)
3. Use: `/queue` or `/supabase`

### I'm debugging an issue
1. Development guides: [docs/guides/README.md](./docs/guides/README.md)
2. Check console logs
3. Use: `/debug` or relevant specialist

### I'm planning a feature
1. Product docs: [docs/product/README.md](./docs/product/README.md)
2. Feature catalog: [docs/features/README.md](./docs/features/README.md)
3. Architecture: [docs/architecture/README.md](./docs/architecture/README.md)
4. Use: `/product` or `/architecture`

## 🎯 Key Concepts by Priority

### Critical Knowledge (Must Know)
1. **Dual Editor System**: ExperimentalEditor (default) vs ManuscriptWorkspace (deprecated)
2. **Queue-Based Processing**: Eliminates WORKER_LIMIT errors, handles 60K+ words
3. **TipTap JWT Authentication**: Complex, currently using temporary tokens
4. **ProseMirror Positions**: Always use PM positions, never character offsets

### Important Knowledge (Should Know)
1. **Suggestion Mapping**: Server format → UI format → Decorations
2. **Style Rules**: Deterministic checks vs AI suggestions
3. **Edge Functions**: Deno-based, 2-minute timeout, CPU protection
4. **State Management**: Context (global) + local state + TanStack Query

### Nice to Know (Good to Know)
1. **Component Organization**: auth/, dashboard/, ui/, workspace/
2. **Plugin System**: suggestionsPlugin, checksPlugin
3. **Performance Optimizations**: Decoration capping, debouncing
4. **MCP Integration**: Supabase MCP for database operations

## 🔍 Finding Information

### By Topic
- **TipTap**: Search "TipTap" or check `/tiptap` command in .cursorrules
- **Queue**: [docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md](./docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md)
- **Authentication**: [docs/guides/TIPTAP_JWT_GUIDE.md](./docs/guides/TIPTAP_JWT_GUIDE.md)
- **Components**: [src/components/workspace/CLAUDE.md](./src/components/workspace/CLAUDE.md)
- **Utilities**: [src/lib/CLAUDE.md](./src/lib/CLAUDE.md)

### By File Type
- **README.md files**: Human-readable overviews
- **CLAUDE.md files**: AI assistant technical guides
- **.cursorrules**: Subagent definitions and commands

### By Complexity Level
- **High Complexity**: TipTap JWT (see guide), ProseMirror plugins
- **Medium Complexity**: Suggestion mapping, queue system
- **Low Complexity**: UI components, utility functions

## 🚨 Known Issues & Workarounds

### TipTap JWT Authentication ✅
- **Status**: RESOLVED - Production ready
- **Solution**: Simplified JWT payload structure
- **Key Discovery**: TipTap accepts any valid JWT signed with Content AI Secret
- **Documentation**: [docs/guides/TIPTAP_JWT_GUIDE.md](./docs/guides/TIPTAP_JWT_GUIDE.md)
- **Use**: `/tiptap` for implementation details

### Large Document Processing 🟢
- **Status**: SOLVED with queue system
- **Documentation**: [docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md](./docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md)
- **Use**: `/queue` for help

### Dual Editor Migration 🟡
- **Status**: IN PROGRESS - migrating to ExperimentalEditor
- **Use**: `/architecture` for planning help

## 📝 Maintaining Documentation

### When to Update

- **New features**: Update [docs/features/README.md](./docs/features/README.md)
- **Architecture changes**: Update [docs/architecture/README.md](./docs/architecture/README.md)
- **New components**: Update [src/components/workspace/CLAUDE.md](./src/components/workspace/CLAUDE.md)
- **New utilities**: Update [src/lib/CLAUDE.md](./src/lib/CLAUDE.md)
- **New edge functions**: Update [supabase/functions/CLAUDE.md](./supabase/functions/CLAUDE.md)
- **Bugs fixed**: Update relevant guides in [docs/guides/](./docs/guides/)

### Documentation Standards

1. **Human-readable**: README.md files use clear language
2. **AI-optimized**: CLAUDE.md files use structured format
3. **Examples included**: Code snippets with context
4. **Links provided**: Cross-reference related docs
5. **Status indicators**: 🔴 High priority, 🟡 In progress, 🟢 Solved, ✅ Complete

## 🎓 Learning Path

### Day 1: Orientation
1. Read [CLAUDE.md](./CLAUDE.md) (10 min)
2. Skim [docs/architecture/README.md](./docs/architecture/README.md) (15 min)
3. Browse [.cursorrules](./.cursorrules) (5 min)

### Day 2: Deep Dive
1. Study [src/components/workspace/CLAUDE.md](./src/components/workspace/CLAUDE.md) (30 min)
2. Review [src/lib/CLAUDE.md](./src/lib/CLAUDE.md) (20 min)
3. Read [docs/features/README.md](./docs/features/README.md) (15 min)

### Day 3: Specialization
1. Choose domain: TipTap, Queue, Supabase, etc.
2. Read relevant specialist docs
3. Practice with `/slash` commands

## 🔗 External Resources

- **TipTap Pro**: https://tiptap.dev/docs/content-ai
- **Supabase**: https://supabase.com/docs
- **ProseMirror**: https://prosemirror.net/docs/
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs/

## 📊 Documentation Metrics

### Coverage
- ✅ Architecture documentation
- ✅ Component documentation
- ✅ Utility documentation
- ✅ Edge function documentation
- ✅ Feature specifications
- ✅ Development guides
- ✅ API documentation
- ✅ Product documentation

### Quality
- ✅ Code examples provided
- ✅ Troubleshooting guides
- ✅ Cross-references included
- ✅ Visual diagrams (ASCII art)
- ✅ Status indicators
- ✅ Priority markers

### Accessibility
- ✅ Hierarchical structure
- ✅ Clear navigation
- ✅ Search-friendly
- ✅ Context-specific guides
- ✅ Quick reference sections

## 🎉 Summary

The documentation is now organized in a hierarchical structure optimized for both human developers and AI assistants:

1. **Root CLAUDE.md** - Main navigation hub
2. **docs/** - Organized by purpose (architecture, features, guides, api, product)
3. **Code CLAUDE.md files** - Technical guides for each major subsystem
4. **.cursorrules** - Subagent definitions with 7 specialized assistants

Use slash commands (`/tiptap`, `/queue`, `/supabase`, etc.) to invoke specialized help for different domains!

---

**Last Updated**: September 30, 2025
**Maintained By**: AI Assistants & Development Team
