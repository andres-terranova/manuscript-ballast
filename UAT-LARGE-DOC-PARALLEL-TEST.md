# UAT: LARGE Document Parallel Test - Dev Baseline vs Exp 5

**Purpose**: Compare AI Suggestions performance on 85K word document between two configurations running concurrently
**Testing Method**: Automated via chrome-devtools MCP tools (Token-Optimized)
**Last Updated**: October 6, 2025

---

## 🎯 Test Configurations

### Test A: Dev Baseline
- **Location**: `/Users/andresterranova/manuscript-ballast`
- **Port**: 8080
- **Config**: `chunkSize: 20`, `BATCH_SIZE: 5`, `delay: 500ms`
- **Branch**: dev (current)

### Test B: Experiment 5
- **Location**: `/Users/andresterranova/ballast-exp-batch10v2`
- **Port**: 8081
- **Config**: `chunkSize: 20`, `BATCH_SIZE: 10`, `delay: 750ms`
- **Branch**: exp/batch-10

### Test Document
- **Manuscript**: Knights of Mairia_LG_Edit
- **Size**: ~85K words, ~488K chars

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__new_page`
- `mcp__chrome-devtools__select_page`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__close_page`
- `mcp__chrome-devtools__list_pages`

### Implementation Status Check
- [ ] All dev servers stopped (we'll start them in Setup 0)
- [ ] Browser is closed (MCP will open it)
- [ ] Worktree exists: `/Users/andresterranova/ballast-exp-batch10v2`
- [ ] Test manuscript exists in database: Knights of Mairia_LG_Edit

---

## Test Environment Setup

### Setup 0: Start Both Servers

**Actions**:

1. **Start Dev Baseline server (port 8080)**
   - **Bash Command**:
   ```bash
   cd /Users/andresterranova/manuscript-ballast && pnpm run dev &
   ```
   - **⚠️ Note**: Wait 8-10 seconds for server to fully start

2. **Start Exp 5 server (port 8081)**
   - **Bash Command**:
   ```bash
   cd /Users/andresterranova/ballast-exp-batch10v2 && PORT=8081 pnpm run dev &
   ```
   - **⚠️ Note**: Wait 8-10 seconds for server to fully start

3. **Verify both servers running**
   - **Bash Command**:
   ```bash
   curl -s http://localhost:8080 > /dev/null && echo "Port 8080: ✅" || echo "Port 8080: ❌"
   curl -s http://localhost:8081 > /dev/null && echo "Port 8081: ✅" || echo "Port 8081: ❌"
   ```

**Success Criteria**:
- [ ] Port 8080: ✅ (Dev Baseline)
- [ ] Port 8081: ✅ (Exp 5)

---

### Setup 1: Open Both Test Pages & Install Interceptors

**Actions**:

1. **Navigate to Dev Baseline (Page 0)**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

2. **Install interceptors on Page 0**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__testId = 'DEV_BASELINE'; window.__testLogs = { critical: [], recent: [] }; ['log', 'warn', 'error', 'info'].forEach(level => { const original = console[level]; console[level] = function(...args) { const message = args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a)).join(' '); const logEntry = { level, message, timestamp: Date.now() }; const isCritical = level === 'error' || /Complete:|Error:|Failed:|✅|❌|TypeError|Warning/.test(message); if (isCritical) { window.__testLogs.critical.push(logEntry); } window.__testLogs.recent.push(logEntry); if (window.__testLogs.recent.length > 50) { window.__testLogs.recent.shift(); } original.apply(console, args); }; }); window.__fetchErrors = []; const origFetch = window.fetch; window.fetch = async function(...args) { const response = await origFetch.apply(this, args); if (response.status === 429 || response.status >= 500) { window.__fetchErrors.push({ status: response.status, url: args[0], timestamp: Date.now() }); } return response; }; window.getTestLogs = () => ({ criticalCount: window.__testLogs.critical.length, critical: window.__testLogs.critical, recentCount: window.__testLogs.recent.length, recent: window.__testLogs.recent, fetchErrorCount: window.__fetchErrors.length, fetchErrors: window.__fetchErrors }); return { testId: window.__testId, consoleInterceptor: 'installed', fetchInterceptor: 'installed' }; }"
   }
   ```

3. **Open Exp 5 in new page (Page 1)**
   - **MCP Tool**: `mcp__chrome-devtools__new_page`
   ```json
   { "url": "http://localhost:8081" }
   ```

4. **Install interceptors on Page 1**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__testId = 'EXP_5'; window.__testLogs = { critical: [], recent: [] }; ['log', 'warn', 'error', 'info'].forEach(level => { const original = console[level]; console[level] = function(...args) { const message = args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 200) : String(a)).join(' '); const logEntry = { level, message, timestamp: Date.now() }; const isCritical = level === 'error' || /Complete:|Error:|Failed:|✅|❌|TypeError|Warning/.test(message); if (isCritical) { window.__testLogs.critical.push(logEntry); } window.__testLogs.recent.push(logEntry); if (window.__testLogs.recent.length > 50) { window.__testLogs.recent.shift(); } original.apply(console, args); }; }); window.__fetchErrors = []; const origFetch = window.fetch; window.fetch = async function(...args) { const response = await origFetch.apply(this, args); if (response.status === 429 || response.status >= 500) { window.__fetchErrors.push({ status: response.status, url: args[0], timestamp: Date.now() }); } return response; }; window.getTestLogs = () => ({ criticalCount: window.__testLogs.critical.length, critical: window.__testLogs.critical, recentCount: window.__testLogs.recent.length, recent: window.__testLogs.recent, fetchErrorCount: window.__fetchErrors.length, fetchErrors: window.__fetchErrors }); return { testId: window.__testId, consoleInterceptor: 'installed', fetchInterceptor: 'installed' }; }"
   }
   ```

