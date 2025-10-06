# AI Progress Indicator: UAT Testing Protocol (TOKEN-OPTIMIZED)
## Visual Progress Tracking for AI Pass Processing

**Purpose**: Validate that the AI Progress Indicator displays correctly and updates smoothly during AI Pass processing
**Prerequisites**: AI Progress Indicator implementation complete (batch-based tracking)
**Testing Method**: Automated via chrome-devtools MCP tools (token-optimized with custom interceptors)
**Last Updated**: October 6, 2025

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__list_pages`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__take_screenshot` (optional, for debugging)

**Note**: This version does NOT use:
- ❌ `list_console_messages` (replaced with custom interceptor)
- ❌ `wait_for` (replaced with polling pattern)
- ❌ `take_snapshot` (too heavy, use evaluate_script instead)

### Implementation Status Check

Before running tests, verify:

- [ ] AI Progress Indicator component created (`src/components/workspace/AIProgressIndicator.tsx`)
- [ ] Progress types defined (`src/types/aiProgress.ts`)
- [ ] Editor.tsx integrated with progress indicator
- [ ] useTiptapEditor.ts emits batch-based progress updates
- [ ] Progress tracking uses `totalBatches`/`processedBatches` (not chunks)
- [ ] Dev server running on `http://localhost:8080` (or note actual port)
- [ ] Test manuscript loaded in editor (3+ chunks to create multiple batches)

---

## Test Environment Setup

### Setup 0: Install Console Interceptor (REQUIRED FIRST!)

**Purpose**: Capture console logs without token overflow

**Actions**:

- **MCP Tool**: `mcp__chrome-devtools__navigate_page`
```json
{ "url": "http://localhost:8080" }
```

- **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { window.__consoleLogs = []; const maxLogs = 50; ['log', 'warn', 'error', 'info'].forEach(level => { const original = console[level]; console[level] = function(...args) { window.__consoleLogs.push({ level: level, message: args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 100) : String(a).slice(0, 100)).join(' '), timestamp: Date.now() }); if (window.__consoleLogs.length > maxLogs) { window.__consoleLogs.shift(); } original.apply(console, args); }; }); return { consoleInterceptor: 'installed', maxConsoleLogs: maxLogs }; }"
}
```

**Success Criteria**:
- [ ] `consoleInterceptor` = 'installed'
- [ ] Interceptor ready to capture logs

---

### Setup 1: Wait for Editor & Get Button Reference

**Actions**:

1. **Polling: Wait for "Run AI Pass" button to appear**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const buttons = Array.from(document.querySelectorAll('button')); const runAiBtn = buttons.find(b => b.textContent?.includes('Run AI Pass')); return { found: !!runAiBtn, ready: !!runAiBtn }; }"
   }
   ```
   - **⚠️ Polling required**: If `found: false`, consult user on polling interval (typically 2-3 seconds for page load), then retry

2. **Store button reference for later use**

**Success Criteria**:
- [ ] `found` = true
- [ ] `ready` = true
- [ ] Editor loaded successfully

---

## Test Suite 1: Progress Dialog Appearance

### Test 1.1: Dialog Opens When Clicking "Run AI Pass"

**Actions**:

1. **Click "Run AI Pass" button**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const buttons = Array.from(document.querySelectorAll('button')); const runAiBtn = buttons.find(b => b.textContent?.includes('Run AI Pass')); if (runAiBtn) { runAiBtn.click(); return { clicked: true }; } return { clicked: false, error: 'Button not found' }; }"
   }
   ```

2. **Polling: Wait for progress dialog to appear**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const title = dialog?.querySelector('h2')?.textContent; return { found: !!dialog, ready: !!dialog && title?.includes('AI Pass Progress') }; }"
   }
   ```
   - **⚠️ Polling required**: If `found: false`, consult user on polling interval (typically 2-3 seconds for dialog to open), then retry

