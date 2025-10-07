⏺ Action Plan: Automatic Snapshots on AI Pass & 
  Apply All

  Analysis Complete ✅

  Key Findings:

  1. AI Pass Completion - Editor.tsx:1005-1008
    - Handler: handleRunAIPass()
    - Completion point: After waitForAiSuggestions()
   returns
    - User ID available: user?.id
  2. Apply All - Editor.tsx:734-775
    - Handler: handleApplyAllSuggestions()
    - Completion point: After
  editor.commands.applyAllAiSuggestions() succeeds
    - User ID available: user?.id
  3. Reject All - ⚠️ Does NOT exist
    - No button, no handler currently implemented
    - Will skip this feature

  Proposed Changes

  1. Extend Snapshot Event Types
  (snapshotService.ts:7)
  // Current: 'upload' | 'send_to_author' | 
  'return_to_editor' | 'manual'
  // New: Add 'ai_pass_complete' | 'apply_all'
  export type SnapshotEvent = 'upload' |
  'send_to_author' | 'return_to_editor' | 'manual' |
   'ai_pass_complete' | 'apply_all';

  2. Add Snapshot to AI Pass Completion
  (Editor.tsx:1005-1008)
  - After suggestions are generated and set to state
  - Before showing success toast
  - Event type: 'ai_pass_complete'
  - Label: Include role count (e.g., "3 roles
  applied")

  3. Add Snapshot to Apply All (Editor.tsx:757-762)
  - After applyAllAiSuggestions() succeeds
  - After UI state updates
  - Before showing success toast
  - Event type: 'apply_all'
  - Label: Include suggestion count (e.g., "Applied
  328 suggestions")

  4. Update Version History UI
  (VersionHistory.tsx:90-98)
  - Add labels for new event types in formatEvent()
  function
  - 'ai_pass_complete' → "AI Pass Complete"
  - 'apply_all' → "Applied All Suggestions"

  Implementation Order

  1. Update SnapshotEvent type in snapshotService.ts
  2. Update formatEvent() in VersionHistory.tsx
  3. Add snapshot call in handleRunAIPass() (after
  line 1008)
  4. Add snapshot call in
  handleApplyAllSuggestions() (after line 757)
  5. Run TypeScript validation
  6. Test both workflows

  Edge Cases Handled

  - ✅ User not authenticated (already handled by
  createSnapshot)
  - ✅ No manuscript loaded (handler checks before
  proceeding)
  - ✅ Snapshot creation fails (won't block user
  workflow, logs error)
  - ✅ No suggestions generated (won't create
  snapshot if uiSuggestions.length === 0)
