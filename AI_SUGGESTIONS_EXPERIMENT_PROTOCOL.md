# AI Suggestions Performance Experiments - Testing Protocol

**Date Created**: January 2025
**Purpose**: Test different configurations to optimize AI Suggestions processing speed and reliability

## 🧪 Experiment Overview

| Experiment | Branch | ChunkSize | BatchSize | Delay | Hypothesis |
|-----------|--------|-----------|-----------|-------|------------|
| **Control** | exp/control | 10 | 5 | 500ms | Baseline performance |
| **Exp 1** | exp/chunk-5 | 5 | 5 | 500ms | Smaller chunks = more API calls but better granularity |
| **Exp 2** | exp/chunk-20 | 20 | 5 | 500ms | Larger chunks = fewer API calls, risk of timeouts |
| **Exp 3** | exp/batch-10 | 10 | 10 | 750ms | Aggressive batching with longer delays |
| **Exp 4** | exp/parallel-rules | 10 | 5 | 500ms | Parallel rule processing = 3-4x speedup per chunk |

## 📁 Worktree Locations

```
/Users/andresterranova/ballast-control              # Control (unchanged)
/Users/andresterranova/ballast-exp-chunk5           # Experiment 1
/Users/andresterranova/ballast-exp-chunk20          # Experiment 2
/Users/andresterranova/ballast-exp-batch10          # Experiment 3
/Users/andresterranova/ballast-exp-parallel-rules   # Experiment 4
```

## 🧑‍🔬 Testing Procedure

### Step 1: Prepare Test Document
- [ ] Select a consistent test document (recommended: 30-50K words)
- [ ] Note document details:
  - Word count: _________________
  - File name: _________________
  - Manuscript ID: _________________

### Step 2: Test Control Baseline
```bash
cd /Users/andresterranova/ballast-control
pnpm run dev
```
- [ ] Open browser: http://localhost:8080
- [ ] Navigate to test manuscript
- [ ] Open browser DevTools Console (to see logs)
- [ ] Click "Run AI Pass"
- [ ] Record metrics (see template below)
- [ ] Stop server (Ctrl+C)

### Step 3: Test Experiment 1 (Small Chunks)
```bash
cd /Users/andresterranova/ballast-exp-chunk5
pnpm run dev
```
- [ ] Repeat testing procedure
- [ ] Record metrics

### Step 4: Test Experiment 2 (Large Chunks)
```bash
cd /Users/andresterranova/ballast-exp-chunk20
pnpm run dev
```
- [ ] Repeat testing procedure
- [ ] Record metrics

### Step 5: Test Experiment 3 (Aggressive Batching)
```bash
cd /Users/andresterranova/ballast-exp-batch10
pnpm run dev
```
- [ ] Repeat testing procedure
- [ ] Record metrics

### Step 6: Test Experiment 4 (Parallel Rules)
```bash
cd /Users/andresterranova/ballast-exp-parallel-rules
pnpm run dev
```
- [ ] **IMPORTANT**: Deploy updated edge function first!
  ```bash
  supabase functions deploy ai-suggestions-html
  ```
- [ ] Repeat testing procedure
- [ ] Record metrics

## 📊 Metrics Template

### Control Baseline
```
Experiment: Control (chunkSize: 10, BATCH_SIZE: 5, delay: 500ms)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___ (timestamp from console)
End Time: ___:___ (timestamp from console)
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____ (from console: "Complete: X suggestions")
Total Suggestions: _____
Failed Chunks: _____ (from console: "❌ Chunk X failed")
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Rate Limit Errors: [ ] None  [ ] Some (count): _____
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

### Experiment 1: Small Chunks (chunkSize: 5)
```
Experiment: Exp 1 (chunkSize: 5, BATCH_SIZE: 5, delay: 500ms)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___
End Time: ___:___
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____
Total Suggestions: _____
Failed Chunks: _____
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Rate Limit Errors: [ ] None  [ ] Some (count): _____
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

vs Control: [ ] Faster  [ ] Slower  [ ] Same
Difference: _____ minutes _____ seconds

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