5. **List all pages to confirm setup**
   - **MCP Tool**: `mcp__chrome-devtools__list_pages`

**Success Criteria**:
- [ ] Page 0 (8080): Interceptors installed, testId: 'DEV_BASELINE'
- [ ] Page 1 (8081): Interceptors installed, testId: 'EXP_5'
- [ ] Both pages visible in list

---

### Setup 2: Navigate Both Pages to LARGE Document

**Actions**:

1. **Get manuscript ID (use Page 0)**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "async () => { const { supabase } = await import('/src/integrations/supabase/client.js'); const { data, error } = await supabase.from('manuscripts').select('id, title').ilike('title', '%Knights of Mairia%').limit(1); return { found: data?.length > 0, manuscript: data?.[0], manuscriptId: data?.[0]?.id, error: error?.message }; }"
   }
   ```

2. **Navigate Page 0 to manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080?manuscript={manuscriptId_from_step_1}" }
   ```
   - **⚠️ Polling required**: Wait 5 seconds for editor to load

3. **Navigate Page 1 to manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 1 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8081?manuscript={manuscriptId_from_step_1}" }
   ```
   - **⚠️ Polling required**: Wait 5 seconds for editor to load

4. **Verify Page 0 editor loaded**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror'); const aiButton = document.querySelector('button'); const buttons = Array.from(document.querySelectorAll('button')).map((btn, i) => ({ uid: 'btn-' + i, text: btn.textContent?.trim() })); const aiBtn = buttons.find(b => b.text?.includes('AI Pass') || b.text?.includes('Run AI')); return { testId: window.__testId, editorLoaded: !!editor, aiButtonUid: aiBtn?.uid, ready: !!editor && !!aiBtn }; }"
   }
   ```
   - **⚠️ Polling required**: If `ready: false`, wait 3 seconds and retry

5. **Verify Page 1 editor loaded**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 1 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror'); const aiButton = document.querySelector('button'); const buttons = Array.from(document.querySelectorAll('button')).map((btn, i) => ({ uid: 'btn-' + i, text: btn.textContent?.trim() })); const aiBtn = buttons.find(b => b.text?.includes('AI Pass') || b.text?.includes('Run AI')); return { testId: window.__testId, editorLoaded: !!editor, aiButtonUid: aiBtn?.uid, ready: !!editor && !!aiBtn }; }"
   }
   ```
   - **⚠️ Polling required**: If `ready: false`, wait 3 seconds and retry

**Success Criteria**:
- [ ] Manuscript found and ID retrieved
- [ ] Page 0 (DEV_BASELINE): Editor loaded, AI button UID found
- [ ] Page 1 (EXP_5): Editor loaded, AI button UID found

---

## Test Suite 1: Start Both AI Passes Concurrently

### Test 1.1: Start AI Pass on Page 0 (Dev Baseline)

**Actions**:

1. **Select Page 0**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```

