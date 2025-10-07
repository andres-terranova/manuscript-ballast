# UAT: Dev Branch Baseline - LARGE Document Test

**Purpose**: Test current dev branch AI Suggestions performance on 85K word document
**Configuration**: `chunkSize: 20`, `BATCH_SIZE: 5` (Round 1 UAT Winner)
**Testing Method**: Automated via chrome-devtools MCP tools (Token-Optimized)
**Last Updated**: October 6, 2025

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__close_page`

### Implementation Status Check
- [ ] Dev server is stopped (we'll start it in Setup 0)
- [ ] Browser is closed (MCP will open it)
- [ ] Current branch is `dev` or has dev configuration (chunk:20, batch:5)
- [ ] Test manuscript exists: Knights of Mairia_LG_Edit (~85K words, ~488K chars)

---

## Test Environment Setup

### Setup 0: Start Server & Install Interceptors

**Actions**:

1. **Start dev server**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script` (via Bash first)
   - **Bash Command**:
   ```bash
   cd /Users/andresterranova/manuscript-ballast && pnpm run dev
   ```
   - **⚠️ Note**: Wait 5-10 seconds for server to start before navigating

2. **Navigate to app**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

3. **Install console & network interceptors** (CRITICAL - must run before any testing)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__consoleLogs = []; const maxLogs = 50; ['log', 'warn', 'error', 'info'].forEach(level => { const original = console[level]; console[level] = function(...args) { window.__consoleLogs.push({ level: level, message: args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 100) : String(a).slice(0, 100)).join(' '), timestamp: Date.now() }); if (window.__consoleLogs.length > maxLogs) { window.__consoleLogs.shift(); } original.apply(console, args); }; }); window.__fetchErrors = []; const origFetch = window.fetch; window.fetch = async function(...args) { const response = await origFetch.apply(this, args); if (response.status === 429 || response.status >= 500) { window.__fetchErrors.push({ status: response.status, url: args[0], timestamp: Date.now() }); } return response; }; return { consoleInterceptor: 'installed', fetchInterceptor: 'installed', maxConsoleLogs: maxLogs }; }"
   }
   ```

**Success Criteria**:
- [ ] Server started successfully
- [ ] Page loaded at http://localhost:8080
- [ ] Interceptors installed: `{ consoleInterceptor: 'installed', fetchInterceptor: 'installed' }`

---

### Setup 1: Navigate to LARGE Document

**Actions**:

1. **Get manuscript list and find Knights of Mairia**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "async () => { const { supabase } = await import('/src/integrations/supabase/client.js'); const { data, error } = await supabase.from('manuscripts').select('id, title').ilike('title', '%Knights of Mairia%').limit(1); return { found: data?.length > 0, manuscript: data?.[0], error: error?.message }; }"
   }
   ```

2. **Navigate to manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080?manuscript={manuscript_id_from_step_1}" }
   ```
   - **⚠️ Polling required**: Wait 3-5 seconds for editor to load

3. **Verify editor loaded**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror'); const aiButton = document.querySelector('button:has-text(\"Run AI Pass\"), button[aria-label*=\"AI\"]'); return { editorLoaded: !!editor, aiButtonFound: !!aiButton, ready: !!editor && !!aiButton }; }"
   }
   ```
   - **⚠️ Polling required**: If `ready: false`, wait 2-3 seconds and retry

4. **Get Run AI Pass button UID**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const buttons = Array.from(document.querySelectorAll('button')).map((btn, i) => ({ uid: 'btn-' + i, text: btn.textContent?.trim(), ariaLabel: btn.getAttribute('aria-label') })); const aiButton = buttons.find(b => b.text?.includes('AI Pass') || b.text?.includes('Run AI') || b.ariaLabel?.includes('AI')); return { aiButtonUid: aiButton?.uid, allButtons: buttons.slice(0, 10) }; }"
   }
   ```

**Success Criteria**:
- [ ] Manuscript found: `found: true`
- [ ] Editor loaded: `editorLoaded: true`
- [ ] AI button found: `aiButtonUid` present

---

## Test Suite 1: AI Pass Execution on LARGE Document

### Test 1.1: Start AI Pass

**Actions**:

1. **Record start time**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { window.__aiPassStartTime = Date.now(); return { startTime: window.__aiPassStartTime, timestamp: new Date().toISOString() }; }"
   }
   ```

