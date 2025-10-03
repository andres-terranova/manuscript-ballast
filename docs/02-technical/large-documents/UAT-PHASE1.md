# Phase 1 UAT: Custom Resolver Testing Protocol
## User Acceptance Testing for Large Document AI Processing

**Purpose**: Validate Phase 1 implementation with automated chrome-devtools MCP testing
**Prerequisites**: Action plan completed, edge function deployed, custom resolver implemented
**Testing Method**: Automated via chrome-devtools MCP tools

---

## ⚠️ Session Prerequisites

### Required MCP Tools
**This testing protocol requires chrome-devtools MCP to be enabled.**

If you're seeing this without chrome-devtools MCP available:
- ❌ You're in the wrong Claude session type
- ❌ This session cannot execute browser-based tests
- 🔄 Please relaunch Claude with chrome-devtools MCP enabled

**Verify MCP availability**: Check that these tools are available:
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__take_snapshot`
- `mcp__chrome-devtools__list_console_messages`

### Implementation Status Check

Before starting UAT, verify implementation is complete:

- [ ] Edge function `ai-suggestions-html` deployed to Supabase
- [ ] Custom resolver added to `src/hooks/useTiptapEditor.ts`
- [ ] Environment variables configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Dev server running: `pnpm run dev` on http://localhost:8080
- [ ] Basic curl test of edge function passed

**If any prerequisite missing**: Return to ACTION-PLAN-PHASE1.md to complete implementation first.

---

## ⚠️ Important: Two-Step UI Flow

**All "Run AI Pass" interactions require TWO button clicks**:

1. **First click**: Opens the Rule Editor dialog
   - The "Run AI Pass" button in the toolbar opens a dialog
   - Dialog displays the AI rules that will be applied

2. **Second click**: Starts processing
   - Within the Rule Editor dialog, click the "Run AI Pass" button
   - This actually initiates the AI processing

**Testing Note**: After each "Run AI Pass" button click in test suites, you must:
1. Wait for the dialog to appear
2. Take a snapshot to find the dialog's "Run AI Pass" button UID
3. Click the button within the dialog to start processing

---

## Test Environment Setup

### Setup 1: Navigate to Application

**MCP Tool**: `mcp__chrome-devtools__navigate_page`
```json
{
  "url": "http://localhost:8080"
}
```

**Verify**:
- [ ] Page loads successfully
- [ ] No console errors on initial load

**MCP Tool to Check**: `mcp__chrome-devtools__list_console_messages`

---

### Setup 2: Take Initial Snapshot

**MCP Tool**: `mcp__chrome-devtools__take_snapshot`

**Purpose**: Identify UIDs for buttons and interactive elements

**Look for**:
- Manuscript list/selection area
- "Run AI Pass" button (or equivalent)
- Editor content area

---

## Test Suite 1: Small Document Baseline (1K words)

### Test 1.1: Open Small Document

**Target Manuscript**: Love Prevails 1st Chapter
- ID: `b080ddf6-f72e-441b-9061-73aa54ef9b02`
- Word Count: 1,247 words
- Character Count: 7,145

**Actions**:

1. **Click on manuscript** (if in list view)
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` from snapshot (manuscript with title "Love Prevails 1st Chapter")

2. **Wait for editor to load**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Love Prevails 1st Chapter",
     "timeout": 10000
   }
   ```

3. **Take screenshot**
   - **MCP Tool**: `mcp__chrome-devtools__take_screenshot`
   - **Purpose**: Document initial state

### Test 1.2: Execute AI Pass

**Actions**:

1. **Clear console before test**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { console.clear(); console.log('🧪 TEST 1.2: Starting AI Pass on small document'); }"
   }
   ```

2. **Click "Run AI Pass" button (opens Rule Editor dialog)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button (from snapshot)

3. **Wait for Rule Editor dialog to open**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Run AI Pass",
     "timeout": 3000
   }
   ```
   - **Note**: A dialog will appear with rule editor and a second "Run AI Pass" button

4. **Take snapshot to find dialog's "Run AI Pass" button**
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`
   - Look for the second "Run AI Pass" button within the Rule Editor dialog

5. **Click "Run AI Pass" button in dialog (starts processing)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button in Rule Editor dialog

