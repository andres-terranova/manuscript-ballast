# UAT Testing Script Template & Generation Guide
## How to Create Automated UAT Scripts with chrome-devtools MCP

**Purpose**: Standardized template and guidelines for generating UAT testing scripts
**Audience**: Claude AI sessions tasked with creating automated test protocols
**Last Updated**: October 5, 2025

---

## 📋 Overview

This guide provides a template and best practices for creating User Acceptance Testing (UAT) scripts that use chrome-devtools MCP for automated browser testing.

### When to Create a UAT Script

Create a UAT script when:
- ✅ New feature implementation is complete
- ✅ Feature involves UI interactions (clicks, forms, dialogs)
- ✅ Feature has database state that needs verification
- ✅ Feature requires multi-step testing workflow
- ✅ Testing needs to be repeatable and documented

### UAT Script Strategy: Two-Document Approach

**ALWAYS create TWO UAT documents** for each feature:

1. **Simple Version** (`UAT-[FEATURE]-SIMPLE.md`)
   - Uses native MCP tools (`list_console_messages`, `wait_for`)
   - Faster and easier to execute (~30% time savings)
   - Risk: May cause token overflow on complex features
   - **Try this first**

2. **Token-Optimized Version** (`UAT-[FEATURE].md`)
   - Uses custom interceptors and `evaluate_script` polling
   - Bulletproof: Always works, even with massive DOMs
   - More complex setup, but guaranteed to succeed
   - **Fallback if simple version overflows**

---

## 🏗️ UAT Document Structure

### Standard Sections (Required)

Every UAT script MUST include these sections in this order:

```markdown
# [Feature Name]: UAT Testing Protocol
## [Brief Description]

**Purpose**: [What this UAT validates]
**Prerequisites**: [Implementation requirements]
**Testing Method**: Automated via chrome-devtools MCP tools
**Last Updated**: [Date]

---

## ⚠️ Session Prerequisites

### Required MCP Tools
[List required chrome-devtools tools]

### Implementation Status Check
[Checklist of prerequisites before testing]

---

## Test Environment Setup

### Setup 0: [Initial setup - install interceptors if token-optimized]
### Setup 1: [Get initial button UIDs]

---

## Test Suite 1: [First Major Feature Area]

### Test 1.1: [Specific test]
**Actions**: [Step-by-step MCP commands]
**Success Criteria**: [Checkboxes with expected results]

### Test 1.2: [Next test]
[...]

## ✅ CHECKPOINT 1: [Summary]
**Pass Criteria**: [What must pass]
**If PASS**: Continue to Test Suite 2 ✅
**If FAIL**: [Recovery actions]

---

[Repeat for each test suite...]

---

## Final Report Generation
[Generate summary script]

---

## Test Execution Checklist
[Master checklist of all tests]

---

## Quick Command Reference
[Useful JavaScript commands for manual verification]

---

## Tags
[Relevant tags for searchability]
```

---

## 🔴 Token Overflow Prevention

### Problem: Native Tools Can Overflow

On features with large DOMs or extensive logging:

| Tool | Risk | Token Count | When to Use |
|------|------|-------------|-------------|
| `list_console_messages` | ⚠️ Medium | 5K-284K | Try first, fallback if overflow |
| `list_network_requests` | ⚠️ Medium | 1K-50K | Try first, fallback if overflow |
| `take_snapshot` | 🔴 High | 50K-328K | **AVOID** - use selectors instead |
| `wait_for` | ⚠️ Medium | 5K-328K | Includes snapshot, use polling instead |

### Solution 1: Simple Version (Try First)

**File**: `UAT-[FEATURE]-SIMPLE.md`

Use native tools with **overflow detection checkpoints**:

```markdown
### Test X.X: [Test Name]

**Actions**:

1. **[Action description]** ⭐ (OVERFLOW RISK POINT)
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`

   **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT-[FEATURE].md`

**Success Criteria**:
- [ ] [Expected result]
- [ ] No token overflow
```

**Include this warning at the top**:

```markdown
## ⚠️ CRITICAL: TOKEN OVERFLOW DETECTION

**THIS DOCUMENT USES NATIVE `list_console_messages` - MAY CAUSE TOKEN OVERFLOW**

### 🚨 IF YOU SEE TOKEN OVERFLOW (25K+ tokens in any response):

1. **STOP TESTING IMMEDIATELY** - Do not continue with this document
2. **Mark this file as deprecated** - Add `❌ DEPRECATED - TOKEN OVERFLOW DETECTED` to title
3. **Switch to token-optimized version**: Use `UAT-[FEATURE].md` instead
4. **Note the failure** - Document when/where overflow occurred
5. **Never use this doc again** - Always use token-optimized version for future tests
```

### Solution 2: Token-Optimized Version (Fallback)

**File**: `UAT-[FEATURE].md`

