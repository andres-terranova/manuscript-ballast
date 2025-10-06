# UAT: Virtualized AI Suggestion Rendering

## Test Environment
- **URL**: [Staging/Test environment URL]
- **Test Data**: Use pre-loaded manuscripts:
  - Small: 1,000 words (~250 suggestions)
  - Medium: 30,000 words (~2,500 suggestions)
  - Large: 85,000 words (~5,000 suggestions)
  - Extra Large: 100,000 words (~12,000 suggestions - stress test)
- **Prerequisites**:
  - Browser DevTools open (Performance & Memory tabs)
  - Fresh browser session (clear cache)
  - Close other browser tabs for accurate memory readings

## Pre-Test Checklist
- [ ] Verify feature flag `virtualizedSuggestions` is enabled
- [ ] Confirm test manuscripts are loaded in database
- [ ] Clear browser cache and restart
- [ ] Open Chrome DevTools → Performance tab

---

## Test Scenarios

### Scenario 1: [Happy Path - Large Document Initial Load]
**Objective**: Verify virtualized rendering eliminates freeze on large documents

**Steps**:
1. Navigate to Editor page for Large test manuscript (85K words)
2. Click "Run AI Pass"
3. Select at least one AI editor role
4. Click "Run AI Pass (1 role)"
5. Wait for AI processing to complete
6. **Start Performance Recording** in DevTools
7. Observe initial suggestion rendering
8. **Stop Performance Recording**
9. Check DevTools Performance tab → Main thread activity
10. Check Memory usage in Task Manager/Activity Monitor

**Expected Results**:
- ✅ AI processing completes successfully (~15-20 min)
- ✅ First 500 suggestions load immediately (<500ms)
- ✅ **NO browser freeze** (Main thread responsive)
- ✅ Suggestions visible in editor and ChangeList
- ✅ Memory usage <500 MB (was 1,575 MB before virtualization)
- ✅ Loading indicator shows "Loading suggestions..." during progressive load
- ✅ All 5,000+ suggestions eventually loaded in batches

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 2: [Viewport-Based Decoration Rendering]
**Objective**: Verify only viewport-visible suggestions render decorations

**Steps**:
1. Load Large test manuscript with 5,000 suggestions (from Scenario 1)
2. Open Browser DevTools → Elements tab
3. Inspect editor content area
4. Count suggestion decorations in DOM (look for `.suggest-replace`, `.suggest-delete` classes)
5. Scroll down in editor 3 full pages
6. Re-inspect DOM and count decorations again
7. Note: Total decorations should remain ~50-100 (not 5,000)

**Expected Results**:
- ✅ Initial render shows ~50-100 decorations (viewport + overscan area)
- ✅ After scrolling, decoration count remains ~50-100 (not 5,000)
- ✅ Decorations update smoothly as viewport changes
- ✅ No visual flicker or jank during scroll
- ✅ Suggestions remain clickable and interactive

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 3: [Progressive Loading UX]
**Objective**: Verify progressive suggestion loading works as expected

**Steps**:
1. Load Extra Large test manuscript (100K words, ~12,000 suggestions)
2. Run AI Pass and wait for completion
3. Observe ChangeList panel - should show first 500 suggestions
4. Scroll to bottom of ChangeList
5. Observe "Loading more suggestions..." indicator
6. Wait for next batch to load (500 more)
7. Repeat scrolling until all suggestions loaded
8. Verify final count matches expected total

**Expected Results**:
- ✅ First 500 suggestions load immediately (<1 second)
- ✅ Loading indicator appears when approaching bottom of list
- ✅ Next 500 suggestions load within 200ms
- ✅ No browser freeze during batch loading
- ✅ Final count shows all 12,000 suggestions
- ✅ User can interact with editor during progressive loading

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 4: [Scroll Performance - 60 FPS]
**Objective**: Verify smooth 60 FPS scrolling performance

**Steps**:
1. Load Large test manuscript (5,000 suggestions)
2. Open DevTools → Performance tab
3. **Start Recording**
4. Rapidly scroll up and down in editor (10 full scrolls)
5. **Stop Recording**
6. Analyze FPS in performance timeline
7. Check for "Long Tasks" (>50ms) on Main thread
8. Note: Frame rate should stay above 50 FPS

**Expected Results**:
- ✅ Sustained FPS: 55-60 FPS during scrolling
- ✅ No dropped frames or stuttering
- ✅ No Long Tasks (>50ms) during scroll
- ✅ Decoration updates are debounced (not on every scroll event)
- ✅ Smooth visual experience, no jank

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 5: [Accept/Reject Suggestion Flow]
**Objective**: Verify suggestion actions work correctly with virtualization