2. **Record start time**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__aiPassStartTime = Date.now(); return { testId: window.__testId, startTime: window.__aiPassStartTime, timestamp: new Date().toISOString() }; }"
   }
   ```

3. **Click Run AI Pass**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   ```json
   { "uid": "{aiButtonUid_from_page0_setup}" }
   ```

4. **Verify started**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog, [class*=\"loading\"]'); return { testId: window.__testId, dialogFound: !!dialog, started: !!dialog }; }"
   }
   ```
   - **⚠️ Polling required**: If `started: false`, wait 2 seconds and retry

**Success Criteria**:
- [ ] Page 0 AI Pass started: `started: true`

---

### Test 1.2: Start AI Pass on Page 1 (Exp 5)

**Actions**:

1. **Select Page 1**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 1 }
   ```

2. **Record start time**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__aiPassStartTime = Date.now(); return { testId: window.__testId, startTime: window.__aiPassStartTime, timestamp: new Date().toISOString() }; }"
   }
   ```

3. **Click Run AI Pass**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   ```json
   { "uid": "{aiButtonUid_from_page1_setup}" }
   ```

4. **Verify started**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog, [class*=\"loading\"]'); return { testId: window.__testId, dialogFound: !!dialog, started: !!dialog }; }"
   }
   ```
   - **⚠️ Polling required**: If `started: false`, wait 2 seconds and retry

**Success Criteria**:
- [ ] Page 1 AI Pass started: `started: true`

---

## Test Suite 2: Monitor Both AI Passes in Parallel

### Test 2.1: Poll Both Pages for Completion

**Actions** (Repeat every 30-60 seconds until both complete):

1. **Check Page 0 status**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog'); const isComplete = !dialog && suggestions.length > 0; const elapsedTime = window.__aiPassStartTime ? Math.floor((Date.now() - window.__aiPassStartTime) / 1000) : 0; const errors = (window.__fetchErrors || []).filter(e => e.timestamp > (window.__aiPassStartTime || 0)); const consoleErrors = (window.__testLogs?.critical || []).filter(l => l.level === 'error' && l.timestamp > (window.__aiPassStartTime || 0)); return { testId: window.__testId, isComplete, suggestionCount: suggestions.length, dialogVisible: !!dialog, elapsedSeconds: elapsedTime, elapsedMinutes: Math.floor(elapsedTime / 60), networkErrors: errors.length, consoleErrors: consoleErrors.length }; }"
   }
   ```

2. **Check Page 1 status**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 1 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog'); const isComplete = !dialog && suggestions.length > 0; const elapsedTime = window.__aiPassStartTime ? Math.floor((Date.now() - window.__aiPassStartTime) / 1000) : 0; const errors = (window.__fetchErrors || []).filter(e => e.timestamp > (window.__aiPassStartTime || 0)); const consoleErrors = (window.__testLogs?.critical || []).filter(l => l.level === 'error' && l.timestamp > (window.__aiPassStartTime || 0)); return { testId: window.__testId, isComplete, suggestionCount: suggestions.length, dialogVisible: !!dialog, elapsedSeconds: elapsedTime, elapsedMinutes: Math.floor(elapsedTime / 60), networkErrors: errors.length, consoleErrors: consoleErrors.length }; }"
   }
   ```

3. **Determine if both complete**
   - Continue polling until BOTH pages show `isComplete: true` OR timeout (25 minutes max)
   - **⚠️ Polling required**: Consult user on polling interval (recommend 30-60 seconds)

**Success Criteria**:
- [ ] Both pages monitored successfully
- [ ] Progress tracked for both tests

---

## ✅ CHECKPOINT 1: Both AI Passes Status

**Pass Criteria**:
- [ ] Page 0 (DEV_BASELINE): Status determined (complete, timeout, or crashed)
- [ ] Page 1 (EXP_5): Status determined (complete, timeout, or crashed)
- [ ] Elapsed times recorded for both
- [ ] Error counts documented for both

**If ALL PASS**: Continue to Final Report ✅
**If FAIL**: Document failure reasons and proceed to Final Report

---

## Test Suite 3: Final Results & Comparison

### Test 3.1: Get Page 0 Final Results

**Actions**:

1. **Select Page 0**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```