6. **Monitor console messages**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **Wait**: 30 seconds (small doc should complete quickly)

### Test 1.3: Validate Results

**Expected Console Messages**:
- `🔄 Custom Resolver: Processing X chunks`
- `📝 Chunk 1/X`
- `✅ Chunk 1 complete: Y suggestions`
- `✅ Complete: Y suggestions in ...ms`

**Validation Script**:

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const editor = window.__editor; if (!editor) return { error: 'Editor not found' }; const storage = editor.extensionStorage?.aiSuggestion; const suggestions = storage?.getSuggestions() || []; return { success: true, suggestionCount: suggestions.length, hasSuggestions: suggestions.length > 0 }; }"
}
```

**Success Criteria**:
- [ ] `suggestionCount` > 0
- [ ] `hasSuggestions` = true
- [ ] No errors in console messages

### Test 1.4: Position Accuracy Check

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const editor = window.__editor; if (!editor) return { error: 'Editor not found' }; const storage = editor.extensionStorage?.aiSuggestion; const suggestions = storage.getSuggestions(); let successCount = 0; let failCount = 0; suggestions.forEach(s => { const actual = editor.state.doc.textBetween(s.deleteRange.from, s.deleteRange.to); const expected = s.deleteText; if (actual === expected) { successCount++; } else { failCount++; } }); const accuracy = suggestions.length > 0 ? ((successCount / suggestions.length) * 100).toFixed(1) : 0; return { total: suggestions.length, successCount, failCount, accuracy: accuracy + '%' }; }"
}
```

**Success Criteria**:
- [ ] `accuracy` = "100.0%"
- [ ] `failCount` = 0

---

## ✅ CHECKPOINT 1: Baseline Validation

**Pass Criteria**:
- [ ] Small document processes successfully
- [ ] Suggestions generated (count > 0)
- [ ] Position accuracy = 100%
- [ ] No console errors

**If PASS**: Continue to Test Suite 2
**If FAIL**: Stop and review console messages, check edge function logs

---

## Test Suite 2: Medium Document Rate Limiting (27K words)

### Test 2.1: Open Medium Document

**Target Manuscript**: Tip of the Spear
- ID: `0e972f2d-c88b-4a0c-8bbc-3213d7958b1c`
- Word Count: 27,782 words
- Character Count: 155,006

**Actions**:

1. **Navigate back to manuscript list** (if needed)
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: Back button or home link `uid`

2. **Click on medium manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Tip of the Spear"

3. **Wait for editor to load**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Tip of the Spear",
     "timeout": 10000
   }
   ```

### Test 2.2: Execute AI Pass with Monitoring

**Actions**:

1. **Clear console and start timestamp**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { console.clear(); window.testStartTime = Date.now(); console.log('🧪 TEST 2.2: Starting AI Pass on medium document (27K words)'); console.log('⏱️  Start time:', new Date().toLocaleTimeString()); }"
   }
   ```

2. **Start performance trace**
   - **MCP Tool**: `mcp__chrome-devtools__performance_start_trace`
   ```json
   {
     "reload": false,
     "autoStop": false
   }
   ```

3. **Click "Run AI Pass" button (opens dialog)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button

4. **Wait for Rule Editor dialog and take snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Run AI Pass",
     "timeout": 3000
   }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`

5. **Click "Run AI Pass" button in dialog (starts processing)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button in dialog

6. **Monitor network requests** (check for 429 errors)
   - **MCP Tool**: `mcp__chrome-devtools__list_network_requests`
   - **Parameters**:
   ```json
   {
     "resourceTypes": ["xhr", "fetch"]
   }
   ```
   - **Run every 30 seconds** during processing

7. **Wait for completion** (may take 2-5 minutes)
   - Poll console messages every 15 seconds
   - Look for "✅ Complete" message

### Test 2.3: Verify No Rate Limiting

**Check Network Requests**:

**MCP Tool**: `mcp__chrome-devtools__list_network_requests`
```json
{
  "resourceTypes": ["xhr", "fetch"]
}
```

**Validate**:
- [ ] No requests with status code 429
- [ ] All requests to `ai-suggestions-html` have status 200
- [ ] Observed 2.5s delays between chunk requests (check timing in network tab)

**Console Validation**:

**MCP Tool**: `mcp__chrome-devtools__list_console_messages`

**Look for**:
- [ ] "⏳ Waiting 2.5s before next chunk..." messages
- [ ] No "429" or "rate limit" errors
- [ ] All chunks complete successfully

### Test 2.4: Performance Metrics

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const elapsed = Date.now() - window.testStartTime; const elapsedMin = (elapsed / 1000 / 60).toFixed(2); const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2); const editor = window.__editor; const storage = editor?.extensionStorage?.aiSuggestion; const suggestions = storage?.getSuggestions() || []; return { elapsedTime: elapsedMin + ' minutes', suggestionCount: suggestions.length, memoryUsageMB: memoryMB, memoryWithinLimit: parseFloat(memoryMB) < 500 }; }"
}
```

