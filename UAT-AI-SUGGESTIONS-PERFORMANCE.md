# AI Suggestions Performance Experiments: UAT Testing Protocol
## Performance optimization testing for TipTap AI Suggestions processing

**Purpose**: Validate performance improvements across 5 different AI Suggestions processing configurations
**Prerequisites**: Git worktrees set up with code changes applied
**Testing Method**: **Fully automated concurrent** testing via chrome-devtools MCP tools (2-3 experiments in parallel)
**Test Manuscript**: `0ee54d94-4a5d-49a1-aee2-8b23733183ad` (Tip of the Spear_LG_EDIT)
**Estimated Time**: ~15-20 minutes (with 2 concurrent) vs ~75-100 minutes (sequential)
**Last Updated**: January 2025

---

## ✅ UAT Validation Status

**Tested**: Yes - Test 1.1 and 1.2 executed successfully with full automation
**Token Safety**: Verified - Uses only `evaluate_script` polling (no expensive MCP tools)
**Automation Level**: 100% - All button clicks, navigation, and metric collection automated
**Concurrency**: Safe - AI suggestions stored in-memory per browser tab, no database conflicts
**Key Updates**:
- ✅ Two-step button click process documented (Run AI Pass → Run AI Pass (2 roles))
- ✅ Progress monitoring via UI polling (not console logs) - token-safe
- ✅ Removed all expensive MCP tools (`list_console_messages`, `take_snapshot`, `wait_for`)
- ✅ All actions automated via `evaluate_script` JavaScript execution
- ✅ **Concurrent testing enabled** - run 2-3 experiments in parallel for 70%+ time savings

## Why Concurrent Testing is Safe

**AI Suggestions are in-memory only** - not saved to database until user accepts them:
- ✅ Each browser tab has isolated JavaScript environment
- ✅ Each worktree runs on different port (8080, 8081, 8082, etc.)
- ✅ Same manuscript can be opened in multiple tabs simultaneously
- ✅ No data conflicts - suggestions exist only in browser memory
- ✅ Each experiment measures independently

**Time Savings**:
- Sequential: ~75-100 minutes (5 experiments × 15-20 min each)
- 2 concurrent: ~40-50 minutes (3 batches: 2+2+1)
- 3 concurrent: ~30-35 minutes (2 batches: 3+2)
- 5 concurrent: ~15-20 minutes (all at once - may strain system resources)

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page` - Navigate to app URL
- `mcp__chrome-devtools__evaluate_script` - Automate button clicks, poll progress, collect metrics
- `mcp__chrome-devtools__take_screenshot` - Capture results (optional)

### ⚠️ AVOID Expensive MCP Tools
- ❌ `mcp__chrome-devtools__list_console_messages` - Causes token overflow (307K tokens)
- ❌ `mcp__chrome-devtools__take_snapshot` - Very expensive (50K-328K tokens)
- ❌ `mcp__chrome-devtools__wait_for` - Includes snapshot, use polling with `evaluate_script` instead

**This UAT uses token-safe patterns** - all monitoring is done via `evaluate_script` polling

### Implementation Status Check
Before testing, verify:
- [ ] All 5 git worktrees created at:
  - `/Users/andresterranova/ballast-control`
  - `/Users/andresterranova/ballast-exp-chunk5`
  - `/Users/andresterranova/ballast-exp-chunk20`
  - `/Users/andresterranova/ballast-exp-batch10`
  - `/Users/andresterranova/ballast-exp-parallel-rules`
- [ ] Dependencies installed in all worktrees (`pnpm install`)
- [ ] `.env` file copied to all worktrees
- [ ] Test document prepared (30-50K words DOCX file)

### Experiment Configuration Overview

| Experiment | ChunkSize | BatchSize | Inter-Batch Delay | Edge Function | Expected Impact |
|-----------|-----------|-----------|-------------------|---------------|-----------------|
| **Control** | 10 | 5 | 500ms | Sequential rules | Baseline |
| **Exp 1** | 5 | 5 | 500ms | Sequential rules | +80% chunks, finer granularity |
| **Exp 2** | 20 | 5 | 500ms | Sequential rules | -50% chunks, timeout risk |
| **Exp 3** | 10 | 10 | 750ms | Sequential rules | 2x parallel, more rate limits possible |
| **Exp 4** | 10 | 5 | 500ms | **Parallel rules** | 3-4x speedup per chunk |

---

## Test Environment Setup

### Setup 0: Initialize Performance Tracking (Automated)

**Actions**:

1. **Verify test manuscript exists**
   - Manuscript ID: `0ee54d94-4a5d-49a1-aee2-8b23733183ad`
   - This manuscript will be used for all 5 experiments
   - No upload needed - already in database

2. **Navigate to app** (automated via MCP)
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

3. **Install performance tracker** (automated via MCP)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__performanceMetrics = { experiments: {} }; console.log('Performance tracker installed'); return { installed: true }; }"
   }
   ```

   **What this does**: Creates global object to store timing metrics for each experiment

