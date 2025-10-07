# AI Suggestions + Snapshots Integration: UAT Testing Protocol (TOKEN-OPTIMIZED)

**Purpose**: Validate that snapshots correctly save and restore AI suggestions
**Prerequisites**: Implementation of IMPLEMENTATION_PLAN.md complete
**Testing Method**: Automated via chrome-devtools MCP (Token-Optimized)
**Last Updated**: 2025-01-07

---

## 🎯 Token Optimization Strategy

**This UAT uses custom interceptors to prevent token overflow**

### Token-Saving Techniques Used:
✅ Console interceptor (limits to 50 messages)
✅ Network error interceptor (captures only failures)
✅ `evaluate_script` polling instead of `wait_for`
✅ No `take_snapshot` or `list_console_messages` calls
✅ Selective logging (only errors and key events)

**Expected Token Usage**: ~5K-15K per test (vs 50K-300K+ for simple version)

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__evaluate_script` ✅ (PRIMARY TOOL)
- ❌ NO `list_console_messages`
- ❌ NO `wait_for`
- ❌ NO `take_snapshot`

### Implementation Status Check
- [ ] Step 1-6 from IMPLEMENTATION_PLAN.md completed
- [ ] Type definitions updated in `snapshotService.ts`
- [ ] `createSnapshot()` captures AI suggestions
- [ ] `restoreSnapshot()` restores AI suggestions
- [ ] VersionHistory UI shows suggestion count
- [ ] Dev server running on port 8080
- [ ] Test manuscript exists with content

### Environment Verification
- [ ] Database accessible
- [ ] TipTap Pro JWT configured
- [ ] OpenAI API key configured in Supabase
- [ ] Browser has no existing errors

---

## Test Environment Setup

### Setup 0: Install Interceptors (REQUIRED FIRST!)

**🚨 CRITICAL**: This must be run BEFORE any other tests!

**Actions**:
1. **Navigate to app**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   - **URL**: `http://localhost:8080`

2. **Install console interceptor**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       // Console interceptor (limits to 50 messages)
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

       // Network error interceptor
       window.__fetchErrors = [];
       const origFetch = window.fetch;
       window.fetch = async function(...args) {
         try {
           const response = await origFetch.apply(this, args);
           if (!response.ok) {
             window.__fetchErrors.push({
               url: String(args[0]).slice(0, 100),
               status: response.status,
               statusText: response.statusText,
               timestamp: Date.now()
             });
           }
           return response;
         } catch (error) {
           window.__fetchErrors.push({
             url: String(args[0]).slice(0, 100),
             error: error.message?.slice(0, 100),
             timestamp: Date.now()
           });
           throw error;
         }
       };

       console.log('🎯 Interceptors installed successfully');
       return { installed: true };
     })()
     ```

3. **Verify installation**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       return {
         consoleInterceptor: Array.isArray(window.__consoleLogs),
         fetchInterceptor: Array.isArray(window.__fetchErrors),
         ready: Array.isArray(window.__consoleLogs) && Array.isArray(window.__fetchErrors)
       };
     })()
     ```
   - **Expected**: `{ consoleInterceptor: true, fetchInterceptor: true, ready: true }`

**Success Criteria**:
- [ ] Interceptors installed successfully
- [ ] Console shows "Interceptors installed successfully"
- [ ] Verification returns `ready: true`

---

### Setup 1: Verify Login State

**Actions**:
1. **Check authentication**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const user = localStorage.getItem('supabase.auth.token');
       return {
         isLoggedIn: !!user,
         timestamp: Date.now()
       };
     })()
     ```
   - **Expected**: `{ isLoggedIn: true }`

**Success Criteria**:
- [ ] User is logged in
- [ ] No errors in interceptor logs

---

### Setup 2: Select Test Manuscript

**Actions**:
1. **Get manuscript list**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const cards = Array.from(document.querySelectorAll('[data-testid*="manuscript"]'));
       return {
         count: cards.length,
         firstTitle: cards[0]?.querySelector('h3')?.textContent?.slice(0, 50),
         hasManuscripts: cards.length > 0
       };
     })()
     ```

