# Claude Code Documentation

Claude Code agent reference, specialized workflows, and custom commands.

## 📂 Claude Docs

### Agent Reference
- **agents.md** - Comprehensive agent documentation and when to use each

## 🤖 Available Agents

### Performance & Scale
- `/chunking` - Large document timeout mitigation
- `/performance` - Profiling & optimization

### Core Systems
- `/tiptap` - Editor, JWT, extensions, large document chunking
- `/queue` - DOCX processing, background jobs, Mammoth.js
- `/supabase` - Database, edge functions, RLS
- `/architecture` - System design, data flow

### Domain Experts
- `/prosemirror` - Position calculations, decorations, mapping
- `/suggestions` - Mapping & rendering AI suggestions
- `/ui` - React components, shadcn/ui, Tailwind

### Meta & Maintenance
- `/product` - Roadmap, requirements, user stories
- `/docs-maintainer` - Documentation updates and maintenance
- `/md-guide-updater` - Markdown file updates for code changes
- `/git-commit-merge` - Git operations, committing, merging

## 🎯 Quick Agent Selection

**Need to:**
- Fix large document timeout? → `/chunking` or `/tiptap`
- Debug position issues? → `/prosemirror`
- Update database? → `/supabase`
- Fix DOCX processing? → `/queue`
- Update docs? → `/docs-maintainer` or `/md-guide-updater`
- Improve performance? → `/performance`
- Build UI component? → `/ui`
- Understand system design? → `/architecture`
- Plan features? → `/product`

## 📝 Custom Commands

### Branch Management
- `/new-branch <branch-name>` - Create new branch and fresh chat
- `/delete-branch <branch-name> [--force]` - Delete branch safely

### Git Operations
- `/commit-merge <target-branch> [new-branch]` - Commit, merge, push

## 🔧 Best Practices

### When to Use Agents
1. **Use agents for complex multi-step tasks** requiring specialized knowledge
2. **Use tools directly** for simple, single-step operations
3. **Delegate to agents** when you need file searches, deep debugging, or extensive research
4. **Run agents in parallel** when tasks are independent

### Agent Communication
- Agents run **autonomously** and return final report
- **Be specific** in task description
- **Include context** about what you expect in return
- **Specify** if agent should write code or just research

## 📍 File Locations

**Agent Definitions**: `/.claude/agents/`
- Each agent has its own `.md` file
- Defines tools, description, and model

**Agent Documentation**: This file provides usage guidelines

## 🎓 Learning Resources

**New to Claude Code?** → [../01-getting-started/README.md](../01-getting-started/README.md)

**Understanding agents?** → [agents.md](./agents.md)

**Main guide?** → [../../CLAUDE.md](../../CLAUDE.md)

---

**Last Updated**: October 2, 2025
