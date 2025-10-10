# UAT Script: Manual Suggestion Duplication Fix

## Test Objective
Verify that manual suggestions are properly removed from the UI after accepting, with no duplication before or after page reload.

## Prerequisites
- Dev server running on http://localhost:8083
- Chrome browser with DevTools MCP available
- Manuscript "love_prevails_1st_chapter__1_" exists in database

## Test Steps

### 1. Navigate to Manuscript
```javascript
// Navigate to the dashboard
navigate_page("http://localhost:8083/dashboard")

// Wait for page load
wait_for("Manuscripts")

// Click on the first manuscript row (love_prevails_1st_chapter__1_)
// The title is in a StaticText element with text "love_prevails_1st_chapter__1_"
click(uid_with_text="love_prevails_1st_chapter__1_")

// Wait for editor to load
wait_for("Changes")
```

### 2. Create Manual Suggestion
```javascript
// Place cursor at end of first paragraph using evaluate_script
evaluate_script(`() => {
  const editor = document.querySelector('.ProseMirror');
  const firstParagraph = editor.querySelector('p');
  const range = document.createRange();
  const textNode = firstParagraph.lastChild;

  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    range.setStart(textNode, textNode.textContent.length);
    range.collapse(true);
  } else {
    range.selectNodeContents(firstParagraph);
    range.collapse(false);
  }

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();

  return { success: true };
}`)

// Right-click to open context menu
evaluate_script(`() => {
  const editor = document.querySelector('.ProseMirror');
  const firstParagraph = editor.querySelector('p');
  const rect = firstParagraph.getBoundingClientRect();

  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.right - 10,
    clientY: rect.top + rect.height / 2,
    button: 2
  });

  firstParagraph.dispatchEvent(event);
  return { success: true };
}`)

// Take snapshot to find "Suggest..." menuitem
take_snapshot()
// Look for menuitem "Suggest..."
click(uid_for_menuitem_suggest)

// Fill in the suggestion dialog
// Look for textbox with "Text to insert"
fill(uid_for_text_insert_textbox, "TEST INSERTION")

// Click "Add Suggestion" button
click(uid_for_add_suggestion_button)

// Wait for toast notification
wait_for("Suggestion added")
```

### 3. Verify Suggestion Created
```javascript
take_snapshot()

// Expected state:
// - Tab should show "Changes 1" (with badge)
// - Change List should show "Showing 1 of 1 filtered (1 total)"
// - Suggestion card should be visible with "TEST INSERTION"
// - Accept and Reject buttons should be present

// CHECKPOINT 1: Suggestion is visible in sidebar
assert(changes_tab_shows_1_suggestion)
```

### 4. Accept the Suggestion
```javascript
// Click the Accept button
// Look for button with text "Accept" and keyshortcuts="Enter"
click(uid_for_accept_button)

// Wait for success toast
wait_for("Change applied")
```

### 5. Verify Suggestion Removed (CRITICAL TEST)
```javascript
take_snapshot()

// Expected state AFTER ACCEPT:
// - The text "TEST INSERTION" should be in the editor
// - Changes tab should show "Changes" (NO badge number)
// - Change List should show "Showing 0 of 0 filtered (0 total)"
// - Should say "No pending suggestions."
// - The suggestion decoration should be GONE from editor

// CHECKPOINT 2: No duplication - suggestion removed from UI
assert(changes_tab_shows_no_badge)
assert(change_list_shows_zero_suggestions)
assert(no_pending_suggestions_message_visible)

// Take screenshot to verify visually
take_screenshot()

// CRITICAL: Check editor text - should have "TEST INSERTION" only ONCE
// The editor textbox value should contain "functionalityTEST INSERTION" (not duplicated)
assert(editor_text_contains_test_insertion_once)
```

### 6. Reload Page and Verify Persistence
```javascript
// Navigate back and forward to trigger reload
navigate_page_history("back")
wait_for("Manuscripts")

navigate_page_history("forward")
wait_for("Changes")

take_snapshot()

// Expected state AFTER RELOAD:
// - The text "TEST INSERTION" should still be in the editor
// - Changes tab should still show "Changes" (NO badge)
// - Change List should still show "Showing 0 of 0 filtered (0 total)"
// - Should still say "No pending suggestions."

// CHECKPOINT 3: Text persisted correctly after reload
assert(changes_tab_shows_no_badge)
assert(change_list_shows_zero_suggestions)
assert(editor_text_contains_test_insertion_once)

// Take final screenshot
take_screenshot()
```

## Success Criteria

✅ **Pass:** All checkpoints pass
- Suggestion created successfully (Checkpoint 1)
- Suggestion removed from UI immediately after accept (Checkpoint 2)
- No duplicate text visible in editor (Checkpoint 2)
- Text persists correctly after page reload (Checkpoint 3)
- No suggestion shown after reload (Checkpoint 3)

❌ **Fail:** Any of these conditions occur
- Suggestion still visible in Change List after accepting
- Text appears duplicated in the editor (e.g., "TEST INSERTIONTEST INSERTION")
- Changes tab shows a badge number after accepting
- Suggestion reappears after page reload

## Known Good Values (for reference)

**Manuscript ID:** `ca15becb-1073-49d6-8ecb-7dd35d731299`
**URL:** `http://localhost:8083/manuscript/ca15becb-1073-49d6-8ecb-7dd35d731299`
**First paragraph starts with:** `"Back to Latest" functionality`

## Console Log Verification

Look for these console logs to verify the fix:
```
Accepting suggestion: manual-[uuid] at positions 33 33
Filtered suggestions from 1 to 0  ← Should be "1 to 0" (was "1 to 1" before fix)
```

The key indicator is `Filtered suggestions from 1 to 0` - this shows the filter is working correctly.

## Regression Test

To verify the fix handles all suggestion types:
1. Test with INSERT suggestion (this test)
2. Test with REPLACE suggestion (select text first, then suggest)
3. Test with DELETE suggestion (select text, choose delete mode)

All three types should properly remove from UI after accepting.