2. **Click first manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: First manuscript card

3. **Wait for editor to load** (polling pattern)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script** (poll every 1 second for up to 10 seconds):
     ```javascript
     (function() {
       const editor = document.querySelector('[role="textbox"]');
       const content = editor?.textContent || '';
       return {
         loaded: !!editor,
         hasContent: content.length > 0,
         wordCount: content.split(/\s+/).filter(Boolean).length,
         ready: !!editor && content.length > 0
       };
     })()
     ```
   - **Poll until**: `ready: true`

4. **Check for errors**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       return {
         errorCount: window.__consoleLogs.filter(l => l.level === 'error').length,
         fetchErrors: window.__fetchErrors.length,
         recentLogs: window.__consoleLogs.slice(-5)
       };
     })()
     ```

**Success Criteria**:
- [ ] Manuscript list displayed
- [ ] Manuscript opened successfully
- [ ] Editor loaded with content (wordCount > 0)
- [ ] No errors in interceptor logs

---

## Test Suite 1: Save Snapshot with AI Suggestions

### Test 1.1: Run AI Pass and Generate Suggestions

**Actions**:
1. **Record start state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       return {
         suggestionsBefore: storage?.getSuggestions?.().length || 0,
         isLoading: storage?.isLoading || false,
         timestamp: Date.now()
       };
     })()
     ```

2. **Click "Run AI Pass" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with text "Run AI Pass" or `[data-testid="run-ai-pass"]`

3. **Poll for AI completion** (every 5 seconds, up to 30 minutes)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const isLoading = storage?.isLoading || false;
       const suggestions = storage?.getSuggestions?.() || [];
       const recentLogs = window.__consoleLogs
         .filter(l => l.message.includes('Complete:') || l.message.includes('Converting'))
         .slice(-3);

       return {
         isLoading,
         suggestionCount: suggestions.length,
         complete: !isLoading && suggestions.length > 0,
         recentLogs,
         errorCount: window.__fetchErrors.length,
         timestamp: Date.now()
       };
     })()
     ```
   - **Poll until**: `complete: true` OR timeout after 30 minutes

4. **Verify completion**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       const completionLogs = window.__consoleLogs.filter(l =>
         l.message.includes('Complete:') || l.message.includes('suggestions in')
       );

       return {
         finalCount: suggestions.length,
         completionLogs: completionLogs.slice(-2),
         errors: window.__consoleLogs.filter(l => l.level === 'error'),
         fetchErrors: window.__fetchErrors
       };
     })()
     ```

**Success Criteria**:
- [ ] AI pass completed (isLoading: false)
- [ ] Suggestions count > 0
- [ ] Completion logs show success
- [ ] No errors in interceptors
- [ ] Suggestions visible in ChangeList

---

### Test 1.2: Save Snapshot with Suggestions

**Actions**:
1. **Record pre-save state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       return {
         suggestionCount: suggestions.length,
         timestamp: Date.now()
       };
     })()
     ```

2. **Clear interceptor logs** (fresh slate for snapshot save)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       window.__consoleLogs = [];
       window.__fetchErrors = [];
       return { cleared: true };
     })()
     ```

3. **Click "Save" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with Save icon or `[data-testid="save-snapshot"]`

