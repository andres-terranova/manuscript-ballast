---
allowed-tools: Task(git-commit-merge:*)
argument-hint: "[target-branch] [new-branch (optional)]"
description: "Verify, commit, and merge changes into target branch, optionally creating a new branch"
---

Triggering the git-commit-merge agent to:
1. Run linting and verification checks
2. Commit all staged changes with a descriptive message
3. Merge into branch: $ARG1
4. Create new branch: $ARG2 (if provided)

!Task --subagent_type git-commit-merge --description "Commit and merge workflow" --prompt "Execute the full commit and merge workflow:

1. Run verification checks (linting)
2. Review staged changes with git status and git diff --cached
3. Create a descriptive commit message following project conventions
4. Commit the staged changes
5. Merge current branch into target branch: $ARG1
6. If provided, create and checkout new branch: $ARG2

Arguments:
- Target branch: $ARG1
- New branch: $ARG2

Provide a summary of what was committed and the current branch status when done."
