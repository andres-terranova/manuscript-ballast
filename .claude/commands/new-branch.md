---
allowed-tools: Bash(git checkout:*), Bash(git branch:*)
argument-hint: "[branch-name]"
description: "Create a new git branch and start a fresh chat"
---
!Bash --command "git checkout -b $ARGUMENTS" --description "Create and checkout new branch $ARGUMENTS"