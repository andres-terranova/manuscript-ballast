---
allowed-tools: Task(git-commit-merge:*)
argument-hint: "[target-branch] [new-branch (optional)]"
description: "Verify, commit, merge changes into target branch, push to remote, and optionally create a new branch"
---

Triggering the git-commit-merge agent to:
1. Run linting and verification checks
2. Commit all staged changes with a descriptive message. ALWAYS STAGE ALL CHANGES with git add .
3. Merge into branch: $ARG1
4. Push target branch to remote (with confirmation)
5. Create new branch: $ARG2 (if provided)

!Task --subagent_type git-commit-merge --description "Commit and merge workflow" --prompt "Execute the full commit and merge workflow:

1. Run verification checks (linting)
2. Review staged changes with git status and git diff --cached
3. **CRITICAL**: Check for Supabase migrations in supabase/migrations/ directory
   - If migrations exist, verify they are staged with git add .
   - ALWAYS include migration files in the commit
   - Mention migration files explicitly in commit message
4. Create a descriptive commit message following project conventions
5. Commit the staged changes
6. Merge current branch into target branch: $ARG1
7. Ask user to confirm before pushing to remote
8. Push target branch to origin: git push origin $ARG1
9. If provided, create and checkout new branch: $ARG2

Arguments:
- Target branch: $ARG1
- New branch: $ARG2

Provide a summary of what was committed, pushed, and the current branch status when done."
