# AI Suggestions + Snapshots Integration: UAT Testing Protocol (SIMPLE)

**Purpose**: Validate that snapshots correctly save and restore AI suggestions
**Prerequisites**: Implementation of IMPLEMENTATION_PLAN.md complete
**Testing Method**: Automated via chrome-devtools MCP (Simple Version)
**Last Updated**: 2025-01-07

---

## ⚠️ CRITICAL: TOKEN OVERFLOW DETECTION

**THIS DOCUMENT USES NATIVE `list_console_messages` - MAY CAUSE TOKEN OVERFLOW**

### 🚨 IF YOU SEE TOKEN OVERFLOW (25K+ tokens in response):

1. **STOP IMMEDIATELY** - Do not continue with this document
2. **Mark deprecated** - Add `❌ DEPRECATED - TOKEN OVERFLOW` to title
3. **Switch to optimized version**: Use `UAT.md` instead
4. **Document failure** - Note when/where overflow occurred in comments
5. **Never use again** - Always use optimized version for future tests

**Why this might overflow**: Large documents with 5K+ suggestions generate extensive console logs that exceed token limits.

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__list_console_messages` ⚠️ (OVERFLOW RISK)
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__wait_for` ⚠️ (OVERFLOW RISK - includes snapshot)

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

### Setup 1: Navigate to Application

**Actions**:
1. **Navigate to app**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   - **URL**: `http://localhost:8080`
   - **Verify**: Page loads, no console errors

2. **Verify login state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const user = localStorage.getItem('supabase.auth.token');
       return { isLoggedIn: !!user };
     })()
     ```
   - **Expected**: `{ isLoggedIn: true }`

**Success Criteria**:
- [ ] Application loaded at localhost:8080
- [ ] User is logged in
- [ ] No console errors

---

### Setup 2: Select Test Manuscript

**Actions**:
1. **Get manuscript list**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const cards = Array.from(document.querySelectorAll('[data-testid*="manuscript"]'));
       return cards.map((c, i) => ({
         index: i,
         title: c.querySelector('h3')?.textContent,
         excerpt: c.querySelector('p')?.textContent?.slice(0, 50)
       }));
     })()
     ```

2. **Select first manuscript**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: First manuscript card

3. **Wait for editor to load**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const editor = document.querySelector('[role="textbox"]');
       const content = editor?.textContent || '';
       return {
         loaded: !!editor,
         hasContent: content.length > 0,
         wordCount: content.split(/\s+/).length
       };
     })()
     ```

**Success Criteria**:
- [ ] Manuscript list displayed
- [ ] Manuscript opened successfully
- [ ] Editor loaded with content
- [ ] Word count > 0

---

## Test Suite 1: Save Snapshot with AI Suggestions

### Test 1.1: Run AI Pass and Generate Suggestions

**Actions**:
1. **Click "Run AI Pass" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with text "Run AI Pass"

2. **Wait for AI processing to complete** (may take 2-20 minutes)
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script` (poll every 5 seconds)
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const isLoading = storage?.isLoading || false;
       const suggestions = storage?.getSuggestions?.() || [];
       return {
         isLoading,
         suggestionCount: suggestions.length,
         complete: !isLoading && suggestions.length > 0
       };
     })()
     ```
   - **Poll until**: `complete: true` OR timeout after 30 minutes

3. **Check console logs** ⭐ **(OVERFLOW RISK POINT)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT.md`
   - **Look for**:
     - `✅ Complete: X suggestions in Xms`
     - `📝 Converting X AI suggestions to UI format`
   - **No errors**: Should not see `❌` or `Error:` messages

**Success Criteria**:
- [ ] AI pass completed (not loading)
- [ ] Suggestions count > 0
- [ ] Console shows completion message
- [ ] No errors in console
- [ ] Suggestions visible in ChangeList sidebar
- [ ] **No token overflow** in MCP response

---

### Test 1.2: Save Snapshot with Suggestions

**Actions**:
1. **Click "Save" button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with Save icon (floppy disk)

2. **Wait for snapshot creation**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       return {
         toastVisible: !!document.querySelector('[role="alert"]'),
         toastText: document.querySelector('[role="alert"]')?.textContent
       };
     })()
     ```
   - **Expected**: Toast shows "Snapshot created"

3. **Check console for snapshot creation** ⭐ **(OVERFLOW RISK POINT)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT.md`
   - **Look for**:
     - `📸 Capturing X AI suggestions with snapshot`
     - `✅ Snapshot created: v1 (manual)` with `suggestionCount: X`