4. **Poll for snapshot creation** (every 500ms, up to 10 seconds)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const snapshotLogs = window.__consoleLogs.filter(l =>
         l.message.includes('Snapshot created') || l.message.includes('Capturing')
       );
       const toastVisible = !!document.querySelector('[role="alert"]');

       return {
         snapshotLogs,
         toastVisible,
         complete: snapshotLogs.length > 0 || toastVisible,
         errors: window.__consoleLogs.filter(l => l.level === 'error')
       };
     })()
     ```
   - **Poll until**: `complete: true`

5. **Verify database state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (async function() {
       const manuscriptId = window.location.pathname.split('/').pop();
       const { data } = await window.supabase
         .from('manuscripts')
         .select('snapshots')
         .eq('id', manuscriptId)
         .single();

       const latestSnapshot = data?.snapshots?.[data.snapshots.length - 1];
       return {
         hasSnapshots: !!data?.snapshots,
         snapshotCount: data?.snapshots?.length || 0,
         latestVersion: latestSnapshot?.version,
         hasSuggestions: !!latestSnapshot?.aiSuggestions,
         suggestionCount: latestSnapshot?.aiSuggestions?.length || 0,
         metadataSuggestionCount: latestSnapshot?.metadata?.suggestionCount,
         matches: latestSnapshot?.aiSuggestions?.length === latestSnapshot?.metadata?.suggestionCount
       };
     })()
     ```

**Success Criteria**:
- [ ] Toast notification appeared
- [ ] Console logs show snapshot creation
- [ ] Database has new snapshot
- [ ] Snapshot contains `aiSuggestions` array
- [ ] Suggestion count matches metadata
- [ ] No errors in interceptors

---

## ✅ CHECKPOINT 1: Snapshot Creation

**Pass Criteria**:
- AI suggestions generated (Test 1.1 ✅)
- Snapshot saved with suggestions (Test 1.2 ✅)
- Database state verified
- Token usage < 15K

**If PASS**: Continue to Test Suite 2 ✅
**If FAIL**: Review console logs, check implementation

---

## Test Suite 2: Restore Snapshot with AI Suggestions

### Test 2.1: Modify Document State

**Actions**:
1. **Clear all suggestions**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const editor = window.editorInstance;
       if (editor?.commands?.setAiSuggestions) {
         editor.commands.setAiSuggestions([]);
         return { cleared: true };
       }
       return { cleared: false, error: 'Editor not found' };
     })()
     ```

2. **Verify suggestions cleared**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       return {
         suggestionCount: suggestions.length,
         changeListEmpty: document.querySelectorAll('[data-suggestion-id]').length === 0
       };
     })()
     ```

**Success Criteria**:
- [ ] Suggestions cleared (count: 0)
- [ ] ChangeList sidebar empty
- [ ] No errors

---

### Test 2.2: Open Version History

**Actions**:
1. **Clear interceptor logs**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       window.__consoleLogs = [];
       window.__fetchErrors = [];
       return { cleared: true };
     })()
     ```

2. **Click Version History button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with History icon or `[data-testid="version-history"]`

3. **Poll for version history sheet** (every 500ms, up to 5 seconds)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const sheet = document.querySelector('[role="dialog"]');
       const snapshots = Array.from(sheet?.querySelectorAll('[data-snapshot-version]') || []);

       return {
         isOpen: !!sheet,
         snapshotCount: snapshots.length,
         hasSnapshots: snapshots.length > 0,
         firstSnapshot: snapshots[0] ? {
           version: snapshots[0].dataset.snapshotVersion,
           hasSuggestionBadge: !!snapshots[0].textContent?.includes('suggestion')
         } : null
       };
     })()
     ```
   - **Poll until**: `isOpen: true`

**Success Criteria**:
- [ ] Version history sheet opened
- [ ] At least one snapshot visible
- [ ] Snapshot has suggestion count badge
- [ ] Badge shows correct count

---

### Test 2.3: Restore Snapshot

**Actions**:
1. **Clear interceptor logs**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       window.__consoleLogs = [];
       window.__fetchErrors = [];
       return { cleared: true };
     })()
     ```

2. **Auto-confirm restoration dialog** (handle native confirm)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       window.__originalConfirm = window.confirm;
       window.confirm = function() { return true; };
       return { confirmOverridden: true };
     })()
     ```

3. **Click "Restore" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: First "Restore" button in version history