**Success Criteria**:
- [ ] Test manuscript verified (ID: `0ee54d94-4a5d-49a1-aee2-8b23733183ad`)
- [ ] Performance tracker installed
- [ ] All actions executed automatically via MCP tools

---

## How Automated Testing Works

**IMPORTANT**: This is **fully automated testing** - all actions are executed via chrome-devtools MCP tools.

### What Gets Automated

1. **Server Management** (via Bash MCP tool)
   - Start dev server: `cd /path/to/worktree && pnpm run dev`
   - Server runs in background on port 8080 (or auto-selects next available port)
   - Stop server when test complete

2. **Browser Navigation** (via `navigate_page` MCP tool)
   - Navigate to: `http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad`
   - Page loads automatically
   - No manual browser interaction needed

3. **Button Clicks** (via `evaluate_script` MCP tool)
   - **Step 1**: Find and click "Run AI Pass" button → Opens role selection dialog
   - **Step 2**: Find and click "Run AI Pass (2 roles)" button → Starts processing
   - Both clicks automated via JavaScript `.click()` method

4. **Progress Monitoring** (via `evaluate_script` polling)
   - Poll progress dialog UI element (not console logs - token-safe)
   - Check for completion message
   - Extract percentage: "17% of manuscript analyzed"
   - No manual observation needed

5. **Metric Collection** (via `evaluate_script`)
   - Record start time, end time, total duration
   - Extract chunk count, suggestion count, error count
   - Store metrics in `window.__performanceMetrics` global object

### Test Manuscript Details
- **Manuscript ID**: `0ee54d94-4a5d-49a1-aee2-8b23733183ad`
- **Direct URL**: `http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad`
- **Document**: "Tip of the Spear_LG_EDIT"
- **Reused**: Same manuscript for all 5 experiments (no re-upload needed)

---

## 🚀 Concurrent Execution Strategy (Recommended)

**Run 2-3 experiments in parallel** for optimal time savings and resource management:

### Batch 1: Control + Exp1 (Parallel)
1. Start both servers in background (different ports)
2. Open 2 browser pages (via `new_page` MCP tool)
3. Navigate each to test manuscript
4. Click "Run AI Pass" on both (automated)
5. Poll both for completion in parallel
6. Collect metrics from both

### Batch 2: Exp2 + Exp3 (Parallel)
1. Stop Batch 1 servers
2. Start Exp2 and Exp3 servers
3. Repeat process

### Batch 3: Exp4 (Solo)
1. Stop Batch 2 servers
2. Deploy edge function for Exp4 (critical!)
3. Run Exp4 alone
4. Collect final metrics

### MCP Tools for Concurrent Testing
```javascript
// Start multiple servers in parallel
Bash: cd /path/worktree1 && pnpm run dev &  // Port 8080
Bash: cd /path/worktree2 && pnpm run dev &  // Port 8081

// Open multiple browser pages
mcp__chrome-devtools__new_page({ url: "http://localhost:8080/manuscript/ID" })  // Page 0
mcp__chrome-devtools__new_page({ url: "http://localhost:8081/manuscript/ID" })  // Page 1

// Select page to interact with
mcp__chrome-devtools__select_page({ pageIdx: 0 })  // Work with page 0
mcp__chrome-devtools__evaluate_script(...)         // Click button on page 0

mcp__chrome-devtools__select_page({ pageIdx: 1 })  // Switch to page 1
mcp__chrome-devtools__evaluate_script(...)         // Click button on page 1

// Poll both pages for completion
select_page(0) → evaluate_script(check progress)
select_page(1) → evaluate_script(check progress)
```

**Time Estimate**: ~40 minutes total (vs ~75 minutes sequential)

---

## Test Suite 1: Control Baseline (chunkSize: 10, BATCH_SIZE: 5)