4. **Verify database state**
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
         metadataSuggestionCount: latestSnapshot?.metadata?.suggestionCount
       };
     })()
     ```

**Success Criteria**:
- [ ] Toast notification appeared
- [ ] Console shows snapshot creation with suggestion count
- [ ] Database has new snapshot
- [ ] Snapshot contains `aiSuggestions` array
- [ ] `suggestionCount` in metadata matches array length
- [ ] **No token overflow** in MCP responses

---

## ✅ CHECKPOINT 1: Snapshot Creation

**Pass Criteria**:
- AI suggestions generated (Test 1.1 ✅)
- Snapshot saved with suggestions (Test 1.2 ✅)
- Database state verified
- No token overflow

**If PASS**: Continue to Test Suite 2 ✅
**If FAIL**: Review console logs, check implementation, fix issues before proceeding
**If TOKEN OVERFLOW**: Switch to `UAT.md` immediately

---

## Test Suite 2: Restore Snapshot with AI Suggestions

### Test 2.1: Modify Document State

**Actions**:
1. **Clear all suggestions** (simulate user accepting/rejecting all)
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
       return { suggestionCount: suggestions.length };
     })()
     ```
   - **Expected**: `{ suggestionCount: 0 }`

**Success Criteria**:
- [ ] Suggestions cleared successfully
- [ ] ChangeList sidebar empty
- [ ] No console errors

---

### Test 2.2: Open Version History

**Actions**:
1. **Click Version History button**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with History icon (clock)

2. **Wait for version history sheet to open**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const sheet = document.querySelector('[role="dialog"]');
       const snapshots = Array.from(sheet?.querySelectorAll('[data-snapshot-version]') || []);
       return {
         isOpen: !!sheet,
         snapshotCount: snapshots.length,
         snapshots: snapshots.map(s => ({
           version: s.dataset.snapshotVersion,
           hasSuggestionBadge: !!s.querySelector('[data-suggestion-count]')
         }))
       };
     })()
     ```

**Success Criteria**:
- [ ] Version history sheet opened
- [ ] At least one snapshot visible
- [ ] Snapshot has suggestion count badge
- [ ] Badge shows correct count (from Test 1.2)

---

### Test 2.3: Restore Snapshot

**Actions**:
1. **Click "Restore" button on latest snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Button with text "Restore" in first snapshot row

2. **Confirm restoration in dialog**
   - **Note**: Browser native confirm dialog - may need to handle
   - **MCP Tool**: Handle confirmation (or use evaluate_script to auto-confirm)

3. **Wait for restoration to complete**
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

4. **Check console for restoration logs** ⭐ **(OVERFLOW RISK POINT)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **🚨 IF THIS OVERFLOWS**: Document overflow point, switch to `UAT.md` for next run
   - **Look for**:
     - `✅ Restored X AI suggestions`
     - `✅ Restored to version 1` with `suggestionsRestored: X`

**Success Criteria**:
- [ ] Restoration completed
- [ ] Suggestions count matches original (from Test 1.1)
- [ ] Console shows restoration success
- [ ] No errors during restoration
- [ ] **No token overflow** (if overflow, note for future tests)

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
         firstSuggestion: changeCards[0] ? {
           id: changeCards[0].dataset.suggestionId,
           text: changeCards[0].textContent?.slice(0, 100)
         } : null
       };
     })()
     ```

2. **Verify editor has suggestion highlights**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const highlights = document.querySelectorAll('[data-ai-suggestion]');
       return {
         highlightCount: highlights.length,
         hasHighlights: highlights.length > 0
       };
     })()
     ```

3. **Test suggestion interaction**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: First suggestion in ChangeList
   - **Expected**: Suggestion scrolls into view, popover appears

**Success Criteria**:
- [ ] ChangeList shows restored suggestions
- [ ] Editor has visual highlights for suggestions
- [ ] Suggestions are clickable and interactive
- [ ] Suggestion count matches saved snapshot

---

## ✅ CHECKPOINT 2: Snapshot Restoration

**Pass Criteria**:
- Snapshot restored successfully (Test 2.3 ✅)
- Suggestions restored to editor (Test 2.4 ✅)
- UI correctly displays suggestions
- No errors or token overflow

**If PASS**: Continue to Test Suite 3 ✅
**If FAIL**: Review restoration logic, check console errors
**If TOKEN OVERFLOW**: Mark this UAT as deprecated, use `UAT.md` only

---

## Test Suite 3: Edge Cases

### Test 3.1: Save Snapshot without AI Suggestions

**Actions**:
1. **Clear all suggestions**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const editor = window.editorInstance;
       editor?.commands?.setAiSuggestions([]);
       return { cleared: true };
     })()
     ```

2. **Save snapshot**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Save button

3. **Check console** ⭐ **(OVERFLOW RISK POINT)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **Look for**: `📸 No AI suggestions found`
   - **Should show**: `suggestionCount: 0`

4. **Verify database**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**: (Same database query from Test 1.2)
   - **Expected**: Latest snapshot has `suggestionCount: 0` or `aiSuggestions: undefined`