4. **Poll for restoration completion** (every 500ms, up to 10 seconds)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       const restoreLogs = window.__consoleLogs.filter(l =>
         l.message.includes('Restored') || l.message.includes('suggestions')
       );

       return {
         suggestionCount: suggestions.length,
         restored: suggestions.length > 0,
         restoreLogs: restoreLogs.slice(-3),
         errors: window.__consoleLogs.filter(l => l.level === 'error'),
         complete: suggestions.length > 0
       };
     })()
     ```
   - **Poll until**: `complete: true`

5. **Restore original confirm**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       if (window.__originalConfirm) {
         window.confirm = window.__originalConfirm;
         delete window.__originalConfirm;
       }
       return { restored: true };
     })()
     ```

**Success Criteria**:
- [ ] Restoration completed
- [ ] Suggestions count > 0
- [ ] Console logs show restoration success
- [ ] No errors during restoration

---

### Test 2.4: Verify Restored Suggestions

**Actions**:
1. **Check ChangeList sidebar**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const changeCards = document.querySelectorAll('[data-suggestion-id]');
       return {
         visibleSuggestions: changeCards.length,
         hasCards: changeCards.length > 0,
         firstSuggestion: changeCards[0] ? {
           id: changeCards[0].dataset.suggestionId,
           preview: changeCards[0].textContent?.slice(0, 50)
         } : null
       };
     })()
     ```

2. **Verify editor highlights**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const highlights = document.querySelectorAll('[data-ai-suggestion]');
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];

       return {
         highlightCount: highlights.length,
         suggestionCount: suggestions.length,
         hasHighlights: highlights.length > 0,
         countsMatch: highlights.length === suggestions.length
       };
     })()
     ```

3. **Test suggestion interaction**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: First suggestion card in ChangeList

4. **Verify popover appears**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const popover = document.querySelector('[data-suggestion-popover]');
       return {
         popoverVisible: !!popover,
         hasAcceptButton: !!popover?.querySelector('button[data-action="accept"]'),
         hasRejectButton: !!popover?.querySelector('button[data-action="reject"]')
       };
     })()
     ```

**Success Criteria**:
- [ ] ChangeList shows restored suggestions
- [ ] Editor has visual highlights
- [ ] Suggestion count matches saved snapshot
- [ ] Suggestions are clickable
- [ ] Popover appears on click

---

## ✅ CHECKPOINT 2: Snapshot Restoration

**Pass Criteria**:
- Snapshot restored successfully (Test 2.3 ✅)
- Suggestions restored to editor (Test 2.4 ✅)
- UI correctly displays suggestions
- No errors, token usage < 15K

**If PASS**: Continue to Test Suite 3 ✅
**If FAIL**: Review restoration logic

---

## Test Suite 3: Page Refresh & Historical Version Restoration

### Test 3.1: Verify Persistence After Page Refresh

**Purpose**: Confirm that AI suggestions are NOT lost after browser refresh and ARE properly restored from the current snapshot on page load.

**Actions**:
1. **Record current state before refresh**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       return {
         suggestionCountBeforeRefresh: suggestions.length,
         timestamp: Date.now()
       };
     })()
     ```

2. **Refresh the page**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   - **URL**: Current page URL (use `window.location.href`)

3. **Wait for editor to reload** (poll every 1 second, up to 15 seconds)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const editor = document.querySelector('[role="textbox"]');
       const runAIPassButton = document.querySelector('button:has-text("Run AI Pass")');
       return {
         editorLoaded: !!editor,
         hasRunAIPassButton: !!runAIPassButton,
         ready: !!editor && !!runAIPassButton
       };
     })()
     ```
   - **Poll until**: `ready: true`

4. **Verify suggestions restored after refresh**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       const changeCards = document.querySelectorAll('[data-suggestion-id]');
       const highlights = document.querySelectorAll('[data-ai-suggestion]');

       return {
         suggestionCountAfterRefresh: suggestions.length,
         changeListCount: changeCards.length,
         highlightCount: highlights.length,
         suggestionsRestored: suggestions.length > 0,
         decorationsVisible: highlights.length > 0
       };
     })()
     ```

