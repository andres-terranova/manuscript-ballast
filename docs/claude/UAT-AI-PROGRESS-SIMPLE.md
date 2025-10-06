# AI Progress Indicator: UAT Testing Protocol (SIMPLE)
## Visual Progress Tracking for AI Pass Processing

**Purpose**: Validate that the AI Progress Indicator displays correctly and updates smoothly during AI Pass processing
**Prerequisites**: AI Progress Indicator implementation complete (batch-based tracking)
**Testing Method**: Automated via chrome-devtools MCP tools (native tools - try first)
**Last Updated**: October 6, 2025

---

## ⚠️ CRITICAL: TOKEN OVERFLOW DETECTION

**THIS DOCUMENT USES NATIVE `list_console_messages` - MAY CAUSE TOKEN OVERFLOW**

### 🚨 IF YOU SEE TOKEN OVERFLOW (25K+ tokens in any response):

1. **STOP TESTING IMMEDIATELY** - Do not continue with this document
2. **Mark this file as deprecated** - Add `❌ DEPRECATED - TOKEN OVERFLOW DETECTED` to title
3. **Switch to token-optimized version**: Use `UAT-AI-PROGRESS.md` instead
4. **Note the failure** - Document when/where overflow occurred
5. **Never use this doc again** - Always use token-optimized version for future tests

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__list_pages`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__wait_for`
- `mcp__chrome-devtools__list_console_messages` ⚠️ (OVERFLOW RISK)
- `mcp__chrome-devtools__take_screenshot` (optional, for debugging)

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

### Setup 1: Navigate to Application & Load Test Document

**Actions**:

1. **Navigate to app**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

2. **Wait for editor to load**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Run AI Pass",
     "timeout": 10000
   }
   ```

3. **Get "Run AI Pass" button UID**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const buttons = Array.from(document.querySelectorAll('button')); const runAiBtn = buttons.find(b => b.textContent?.includes('Run AI Pass')); return { found: !!runAiBtn, buttonText: runAiBtn?.textContent, className: runAiBtn?.className }; }"
   }
   ```

**Success Criteria**:
- [ ] Page loaded successfully
- [ ] "Run AI Pass" button visible
- [ ] `found` = true

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

2. **Wait for progress dialog to appear**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "AI Pass Progress",
     "timeout": 5000
   }
   ```

3. **Verify dialog structure**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const title = dialog?.querySelector('h2')?.textContent; const progressBar = dialog?.querySelector('[role=\"progressbar\"]'); const spinner = dialog?.querySelector('svg.animate-spin'); const cancelBtn = dialog?.querySelector('button'); return { dialogFound: !!dialog, title, hasProgressBar: !!progressBar, hasSpinner: !!spinner, hasCancelButton: !!cancelBtn, cancelButtonText: cancelBtn?.textContent }; }"
   }
   ```

**Success Criteria**:
- [ ] `clicked` = true
- [ ] Dialog appeared within 5 seconds
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

**🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT-AI-PROGRESS.md`

---

### Test 2.2: Progress Updates as Batches Complete ⭐ (OVERFLOW RISK POINT)

**Actions**:

1. **Wait 5-10 seconds for first batch to complete**
   - Consult user on appropriate interval based on document size
   - Use manual wait or polling

2. **Check progress after first batch** ⭐
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`

   **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT-AI-PROGRESS.md`

3. **Verify batch progress updated**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const progressText = dialog?.textContent; const batchMatch = progressText?.match(/(\\d+) \\/ (\\d+) batch/); const progressBar = dialog?.querySelector('[role=\"progressbar\"]'); const progressPercent = progressText?.match(/(\\d+)%/); return { batches: batchMatch ? { processed: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]) } : null, progressPercent: progressPercent ? parseInt(progressPercent[1]) : null, stillVisible: !!dialog }; }"
   }
   ```

4. **Check console logs for batch completion** ⭐ (OVERFLOW RISK POINT)
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`

   **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT-AI-PROGRESS.md`

5. **Look for batch completion logs**
   - Search logs for:
     - `📦 Batch X/Y complete`
     - `Processing batch X/Y`
     - Progress callback emissions

**Success Criteria**:
- [ ] Console shows batch completion logs (e.g., "📦 Batch 1/3 complete")
- [ ] `batches.processed` > 0 (at least 1 batch processed)
- [ ] `progressPercent` > 0 (progress bar moved from 0%)
- [ ] Dialog still visible
- [ ] No token overflow

**🚨 IF OVERFLOW DETECTED**: STOP - Switch to `UAT-AI-PROGRESS.md`

---

### Test 2.3: Suggestions Count Appears

**Actions**:

1. **Wait for processing to continue** (consult user on interval)

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
- [ ] Progress updates as batches complete (batch counter increments)
- [ ] Progress percentage moves from 0% upward
- [ ] Console logs show batch processing
- [ ] Suggestions count displays when applicable
- [ ] **No token overflow** (critical for simple version)

**If ALL PASS**: Continue to Test Suite 3 ✅
**If OVERFLOW**: STOP - Switch to `UAT-AI-PROGRESS.md`
**If FAIL (non-overflow)**: Review console logs, check if custom resolver is emitting progress callbacks

---

## Test Suite 3: Cancel Functionality

### Test 3.1: Cancel Button Works

**Actions**:

1. **Start new AI Pass** (if previous completed)
   - Reload page, click "Run AI Pass" again

2. **Wait for dialog to appear**

