---
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(grep:*), Read
argument-hint: ""
description: "List available MCP profile configurations and their aliases"
---
!Bash --command "echo '📋 Available MCP Profile Aliases:\n' && grep 'alias claude-' ~/.zshrc | sed 's/alias //' | sed 's/=/ → /' | sed 's|~/.claude/configs/||' | sed \"s/'//g\" | sed 's/^/  • /' && echo '\n🔧 Config Files in ~/.claude/configs/:' && ls -1 ~/.claude/configs/*.json | xargs -n1 basename | sed 's/^/  • /'" --description "List MCP profiles and their aliases with mappings"