2. **Get final metrics**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const endTime = Date.now(); const totalSeconds = window.__aiPassStartTime ? Math.floor((endTime - window.__aiPassStartTime) / 1000) : 0; const totalMinutes = (totalSeconds / 60).toFixed(1); const errors = window.__fetchErrors || []; const consoleErrors = (window.__testLogs?.critical || []).filter(l => l.level === 'error'); const memoryInfo = (performance as any).memory; const crashed = !document.querySelector('.ProseMirror'); return { testId: window.__testId, suggestionCount: suggestions.length, totalSeconds, totalMinutes, networkErrorCount: errors.length, rateLimits429: errors.filter(e => e.status === 429).length, consoleErrorCount: consoleErrors.length, memoryUsed: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB' : 'unknown', crashed, success: suggestions.length > 0 && totalSeconds > 0 }; }"
   }
   ```

**Success Criteria**:
- [ ] Page 0 metrics captured

---

### Test 3.2: Get Page 1 Final Results

**Actions**:

1. **Select Page 1**
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 1 }
   ```

2. **Get final metrics**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const endTime = Date.now(); const totalSeconds = window.__aiPassStartTime ? Math.floor((endTime - window.__aiPassStartTime) / 1000) : 0; const totalMinutes = (totalSeconds / 60).toFixed(1); const errors = window.__fetchErrors || []; const consoleErrors = (window.__testLogs?.critical || []).filter(l => l.level === 'error'); const memoryInfo = (performance as any).memory; const crashed = !document.querySelector('.ProseMirror'); return { testId: window.__testId, suggestionCount: suggestions.length, totalSeconds, totalMinutes, networkErrorCount: errors.length, rateLimits429: errors.filter(e => e.status === 429).length, consoleErrorCount: consoleErrors.length, memoryUsed: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB' : 'unknown', crashed, success: suggestions.length > 0 && totalSeconds > 0 }; }"
   }
   ```

**Success Criteria**:
- [ ] Page 1 metrics captured

---

### Test 3.3: Generate Comparison Report

**Actions**:

1. **Generate side-by-side comparison** (run on Page 0)
   - **MCP Tool**: `mcp__chrome-devtools__select_page`
   ```json
   { "pageIdx": 0 }
   ```
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const report = { testDate: new Date().toISOString(), document: 'Knights of Mairia_LG_Edit (85K words, ~488K chars)', testDocument: 'UAT-LARGE-DOC-PARALLEL-TEST.md', configurations: { devBaseline: { config: 'chunkSize: 20, BATCH_SIZE: 5', port: 8080, worktree: 'manuscript-ballast' }, exp5: { config: 'chunkSize: 20, BATCH_SIZE: 10', port: 8081, worktree: 'ballast-exp-batch10v2' } }, results: '<<TO_BE_FILLED_WITH_BOTH_METRICS>>', comparison: 'Results will be compared in final step', notes: 'Both tests run concurrently on same 85K document' }; console.log('=== PARALLEL TEST COMPARISON REPORT ==='); console.table(report); return report; }"
   }
   ```

**Success Criteria**:
- [ ] Comparison report generated
- [ ] Results from both tests documented

---

## Cleanup: Close All Pages & Stop Servers

### Cleanup 1: Close Browser Pages

**Actions**:

1. **Close Page 1**
   - **MCP Tool**: `mcp__chrome-devtools__close_page`
   ```json
   { "pageIdx": 1 }
   ```

2. **Close Page 0**
   - **MCP Tool**: `mcp__chrome-devtools__close_page`
   ```json
   { "pageIdx": 0 }
   ```

