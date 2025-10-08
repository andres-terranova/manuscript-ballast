# setAISuggestions Feature Implementation

This folder contains the implementation plan for integrating AI suggestions with snapshots.

## Contents

- **IMPLEMENTATION_PLAN.md** - Detailed step-by-step implementation guide for Claude Code or developers
- **UAT-SIMPLE.md** - Simple UAT testing protocol (try first, may overflow with large documents)
- **UAT.md** - Token-optimized UAT testing protocol (production-ready, use if simple version overflows)

## Overview

This feature allows snapshots to capture and restore AI suggestions, preserving the complete editing state (document + suggestions) at any point in time.

## Usage

### Implementation

1. Hand off `IMPLEMENTATION_PLAN.md` to a new Claude Code session
2. Execute steps sequentially (Step 1 through Step 6)
3. Verify all validation checkboxes are checked

### Testing

**Two-Document Strategy** (see `docs/TESTING.md` for details):

1. **Try SIMPLE version first**: `UAT-SIMPLE.md`
   - Uses native `list_console_messages` MCP tool
   - Faster to execute (~30% faster)
   - **Risk**: May cause token overflow on large documents with many suggestions
   - **Strategy**: Try this first, switch to optimized if overflow occurs

2. **Fallback to OPTIMIZED version**: `UAT.md`
   - Uses custom interceptors + `evaluate_script` polling
   - Token-safe even with 5K+ suggestions
   - More complex setup but guaranteed to work
   - **Strategy**: Use if simple version overflows, or for production testing

### Deployment

- Deploy when all tests pass
- Use optimized UAT for final validation

## Estimated Time

**Implementation**: 2-3 hours (Steps 1-6)
**Testing**: 2-3 hours
- Simple UAT: ~30-60 minutes (if no overflow)
- Optimized UAT: ~45-90 minutes
- Includes AI pass time (2-20 min depending on document size)

**Total**: 4-6 hours

## Risk Level

**LOW** - Additive changes only, backward compatible, no breaking changes to existing functionality.

## Key Features

✅ Save AI suggestions with snapshots
✅ Restore suggestions when snapshot is loaded (page load + manual restore)
✅ Auto-restore AI suggestions on page load from latest snapshot
✅ Track current version across page loads and manual restores
✅ Backward compatible (old snapshots work fine)
✅ UI shows suggestion count in version history
✅ Handles 5K+ suggestions

## Recent Updates (January 2025)

**Bug Fixes Implemented**:

1. **Page Load Restoration** (`Editor.tsx:1120-1193`)
   - Fixed: AI suggestions vanished after page refresh
   - Solution: Added useEffect hook that fetches latest snapshot and restores suggestions on mount
   - Updates both editor state (`setAiSuggestions`) and UI state (`convertAiSuggestionsToUI`)

2. **Manual Restore UI Sync** (`Editor.tsx:1647-1672`)
   - Fixed: Version History restore didn't populate Change List
   - Solution: Updated `onRestore` callback to convert suggestions to UI format and update React state
   - Now fully synchronizes editor and UI after manual restoration

3. **Version Tracking** (`Editor.tsx:72, VersionHistory.tsx:10-14`)
   - Fixed: Version History always marked latest as "Current Version"
   - Solution: Added `currentVersion` state tracking across page loads, restores, and snapshot creation
   - Users can now restore to any version including the latest after using older versions

**New Features**:

4. **Automatic Snapshots on AI Pass Completion** (`Editor.tsx:1033-1055`)
   - Automatically creates snapshot after AI Pass generates suggestions
   - Event type: `'ai_pass_complete'`
   - Label includes role count (e.g., "3 roles applied")
   - Only creates snapshot if suggestions were generated

5. **Automatic Snapshots on Apply All** (`Editor.tsx:762-784`)
   - Automatically creates snapshot after applying all AI suggestions
   - Event type: `'apply_all'`
   - Label includes suggestion count (e.g., "Applied 328 suggestions")
   - Tracks count before applying for accurate labeling

6. **Extended Snapshot Event Types** (`snapshotService.ts:7`, `VersionHistory.tsx:96-97`)
   - Added `'ai_pass_complete'` → "AI Pass Complete"
   - Added `'apply_all'` → "Applied All Suggestions"
   - Version History displays new event types with proper labels

## Questions?

Review the research findings in the conversation that created this plan, or reference:
- TipTap AI Suggestions docs: https://tiptap.dev/docs/content-ai/capabilities/suggestion
- Existing snapshot code: `src/services/snapshotService.ts`
- Existing AI integration: `src/hooks/useTiptapEditor.ts`