**Worktree**: `/Users/andresterranova/ballast-control`
**Port**: 8080 (or next available)
**Can run concurrently with**: Exp1, Exp2, Exp3, or Exp4

### Test 1.1: Start Control Experiment

**Actions**:

1. **Open terminal and navigate to control worktree**
   ```bash
   cd /Users/andresterranova/ballast-control
   ```

2. **Start dev server**
   ```bash
   pnpm run dev
   ```
   - Server should start on port 8080
   - Wait for "ready in XXXms" message

3. **Open browser and navigate to app**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

4. **Navigate to test manuscript**
   - Navigate directly to: `http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad`
   - No upload needed - manuscript already exists in database

**Success Criteria**:
- [ ] Dev server running on port 8080 (or next available port)
- [ ] Browser navigated to test manuscript automatically
- [ ] Editor loaded with test document (verify via `evaluate_script`)

### Test 1.2: Execute Control AI Pass (Fully Automated)

**Actions**:

1. **Record start time and click "Run AI Pass" button** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const start = new Date().toISOString(); window.__performanceMetrics.experiments.control = { startTime: start }; const allButtons = Array.from(document.querySelectorAll('button')); const runAIButton = allButtons.find(btn => btn.textContent.toLowerCase().includes('run ai pass')); if (runAIButton) { runAIButton.setAttribute('data-test-uid', 'run-ai-pass-btn'); runAIButton.click(); } return { startTime: start, buttonClicked: !!runAIButton }; }"
   }
   ```

   **What this does**: Records start time AND clicks "Run AI Pass" button (opens role selection dialog)

2. **Click "Run AI Pass (2 roles)" button in dialog** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const allButtons = Array.from(document.querySelectorAll('button')); const runButton = allButtons.find(btn => btn.textContent.includes('Run AI Pass') && btn.textContent.includes('roles')); if (runButton) { runButton.click(); return { clicked: true, buttonText: runButton.textContent }; } return { clicked: false }; }"
   }
   ```

   **What this does**: Finds and clicks the final "Run AI Pass (2 roles)" button to start processing

3. **Poll for processing completion** (automated, token-safe)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script` (repeat every 30-60 seconds)
   ```json
   {
     "function": "() => { const progressText = document.querySelector('body')?.innerText; const percentMatch = progressText?.match(/(\\d+)%\\s+of\\s+manuscript\\s+analyzed/); const currentPercent = percentMatch ? parseInt(percentMatch[1]) : 0; const progressDialog = document.querySelector('[role=\"dialog\"]'); const isProcessing = !!progressDialog; return { isProcessing: isProcessing, currentPercent: currentPercent, complete: !isProcessing && currentPercent === 0, status: isProcessing ? `PROCESSING (${currentPercent}%)` : 'CHECKING' }; }"
   }
   ```

   **What this does**: Checks progress dialog (NOT console logs) for "X% of manuscript analyzed"

   **⚠️ Polling required**: Repeat this command every 30-60 seconds until `isProcessing: false`

4. **Record completion metrics** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const end = new Date().toISOString(); window.__performanceMetrics.experiments.control.endTime = end; const startMs = new Date(window.__performanceMetrics.experiments.control.startTime).getTime(); const endMs = new Date(end).getTime(); const durationMs = endMs - startMs; const durationSec = (durationMs / 1000).toFixed(1); window.__performanceMetrics.experiments.control.durationMs = durationMs; window.__performanceMetrics.experiments.control.durationSec = durationSec; return window.__performanceMetrics.experiments.control; }"
   }
   ```

**Success Criteria**:
- [ ] Both button clicks completed automatically
- [ ] AI Pass processing started (progress dialog appeared)
- [ ] Processing completed (progress dialog disappeared)
- [ ] Metrics recorded automatically:
  - Start time: (stored in `window.__performanceMetrics.experiments.control.startTime`)
  - End time: (stored in `window.__performanceMetrics.experiments.control.endTime`)
  - Total duration: (stored in `durationSec`)
- [ ] No expensive MCP tools used (no `list_console_messages`, no `take_snapshot`)

### Test 1.3: Stop Control Server

**Actions**:

1. **Stop the dev server** (terminal: Ctrl+C)
   ```bash
   # In terminal where pnpm run dev is running, press Ctrl+C
   ```

