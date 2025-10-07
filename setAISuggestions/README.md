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
✅ Restore suggestions when snapshot is loaded
✅ Backward compatible (old snapshots work fine)
✅ UI shows suggestion count
✅ Handles 5K+ suggestions

## Questions?

Review the research findings in the conversation that created this plan, or reference:
- TipTap AI Suggestions docs: https://tiptap.dev/docs/content-ai/capabilities/suggestion
- Existing snapshot code: `src/services/snapshotService.ts`
- Existing AI integration: `src/hooks/useTiptapEditor.ts`
