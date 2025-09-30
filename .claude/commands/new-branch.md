---
allowed-tools: Bash(git checkout:*), Bash(git branch:*), SlashCommand(/new-chat)
argument-hint: "[branch-name]"
description: "Create a new git branch and start a fresh chat"
---
!git checkout -b $ARGUMENTS

Now starting a new chat session for branch: $ARGUMENTS