Use custom interceptors + `evaluate_script` polling:

#### Setup 0: Install Interceptors (REQUIRED FIRST!)

```javascript
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
  const response = await origFetch.apply(this, args);
  if (response.status === 429 || response.status >= 500) {
    window.__fetchErrors.push({
      status: response.status,
      url: args[0],
      timestamp: Date.now()
    });
  }
  return response;
};

return {
  consoleInterceptor: 'installed',
  fetchInterceptor: 'installed',
  maxConsoleLogs: maxLogs
};
```

#### Check Console (Token-Safe)

Replace `list_console_messages` with:

```javascript
// Get filtered console logs (1K tokens vs 284K)
const logs = window.__consoleLogs || [];
const errors = logs.filter(l => l.level === 'error');
const recent = logs.slice(-10);
return {
  errorCount: errors.length,
  recentLogs: recent.map(l => ({
    level: l.level,
    message: l.message
  }))
};
```

#### Wait for Element (Token-Safe)

Replace `wait_for` with polling pattern:

```javascript
// Polling pattern (50 tokens vs 328K)
const found = document.querySelector('[role="dialog"]');
return {
  found: !!found,
  ready: !!found
};
// ⚠️ Polling required: If found=false, wait 2-3 seconds and retry
```

#### Check Network Errors (Token-Safe)

Replace `list_network_requests` with:

```javascript
// Get filtered network errors (500 tokens vs 50K)
const errors = window.__fetchErrors || [];
const rateLimits = errors.filter(e => e.status === 429);
const serverErrors = errors.filter(e => e.status >= 500);
return {
  total429Count: rateLimits.length,
  total5xxCount: serverErrors.length,
  allSuccessful: errors.length === 0
};
```

---

## 🧪 Test Suite Design Patterns

### Pattern 1: Database State Verification

**Purpose**: Verify data persists correctly

```markdown
### Test X.1: Verify Database Persistence

**Actions**:

1. **Modify state** (enable rule, create item, etc.)
   - [MCP commands]

2. **Reload page**
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

3. **Verify state persisted**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "async () => { const { Service } = await import('/src/services/service.js'); const data = await Service.getData(); return { persisted: data.length > 0, count: data.length }; }"
   }
   ```

**Success Criteria**:
- [ ] State survived page reload
- [ ] `persisted` = true
```

### Pattern 2: CRUD Operations

**Purpose**: Test Create, Read, Update, Delete

```markdown
### Test X.1: Create Item

**Actions**:
1. Open create dialog
2. Fill in form fields
3. Click create button
4. Verify toast notification
5. Verify item appears in list

### Test X.2: Edit Item

**Actions**:
1. Click edit button on item
2. Modify fields
3. Save changes
4. Verify toast notification
5. Verify changes reflected

### Test X.3: Delete Item

**Actions**:
1. Click delete button
2. Confirm deletion
3. Verify toast notification
4. Verify item removed from list

### Test X.4: Verify Built-in Items Protected

**Actions**:
1. Check built-in item has no delete button
2. Attempt deletion via console (should fail)
3. Verify RLS policy blocks it

**Success Criteria**:
- [ ] Built-in items cannot be deleted
- [ ] `rlsWorking` = true
```

### Pattern 3: Dynamic UI Updates

**Purpose**: Test real-time updates without page reload

```markdown
### Test X.1: Verify Dynamic Update

**Actions**:

1. **Track initial state**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { return window.__someGlobalState; }"
   }
   ```

2. **Trigger change** (toggle, update, etc.)

3. **Verify state updated immediately**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const newState = window.__someGlobalState; return { updated: true, stateChanged: newState !== oldState }; }"
   }
   ```
   - **⚠️ Polling required**: May need 1-2 seconds delay

**Success Criteria**:
- [ ] UI updated without page reload
- [ ] `stateChanged` = true
```

### Pattern 4: Multi-Tab/Organization-Wide State

**Purpose**: Verify shared state across contexts

```markdown
### Test X.1: Verify Shared State

**Actions**:

1. **Note current state in Tab 1**

2. **Open Tab 2** (simulate new session)
   - **MCP Tool**: `mcp__chrome-devtools__navigate_page`
   ```json
   { "url": "http://localhost:8080" }
   ```

3. **Verify same state appears**
   - Compare states between tabs

**Success Criteria**:
- [ ] State is shared (not per-session)
- [ ] `organizationWideWorking` = true
```

### Pattern 5: Error Handling & Edge Cases

**Purpose**: Test validation and error scenarios

```markdown
### Test X.1: Test Empty Form Submission

**Actions**:

1. **Open create dialog**
2. **Leave fields empty**
3. **Verify submit button disabled**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "() => { const btn = document.querySelector('button[type=\"submit\"]'); return { disabled: btn?.disabled, validationWorking: btn?.disabled }; }"
   }
   ```

**Success Criteria**:
- [ ] Submit button disabled when invalid
- [ ] `validationWorking` = true

### Test X.2: Test RLS Policy Protection

**Actions**:

1. **Attempt forbidden operation via console**
   - **MCP Tool**: `mcp__chrome-devtools__evaluate_script`
   ```json
   {
     "function": "async () => { const { supabase } = await import('/src/integrations/supabase/client.js'); const { error } = await supabase.from('table').delete().eq('id', 'protected-id'); return { error: error?.message, rlsWorking: !!error }; }"
   }
   ```

**Success Criteria**:
- [ ] Operation blocked by database policy
- [ ] `rlsWorking` = true
```

---

## 📝 MCP Tools Quick Reference

### Navigation

```json
// Navigate to URL
{
  "tool": "mcp__chrome-devtools__navigate_page",
  "params": { "url": "http://localhost:8080" }
}
```

### Clicking Elements

```json
// Click by UID (from evaluate_script button mapping)
{
  "tool": "mcp__chrome-devtools__click",
  "params": { "uid": "btn-5" }
}
```

### JavaScript Execution

```json
// Run custom JavaScript
{
  "tool": "mcp__chrome-devtools__evaluate_script",
  "params": {
    "function": "() => { /* your code */ return { result: true }; }"
  }
}
```

### Waiting (Simple Version)

```json
// Wait for selector (may include snapshot - overflow risk)
{
  "tool": "mcp__chrome-devtools__wait_for",
  "params": {
    "selector": "[role=\"dialog\"]",
    "timeout": 5000
  }
}
```

### Waiting (Token-Optimized Version)

```javascript
// Polling pattern with evaluate_script
{
  "function": "() => { const found = document.querySelector('[role=\"dialog\"]'); return { found: !!found, ready: !!found }; }"
}
// ⚠️ Polling required: If found=false, consult user on interval (2-5 seconds), then retry
```

### Screenshots

```json
// Take screenshot
{
  "tool": "mcp__chrome-devtools__take_screenshot",
  "params": { "filePath": "test-results/screenshot.png" }
}
```

### Console Messages (Simple Version Only)

```json
// Get console logs (OVERFLOW RISK - mark checkpoint)
{
  "tool": "mcp__chrome-devtools__list_console_messages"
}
```

---

## ✅ Checkpoint Pattern

After each major test suite, include a checkpoint:

```markdown
## ✅ CHECKPOINT X: [Summary Name]

**Pass Criteria** (ALL must pass):
- [ ] [Specific requirement 1]
- [ ] [Specific requirement 2]
- [ ] [Specific requirement 3]
- [ ] No token overflow (if using simple version)

**If ALL PASS**: Continue to Test Suite X+1 ✅
**If OVERFLOW (simple version)**: STOP - Switch to `UAT-[FEATURE].md`
**If FAIL (non-overflow)**: [Recovery instructions]

---
```

---

## 📊 Final Report Pattern

Every UAT should end with automated report generation:

```javascript
// Final test report
const report = {
  testDate: new Date().toISOString(),
  feature: '[Feature Name]',
  testDocument: '[UAT doc filename]',
  testsPassed: {
    suite1: true,
    suite2: true,
    // ... all suites
  },
  tokenOverflow: 'NONE' or 'DETECTED',
  criticalMetrics: {
    // Feature-specific metrics
  },
  decision: 'PRODUCTION_READY' or 'FIX_REQUIRED',
  notes: 'Brief summary'
};
console.log('=== [FEATURE] UAT COMPLETE ===');
console.table(report);
return report;
```

---

## 📋 Generation Checklist

When creating a new UAT script, ensure:

**Two-Document Approach**:
- [ ] Created `UAT-[FEATURE]-SIMPLE.md` (try first)
- [ ] Created `UAT-[FEATURE].md` (token-optimized fallback)
- [ ] Simple version has overflow detection checkpoints
- [ ] Simple version has clear failover instructions

**Structure**:
- [ ] Session prerequisites section
- [ ] Implementation status checklist
- [ ] Setup instructions (Setup 0, Setup 1, etc.)
- [ ] 3-6 test suites covering all functionality
- [ ] Checkpoints after each suite
- [ ] Final report generation
- [ ] Test execution checklist
- [ ] Quick command reference
- [ ] Tags for searchability

**Test Coverage**:
- [ ] Database state verification
- [ ] CRUD operations (if applicable)
- [ ] Dynamic UI updates
- [ ] Multi-tab/organization-wide state (if applicable)
- [ ] Error handling & edge cases
- [ ] RLS policy verification (if database feature)