**Success Criteria**:
- [ ] Page refreshed successfully
- [ ] Editor reloaded
- [ ] Suggestions count > 0 after refresh
- [ ] Suggestions visible in ChangeList
- [ ] **CRITICAL**: Suggestions decorated/highlighted in editor

**Expected Behavior**: Since the current snapshot has AI suggestions saved, they should automatically restore when the page loads.

---

### Test 3.2: Restore Historical Version with Suggestions

**Purpose**: Confirm that restoring an older snapshot correctly loads AI suggestions from that specific version.

**Actions**:
1. **Open Version History**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Version History button

2. **Wait for dialog to open**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const dialog = document.querySelector('[role="dialog"]');
       const snapshots = Array.from(dialog?.querySelectorAll('[data-snapshot-version]') || []);
       return {
         dialogOpen: !!dialog,
         snapshotCount: snapshots.length,
         ready: !!dialog && snapshots.length > 0
       };
     })()
     ```

3. **Record snapshot suggestion counts**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const dialog = document.querySelector('[role="dialog"]');
       const snapshots = Array.from(dialog?.querySelectorAll('[data-snapshot-version]') || []);

       return {
         snapshots: snapshots.map(el => ({
           version: el.dataset.snapshotVersion,
           suggestionText: el.textContent.match(/(\d+)\s+suggestion/)?.[1] || '0'
         }))
       };
     })()
     ```

4. **Select a historical version (not current)**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Second "Restore" button (Version N-1)

5. **Handle confirmation dialog**
   - **MCP Tool**: `mcp__chrome-devtools__handle_dialog`
   - **Action**: `accept`

6. **Wait for restoration to complete**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       return {
         suggestionCount: suggestions.length,
         restored: suggestions.length > 0
       };
     })()
     ```

7. **Verify suggestions match historical version**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       const changeCards = document.querySelectorAll('[data-suggestion-id]');
       const highlights = document.querySelectorAll('[data-ai-suggestion]');

       return {
         suggestionCount: suggestions.length,
         changeListCount: changeCards.length,
         highlightCount: highlights.length,
         suggestionsVisible: changeCards.length > 0,
         decorationsVisible: highlights.length > 0,
         countsMatch: suggestions.length === changeCards.length && suggestions.length === highlights.length
       };
     })()
     ```

**Success Criteria**:
- [ ] Version History opened
- [ ] Historical snapshot selected
- [ ] Restoration completed
- [ ] Suggestions count matches historical snapshot
- [ ] **CRITICAL**: Suggestions decorated/highlighted in editor
- [ ] ChangeList shows correct suggestions

---

## Test Suite 4: Edge Cases

### Test 4.1: Save Snapshot without AI Suggestions

**Actions**:
1. **Clear suggestions**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const editor = window.editorInstance;
       editor?.commands?.setAiSuggestions([]);
       window.__consoleLogs = [];
       return { cleared: true };
     })()
     ```

2. **Save snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Save button

3. **Verify snapshot creation**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const logs = window.__consoleLogs.filter(l =>
         l.message.includes('No AI suggestions') || l.message.includes('Snapshot created')
       );
       return {
         logs: logs.slice(-3),
         hasNoSuggestionsLog: logs.some(l => l.message.includes('No AI suggestions'))
       };
     })()
     ```

4. **Verify database**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (async function() {
       const manuscriptId = window.location.pathname.split('/').pop();
       const { data } = await window.supabase
         .from('manuscripts')
         .select('snapshots')
         .eq('id', manuscriptId)
         .single();

       const latestSnapshot = data?.snapshots?.[data.snapshots.length - 1];
       return {
         suggestionCount: latestSnapshot?.metadata?.suggestionCount || 0,
         hasSuggestionsArray: !!latestSnapshot?.aiSuggestions,
         isEmpty: !latestSnapshot?.aiSuggestions || latestSnapshot.aiSuggestions.length === 0
       };
     })()
     ```

**Success Criteria**:
- [ ] Snapshot created without suggestions
- [ ] Console shows "No AI suggestions found"
- [ ] Database snapshot has suggestionCount: 0
- [ ] No errors

---

### Test 4.2: Restore Snapshot without AI Suggestions

**Actions**:
1. **Clear logs and restore**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       window.__consoleLogs = [];
       window.confirm = () => true;
       return { ready: true };
     })()
     ```