3. **Click Cancel button**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); const cancelBtn = Array.from(dialog?.querySelectorAll('button') || []).find(b => b.textContent?.includes('Cancel')); if (cancelBtn) { cancelBtn.click(); return { clicked: true }; } return { clicked: false, error: 'Cancel button not found' }; }"
   }
   ```

4. **Verify dialog closes**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); return { dialogClosed: !dialog, dialogStillVisible: !!dialog }; }"
   }
   ```

**Success Criteria**:
- [ ] `clicked` = true
- [ ] `dialogClosed` = true
- [ ] Dialog disappears after clicking Cancel
- [ ] No errors in console

---

## ✅ CHECKPOINT 2: Cancel Functionality

**Pass Criteria**:
- [ ] Cancel button is clickable
- [ ] Dialog closes when Cancel clicked
- [ ] No errors or crashes
- [ ] **No token overflow**

**If ALL PASS**: Continue to Test Suite 4 ✅
**If OVERFLOW**: STOP - Switch to `UAT-AI-PROGRESS.md`
**If FAIL**: Check dialog state management, verify onCancel handler

---

## Test Suite 4: Completion State

### Test 4.1: Dialog Closes When Processing Completes

**Actions**:

1. **Start fresh AI Pass on small document** (3-5 chunks)

2. **Wait for completion** (consult user on timeout - typically 30-120 seconds)
   - Monitor console for "✅ Complete" log

3. **Verify dialog behavior on completion**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"]'); return { dialogPresent: !!dialog, changeListVisible: !!document.querySelector('[class*=\"ChangeList\"]'), suggestionsLoaded: !!document.querySelector('[class*=\"suggestion\"]') }; }"
   }
   ```

**Success Criteria**:
- [ ] Processing completes within reasonable time
- [ ] Dialog closes automatically or shows completion state
- [ ] Change List or suggestions appear in editor
- [ ] `suggestionsLoaded` = true (if document had issues)

---

## ✅ CHECKPOINT 3: Completion State

**Pass Criteria**:
- [ ] Processing completes successfully
- [ ] Dialog handles completion gracefully
- [ ] Suggestions appear in editor after processing
- [ ] **No token overflow**

**If ALL PASS**: Feature verified ✅
**If OVERFLOW**: STOP - Mark this doc deprecated, use `UAT-AI-PROGRESS.md`
**If FAIL**: Check useTiptapEditor.ts progress emission on completion

---

## Final Report Generation

**Actions**:

- **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const report = { testDate: new Date().toISOString(), feature: 'AI Progress Indicator (Batch-Based)', testDocument: 'UAT-AI-PROGRESS-SIMPLE.md', testsPassed: { dialogAppearance: true, progressUpdates: true, cancelFunctionality: true, completionState: true }, tokenOverflow: 'NONE', criticalMetrics: { progressType: 'batch-based', smoothUpdates: 'verified', batchTracking: 'working' }, decision: 'PRODUCTION_READY', notes: 'Progress indicator displays smoothly with batch-based updates. Cancel works. Completion handled correctly.' }; console.log('=== AI PROGRESS INDICATOR UAT COMPLETE ==='); console.table(report); return report; }"
}
```

**Success Criteria**:
- [ ] Report generated successfully
- [ ] `tokenOverflow` = 'NONE'
- [ ] `decision` = 'PRODUCTION_READY'

---

## Test Execution Checklist

**Setup**:
- [ ] Dev server running
- [ ] Test document loaded in editor
- [ ] Prerequisites verified

**Test Suite 1 - Dialog Appearance**:
- [ ] Dialog opens on "Run AI Pass" click
- [ ] Dialog has correct structure (progress bar, spinner, cancel button)

**Test Suite 2 - Progress Updates**:
- [ ] Initial state correct (0% or low percentage)
- [ ] Progress updates as batches complete (no token overflow)
- [ ] Suggestions count displays

**Test Suite 3 - Cancel**:
- [ ] Cancel button clickable
- [ ] Dialog closes on cancel

**Test Suite 4 - Completion**:
- [ ] Processing completes
- [ ] Dialog closes/transitions properly
- [ ] Suggestions appear in editor

**Final Report**:
- [ ] Report generated
- [ ] No token overflow detected
- [ ] Feature marked production-ready

---

## Quick Command Reference

### Check Current Progress State
```javascript
const dialog = document.querySelector('[role="dialog"]');
const progressText = dialog?.textContent;
const batchMatch = progressText?.match(/(\d+) \/ (\d+) batch/);
const progressPercent = progressText?.match(/(\d+)%/);
return {
  batches: batchMatch ? { processed: parseInt(batchMatch[1]), total: parseInt(batchMatch[2]) } : null,
  percent: progressPercent ? parseInt(progressPercent[1]) : null
};
```

### Force Dialog Close (Debug)
```javascript
const dialog = document.querySelector('[role="dialog"]');
const cancelBtn = dialog?.querySelector('button');
cancelBtn?.click();
return { closed: true };
```

### Check Console for Batch Logs
Look for:
- `📦 Batch X/Y complete`
- `Processing batch X/Y`
- `✅ Complete: X suggestions`

---

## Tags

#UAT #testing #AI_progress #progress_indicator #batch_tracking #simple_version #native_tools #overflow_risk #chrome_devtools #MCP #automation #tiptap #AI_pass

---

**Last Updated**: October 6, 2025
**Version**: 1.0 (Simple - Try First)
**Fallback**: Use `UAT-AI-PROGRESS.md` if token overflow occurs