**Token Safety** (Optimized Version):
- [ ] Setup 0 installs console interceptor
- [ ] Setup 0 installs network error interceptor
- [ ] All waits use polling pattern (not `wait_for`)
- [ ] All console checks use `window.__consoleLogs`
- [ ] All network checks use `window.__fetchErrors`
- [ ] Never uses `take_snapshot`
- [ ] Reinstalls interceptors after page reload

**Token Safety** (Simple Version):
- [ ] Overflow checkpoints after risky operations
- [ ] Clear STOP instructions if overflow
- [ ] Failover instructions to optimized version
- [ ] Warning section at top of document

**Documentation**:
- [ ] Purpose clearly stated
- [ ] Prerequisites listed
- [ ] Success criteria for each test
- [ ] Expected results documented
- [ ] Recovery actions for failures
- [ ] Tags added for searchability

---

## 🎯 Example UAT Scripts

**Reference Examples** (in this repository):

1. **Phase 1 Large Documents**
   - File: `docs/02-technical/large-documents/UAT-PHASE1.md`
   - Features: Custom interceptors, polling patterns, performance testing
   - Use Case: Complex feature with massive DOMs (85K words)

2. **AI Editor Rules Management (Simple)**
   - File: `docs/02-technical/ai-editor-rules/UAT-RULES-MANAGEMENT-SIMPLE.md`
   - Features: Native tools, overflow detection
   - Use Case: Try-first approach for normal-sized features

3. **AI Editor Rules Management (Optimized)**
   - File: `docs/02-technical/ai-editor-rules/UAT-RULES-MANAGEMENT.md`
   - Features: Full token optimization, bulletproof approach
   - Use Case: Guaranteed success fallback

---

## 💡 Best Practices

### DO:
- ✅ Always create both simple and optimized versions
- ✅ Mark overflow risk points in simple version
- ✅ Use descriptive test names
- ✅ Include success criteria checkboxes
- ✅ Add checkpoints after each suite
- ✅ Test edge cases and error handling
- ✅ Verify RLS policies if database feature
- ✅ Include cleanup steps for test data
- ✅ Generate automated final report
- ✅ Add helpful tags for searchability

### DON'T:
- ❌ Create only one UAT version (always make both)
- ❌ Use `take_snapshot` in optimized version
- ❌ Forget to reinstall interceptors after reload
- ❌ Skip overflow detection in simple version
- ❌ Hardcode polling intervals (consult user)
- ❌ Skip checkpoints between suites
- ❌ Forget cleanup steps
- ❌ Skip RLS policy testing for database features

---

## 🔧 Polling Interval Strategy

**CRITICAL**: Never hardcode polling intervals. Always consult user.

**Pattern**:
```markdown
- **⚠️ Polling required**: If `found: false`, consult user on polling interval (typically 2-5 seconds for this operation), then retry
```

**Why**: Intervals vary by:
- Operation complexity (dialog open vs. large document processing)
- System performance
- Network latency
- Test type (unit vs. integration)

**General Guidelines** (but ALWAYS ask):
- Fast operations (dialogs): 1-3 seconds
- Medium operations (database queries): 2-5 seconds
- Slow operations (API calls): 5-15 seconds
- Very slow (large document processing): 30-120 seconds

---

## 📁 File Naming Convention

```
UAT-[FEATURE]-SIMPLE.md          # Try first (native tools)
UAT-[FEATURE].md                 # Fallback (token-optimized)
UAT-[FEATURE]-FINDINGS.md        # Test results (optional)
```

**Examples**:
- `UAT-RULES-MANAGEMENT-SIMPLE.md`
- `UAT-RULES-MANAGEMENT.md`
- `UAT-PHASE1.md`
- `UAT-AUTH-FLOW-SIMPLE.md`

---

## 🎓 Prompt Template for Generating UAT Scripts

Use this prompt when asking Claude to generate UAT scripts:

```
I need you to create UAT testing scripts for [FEATURE NAME].

Please read the UAT template guide at:
/Users/andresterranova/manuscript-ballast/docs/07-claude/UAT-TEMPLATE-GUIDE.md

Then create TWO UAT documents following the two-document approach:

1. UAT-[FEATURE]-SIMPLE.md (try-first version using native MCP tools)
2. UAT-[FEATURE].md (token-optimized fallback with custom interceptors)

The feature being tested:
- [Brief description of feature]
- [Key functionality to test]
- [Database tables involved]
- [UI components involved]

Please ensure:
- All test suites cover the functionality
- Overflow detection checkpoints in simple version
- Token-safe patterns in optimized version
- Clear success criteria for each test
- Checkpoints after each suite

Save the files to: [target directory]
```

---

## 🏷️ Tags

#UAT #testing #template #guide #chrome_devtools #MCP #automation #token_optimization #best_practices #documentation #test_design #patterns #reference

---

**Last Updated**: October 5, 2025
**Version**: 1.0
**Maintained By**: Manuscript Ballast Development Team