2. **Click restore on empty snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Restore button on latest snapshot

3. **Verify restoration**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       const logs = window.__consoleLogs.filter(l =>
         l.message.includes('No AI suggestions to restore') || l.message.includes('Restored')
       );

       return {
         suggestionCount: suggestions.length,
         hasNoRestoreLog: logs.some(l => l.message.includes('No AI suggestions to restore')),
         changeListEmpty: document.querySelectorAll('[data-suggestion-id]').length === 0,
         errors: window.__consoleLogs.filter(l => l.level === 'error')
       };
     })()
     ```

**Success Criteria**:
- [ ] Restoration completed
- [ ] Console shows "No AI suggestions to restore"
- [ ] ChangeList is empty
- [ ] No errors

---

## ✅ CHECKPOINT 3: Page Refresh & Historical Versions

**Pass Criteria**:
- Page refresh restores suggestions (Test 3.1 ✅)
- Historical version restore works (Test 3.2 ✅)
- **CRITICAL**: Suggestions decorated in editor after both operations
- No errors

**If PASS**: Continue to Test Suite 4 ✅
**If FAIL**: Review snapshot restoration on page load

---

## ✅ CHECKPOINT 4: Edge Cases

**Pass Criteria**:
- Snapshots without suggestions work (Test 4.1-4.2 ✅)
- Graceful handling of empty arrays
- No errors

**If PASS**: Continue to Final Verification ✅
**If FAIL**: Review edge case handling

---

## Final Verification

### Verify Complete Workflow

**Actions**:
1. **Get final interceptor summary**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const errors = window.__consoleLogs.filter(l => l.level === 'error');
       const warnings = window.__consoleLogs.filter(l => l.level === 'warn');
       const keyEvents = window.__consoleLogs.filter(l =>
         l.message.includes('Capturing') ||
         l.message.includes('Restored') ||
         l.message.includes('Complete:')
       );

       return {
         totalLogs: window.__consoleLogs.length,
         errorCount: errors.length,
         warningCount: warnings.length,
         fetchErrorCount: window.__fetchErrors.length,
         keyEvents: keyEvents.map(e => ({
           level: e.level,
           message: e.message,
           timestamp: e.timestamp
         })),
         errors: errors,
         fetchErrors: window.__fetchErrors
       };
     })()
     ```

2. **Database final state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (async function() {
       const manuscriptId = window.location.pathname.split('/').pop();
       const { data } = await window.supabase
         .from('manuscripts')
         .select('snapshots')
         .eq('id', manuscriptId)
         .single();

       return {
         totalSnapshots: data?.snapshots?.length || 0,
         snapshotsWithSuggestions: data?.snapshots?.filter(s =>
           s.aiSuggestions && s.aiSuggestions.length > 0
         ).length || 0,
         snapshotsWithoutSuggestions: data?.snapshots?.filter(s =>
           !s.aiSuggestions || s.aiSuggestions.length === 0
         ).length || 0,
         allSnapshotVersions: data?.snapshots?.map(s => ({
           version: s.version,
           suggestionCount: s.metadata?.suggestionCount || 0
         })) || []
       };
     })()
     ```

**Success Criteria**:
- [ ] Multiple snapshots exist
- [ ] At least 1 snapshot with suggestions
- [ ] At least 1 snapshot without suggestions
- [ ] No console errors
- [ ] No fetch errors
- [ ] Token usage < 20K for entire session

---

## Test Execution Checklist

- [ ] **Setup 0**: Install Interceptors (REQUIRED FIRST!)
- [ ] **Setup 1**: Verify Login State
- [ ] **Setup 2**: Select Test Manuscript

- [ ] **Suite 1**: Save Snapshot with AI Suggestions
  - [ ] Test 1.1: Run AI Pass and Generate Suggestions
  - [ ] Test 1.2: Save Snapshot with Suggestions
  - [ ] ✅ CHECKPOINT 1: Snapshot Creation

- [ ] **Suite 2**: Restore Snapshot with AI Suggestions
  - [ ] Test 2.1: Modify Document State
  - [ ] Test 2.2: Open Version History
  - [ ] Test 2.3: Restore Snapshot
  - [ ] Test 2.4: Verify Restored Suggestions
  - [ ] ✅ CHECKPOINT 2: Snapshot Restoration

- [ ] **Suite 3**: Page Refresh & Historical Version Restoration
  - [ ] Test 3.1: Verify Persistence After Page Refresh
  - [ ] Test 3.2: Restore Historical Version with Suggestions
  - [ ] ✅ CHECKPOINT 3: Page Refresh & Historical Versions

- [ ] **Suite 4**: Edge Cases
  - [ ] Test 4.1: Save Snapshot without AI Suggestions
  - [ ] Test 4.2: Restore Snapshot without AI Suggestions
  - [ ] ✅ CHECKPOINT 4: Edge Cases

- [ ] **Final Verification**
  - [ ] Get final interceptor summary
  - [ ] Verify database final state

---

## Final Report Template

```markdown
# UAT Report: AI Suggestions + Snapshots Integration

