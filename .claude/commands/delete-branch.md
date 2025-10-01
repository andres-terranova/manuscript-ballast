---
allowed-tools: Bash(git *), Bash(gh pr list:*)
argument-hint: "[branch-name] [--force (optional)]"
description: "Safely delete a git branch locally and on GitHub with merge verification"
---

Execute branch deletion with comprehensive safety checks:

**CRITICAL SAFETY CHECKS (MUST PASS):**

1. **Current Branch Check**
   - Run: `git branch --show-current`
   - BLOCK if deleting current branch (user must switch first)

2. **Protected Branch Check**
   - BLOCK if branch is: main, master, develop, development, production, staging
   - Error message: "Cannot delete protected branch: <branch>"

3. **Branch Existence Check**
   - Local: `git branch --list $ARG1`
   - Remote: `git branch -r --list origin/$ARG1`
   - Handle cases: local-only, remote-only, both, neither

4. **Merge Status Verification**
   - Run: `git branch --merged main --list $ARG1` (or master if main doesn't exist)
   - If NOT merged and --force not provided: WARN with commit count and BLOCK
   - Show: `git log main..$ARG1 --oneline` to display unmerged commits

5. **Open PR Detection**
   - Run: `gh pr list --head $ARG1 --json number,title,url`
   - If open PR exists: SHOW PR details and BLOCK deletion
   - Message: "Branch has open PR #X: <title> - Close PR first or delete via GitHub"

**DELETION FLOW (IF ALL CHECKS PASS):**

6. **Show Recovery Info**
   - Run: `git rev-parse $ARG1`
   - Display: "Tip commit: <sha> (restore with: git checkout -b $ARG1 <sha>)"

7. **Local Deletion** (with confirmation)
   - If merged: `git branch -d $ARG1`
   - If unmerged + --force: Ask "Branch has X unmerged commits. Force delete? (y/n)"
     - If yes: `git branch -D $ARG1`
     - If no: ABORT

8. **Remote Deletion** (with separate confirmation)
   - If remote branch exists: Ask "Delete from GitHub? This is permanent. (y/n)"
     - If yes: `git push origin --delete $ARG1`
     - If no: SKIP (local only deleted)

**SUMMARY OUTPUT:**
- ✓ Local branch deleted: <branch>
- ✓ Remote branch deleted: <branch> (if applicable)
- ℹ Recovery: git checkout -b <branch> <sha>
- Current branch: <current-branch>

**Arguments:**
- $ARG1: Branch name to delete (required)
- $ARG2: --force flag to allow unmerged branch deletion (optional)

**Error Handling:**
- If branch doesn't exist locally or remotely: "Branch '$ARG1' not found"
- If git commands fail: Show error and ABORT
- If gh not installed: SKIP PR check with warning