**Success Criteria**:
- [ ] `memoryWithinLimit` = true
- [ ] `elapsedTime` < 5 minutes
- [ ] `suggestionCount` > 0

### Test 2.5: Stop Performance Trace

**MCP Tool**: `mcp__chrome-devtools__performance_stop_trace`

**Review**: Check for performance issues, memory leaks

---

## ✅ CHECKPOINT 2: Rate Limiting & Memory

**Pass Criteria**:
- [ ] No 429 rate limit errors
- [ ] Memory usage < 500 MB
- [ ] Processing completes within 5 minutes
- [ ] Position accuracy = 100% (run validation from Test 1.4)

**If PASS**: Continue to Test Suite 3 (Critical Test)
**If FAIL**: Investigate throttling delays, memory leaks, or rate limits

---

## Test Suite 3: Large Document Critical Validation ⭐ (85K words)

### Test 3.1: Open Large Document

**Target Manuscript**: Knights of Mairia
- ID: `a44cbca8-9748-44b2-9775-73cb77de853c`
- Word Count: 85,337 words
- Character Count: 488,451

**Actions**:

1. **Navigate to manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: Back to list, then click "Knights of Mairia"

2. **Wait for editor to load**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Knights of Mairia",
     "timeout": 15000
   }
   ```

3. **Take screenshot of initial state**
   - **MCP Tool**: `mcp__chrome-devtools__take_screenshot`

### Test 3.2: Setup Monitoring

**Install Position Validation Function**:

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { window.validatePositions = function() { const editor = window.__editor; if (!editor) return { error: 'Editor not found' }; const storage = editor.extensionStorage?.aiSuggestion; const suggestions = storage.getSuggestions(); let successCount = 0; let failCount = 0; const failures = []; suggestions.forEach((s, idx) => { const actual = editor.state.doc.textBetween(s.deleteRange.from, s.deleteRange.to); const expected = s.deleteText; const match = actual === expected; if (match) { successCount++; } else { failCount++; failures.push({ index: idx, id: s.id, expected: expected.substring(0, 50), actual: actual.substring(0, 50), positions: { from: s.deleteRange.from, to: s.deleteRange.to } }); } }); const accuracy = suggestions.length > 0 ? ((successCount / suggestions.length) * 100).toFixed(1) : 0; return { total: suggestions.length, successCount, failCount, accuracy: accuracy + '%', failures: failures.slice(0, 5) }; }; return { message: 'Position validation function installed' }; }"
}
```

**Clear Console and Start Timer**:

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { console.clear(); window.largeDocStartTime = Date.now(); console.log('🧪 TEST 3.2: Starting AI Pass on LARGE document (85K words)'); console.log('⏱️  Start time:', new Date().toLocaleTimeString()); console.log('⚠️  This may take 5-15 minutes...'); return { started: true }; }"
}
```

### Test 3.3: Execute AI Pass (Long Running)

**Actions**:

1. **Start performance trace**
   - **MCP Tool**: `mcp__chrome-devtools__performance_start_trace`
   ```json
   {
     "reload": false,
     "autoStop": false
   }
   ```

2. **Click "Run AI Pass" button (opens dialog)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button

3. **Wait for Rule Editor dialog and take snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Run AI Pass",
     "timeout": 3000
   }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`

4. **Click "Run AI Pass" button in dialog (starts processing)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button in dialog