2. **Click Run AI Pass button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   ```json
   { "uid": "{aiButtonUid_from_setup_1}" }
   ```

3. **Verify AI Pass started (wait for loading dialog)**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog, [class*=\"loading\"]'); return { dialogFound: !!dialog, started: !!dialog }; }"
   }
   ```
   - **⚠️ Polling required**: If `started: false`, wait 2-3 seconds and retry (max 3 attempts)

**Success Criteria**:
- [ ] Start time recorded
- [ ] AI Pass button clicked
- [ ] Loading dialog appeared: `dialogFound: true`

---

### Test 1.2: Monitor AI Pass Progress

**Actions**:

1. **Poll for completion status** (repeat every 30-60 seconds)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const dialog = document.querySelector('[role=\"dialog\"], .loading-dialog'); const dialogText = dialog?.textContent || ''; const isComplete = !dialog && suggestions.length > 0; const elapsedTime = window.__aiPassStartTime ? Math.floor((Date.now() - window.__aiPassStartTime) / 1000) : 0; return { isComplete, suggestionCount: suggestions.length, dialogVisible: !!dialog, dialogText: dialogText.slice(0, 100), elapsedSeconds: elapsedTime, elapsedMinutes: Math.floor(elapsedTime / 60) }; }"
   }
   ```
   - **⚠️ Polling required**:
     - If `isComplete: false`, consult user on polling interval (recommend 30-60 seconds for large docs)
     - Continue polling until `isComplete: true` OR timeout (20 minutes max)
     - Monitor `elapsedMinutes` to track progress

2. **Check for errors during processing**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const errors = (window.__fetchErrors || []).filter(e => e.timestamp > (window.__aiPassStartTime || 0)); const consoleErrors = (window.__consoleLogs || []).filter(l => l.level === 'error' && l.timestamp > (window.__aiPassStartTime || 0)); return { networkErrors: errors.length, rateLimits: errors.filter(e => e.status === 429).length, consoleErrors: consoleErrors.length, allClear: errors.length === 0 && consoleErrors.length === 0 }; }"
   }
   ```

**Success Criteria**:
- [ ] Polling completes successfully (either `isComplete: true` OR timeout with clear status)
- [ ] No critical errors: `allClear: true` OR acceptable error count
- [ ] Total time recorded

---

### Test 1.3: Verify Results & Calculate Metrics

**Actions**:

1. **Get final results**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const endTime = Date.now(); const totalSeconds = window.__aiPassStartTime ? Math.floor((endTime - window.__aiPassStartTime) / 1000) : 0; const totalMinutes = (totalSeconds / 60).toFixed(1); const errors = window.__fetchErrors || []; const consoleErrors = (window.__consoleLogs || []).filter(l => l.level === 'error'); return { suggestionCount: suggestions.length, totalSeconds, totalMinutes, networkErrorCount: errors.length, consoleErrorCount: consoleErrors.length, success: suggestions.length > 0 && totalSeconds > 0 }; }"
   }
   ```