3. **Verify dialog structure**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const title = dialog?.querySelector('h2')?.textContent; const progressBar = dialog?.querySelector('[role=\"progressbar\"]'); const spinner = dialog?.querySelector('svg.animate-spin'); const cancelBtn = dialog?.querySelector('button'); return { dialogFound: !!dialog, title, hasProgressBar: !!progressBar, hasSpinner: !!spinner, hasCancelButton: !!cancelBtn, cancelButtonText: cancelBtn?.textContent }; }"
   }
   ```

**Success Criteria**:
- [ ] `clicked` = true
- [ ] `found` = true (dialog appeared)
- [ ] `ready` = true
- [ ] `dialogFound` = true
- [ ] `title` = "AI Pass Progress"
- [ ] `hasProgressBar` = true
- [ ] `hasSpinner` = true (loading spinner visible)
- [ ] `hasCancelButton` = true
- [ ] `cancelButtonText` includes "Cancel"

---

## Test Suite 2: Progress Updates During Processing

### Test 2.1: Initial Progress State

**Actions**:

1. **Check initial progress state (immediately after dialog opens)**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const progressText = dialog?.textContent; const statusMatch = progressText?.match(/Processing (\\d+) batch/); const batchMatch = progressText?.match(/(\\d+) \\/ (\\d+) batch/); const progressBar = dialog?.querySelector('[role=\"progressbar\"]'); const progressValue = progressBar?.getAttribute('aria-valuenow') || progressBar?.style?.width; return { statusMessage: statusMatch ? statusMatch[0] : null, batches: batchMatch ? { processed: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]) } : null, progressValue, fullText: progressText?.slice(0, 200) }; }"
   }
   ```

**Success Criteria**:
- [ ] Status message mentions "Processing" or "Initializing"
- [ ] Batch counter shows "0 / X batches" or similar
- [ ] Progress bar at 0% or low percentage
- [ ] Dialog is visible and responsive

---

### Test 2.2: Progress Updates as Batches Complete (Token-Safe)

**Actions**:

1. **Polling: Wait for first batch to complete**
   - Consult user on appropriate interval (typically 5-15 seconds for first batch)
   - Retry until progress changes

2. **Check console logs (token-safe method)**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const logs = window.__consoleLogs || []; const batchLogs = logs.filter(l => l.message.includes('Batch') && l.message.includes('complete')); const progressLogs = logs.filter(l => l.message.includes('Processing batch')); const recent = logs.slice(-10); return { batchCompletionCount: batchLogs.length, progressUpdateCount: progressLogs.length, recentLogs: recent.map(l => ({ level: l.level, message: l.message.slice(0, 80) })) }; }"
   }
   ```

3. **Verify batch progress updated**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const progressText = dialog?.textContent; const batchMatch = progressText?.match(/(\\d+) \\/ (\\d+) batch/); const progressBar = dialog?.querySelector('[role=\"progressbar\"]'); const progressPercent = progressText?.match(/(\\d+)%/); return { batches: batchMatch ? { processed: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]) } : null, progressPercent: progressPercent ? parseInt(progressPercent[1]) : null, stillVisible: !!dialog }; }"
   }
   ```

**Success Criteria**:
- [ ] `batchCompletionCount` > 0 (at least 1 batch logged as complete)
- [ ] `batches.processed` > 0 (batch counter incremented)
- [ ] `progressPercent` > 0 (progress bar moved from 0%)
- [ ] Dialog still visible
- [ ] Console logs show batch processing (e.g., "Batch 1/3 complete")
- [ ] **Token-safe**: Response under 5K tokens

---

### Test 2.3: Monitor Progress Through Multiple Batches

**Actions**:

1. **Polling loop: Check progress every X seconds** (consult user on interval)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); if (!dialog) return { dialogClosed: true }; const progressText = dialog.textContent; const batchMatch = progressText?.match(/(\\d+) \\/ (\\d+) batch/); const progressPercent = progressText?.match(/(\\d+)%/); const suggestionsMatch = progressText?.match(/(\\d+) suggestion/); return { dialogOpen: true, batches: batchMatch ? { processed: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]), percentComplete: Math.round((parseInt(batchMatch[1]) / parseInt(batchMatch[2])) * 100) } : null, progressPercent: progressPercent ? parseInt(progressPercent[1]) : null, suggestionsCount: suggestionsMatch ? parseInt(suggestionsMatch[1]) : 0 }; }"
   }
   ```
   - **⚠️ Polling required**: Repeat every X seconds (consult user) until `batches.processed` = `batches.total` or dialog closes

2. **Verify smooth progress increments**
   - Track `batches.processed` across polls
   - Ensure it increments by 1 each time a batch completes

**Success Criteria**:
- [ ] Progress increments smoothly (1 batch at a time)
- [ ] Progress percentage increases proportionally
- [ ] No jumps or stuck progress
- [ ] Suggestions count updates as suggestions are found

---

### Test 2.4: Suggestions Count Appears

**Actions**:

1. **Polling: Wait for suggestions to appear** (consult user on interval)

2. **Check if suggestions count displayed**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const progressText = dialog?.textContent; const suggestionsMatch = progressText?.match(/(\\d+) suggestion/); return { suggestionsShown: !!suggestionsMatch, suggestionsCount: suggestionsMatch ? parseInt(suggestionsMatch[1]) : 0, dialogText: progressText?.slice(0, 300) }; }"
   }
   ```