5. **Monitor progress every 60 seconds**:

   **MCP Tool**: `mcp__chrome-devtools__list_console_messages`

   **Look for**:
   - Chunk progress: "📝 Chunk X/Y"
   - Completion: "✅ Complete"
   - Any errors

6. **Check browser isn't timing out**:

   **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const elapsed = Date.now() - window.largeDocStartTime; const elapsedMin = (elapsed / 1000 / 60).toFixed(2); return { elapsedMinutes: elapsedMin, stillProcessing: elapsed < 900000 }; }"
   }
   ```

   **Run every 60 seconds** until completion or 15 minute mark

### Test 3.4: Critical Position Validation ⭐

**Once AI Pass completes** (look for "✅ Complete" in console):

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { return window.validatePositions(); }"
}
```

**Success Criteria** (MUST PASS):
- [ ] `accuracy` = "100.0%"
- [ ] `failCount` = 0
- [ ] `total` > 0 (suggestions generated)

**If accuracy < 100%**:
- 🔴 **CRITICAL FAILURE** - HTML matching broken
- Review `failures` array for patterns
- Check if HTML format from LLM matches document
- Phase 2 may not be viable

### Test 3.5: Performance & Memory Metrics

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const elapsed = Date.now() - window.largeDocStartTime; const elapsedMin = (elapsed / 1000 / 60).toFixed(2); const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2); const editor = window.__editor; const storage = editor?.extensionStorage?.aiSuggestion; const suggestions = storage?.getSuggestions() || []; const consoleMessages = []; for (let i = 0; i < 10; i++) { const msg = console.log.arguments?.[i]; if (msg) consoleMessages.push(msg); } return { documentSize: 488451, elapsedMinutes: elapsedMin, suggestionCount: suggestions.length, memoryUsageMB: memoryMB, memoryWithinLimit: parseFloat(memoryMB) < 500, processingTimeAcceptable: parseFloat(elapsedMin) < 15, test: 'LARGE_DOC_85K' }; }"
}
```

**Stop Performance Trace**:

**MCP Tool**: `mcp__chrome-devtools__performance_stop_trace`

### Test 3.6: Network Request Analysis

**Check for any failures**:

**MCP Tool**: `mcp__chrome-devtools__list_network_requests`
```json
{
  "resourceTypes": ["xhr", "fetch"]
}
```

**Validate**:
- [ ] No 429 errors
- [ ] No 5xx server errors
- [ ] All chunk requests completed successfully

---

## ✅ CHECKPOINT 3: Critical Validation ⭐

**Pass Criteria** (ALL must pass):
- [ ] ✅ No browser timeout (processing completes)
- [ ] ✅ Position accuracy = 100.0%
- [ ] ✅ No 429 rate limit errors
- [ ] ✅ Memory usage < 500 MB
- [ ] ✅ Processing time < 15 minutes
- [ ] ✅ Suggestions visible in editor

**If ALL PASS**: Phase 1 is SUCCESSFUL! ✅ Proceed to Test Suite 4
**If ANY FAIL**: Phase 1 has issues - review failure type

---

## Test Suite 4: Accept/Reject Functionality

### Test 4.1: Accept Suggestion

**Actions**:

1. **Take snapshot to find suggestion**
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`
   - Look for suggestion UI elements

2. **Click on first suggestion**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for first suggestion

3. **Wait for popover/context menu**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Accept",
     "timeout": 5000
   }
   ```

4. **Take snapshot of popover**
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`

5. **Click "Accept" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Accept" button

6. **Verify suggestion applied**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = window.__editor; const storage = editor?.extensionStorage?.aiSuggestion; const remainingSuggestions = storage?.getSuggestions() || []; return { suggestionAccepted: true, remainingSuggestionCount: remainingSuggestions.length }; }"
   }
   ```

**Success Criteria**:
- [ ] Suggestion disappears from UI
- [ ] Text changes in editor
- [ ] `remainingSuggestionCount` decreased by 1

### Test 4.2: Reject Suggestion

**Actions**:

1. **Click on another suggestion**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for next suggestion

2. **Click "Reject" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Reject" button

3. **Verify suggestion removed**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = window.__editor; const storage = editor?.extensionStorage?.aiSuggestion; const remainingSuggestions = storage?.getSuggestions() || []; return { suggestionRejected: true, remainingSuggestionCount: remainingSuggestions.length }; }"
   }
   ```