2. **Check for browser crash/freeze indicators**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const memoryInfo = (performance as any).memory; const crashed = !document.querySelector('.ProseMirror'); return { crashed, memoryUsed: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB' : 'unknown', memoryLimit: memoryInfo ? Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB' : 'unknown' }; }"
   }
   ```

**Success Criteria**:
- [ ] Results retrieved: `success: true`
- [ ] Suggestions generated: `suggestionCount > 0`
- [ ] No browser crash: `crashed: false`
- [ ] Memory usage within limits

---

## ✅ CHECKPOINT 1: AI Pass Completion Status

**Pass Criteria** (ALL must pass):
- [ ] AI Pass completed (suggestions loaded OR timeout with known cause)
- [ ] Total time recorded accurately
- [ ] Suggestion count retrieved (0+ is acceptable, documents result)
- [ ] No browser crash
- [ ] Error counts documented

**If ALL PASS**: Continue to Final Report ✅
**If FAIL**: Document failure reason and proceed to Final Report with failure status

---

## Final Report Generation

**Actions**:

1. **Generate comprehensive test report**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const editor = document.querySelector('.ProseMirror')?.__editor || window.__editor; const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || []; const endTime = Date.now(); const totalSeconds = window.__aiPassStartTime ? Math.floor((endTime - window.__aiPassStartTime) / 1000) : 0; const totalMinutes = (totalSeconds / 60).toFixed(1); const errors = window.__fetchErrors || []; const consoleErrors = (window.__consoleLogs || []).filter(l => l.level === 'error'); const memoryInfo = (performance as any).memory; const report = { testDate: new Date().toISOString(), configuration: 'dev baseline (chunkSize: 20, BATCH_SIZE: 5)', document: 'Knights of Mairia_LG_Edit (85K words, ~488K chars)', testDocument: 'UAT-DEV-BASELINE-LARGE-DOC.md', results: { suggestionCount: suggestions.length, totalSeconds, totalMinutes: totalMinutes + ' min', networkErrorCount: errors.length, rateLimits429: errors.filter(e => e.status === 429).length, consoleErrorCount: consoleErrors.length, memoryUsed: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB' : 'unknown' }, status: suggestions.length > 0 ? 'SUCCESS' : 'FAILED', notes: suggestions.length === 0 ? 'No suggestions generated - possible timeout or crash' : 'AI Pass completed successfully' }; console.log('=== DEV BASELINE LARGE DOC TEST COMPLETE ==='); console.table(report); return report; }"
   }
   ```

**Success Criteria**:
- [ ] Report generated with all metrics
- [ ] Status determined: `SUCCESS` or `FAILED`
- [ ] All relevant data captured

---

## Cleanup: Close Browser & Stop Server

**Actions**:

1. **Close browser page**
   - **MCP Tool**: `mcp__chrome-devtools__close_page`
   ```json
   { "pageIdx": 0 }
   ```

2. **Stop dev server**
   - **Bash Command**:
   ```bash
   pkill -f "vite.*8080" || pkill -f "pnpm.*dev"
   ```

**Success Criteria**:
- [ ] Browser closed successfully
- [ ] Dev server stopped (port 8080 freed)

---

## Test Execution Checklist

### Pre-Test
- [ ] Dev server stopped
- [ ] Browser closed
- [ ] On dev branch or equivalent configuration

### During Test
- [ ] Setup 0: Interceptors installed
- [ ] Setup 1: Manuscript found and loaded
- [ ] Test 1.1: AI Pass started
- [ ] Test 1.2: Progress monitored (polling)
- [ ] Test 1.3: Results verified
- [ ] Checkpoint 1: All criteria met

### Post-Test
- [ ] Final report generated
- [ ] Browser closed
- [ ] Server stopped

---

## Expected Results

**Based on Prior Testing**:
- **Document**: Knights of Mairia_LG_Edit (85K words, ~488K chars)
- **Configuration**: chunkSize: 20, BATCH_SIZE: 5
- **Expected Outcome**: Likely to **timeout or crash** (85K docs exceed TipTap Pro limits per Round 2 findings)
- **Previous 85K Test**: Exp 8 with chunk:40/batch:10 crashed at 2245 suggestions

**This test establishes baseline for comparison with optimized configurations.**

---

## Quick Command Reference

### Manual Verification Commands (if needed)

```javascript
// Check if AI Pass is running
const dialog = document.querySelector('[role="dialog"]');
console.log('Dialog visible:', !!dialog);

// Check suggestions loaded
const editor = window.__editor || document.querySelector('.ProseMirror')?.__editor;
const suggestions = editor?.storage?.aiSuggestion?.getSuggestions?.() || [];
console.log('Suggestions:', suggestions.length);

// Check elapsed time
const elapsed = window.__aiPassStartTime ? Math.floor((Date.now() - window.__aiPassStartTime) / 1000) : 0;
console.log('Elapsed:', Math.floor(elapsed / 60), 'min', elapsed % 60, 'sec');

// Check for errors
console.log('Network errors:', window.__fetchErrors?.length || 0);
console.log('Console errors:', window.__consoleLogs?.filter(l => l.level === 'error').length || 0);
```

---

## Tags

#UAT #testing #dev_baseline #large_document #85K_words #AI_suggestions #performance #token_optimized #chrome_devtools

---

**Last Updated**: October 6, 2025
**Status**: Ready for execution
**Estimated Time**: 20-30 minutes (includes up to 20min for AI Pass)