**Steps**:
1. Load Medium test manuscript (2,500 suggestions)
2. Scroll to middle of ChangeList (suggestion #1250)
3. Click on a suggestion card to navigate to editor position
4. Verify suggestion highlights in editor
5. Click "Accept" on the suggestion
6. Observe:
   - Suggestion removed from list
   - Text updated in editor
   - Remaining suggestions re-render correctly
7. Repeat with "Reject" action
8. Verify no browser freeze during actions

**Expected Results**:
- ✅ Clicking suggestion scrolls editor to correct position
- ✅ Suggestion highlights correctly in editor
- ✅ "Accept" applies change and removes suggestion (<50ms)
- ✅ "Reject" dismisses suggestion without applying (<50ms)
- ✅ Remaining suggestions maintain correct positions
- ✅ No full re-render of all 2,500 suggestions (only viewport updates)
- ✅ ChangeList updates immediately

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 6: [Memory Leak Detection]
**Objective**: Verify no memory leaks during extended usage

**Steps**:
1. Open Chrome DevTools → Memory tab
2. Load Large test manuscript (5,000 suggestions)
3. Take **Heap Snapshot #1** (baseline)
4. Scroll through ChangeList 10 times (top to bottom)
5. Accept 50 suggestions randomly
6. Scroll through editor 20 times
7. Take **Heap Snapshot #2** (after usage)
8. Compare snapshots - check for:
   - Detached DOM nodes
   - Growing arrays/objects
   - Unreleased event listeners

**Expected Results**:
- ✅ Memory increase <50 MB between snapshots
- ✅ No detached DOM nodes (or <10)
- ✅ No growing listener counts
- ✅ Decoration references properly cleaned up
- ✅ Total memory usage remains <500 MB

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 7: [Edge Case - Suggestions at Document Boundaries]
**Objective**: Verify correct handling of suggestions at start/end of document

**Steps**:
1. Load test manuscript with suggestions at:
   - Position 0 (start of document)
   - Last position (end of document)
2. Scroll to top of editor → verify first suggestion visible
3. Scroll to bottom → verify last suggestion visible
4. Accept suggestion at position 0
5. Accept suggestion at end position
6. Verify no errors in console
7. Verify decorations render correctly

**Expected Results**:
- ✅ Suggestions at position 0 render without error
- ✅ Suggestions at document end render correctly
- ✅ Accepting boundary suggestions works correctly
- ✅ No console errors or warnings
- ✅ Viewport calculations handle boundary cases

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 8: [Fallback Mode - Browser Compatibility]
**Objective**: Verify graceful degradation on older browsers

**Steps**:
1. Simulate older browser (disable IntersectionObserver in DevTools):
   ```javascript
   // In Console:
   delete window.IntersectionObserver;
   ```
2. Reload page and load Medium test manuscript
3. Run AI Pass with 2,500 suggestions
4. Observe behavior - should fall back to capped rendering

**Expected Results**:
- ✅ Detects missing IntersectionObserver API
- ✅ Falls back to rendering first 200 suggestions (cap)
- ✅ Shows warning: "Viewport virtualization not supported, showing 200 suggestions"
- ✅ No errors in console
- ✅ Accept/Reject still works for visible suggestions
- ✅ ChangeList shows all suggestions (pagination still works)

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 9: [Dynamic Document Editing with Suggestions]
**Objective**: Verify position remapping works with virtualized decorations

**Steps**:
1. Load Medium test manuscript (2,500 suggestions)
2. Scroll to middle of document
3. Edit text BEFORE a visible suggestion (add 100 characters)
4. Observe suggestion position updates
5. Edit text AFTER a visible suggestion (delete 50 characters)
6. Scroll to view updated positions
7. Accept a suggestion after edits
8. Verify text applies to correct position

**Expected Results**:
- ✅ Suggestions remap positions correctly after edits
- ✅ Decorations update to show new positions
- ✅ No position drift or accuracy loss
- ✅ Accepting suggestion applies to correct remapped position
- ✅ Viewport calculations remain accurate after edits
- ✅ No performance degradation during remapping

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

### Scenario 10: [Stress Test - 50,000 Suggestions]
**Objective**: Verify system handles extreme edge case gracefully

**Steps**:
1. Create synthetic test document with 50,000 suggestions (or use API to inject)
2. Open editor with this document
3. Observe initial load behavior
4. Attempt to scroll through ChangeList
5. Monitor performance and memory
6. Attempt to accept/reject suggestions

**Expected Results**:
- ✅ System remains responsive (no freeze)
- ✅ Progressive loading works with 100 batches (500 suggestions each)
- ✅ Memory usage <1 GB
- ✅ Viewport rendering shows only ~100 decorations at a time
- ✅ Actions (accept/reject) remain functional
- ⚠️ Performance degradation is acceptable (may be slower, but no freeze)

**Actual Results**: [To be filled during testing]
**Status**: ⏸️ Not Started | ✅ Pass | ❌ Fail | ⚠️ Degraded

---

## Performance Benchmarks

Record these metrics during testing:

### Initial Render Performance
- [ ] **Small (250 suggestions)**: [___]ms (Target: <200ms)
- [ ] **Medium (2,500 suggestions)**: [___]ms (Target: <500ms)
- [ ] **Large (5,000 suggestions)**: [___]ms (Target: <500ms)
- [ ] **Extra Large (12,000 suggestions)**: [___]ms (Target: <1,000ms)

### Memory Usage
- [ ] **Small (250 suggestions)**: [___] MB (Target: <100 MB)
- [ ] **Medium (2,500 suggestions)**: [___] MB (Target: <300 MB)
- [ ] **Large (5,000 suggestions)**: [___] MB (Target: <500 MB)
- [ ] **Extra Large (12,000 suggestions)**: [___] MB (Target: <800 MB)

### Scroll Performance
- [ ] **FPS during rapid scroll**: [___] FPS (Target: >55 FPS)
- [ ] **Decoration update latency**: [___]ms (Target: <100ms)

### Action Performance
- [ ] **Accept suggestion**: [___]ms (Target: <50ms)
- [ ] **Reject suggestion**: [___]ms (Target: <50ms)

---

## Regression Testing

Verify virtualization doesn't break existing functionality:

- [ ] **Small documents (<1,000 suggestions)** work as before
- [ ] **Manual suggestions** render and accept/reject correctly
- [ ] **Style checks** (checksPlugin.ts) render correctly
- [ ] **TipTap AI popover** appears on hover/click
- [ ] **Keyboard navigation** (arrow keys) works in ChangeList
- [ ] **Filter by AI role** in ChangeList works correctly
- [ ] **"Apply All Suggestions"** button works (if <1,000 suggestions)

---

## Browser Compatibility

Test on each browser with Medium test manuscript (2,500 suggestions):

### Chrome (90+)
- [ ] Initial load: [___]ms
- [ ] Scroll FPS: [___]
- [ ] Memory: [___] MB
- [ ] Status: ⏸️ Not Started | ✅ Pass | ❌ Fail

### Firefox (88+)
- [ ] Initial load: [___]ms
- [ ] Scroll FPS: [___]
- [ ] Memory: [___] MB
- [ ] Status: ⏸️ Not Started | ✅ Pass | ❌ Fail

### Safari (14+)
- [ ] Initial load: [___]ms
- [ ] Scroll FPS: [___]
- [ ] Memory: [___] MB
- [ ] Status: ⏸️ Not Started | ✅ Pass | ❌ Fail

### Edge (Chromium)
- [ ] Initial load: [___]ms
- [ ] Scroll FPS: [___]
- [ ] Memory: [___] MB
- [ ] Status: ⏸️ Not Started | ✅ Pass | ❌ Fail

---

## Known Issues & Workarounds

Document any issues found during testing:

### Issue #1: [Title]
- **Description**:
- **Impact**: High | Medium | Low
- **Workaround**:
- **Fix Required**: Yes | No

### Issue #2: [Title]
- **Description**:
- **Impact**: High | Medium | Low
- **Workaround**:
- **Fix Required**: Yes | No

---

## Sign-Off

### Acceptance Criteria
- [ ] All scenarios pass (or degraded performance acceptable for stress test)
- [ ] Performance targets met for Large documents (5,000 suggestions)
- [ ] Memory usage <500 MB for 10,000 suggestions
- [ ] No browser freeze on any test case
- [ ] 60 FPS scroll performance maintained
- [ ] No regressions on existing functionality
- [ ] Browser compatibility verified on 4 major browsers

### Approvals
- [ ] **Product Owner**: [Name] - Date: [___]
- [ ] **Engineering Lead**: [Name] - Date: [___]
- [ ] **QA Sign-Off**: [Name] - Date: [___]

### Deployment Recommendation
- [ ] ✅ **Ready for Production** - All tests pass
- [ ] ⚠️ **Ready with Caveats** - Minor issues documented
- [ ] ❌ **Not Ready** - Critical issues found

**Tester**: _____________
**Date**: _____________
**Overall Status**: ⏸️ Not Started | 🟡 In Progress | ✅ Passed | ❌ Failed

---

**Last Updated**: October 6, 2025

## Tags
#uat #testing #virtualization #performance #phase2