**Success Criteria**:
- [ ] Suggestion disappears from UI
- [ ] Text remains unchanged
- [ ] `remainingSuggestionCount` decreased by 1

### Test 4.3: Position Drift Check

**After accepting 3-5 suggestions**:

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { return window.validatePositions(); }"
}
```

**Success Criteria**:
- [ ] `accuracy` still = "100.0%"
- [ ] No position drift after accepting suggestions

---

## Test Suite 5: Edge Cases

### Test 5.1: Re-run AI Pass on Modified Document

**Actions**:

1. **Accept 2-3 suggestions**
2. **Clear console**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { console.clear(); console.log('🧪 TEST 5.1: Re-running AI Pass after modifications'); }"
   }
   ```

3. **Click "Run AI Pass" button (opens dialog)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button

4. **Wait for dialog and click "Run AI Pass" in dialog**
   - **MCP Tool**: `mcp__chrome-devtools__wait_for`
   ```json
   {
     "text": "Run AI Pass",
     "timeout": 3000
   }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__take_snapshot`
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Parameter**: `uid` for "Run AI Pass" button in dialog

5. **Wait for completion**

6. **Validate positions again**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { return window.validatePositions(); }"
   }
   ```

**Success Criteria**:
- [ ] New suggestions generated
- [ ] Position accuracy still 100%
- [ ] No errors

### Test 5.2: Browser Memory After Multiple Passes

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2); const totalMemoryMB = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2); return { usedMemoryMB: memoryMB, totalMemoryMB: totalMemoryMB, withinLimit: parseFloat(memoryMB) < 500, memoryPressure: (parseFloat(memoryMB) / parseFloat(totalMemoryMB) * 100).toFixed(1) + '%' }; }"
}
```

**Success Criteria**:
- [ ] `withinLimit` = true
- [ ] `memoryPressure` < 80%

---

## Test Suite 6: Performance Comparison

### Test 6.1: Document Processing Time Summary

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { return { smallDoc: { name: 'Love Prevails 1st Chapter', words: 1247, expectedTime: '< 1 minute' }, mediumDoc: { name: 'Tip of the Spear', words: 27782, expectedTime: '2-5 minutes' }, largeDoc: { name: 'Knights of Mairia', words: 85337, expectedTime: '5-15 minutes' }, note: 'Actual times logged during tests' }; }"
}
```

### Test 6.2: Final Metrics Collection

**Collect all metrics**:

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2); return { phase1Complete: true, metrics: { smallDocPassed: true, mediumDocPassed: true, largeDocPassed: true, positionAccuracy: '100%', memoryUsageMB: memoryMB, noRateLimiting: true, noTimeouts: true }, recommendation: 'Ready for production or Phase 2 evaluation' }; }"
}
```

---

## Final Report Generation

### Generate Test Summary

**MCP Tool**: `mcp__chrome-devtools__evaluate_script`
```json
{
  "function": "() => { const report = { testDate: new Date().toISOString(), phase: 'Phase 1 - Custom Resolver', testsPassed: { smallDoc: true, mediumDoc: true, largeDoc: true, positionAccuracy: true, acceptReject: true, edgeCases: true }, criticalMetrics: { positionAccuracy: '100%', maxMemoryMB: 'XXX', maxProcessingTimeMin: 'XXX', rateLimitErrors: 0, browserTimeouts: 0 }, decision: 'PENDING_REVIEW', notes: 'All tests passed - ready for decision point' }; console.log('=== PHASE 1 UAT COMPLETE ==='); console.table(report); return report; }"
}
```

### Take Final Screenshot

**MCP Tool**: `mcp__chrome-devtools__take_screenshot`
```json
{
  "filePath": "test-results/phase1-final-state.png"
}
```

---

## Decision Matrix

### Option A: Ship Phase 1 to Production ✅

**If ALL criteria met**:
- [ ] Position accuracy = 100%
- [ ] Processing time < 15 min for 85K words
- [ ] Memory usage < 500MB
- [ ] No browser crashes
- [ ] No rate limiting
- [ ] Accept/reject works

**Action**: Deploy with feature flag, monitor real usage

---

### Option B: Proceed to Phase 2 ⏭️

