# Claude Session Prompts for Phase 1 Implementation

## Overview

Phase 1 requires **two separate Claude sessions** with different MCP configurations:
1. **Implementation Session** (no chrome-devtools MCP) - Builds the solution
2. **Testing Session** (with chrome-devtools MCP) - Validates the solution

---

## 1. Implementation Session Prompt

**Use this prompt to start implementation** (Session without chrome-devtools MCP):

```
You are implementing Phase 1 of a large document AI processing system for a TipTap-based manuscript editor.

GOAL: Process 85K+ word documents without browser timeout by implementing a custom apiResolver with sequential chunk processing.

ACTION PLAN: docs/02-technical/large-documents/ACTION-PLAN-PHASE1.md

YOUR TASK:
Execute Parts 1 and 2 of the action plan:
- Part 1: Create Edge Function (ai-suggestions-html)
- Part 2: Implement Custom Resolver (modify useTiptapEditor.ts)

STOP at the IMPLEMENTATION CHECKPOINT (before Part 3).

EXECUTION APPROACH:
1. Read ACTION-PLAN-PHASE1.md thoroughly
2. Execute tasks sequentially, marking checkboxes as completed
3. Use Supabase MCP for edge function deployment
4. Copy-paste code exactly as provided
5. Test edge function with curl before proceeding
6. Build and verify TypeScript compilation

AVAILABLE TOOLS:
- Supabase MCP: deploy_edge_function, get_logs, execute_sql
- File operations: Read, Write, Edit
- Bash: for commands and dev server

CRITICAL NOTES:
- You do NOT have chrome-devtools MCP in this session
- Testing will be done in a separate session (UAT-PHASE1.md)
- When you reach IMPLEMENTATION CHECKPOINT: STOP and report completion

SUCCESS CRITERIA for Implementation:
- Edge function deployed and responds to curl test
- Custom resolver added to useTiptapEditor.ts
- TypeScript compiles without errors
- Dev server runs successfully (pnpm run dev)

Begin by confirming you understand the task, then start Part 1.
```

---

## 2. Testing Session Prompt

**Use this prompt after implementation is complete** (Session WITH chrome-devtools MCP):

```
You are executing User Acceptance Testing (UAT) for Phase 1 implementation of a large document AI processing system.

GOAL: Validate that the custom resolver implementation works correctly with 85K+ word documents.

UAT PROTOCOL: docs/02-technical/large-documents/UAT-PHASE1.md

PREREQUISITES (verify before starting):
- Implementation complete (edge function deployed, custom resolver added)
- Dev server running on http://localhost:8080
- Chrome devtools MCP tools available to you

YOUR TASK:
Execute all test suites in UAT-PHASE1.md using chrome-devtools MCP:
- Test Suite 1: Small document (1K words) - Baseline
- Test Suite 2: Medium document (27K words) - Rate limiting
- Test Suite 3: Large document (85K words) - Critical validation ⭐
- Test Suite 4: Accept/Reject functionality
- Test Suite 5: Edge cases
- Test Suite 6: Performance summary

EXECUTION APPROACH:
1. Verify chrome-devtools MCP tools are available
2. Navigate to http://localhost:8080 using MCP
3. Execute each test suite sequentially
4. Use evaluate_script for position validation
5. STOP at each CHECKPOINT and report results
6. Wait for approval before continuing

AVAILABLE TOOLS (chrome-devtools MCP):
- navigate_page - Load application
- take_snapshot - Find element UIDs
- click - Interact with UI
- evaluate_script - Run validation scripts
- list_console_messages - Check logs
- list_network_requests - Monitor API calls
- take_screenshot - Document states

CRITICAL SUCCESS CRITERIA:
- CHECKPOINT 3 (Large doc): Position accuracy MUST = 100.0%
  - If < 100%: STOP immediately and report failure
- Memory usage < 500 MB
- No browser timeout (processing completes)
- No 429 rate limit errors

CHECKPOINT PROTOCOL:
At each checkpoint:
1. Run all validation tests specified
2. Report pass/fail with metrics
3. STOP and ask: "CHECKPOINT X result: [PASS/FAIL]. Continue?"
4. Wait for approval before proceeding

When all tests complete:
- Generate final test report
- Report results summary
- Recommend decision (SHIP/PHASE2/INVESTIGATE)

Begin by verifying MCP tools are available, then start Test Suite 1.
```