2. **Export metrics to file** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments.control; const json = JSON.stringify(metrics, null, 2); const blob = new Blob([json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'control-metrics.json'; a.click(); URL.revokeObjectURL(url); return 'Exported control-metrics.json'; }"
   }
   ```

**Success Criteria**:
- [ ] Dev server stopped
- [ ] Baseline metrics exported to `control-metrics.json` in Downloads folder

---

## ✅ CHECKPOINT 1: Control Baseline Complete

**Pass Criteria** (ALL must pass):
- [ ] Control experiment completed successfully via automated MCP tools
- [ ] Baseline metrics recorded in `window.__performanceMetrics.experiments.control`
- [ ] Processing completed (progress dialog disappeared)
- [ ] Server stopped and ready for next experiment
- [ ] No expensive MCP tools used (token-safe approach verified)

**If ALL PASS**: Continue to Test Suite 2 ✅
**If FAIL**: Debug control experiment before proceeding - check:
  - Is dev server running on correct port?
  - Did browser navigate to manuscript URL?
  - Did "Run AI Pass" buttons click successfully?
  - Did progress dialog appear and disappear?
  - Are there Supabase/network connection errors?

---

## Test Suite 2: Experiment 1 - Small Chunks (chunkSize: 5)

**Worktree**: `/Users/andresterranova/ballast-exp-chunk5`
**Port**: 8081 (or next available)
**Can run concurrently with**: Control, Exp2, Exp3, or Exp4
**Hypothesis**: Smaller chunks = more API calls but better granularity, possibly lower timeout risk

### Test 2.1: Start Experiment 1

**Actions**:

1. **Open terminal and navigate to exp-chunk5 worktree**
   ```bash
   cd /Users/andresterranova/ballast-exp-chunk5
   ```

2. **Start dev server**
   ```bash
   pnpm run dev
   ```

3. **Navigate to SAME manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad" }
   ```

**Success Criteria**:
- [ ] Dev server running on port 8080
- [ ] Same test document loaded

### Test 2.2: Execute Experiment 1 AI Pass

**Actions**:

1. **Record start time**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const start = new Date().toISOString(); window.__performanceMetrics.experiments.exp1 = { startTime: start, config: 'chunkSize: 5' }; console.log('EXP1 START:', start); return { startTime: start }; }"
   }
   ```

2. **Click "Run AI Pass" button**

3. **Wait for completion** (⚠️ May take longer than control due to 80% more chunks)
   - Poll every 30-60 seconds using evaluate_script or manually observe console

4. **Record completion metrics**
   - Use same evaluate_script pattern as Test 1.2, but store to `window.__performanceMetrics.experiments.exp1`

5. **Compare to control**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const control = window.__performanceMetrics.experiments.control; const exp1 = window.__performanceMetrics.experiments.exp1; const diff = exp1.timeMs - control.timeMs; const percent = ((diff / control.timeMs) * 100).toFixed(1); return { control: control.timeSec, exp1: exp1.timeSec, diffSec: (diff/1000).toFixed(1), percentChange: percent + '%' }; }"
   }
   ```

**Success Criteria**:
- [ ] AI Pass completed
- [ ] Metrics recorded and compared to control:
  - Time difference: `_____ sec` (faster/slower than control)
  - Percent change: `_____%`
  - Chunks processed: `_____` (should be ~80% more than control)
  - Suggestions: `_____`
  - Errors: `_____`

### Test 2.3: Stop Experiment 1 Server

**Actions**:
1. Stop dev server (Ctrl+C)
2. **Export metrics to file** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments.exp1; const json = JSON.stringify(metrics, null, 2); const blob = new Blob([json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'exp1-metrics.json'; a.click(); URL.revokeObjectURL(url); return 'Exported exp1-metrics.json'; }"
   }
   ```

**Success Criteria**:
- [ ] Server stopped
- [ ] Exp1 metrics exported to `exp1-metrics.json` in Downloads folder

---

## ✅ CHECKPOINT 2: Experiment 1 Complete

**Pass Criteria**:
- [ ] Exp1 completed successfully
- [ ] Metrics show ~80% more chunks processed than control
- [ ] Performance comparison recorded (faster/slower/same)
- [ ] Server stopped

**If ALL PASS**: Continue to Test Suite 3 ✅
**If FAIL**: Note failure reason and continue (we want to test all experiments)

---

## Test Suite 3: Experiment 2 - Large Chunks (chunkSize: 20)

**Worktree**: `/Users/andresterranova/ballast-exp-chunk20`
**Port**: 8082 (or next available)
**Can run concurrently with**: Control, Exp1, Exp3, or Exp4
**Hypothesis**: Larger chunks = fewer API calls, but increased timeout risk per chunk

### Test 3.1: Start Experiment 2

**Actions**:

1. **Navigate to exp-chunk20 worktree**
   ```bash
   cd /Users/andresterranova/ballast-exp-chunk20
   pnpm run dev
   ```

2. **Navigate to test manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad" }
   ```