**If**:
- [ ] Position mapping works (100%)
- [ ] BUT UX friction (15+ min wait unacceptable)
- [ ] OR users need to close browser
- [ ] OR need progress tracking

**Action**: Begin 12-week Phase 2 job queue implementation

---

### Option C: Investigate Alternatives 🔴

**If**:
- [ ] Position accuracy < 95%
- [ ] Browser timeout occurs
- [ ] Memory exceeds 500MB regularly
- [ ] Individual chunks timing out

**Action**: Consult TipTap support, consider different architecture

---

## Test Execution Checklist

**Pre-Test**:
- [ ] Dev server running (`pnpm run dev`)
- [ ] Edge function deployed
- [ ] Custom resolver implemented
- [ ] Chrome DevTools MCP connected

**Test Execution**:
- [ ] Test Suite 1: Small Doc ✅
- [ ] CHECKPOINT 1 passed
- [ ] Test Suite 2: Medium Doc ✅
- [ ] CHECKPOINT 2 passed
- [ ] Test Suite 3: Large Doc ⭐ ✅
- [ ] CHECKPOINT 3 passed
- [ ] Test Suite 4: Accept/Reject ✅
- [ ] Test Suite 5: Edge Cases ✅
- [ ] Test Suite 6: Performance Summary ✅

**Post-Test**:
- [ ] Metrics collected
- [ ] Screenshots saved
- [ ] Final report generated
- [ ] Decision documented

---

## Quick Command Reference

```javascript
// Install validation function
window.validatePositions = function() { /* ... */ }

// Run validation
window.validatePositions()

// Check memory
const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
console.log(`Memory: ${memoryMB} MB`);

// Clear console
console.clear();

// Get suggestion count
window.__editor?.extensionStorage?.aiSuggestion?.getSuggestions().length
```

---

## MCP Tools Quick Reference

**Navigation**:
- `navigate_page` - Go to URL
- `click` - Click element by UID
- `wait_for` - Wait for text to appear

**Testing**:
- `evaluate_script` - Run JavaScript
- `list_console_messages` - Check console
- `take_snapshot` - Get page structure
- `take_screenshot` - Visual documentation

**Performance**:
- `performance_start_trace` - Begin profiling
- `performance_stop_trace` - End profiling
- `list_network_requests` - Check API calls

---

## 🎯 UAT Complete - Session Handoff

### Test Results Summary

After completing all test suites, provide final summary:

```javascript
// Final test report
const finalReport = {
  testDate: new Date().toISOString(),
  phase: 'Phase 1 - Custom Resolver',
  allTestsPassed: true/false, // Update based on results
  criticalMetrics: {
    positionAccuracy: 'X%',    // From CHECKPOINT 3
    maxMemoryMB: 'X',          // From performance checks
    maxProcessingTimeMin: 'X', // From large doc test
    rateLimitErrors: 0,        // Count of 429 errors
    browserTimeouts: 0         // Did processing complete?
  },
  decision: 'SHIP | PHASE2 | INVESTIGATE',
  notes: 'Brief summary of any issues or observations'
};
console.table(finalReport);
```

### Save Test Results (Optional)

```bash
# Create test results file
mkdir -p test-results
echo "UAT Phase 1 Test Results" > test-results/phase1-uat-results.md
echo "Date: $(date)" >> test-results/phase1-uat-results.md
echo "Position Accuracy: X%" >> test-results/phase1-uat-results.md
echo "Memory Usage: X MB" >> test-results/phase1-uat-results.md
echo "Processing Time: X minutes" >> test-results/phase1-uat-results.md
echo "Decision: [SHIP/PHASE2/INVESTIGATE]" >> test-results/phase1-uat-results.md
```

### Return to Decision Making

**Testing Complete** - Return to ACTION-PLAN-PHASE1.md Part 4 for decision.

**Human Action**:
- Review test results from this session
- Make decision per ACTION-PLAN-PHASE1.md Part 4 decision matrix
- If needed, can return to implementation session (no chrome-devtools) for Phase 2 planning

---

**Test Status**: Ready to Execute
**Prerequisites**: Action Plan Phase 1 completed
**Execution Time**: 30-60 minutes (automated)
**Last Updated**: October 3, 2025