---

## Session Flow Summary

```
┌─────────────────────────────────────┐
│  Implementation Session             │
│  (No chrome-devtools MCP)           │
│                                     │
│  1. Execute ACTION-PLAN Parts 1-2   │
│  2. Deploy edge function            │
│  3. Add custom resolver             │
│  4. Reach IMPLEMENTATION CHECKPOINT │
│  5. STOP ⛔                          │
└─────────────────────────────────────┘
              ↓
    [Human switches sessions]
              ↓
┌─────────────────────────────────────┐
│  Testing Session                    │
│  (WITH chrome-devtools MCP)         │
│                                     │
│  1. Execute UAT-PHASE1.md           │
│  2. Run all test suites             │
│  3. Validate positions = 100%       │
│  4. Generate test report            │
│  5. Recommend decision              │
└─────────────────────────────────────┘
              ↓
    [Human reviews results]
              ↓
   Decision: SHIP / PHASE2 / INVESTIGATE
```

---

## Quick Reference

### When to Use Each Prompt

**Implementation Prompt**:
- Starting fresh Phase 1 implementation
- Need to build edge function and custom resolver
- Don't need browser testing yet

**Testing Prompt**:
- Implementation already complete
- Ready to validate with real browser tests
- Need chrome-devtools MCP for automation

### Troubleshooting

**If Implementation Claude tries to test**:
- Remind: "You don't have chrome-devtools MCP. Stop at IMPLEMENTATION CHECKPOINT."

**If Testing Claude can't find MCP tools**:
- Check MCP configuration is enabled
- Verify chrome-devtools profile is active
- May need to restart Claude with correct profile

**If unclear which session to use**:
- Not started yet? → Implementation prompt
- Implementation done? → Testing prompt
- Testing done? → Review results (no new session needed)

---

## Example Session Transcript

### Implementation Session Start
```
User: [Pastes implementation prompt]

Claude: I understand. I'll execute Phase 1 implementation:
- Part 1: Create edge function (ai-suggestions-html)
- Part 2: Add custom resolver to useTiptapEditor.ts
- Stop at IMPLEMENTATION CHECKPOINT

I have Supabase MCP and file tools available.
I do NOT have chrome-devtools - testing will be separate.

Starting with Part 1...
```

### Implementation Session End
```
Claude: ✅ IMPLEMENTATION CHECKPOINT reached!

Implementation complete:
- Edge function deployed: ai-suggestions-html ✅
- Custom resolver added to useTiptapEditor.ts ✅
- TypeScript compiles without errors ✅
- Dev server running on http://localhost:8080 ✅
- Curl test passed ✅

⛔ STOPPING HERE per instructions.

Next step (human action required):
1. Close this session
2. Launch new Claude with chrome-devtools MCP
3. Run UAT testing protocol
```

### Testing Session Start
```
User: [Pastes testing prompt]

Claude: I understand. I'll execute UAT testing for Phase 1.

Verifying prerequisites:
- Chrome devtools MCP available ✅
- Implementation should be complete ✅

I'll now execute all test suites from UAT-PHASE1.md
and stop at each checkpoint for approval.

Starting Test Suite 1: Small Document Baseline...
```

### Testing Session End
```
Claude: 🎯 UAT COMPLETE - All tests passed!

Final Results:
- Position Accuracy: 100.0% ✅
- Memory Usage: 420 MB ✅
- Processing Time: 12 minutes ✅
- Rate Limit Errors: 0 ✅
- Browser Timeouts: 0 ✅

RECOMMENDATION: SHIP Phase 1 to Production

All success criteria met. Phase 1 is ready for deployment
with feature flag. See ACTION-PLAN-PHASE1.md Part 4 for
deployment steps.
```

---

**Document Status**: Ready to Use
**Last Updated**: October 3, 2025
**Related Documents**:
- ACTION-PLAN-PHASE1.md (Implementation guide)
- UAT-PHASE1.md (Testing protocol)
- implementation-guide-phased-approach.md (Technical reference)