**Date**: [Date/Time]
**Version**: TOKEN-OPTIMIZED
**Status**: [PASS / FAIL]
**Total Token Usage**: ~[X]K tokens

## Test Results

### Suite 1: Save Snapshot with AI Suggestions
- Test 1.1: [PASS/FAIL] - AI Pass Generated X suggestions in Y minutes
- Test 1.2: [PASS/FAIL] - Snapshot saved with X suggestions

### Suite 2: Restore Snapshot with AI Suggestions
- Test 2.1: [PASS/FAIL] - Document state modified
- Test 2.2: [PASS/FAIL] - Version history displayed
- Test 2.3: [PASS/FAIL] - Snapshot restored
- Test 2.4: [PASS/FAIL] - Suggestions verified

### Suite 3: Page Refresh & Historical Version Restoration
- Test 3.1: [PASS/FAIL] - Page refresh persistence
- Test 3.2: [PASS/FAIL] - Historical version restore

### Suite 4: Edge Cases
- Test 4.1: [PASS/FAIL] - Snapshot without suggestions
- Test 4.2: [PASS/FAIL] - Restore without suggestions

## Performance Metrics

- AI Pass Duration: [X] minutes
- Total Test Duration: [Y] minutes
- Token Usage: [Z]K tokens
- Intercepted Errors: [N] (detail below)
- Fetch Errors: [M] (detail below)

## Issues Found

[List any issues, with severity and steps to reproduce]

## Console Errors

[List any error messages from interceptors]

## Fetch Errors

[List any network errors from interceptors]

## Database State

- Total Snapshots: [N]
- With Suggestions: [X]
- Without Suggestions: [Y]

## Notes

[Additional observations, performance notes, etc.]

## Recommendation

- [ ] Feature ready for production
- [ ] Issues need addressing
- [ ] Performance acceptable
```

---

## Recovery Procedures

### If Test Fails

1. **Check interceptor logs** - Review `window.__consoleLogs` and `window.__fetchErrors`
2. **Verify implementation** - Confirm IMPLEMENTATION_PLAN.md steps complete
3. **Check database** - Verify schema and data integrity
4. **Test manually** - Reproduce in browser DevTools
5. **Fix and retry** - Address issue, re-run from checkpoint

### If Interceptors Not Working

1. **Verify installation** - Check Setup 0 completed
2. **Re-install interceptors** - Run Setup 0 again
3. **Check for conflicts** - Other extensions may interfere
4. **Manual verification** - Use browser DevTools console directly

---

## Tags
#uat #testing #snapshots #ai-suggestions #token-optimized #automated #production-ready