**Success Criteria**:
- [ ] Both pages closed

---

### Cleanup 2: Stop Both Servers

**Actions**:

1. **Stop both dev servers**
   - **Bash Command**:
   ```bash
   pkill -f "vite.*8080" || pkill -f "PORT=8080"
   pkill -f "vite.*8081" || pkill -f "PORT=8081"
   ```

2. **Verify ports freed**
   - **Bash Command**:
   ```bash
   lsof -ti:8080 && echo "Port 8080 still in use ❌" || echo "Port 8080 freed ✅"
   lsof -ti:8081 && echo "Port 8081 still in use ❌" || echo "Port 8081 freed ✅"
   ```

**Success Criteria**:
- [ ] Port 8080 freed ✅
- [ ] Port 8081 freed ✅

---

## Test Execution Checklist

### Pre-Test
- [ ] All servers stopped
- [ ] Browser closed
- [ ] Exp 5 worktree exists

### During Test
- [ ] Setup 0: Both servers started
- [ ] Setup 1: Both pages opened, interceptors installed
- [ ] Setup 2: Both navigated to LARGE document
- [ ] Test 1.1: Page 0 AI Pass started
- [ ] Test 1.2: Page 1 AI Pass started
- [ ] Test 2.1: Both monitored in parallel
- [ ] Checkpoint 1: Both statuses determined
- [ ] Test 3.1: Page 0 final results
- [ ] Test 3.2: Page 1 final results
- [ ] Test 3.3: Comparison generated

### Post-Test
- [ ] Cleanup 1: Pages closed
- [ ] Cleanup 2: Servers stopped

---

## Expected Results

**Based on Round 2 Testing (61K document)**:
- **Dev Baseline** (chunk:20/batch:5): 863.1s (14.4 min)
- **Exp 5** (chunk:20/batch:10): 831.2s (13.9 min) - 3.7% faster

**For 85K document**:
- **Expected**: Both likely to timeout or crash (exceeds TipTap Pro limits)
- **If successful**: Exp 5 should be ~3-4% faster than Dev Baseline
- **Purpose**: Establish if batch size alone helps with larger documents

---

## Quick Command Reference

### Manual Status Check Commands

```javascript
// Check which test (paste in console)
console.log('Test ID:', window.__testId);

// Check progress
const elapsed = window.__aiPassStartTime ? Math.floor((Date.now() - window.__aiPassStartTime) / 1000) : 0;
console.log('Elapsed:', Math.floor(elapsed / 60), 'min', elapsed % 60, 'sec');

// Check suggestions
const editor = window.__editor || document.querySelector('.ProseMirror')?.__editor;
const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || [];
console.log('Suggestions:', suggestions.length);

// Check if complete
const dialog = document.querySelector('[role="dialog"]');
console.log('Complete:', !dialog && suggestions.length > 0);
```

### Enhanced Logging System (Token-Efficient)

```javascript
// Get all test logs (structured summary)
window.getTestLogs();
// Returns: { criticalCount, critical[], recentCount, recent[], fetchErrorCount, fetchErrors[] }

// Get just critical logs (errors + milestones)
window.__testLogs.critical;

// Get milestone log (e.g., completion time)
window.__testLogs.critical.find(l => l.message.includes('Complete:'));

// Get all errors
window.__testLogs.critical.filter(l => l.level === 'error');

// Get recent 50 logs
window.__testLogs.recent;
```

**Why this is token-efficient:**
- `window.__testLogs.critical` typically returns 10-50 logs (~500-2000 tokens)
- Native `mcp__chrome-devtools__list_console_messages` returns 1.7M tokens (unusable)
- Critical logs never get lost in circular buffer (unlimited storage)
- Milestone logs like "Complete: X suggestions" are always captured

---

## Tags

#UAT #testing #parallel_test #large_document #85K_words #dev_baseline #exp5 #batch_size #comparison #performance #token_optimized #chrome_devtools

---

**Last Updated**: October 7, 2025 - Enhanced logging interceptor (token-efficient, critical logs never lost)
**Status**: Ready for execution
**Estimated Time**: 25-35 minutes (concurrent execution, up to 25min for AI Passes)
