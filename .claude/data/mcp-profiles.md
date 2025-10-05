# MCP Profile Registry

**Last Updated**: 2025-10-05 (claude-deployer updated)

This file contains a static reference of all configured MCP profiles for quick retrieval.

## Active Profiles

### 1. minimal
- **Alias**: `claude-minimal`
- **Config**: `~/.claude/configs/empty.json`
- **MCPs**: None
- **Use Case**: Maximum performance, no external tools
- **Context Savings**: ~43k tokens

### 2. db-only
- **Alias**: `claude-db`
- **Config**: `~/.claude/configs/db-only.json`
- **MCPs**: supabase
- **Use Case**: Database operations, RLS, migrations
- **Context Savings**: ~30-35k tokens

### 3. supabase-only
- **Alias**: `claude-supabase`
- **Config**: `~/.claude/configs/supabase-only.json`
- **MCPs**: supabase
- **Use Case**: Database operations (duplicate of db-only)
- **Context Savings**: ~30-35k tokens
- **Note**: Duplicate of db-only

### 4. deployer
- **Alias**: `claude-deployer`
- **Config**: `~/.claude/configs/vercel-only.json`
- **MCPs**: vercel, supabase, exa (with API key)
- **Use Case**: Full-stack deployment workflows (hosting, database, code search)
- **Context Savings**: ~15-20k tokens

### 5. lightweight
- **Alias**: `claude-light`
- **Config**: `~/.claude/configs/lightweight.json`
- **MCPs**: context7, exa (no API key)
- **Use Case**: Code research, web search
- **Context Savings**: ~10-20k tokens
- **Note**: Exa missing API key, may not function properly

### 6. research
- **Alias**: `claude-research`
- **Config**: `~/.claude/configs/research.json`
- **MCPs**: context7, exa (with API key)
- **Use Case**: Full research capabilities with Exa search
- **Context Savings**: ~10-20k tokens

### 7. claude-build
- **Alias**: `claude-build`
- **Config**: `~/.claude/configs/claude-build.json`
- **MCPs**: supabase, exa (with API key)
- **Use Case**: Building features requiring database + code research
- **Context Savings**: ~20-25k tokens

### 8. claude-tester
- **Alias**: `claude-tester`
- **Config**: `~/.claude/configs/claude-tester.json`
- **MCPs**: chrome-devtools, exa (with API key), supabase
- **Use Case**: Testing with browser automation, search, and database
- **Context Savings**: ~15-20k tokens

## Quick Reference

| Profile | Alias | MCPs | Best For |
|---------|-------|------|----------|
| minimal | `claude-minimal` | None | Max performance |
| db-only | `claude-db` | supabase | Database work |
| supabase-only | `claude-supabase` | supabase | Database work (duplicate) |
| deployer | `claude-deployer` | vercel, supabase, exa | Full-stack deployment |
| lightweight | `claude-light` | context7, exa* | Research (broken) |
| research | `claude-research` | context7, exa | Research |
| claude-build | `claude-build` | supabase, exa | Feature development |
| claude-tester | `claude-tester` | chrome-devtools, exa, supabase | Testing + automation |

*Exa API key missing in lightweight profile

## Available MCPs

- **supabase**: Database operations, RLS, migrations, edge functions
- **context7**: Library documentation and code examples
- **exa**: Web search and code context retrieval
- **vercel**: Deployment management and logs
- **chrome-devtools**: Browser automation (in default config only)

## Default Configuration

Running `claude` without an alias loads all MCPs from `~/.claude/mcp.json`:
- supabase
- context7
- chrome-devtools
- vercel

**Highest context usage** - Use profiles to reduce token consumption.

---

**⚠️ MAINTENANCE**: When creating/deleting profiles, this file MUST be updated accordingly.