**Success Criteria**:
- [ ] Snapshot created without suggestions
- [ ] Console shows "No AI suggestions found"
- [ ] Database snapshot has 0 or undefined suggestions
- [ ] No errors

---

### Test 3.2: Restore Snapshot without AI Suggestions

**Actions**:
1. **Restore snapshot from Test 3.1**
   - **MCP Tool**: `mcp__chrome-devtools__click`
   - **Selector**: Restore button on latest snapshot

2. **Check console** ⭐ **(OVERFLOW RISK POINT)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **Look for**: `ℹ️ No AI suggestions to restore`

3. **Verify no suggestions loaded**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   - **Script**:
     ```javascript
     (function() {
       const storage = window.editorInstance?.extensionStorage?.aiSuggestion;
       const suggestions = storage?.getSuggestions?.() || [];
       return { suggestionCount: suggestions.length };
     })()
     ```
   - **Expected**: `{ suggestionCount: 0 }`

**Success Criteria**:
- [ ] Restoration completed successfully
- [ ] Console shows "No AI suggestions to restore"
- [ ] ChangeList is empty
- [ ] No errors

---

## ✅ CHECKPOINT 3: Edge Cases

**Pass Criteria**:
- Snapshots without suggestions work correctly (Test 3.1-3.2 ✅)
- Graceful handling of empty suggestion arrays
- No errors

**If PASS**: Continue to Final Verification ✅
**If FAIL**: Review edge case handling in implementation

---

## Final Verification

### Verify Complete Workflow

**Actions**:
1. **Check all console logs** ⭐ **(FINAL OVERFLOW CHECK)**
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`
   - **🚨 IF THIS OVERFLOWS**: Document it, use `UAT.md` for future tests
   - **Review**: All logs from session, verify no unexpected errors

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
         ).length || 0
       };
     })()
     ```

**Success Criteria**:
- [ ] Multiple snapshots exist
- [ ] At least 1 snapshot with suggestions
- [ ] At least 1 snapshot without suggestions
- [ ] No console errors throughout session
- [ ] **No token overflows** (if overflows occurred, mark UAT as deprecated)

---

## Test Execution Checklist

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

- [ ] **Suite 3**: Edge Cases
  - [ ] Test 3.1: Save Snapshot without AI Suggestions
  - [ ] Test 3.2: Restore Snapshot without AI Suggestions
  - [ ] ✅ CHECKPOINT 3: Edge Cases

- [ ] **Final Verification**
  - [ ] Check all console logs
  - [ ] Verify database final state

---

## Final Report Template

```markdown
# UAT Report: AI Suggestions + Snapshots Integration

**Date**: [Date/Time]
**Version**: SIMPLE
**Status**: [PASS / FAIL / DEPRECATED]

## Test Results

### Suite 1: Save Snapshot with AI Suggestions
- Test 1.1: [PASS/FAIL] - AI Pass Generated X suggestions in Y minutes
- Test 1.2: [PASS/FAIL] - Snapshot saved with X suggestions

### Suite 2: Restore Snapshot with AI Suggestions
- Test 2.1: [PASS/FAIL] - Document state modified
- Test 2.2: [PASS/FAIL] - Version history displayed
- Test 2.3: [PASS/FAIL] - Snapshot restored
- Test 2.4: [PASS/FAIL] - Suggestions verified

### Suite 3: Edge Cases
- Test 3.1: [PASS/FAIL] - Snapshot without suggestions
- Test 3.2: [PASS/FAIL] - Restore without suggestions

## Token Overflow Status

- [ ] No token overflows - SIMPLE version is reliable
- [ ] Token overflow occurred at: [Test Number] - DEPRECATED, use UAT.md

## Issues Found

[List any issues, with severity and steps to reproduce]

## Notes

[Additional observations, performance notes, etc.]

## Recommendation

- [ ] Feature ready for production
- [ ] Issues need addressing
- [ ] Use UAT.md for future testing (if overflows occurred)
```

---

## Recovery Procedures

### If Test Fails

1. **Check console errors** - Review all error messages
2. **Verify implementation** - Confirm all steps in IMPLEMENTATION_PLAN.md completed
3. **Check database** - Verify schema supports optional fields
4. **Test manually** - Reproduce issue in browser DevTools
5. **Fix and retry** - Address issue, re-run failed test

### If Token Overflow Occurs

1. **STOP immediately** - Do not continue testing
2. **Update this document** - Add `❌ DEPRECATED - TOKEN OVERFLOW` to title
3. **Note overflow point** - Document which test caused overflow
4. **Switch to UAT.md** - Use token-optimized version
5. **Never use SIMPLE again** - This document becomes historical reference only

---

## Tags
#uat #testing #snapshots #ai-suggestions #simple-version #overflow-risk #automated