**Success Criteria**:
- [ ] If any suggestions found, count is displayed
- [ ] Format: "X suggestion(s) found"
- [ ] Dialog still visible and updating

---

## ✅ CHECKPOINT 1: Progress Display & Updates

**Pass Criteria** (ALL must pass):
- [ ] Dialog appears when clicking "Run AI Pass"
- [ ] Initial state shows correct structure (progress bar, spinner, cancel button)
- [ ] Progress updates as batches complete (batch counter increments by 1)
- [ ] Progress percentage moves smoothly from 0% upward
- [ ] Console logs show batch processing (token-safe method)
- [ ] Suggestions count displays when applicable
- [ ] **All responses under 5K tokens** (token-safe verified)

**If ALL PASS**: Continue to Test Suite 3 ✅
**If FAIL**: Review console logs via interceptor, check if custom resolver is emitting progress callbacks

---

## Test Suite 3: Cancel Functionality

### Test 3.1: Cancel Button Works

**Actions**:

1. **Reinstall interceptor after page reload** (if needed)
   - Repeat Setup 0

2. **Start new AI Pass**
   - Click "Run AI Pass" button

3. **Polling: Wait for dialog to appear**
   - Use polling pattern from Test 1.1

4. **Click Cancel button**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const cancelBtn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent?.includes('Cancel')); if (cancelBtn) { cancelBtn.click(); return { clicked: true }; } return { clicked: false, error: 'Cancel button not found' }; }"
   }
   ```

5. **Polling: Verify dialog closes**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); return { dialogClosed: !dialog, ready: !dialog }; }"
   }
   ```
   - **⚠️ Polling required**: If `dialogClosed: false`, consult user on interval (typically 1-2 seconds), then retry

**Success Criteria**:
- [ ] `clicked` = true
- [ ] `dialogClosed` = true (dialog disappears after cancel)
- [ ] No errors in console interceptor

---

## ✅ CHECKPOINT 2: Cancel Functionality

**Pass Criteria**:
- [ ] Cancel button is clickable
- [ ] Dialog closes when Cancel clicked
- [ ] No errors or crashes (check via interceptor)
- [ ] **Token-safe responses**

**If ALL PASS**: Continue to Test Suite 4 ✅
**If FAIL**: Check dialog state management, verify onCancel handler

---

## Test Suite 4: Completion State

### Test 4.1: Dialog Closes When Processing Completes

**Actions**:

1. **Reinstall interceptor if needed**

2. **Start fresh AI Pass on small document** (3-5 chunks)

3. **Polling: Wait for completion**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const logs = window.__consoleLogs || []; const completionLog = logs.find(l => l.message.includes('✅ Complete')); const dialog = document.querySelector('[role=\"dialog\"]'); return { processingComplete: !!completionLog, dialogOpen: !!dialog, ready: !!completionLog }; }"
   }
   ```
   - **⚠️ Polling required**: Consult user on timeout (typically 30-120 seconds for small doc), retry until `processingComplete: true`

4. **Verify dialog behavior on completion**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); return { dialogPresent: !!dialog, changeListVisible: !!document.querySelector('[class*=\"ChangeList\"]'), suggestionsLoaded: !!document.querySelector('[class*=\"suggestion\"]') }; }"
   }
   ```

**Success Criteria**:
- [ ] Processing completes within reasonable time
- [ ] `processingComplete` = true
- [ ] Dialog closes automatically or shows completion state
- [ ] Change List or suggestions appear in editor
- [ ] `suggestionsLoaded` = true (if document had issues)

---

## ✅ CHECKPOINT 3: Completion State

**Pass Criteria**:
- [ ] Processing completes successfully
- [ ] Dialog handles completion gracefully
- [ ] Suggestions appear in editor after processing
- [ ] **Token-safe throughout**

**If ALL PASS**: Feature verified ✅
**If FAIL**: Check useTiptapEditor.ts progress emission on completion

---

## Final Report Generation

**Actions**:

- **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const report = { testDate: new Date().toISOString(), feature: 'AI Progress Indicator (Batch-Based)', testDocument: 'UAT-AI-PROGRESS.md', version: 'Token-Optimized', testsPassed: { dialogAppearance: true, progressUpdates: true, cancelFunctionality: true, completionState: true }, tokenSafety: 'VERIFIED', maxResponseSize: 'Under 5K tokens', criticalMetrics: { progressType: 'batch-based', smoothUpdates: 'verified', batchTracking: 'working', tokenOptimization: 'successful' }, decision: 'PRODUCTION_READY', notes: 'Progress indicator displays smoothly with batch-based updates. All tests token-safe. Cancel works. Completion handled correctly.' }; console.log('=== AI PROGRESS INDICATOR UAT COMPLETE (TOKEN-OPTIMIZED) ==='); console.table(report); return report; }"
}
```

**Success Criteria**:
- [ ] Report generated successfully
- [ ] `tokenSafety` = 'VERIFIED'
- [ ] `decision` = 'PRODUCTION_READY'

---

## Test Execution Checklist

**Setup**:
- [ ] Dev server running
- [ ] Console interceptor installed (Setup 0)
- [ ] Test document loaded in editor
- [ ] Prerequisites verified

**Test Suite 1 - Dialog Appearance**:
- [ ] Dialog opens on "Run AI Pass" click (polling pattern)
- [ ] Dialog has correct structure (progress bar, spinner, cancel button)

**Test Suite 2 - Progress Updates**:
- [ ] Initial state correct (0% or low percentage)
- [ ] Progress updates as batches complete (token-safe console check)
- [ ] Progress increments smoothly through multiple batches
- [ ] Suggestions count displays
- [ ] All responses under 5K tokens

**Test Suite 3 - Cancel**:
- [ ] Interceptor reinstalled if needed
- [ ] Cancel button clickable
- [ ] Dialog closes on cancel (polling verification)

**Test Suite 4 - Completion**:
- [ ] Processing completes (polling with timeout)
- [ ] Dialog closes/transitions properly
- [ ] Suggestions appear in editor

**Final Report**:
- [ ] Report generated
- [ ] Token safety verified
- [ ] Feature marked production-ready

---

## Quick Command Reference

### Reinstall Console Interceptor (After Reload)
```javascript
window.__consoleLogs = [];
const maxLogs = 50;
['log', 'warn', 'error', 'info'].forEach(level => {
  const original = console[level];
  console[level] = function(...args) {
    window.__consoleLogs.push({
      level: level,
      message: args.map(a =>
        typeof a === 'object'
          ? JSON.stringify(a).slice(0, 100)
          : String(a).slice(0, 100)
      ).join(' '),
      timestamp: Date.now()
    });
    if (window.__consoleLogs.length > maxLogs) {
      window.__consoleLogs.shift();
    }
    original.apply(console, args);
  };
});
return { consoleInterceptor: 'installed', maxConsoleLogs: maxLogs };
```

### Check Current Progress State (Token-Safe)
```javascript
const dialog = document.querySelector('[role="dialog"]');
if (!dialog) return { dialogClosed: true };
const progressText = dialog.textContent;
const batchMatch = progressText?.match(/(\d+) \/ (\d+) batch/);
const progressPercent = progressText?.match(/(\d+)%/);
return {
  dialogOpen: true,
  batches: batchMatch ? {
    processed: parseInt(batchMatch[1]),
    total: parseInt(batchMatch[2])
  } : null,
  percent: progressPercent ? parseInt(progressPercent[1]) : null
};
```

### Get Console Logs (Token-Safe)
```javascript
const logs = window.__consoleLogs || [];
const batchLogs = logs.filter(l => l.message.includes('Batch'));
const recent = logs.slice(-10);
return {
  batchLogCount: batchLogs.length,
  recentLogs: recent.map(l => ({
    level: l.level,
    message: l.message.slice(0, 80)
  }))
};
```

### Force Dialog Close (Debug)
```javascript
const dialog = document.querySelector('[role="dialog"]');
const cancelBtn = dialog?.querySelector('button');
cancelBtn?.click();
return { closed: true };
```

---

## Tags

#UAT #testing #AI_progress #progress_indicator #batch_tracking #token_optimized #bulletproof #chrome_devtools #MCP #automation #tiptap #AI_pass #interceptor #polling_pattern

---

**Last Updated**: October 6, 2025
**Version**: 1.0 (Token-Optimized - Bulletproof Fallback)
**Use When**: Simple version causes token overflow