**Success Criteria**:
- [ ] Dev server running
- [ ] Test document loaded

### Test 3.2: Execute Experiment 2 AI Pass

**Actions**:

1. **Record start time**
   - Store to `window.__performanceMetrics.experiments.exp2`

2. **Click "Run AI Pass"**

3. **Wait for completion** (⚠️ May be faster due to 50% fewer chunks)

4. **Record metrics and compare**

**Success Criteria**:
- [ ] AI Pass completed
- [ ] Metrics recorded:
  - Time difference vs control: `_____ sec`
  - Chunks processed: `_____` (should be ~50% less than control)
  - Any timeout errors: `_____`
  - Suggestions: `_____`

### Test 3.3: Stop Experiment 2 Server

**Actions**:
1. Stop dev server (Ctrl+C)
2. **Export metrics to file** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments.exp2; const json = JSON.stringify(metrics, null, 2); const blob = new Blob([json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'exp2-metrics.json'; a.click(); URL.revokeObjectURL(url); return 'Exported exp2-metrics.json'; }"
   }
   ```

**Success Criteria**:
- [ ] Server stopped
- [ ] Exp2 metrics exported to `exp2-metrics.json` in Downloads folder

---

## ✅ CHECKPOINT 3: Experiment 2 Complete

**Pass Criteria**:
- [ ] Exp2 completed
- [ ] Metrics show ~50% fewer chunks than control
- [ ] Timeout errors noted (if any)
- [ ] Performance comparison recorded

**If ALL PASS**: Continue to Test Suite 4 ✅

---

## Test Suite 4: Experiment 3 - Aggressive Batching (BATCH_SIZE: 10, delay: 750ms)

**Worktree**: `/Users/andresterranova/ballast-exp-batch10`
**Port**: 8083 (or next available)
**Can run concurrently with**: Control, Exp1, Exp2, or Exp4
**Hypothesis**: More parallel processing with longer delays = faster overall, but more rate limit risk

### Test 4.1: Start Experiment 3

**Actions**:

1. **Navigate to exp-batch10 worktree**
   ```bash
   cd /Users/andresterranova/ballast-exp-batch10
   pnpm run dev
   ```

2. **Navigate to test manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080/manuscript/0ee54d94-4a5d-49a1-aee2-8b23733183ad" }
   ```

**Success Criteria**:
- [ ] Dev server running
- [ ] Test document loaded

### Test 4.2: Execute Experiment 3 AI Pass

**Actions**:

1. **Record start time**
   - Store to `window.__performanceMetrics.experiments.exp3`

2. **Click "Run AI Pass"**

3. **Monitor for rate limit errors** (watch console for 429 errors)

4. **Record metrics and compare**

**Success Criteria**:
- [ ] AI Pass completed
- [ ] Metrics recorded:
  - Time difference vs control: `_____ sec`
  - Rate limit (429) errors: `_____`
  - Success rate: `_____%`
  - Suggestions: `_____`

### Test 4.3: Stop Experiment 3 Server