### Experiment 2: Large Chunks (chunkSize: 20)
```
Experiment: Exp 2 (chunkSize: 20, BATCH_SIZE: 5, delay: 500ms)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___
End Time: ___:___
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____
Total Suggestions: _____
Failed Chunks: _____
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Rate Limit Errors: [ ] None  [ ] Some (count): _____
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

vs Control: [ ] Faster  [ ] Slower  [ ] Same
Difference: _____ minutes _____ seconds

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

### Experiment 3: Aggressive Batching (BATCH_SIZE: 10, delay: 750ms)
```
Experiment: Exp 3 (chunkSize: 10, BATCH_SIZE: 10, delay: 750ms)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___
End Time: ___:___
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____
Total Suggestions: _____
Failed Chunks: _____
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Rate Limit Errors: [ ] None  [ ] Some (count): _____
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

vs Control: [ ] Faster  [ ] Slower  [ ] Same
Difference: _____ minutes _____ seconds

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

### Experiment 4: Parallel Rules
```
Experiment: Exp 4 (Parallel rule processing)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___
End Time: ___:___
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____
Total Suggestions: _____
Failed Chunks: _____
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Rate Limit Errors: [ ] None  [ ] Some (count): _____
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

vs Control: [ ] Faster  [ ] Slower  [ ] Same
Difference: _____ minutes _____ seconds

Expected Speedup: 3-4x per chunk (if using 3-4 rules)
Actual Speedup: _____x

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

## 📈 Comparison Summary

After completing all experiments, fill out this summary:

### Fastest Configuration
**Winner**: _________________
**Total Time**: _____ minutes _____ seconds
**Why it won**:
________________________________________________________________________________

### Most Reliable Configuration
**Winner**: _________________
**Success Rate**: _____%
**Failed Chunks**: _____
**Why it won**:
________________________________________________________________________________

### Best Suggestions/Time Ratio
**Winner**: _________________
**Suggestions per minute**: _____
**Why it won**:
________________________________________________________________________________

### Recommendation for Production
**Selected Configuration**: _________________
**Reasoning**:
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________

## 🧹 Cleanup After Testing

### Step 1: Merge Winner to Main Branch
```bash
cd /Users/andresterranova/manuscript-ballast
git checkout feature/tree
git merge exp/[winner-branch-name]
```

### Step 2: Remove All Worktrees
```bash
git worktree remove /Users/andresterranova/ballast-control
git worktree remove /Users/andresterranova/ballast-exp-chunk5
git worktree remove /Users/andresterranova/ballast-exp-chunk20
git worktree remove /Users/andresterranova/ballast-exp-batch10
git worktree remove /Users/andresterranova/ballast-exp-parallel-rules
```

### Step 3: Delete Experiment Branches
```bash
git branch -d exp/control
git branch -d exp/chunk-5
git branch -d exp/chunk-20
git branch -d exp/batch-10
git branch -d exp/parallel-rules
```

### Step 4: Deploy Final Configuration
If exp/parallel-rules won:
```bash
supabase functions deploy ai-suggestions-html
```

## 📝 Key Console Commands to Monitor

While testing, watch for these console messages:

**Chunk Processing Progress**:
```
Processing chunk chunk-1 with 2847 characters
✅ Complete: 156 suggestions in 234567ms (234.6s)
```

**Errors to Watch For**:
```
❌ Chunk 45 failed: HTTP 429: Rate limit exceeded
OpenAI API error: 500 - Internal server error
```

**Performance Indicators**:
- Time per chunk (should be consistent)
- Percentage completion messages
- Any timeout errors
- Memory usage in DevTools

## 🎯 Success Criteria

A successful experiment will show:
- [ ] Faster total processing time than control
- [ ] >95% success rate (fewer failed chunks)
- [ ] No significant increase in rate limit errors
- [ ] Similar or better suggestion count
- [ ] Acceptable browser responsiveness

---

**Last Updated**: January 2025
**Next Steps**: After testing, update `docs/ai-suggestions/ai-suggestions-flow.md` with optimal configuration