**Actions**:
1. Stop dev server (Ctrl+C)
2. **Export metrics to file** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments.exp3; const json = JSON.stringify(metrics, null, 2); const blob = new Blob([json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'exp3-metrics.json'; a.click(); URL.revokeObjectURL(url); return 'Exported exp3-metrics.json'; }"
   }
   ```

**Success Criteria**:
- [ ] Server stopped
- [ ] Exp3 metrics exported to `exp3-metrics.json` in Downloads folder

---

## ✅ CHECKPOINT 4: Experiment 3 Complete

**Pass Criteria**:
- [ ] Exp3 completed
- [ ] Rate limit errors monitored and recorded
- [ ] Performance comparison shows impact of aggressive batching

**If ALL PASS**: Continue to Test Suite 5 ✅

---

## Test Suite 5: Experiment 4 - Parallel Rule Processing (Edge Function Change)

**Worktree**: `/Users/andresterranova/ballast-exp-parallel-rules`
**Port**: 8084 (or next available)
**Can run concurrently with**: Control, Exp1, Exp2, or Exp3
**⚠️ REQUIRES**: Edge function deployment before testing
**Hypothesis**: Parallel rule processing = 3-4x speedup per chunk

### Test 5.1: Deploy Updated Edge Function ⚠️ CRITICAL STEP

**Actions**:

1. **Navigate to exp-parallel-rules worktree**
   ```bash
   cd /Users/andresterranova/ballast-exp-parallel-rules
   ```

2. **Deploy the modified edge function**
   ```bash
   supabase functions deploy ai-suggestions-html
   ```
   - Wait for deployment confirmation
   - This changes how rules are processed (parallel instead of sequential)

3. **Start dev server**
   ```bash
   pnpm run dev
   ```

4. **Navigate to test manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080/manuscript/{YOUR_MANUSCRIPT_ID}" }
   ```

**Success Criteria**:
- [ ] Edge function deployed successfully
- [ ] Dev server running
- [ ] Test document loaded

### Test 5.2: Execute Experiment 4 AI Pass

**Actions**:

1. **Record start time**
   - Store to `window.__performanceMetrics.experiments.exp4`

2. **Click "Run AI Pass"**

3. **Wait for completion** (⚠️ Should be significantly faster if using multiple AI rules)

4. **Calculate speedup**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const control = window.__performanceMetrics.experiments.control; const exp4 = window.__performanceMetrics.experiments.exp4; const speedup = (control.timeMs / exp4.timeMs).toFixed(2); return { controlTime: control.timeSec, exp4Time: exp4.timeSec, speedupFactor: speedup + 'x' }; }"
   }
   ```

**Success Criteria**:
- [ ] AI Pass completed
- [ ] Metrics recorded:
  - Time difference vs control: `_____ sec`
  - Speedup factor: `_____x` (expected: 3-4x if using 3-4 AI rules)
  - Suggestions: `_____`
  - Errors: `_____`

### Test 5.3: Stop Experiment 4 Server

**Actions**:
1. Stop dev server (Ctrl+C)
2. **Export metrics to file** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments.exp4; const json = JSON.stringify(metrics, null, 2); const blob = new Blob([json], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'exp4-metrics.json'; a.click(); URL.revokeObjectURL(url); return 'Exported exp4-metrics.json'; }"
   }
   ```

**Success Criteria**:
- [ ] Server stopped
- [ ] Exp4 metrics exported to `exp4-metrics.json` in Downloads folder

---

## ✅ CHECKPOINT 5: All Experiments Complete

**Pass Criteria** (ALL must pass):
- [ ] All 5 experiments completed
- [ ] Metrics collected for each:
  - Control (baseline)
  - Exp1 (small chunks)
  - Exp2 (large chunks)
  - Exp3 (aggressive batching)
  - Exp4 (parallel rules)
- [ ] Performance comparisons calculated
- [ ] No critical failures (processing completed for each)

**If ALL PASS**: Proceed to Final Report Generation ✅
**If FAIL**: Review failed experiments and note reasons

---

## Final Report Generation

**Actions**:

Generate comprehensive performance comparison report:

1. **Generate console summary** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const metrics = window.__performanceMetrics.experiments; const report = { testDate: new Date().toISOString(), testDocument: 'YOUR_DOCUMENT_NAME', wordCount: 'YOUR_WORD_COUNT', results: { control: { time: metrics.control?.timeSec || 'N/A', suggestions: metrics.control?.suggestions || 'N/A' }, exp1_smallChunks: { time: metrics.exp1?.timeSec || 'N/A', vsControl: metrics.exp1 && metrics.control ? ((metrics.exp1.timeMs - metrics.control.timeMs) / 1000).toFixed(1) + 's' : 'N/A' }, exp2_largeChunks: { time: metrics.exp2?.timeSec || 'N/A', vsControl: metrics.exp2 && metrics.control ? ((metrics.exp2.timeMs - metrics.control.timeMs) / 1000).toFixed(1) + 's' : 'N/A' }, exp3_aggressiveBatch: { time: metrics.exp3?.timeSec || 'N/A', vsControl: metrics.exp3 && metrics.control ? ((metrics.exp3.timeMs - metrics.control.timeMs) / 1000).toFixed(1) + 's' : 'N/A' }, exp4_parallelRules: { time: metrics.exp4?.timeSec || 'N/A', vsControl: metrics.exp4 && metrics.control ? ((metrics.exp4.timeMs - metrics.control.timeMs) / 1000).toFixed(1) + 's' : 'N/A', speedup: metrics.exp4 && metrics.control ? (metrics.control.timeMs / metrics.exp4.timeMs).toFixed(2) + 'x' : 'N/A' } } }; console.log('=== AI SUGGESTIONS PERFORMANCE TEST COMPLETE ==='); console.table(report); return report; }"
   }
   ```

2. **Generate markdown report** (automated)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const m = window.__performanceMetrics.experiments; const timestamp = new Date().toISOString(); const markdown = `# AI Suggestions Performance Test Results\\n\\n**Test Date**: ${timestamp}\\n**Manuscript ID**: 0ee54d94-4a5d-49a1-aee2-8b23733183ad\\n\\n## Results Summary\\n\\n| Experiment | Configuration | Time (sec) | vs Control | Speedup |\\n|-----------|---------------|------------|-----------|---------|\\n| Control | chunkSize: 10, BATCH_SIZE: 5 | ${m.control?.durationSec || 'N/A'} | - | 1.00x |\\n| Exp1 | chunkSize: 5, BATCH_SIZE: 5 | ${m.exp1?.durationSec || 'N/A'} | ${m.exp1 && m.control ? ((m.exp1.durationMs - m.control.durationMs) / 1000).toFixed(1) + 's' : 'N/A'} | ${m.exp1 && m.control ? (m.control.durationMs / m.exp1.durationMs).toFixed(2) + 'x' : 'N/A'} |\\n| Exp2 | chunkSize: 20, BATCH_SIZE: 5 | ${m.exp2?.durationSec || 'N/A'} | ${m.exp2 && m.control ? ((m.exp2.durationMs - m.control.durationMs) / 1000).toFixed(1) + 's' : 'N/A'} | ${m.exp2 && m.control ? (m.control.durationMs / m.exp2.durationMs).toFixed(2) + 'x' : 'N/A'} |\\n| Exp3 | BATCH_SIZE: 10, delay: 750ms | ${m.exp3?.durationSec || 'N/A'} | ${m.exp3 && m.control ? ((m.exp3.durationMs - m.control.durationMs) / 1000).toFixed(1) + 's' : 'N/A'} | ${m.exp3 && m.control ? (m.control.durationMs / m.exp3.durationMs).toFixed(2) + 'x' : 'N/A'} |\\n| Exp4 | Parallel rule processing | ${m.exp4?.durationSec || 'N/A'} | ${m.exp4 && m.control ? ((m.exp4.durationMs - m.control.durationMs) / 1000).toFixed(1) + 's' : 'N/A'} | ${m.exp4 && m.control ? (m.control.durationMs / m.exp4.durationMs).toFixed(2) + 'x' : 'N/A'} |\\n\\n## Detailed Metrics\\n\\n### Control Baseline\\n- Start: ${m.control?.startTime || 'N/A'}\\n- End: ${m.control?.endTime || 'N/A'}\\n- Duration: ${m.control?.durationSec || 'N/A'}s\\n\\n### Experiment 1 (Small Chunks)\\n- Start: ${m.exp1?.startTime || 'N/A'}\\n- End: ${m.exp1?.endTime || 'N/A'}\\n- Duration: ${m.exp1?.durationSec || 'N/A'}s\\n\\n### Experiment 2 (Large Chunks)\\n- Start: ${m.exp2?.startTime || 'N/A'}\\n- End: ${m.exp2?.endTime || 'N/A'}\\n- Duration: ${m.exp2?.durationSec || 'N/A'}s\\n\\n### Experiment 3 (Aggressive Batching)\\n- Start: ${m.exp3?.startTime || 'N/A'}\\n- End: ${m.exp3?.endTime || 'N/A'}\\n- Duration: ${m.exp3?.durationSec || 'N/A'}s\\n\\n### Experiment 4 (Parallel Rules)\\n- Start: ${m.exp4?.startTime || 'N/A'}\\n- End: ${m.exp4?.endTime || 'N/A'}\\n- Duration: ${m.exp4?.durationSec || 'N/A'}s\\n\\n## Analysis (Manual Fill-In)\\n\\n### Fastest Configuration\\n- **Winner**: _________________\\n- **Total Time**: _____ seconds\\n- **Improvement over control**: _____ seconds (____%)\\n\\n### Most Reliable Configuration\\n- **Winner**: _________________\\n- **Success Rate**: _____%\\n- **Failed Chunks**: _____\\n\\n### Recommended for Production\\n- **Selected Configuration**: _________________\\n- **Reasoning**:\\n  - ________________________________________________________________\\n  - ________________________________________________________________\\n  - ________________________________________________________________\\n\\n---\\n\\n**Generated**: ${timestamp}\\n`; const blob = new Blob([markdown], {type: 'text/markdown'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'UAT-RESULTS.md'; a.click(); URL.revokeObjectURL(url); return 'Exported UAT-RESULTS.md'; }"
   }
   ```

**Success Criteria**:
- [ ] Console summary displayed
- [ ] `UAT-RESULTS.md` downloaded to Downloads folder
- [ ] All 5 JSON metric files available (control-metrics.json, exp1-metrics.json, exp2-metrics.json, exp3-metrics.json, exp4-metrics.json)

**Where to Find Results**:

All test results are automatically saved to your Downloads folder:

1. **Individual Metrics** (5 JSON files):
   - `~/Downloads/control-metrics.json`
   - `~/Downloads/exp1-metrics.json`
   - `~/Downloads/exp2-metrics.json`
   - `~/Downloads/exp3-metrics.json`
   - `~/Downloads/exp4-metrics.json`

2. **Final Report** (markdown file):
   - `~/Downloads/UAT-RESULTS.md` - Open this file and fill in the "Analysis (Manual Fill-In)" section

**Next Steps**:
1. Open `UAT-RESULTS.md` in your editor
2. Review the results summary table
3. Fill in the analysis sections:
   - Fastest Configuration
   - Most Reliable Configuration
   - Recommended for Production
4. Save the completed report for documentation

---

## Test Execution Checklist

**Pre-Test Setup**:
- [ ] All 5 worktrees created and dependencies installed
- [ ] Test document prepared (30-50K words)
- [ ] Browser DevTools accessible

**Test Suite Execution**:
- [ ] Test Suite 1: Control baseline complete
- [ ] Test Suite 2: Exp1 (small chunks) complete
- [ ] Test Suite 3: Exp2 (large chunks) complete
- [ ] Test Suite 4: Exp3 (aggressive batching) complete
- [ ] Test Suite 5: Exp4 (parallel rules) complete - **Edge function deployed!**

**Post-Test**:
- [ ] Final report generated
- [ ] Winner identified
- [ ] Production recommendation made
- [ ] Results saved for documentation

---

## Cleanup Instructions (After Testing Complete)

### Step 1: Merge Winner to Main Branch

```bash
cd /Users/andresterranova/manuscript-ballast
git checkout feature/tree
git merge exp/{WINNER_BRANCH_NAME}
# Example: git merge exp/parallel-rules
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
cd /Users/andresterranova/manuscript-ballast
supabase functions deploy ai-suggestions-html
```

---

## Quick Command Reference

### Monitor Console Logs (Manual)
```javascript
// In browser console - check for completion
console.log.toString().match(/Complete: (\\d+) suggestions/)

// Check for errors
console.log.toString().match(/❌/)

// Check for rate limits
console.log.toString().match(/429/)
```

### Check Processing Status (Manual)
```javascript
// See if AI Pass is still running
document.querySelector('[aria-label="AI processing"]') !== null
```

### Force Stop Processing (Emergency)
```javascript
// If processing hangs - reload page
location.reload()
```

---

## Expected Console Log Patterns

**Normal Progress**:
```
Processing chunk chunk-1 with 2847 characters
15% of manuscript analyzed
Processing chunk chunk-2 with 3124 characters
30% of manuscript analyzed
...
✅ Complete: 156 suggestions in 234567ms (234.6s)
```

**Errors to Watch**:
```
❌ Chunk 45 failed: HTTP 429: Rate limit exceeded
OpenAI API error: 500 - Internal server error
```

---

## Tags

#UAT #performance #testing #AI_suggestions #TipTap #worktrees #experiments #optimization #chrome_devtools #automation #sequential_testing #benchmarking

---

**Last Updated**: January 2025
**Version**: 1.0
**Next Steps**: After testing, update `docs/ai-suggestions/ai-suggestions-flow.md` with winning configuration
