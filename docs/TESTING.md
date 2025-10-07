# Testing Guide & UAT Templates

**For Claude Code**: Testing protocols, UAT templates, and process guides.

---

# 📌 Quick Navigation

```
UAT Testing
├─ When to Create UAT
├─ Two-Document Strategy
├─ UAT Structure Template
└─ Token Overflow Prevention

Testing Examples
└─ Git Worktrees Testing Example
```

---

# UAT TESTING WITH CHROME-DEVTOOLS MCP

## When to Create a UAT Script

Create automated UAT when:
- ✅ New feature implementation complete
- ✅ Feature involves UI interactions (clicks, forms, dialogs)
- ✅ Feature has database state needing verification
- ✅ Feature requires multi-step testing workflow
- ✅ Testing needs to be repeatable and documented

## Two-Document Strategy

**ALWAYS create TWO UAT documents** for each feature:

### 1. Simple Version (`UAT-[FEATURE]-SIMPLE.md`)
- **Tools**: Native MCP tools (`list_console_messages`, `wait_for`)
- **Speed**: ~30% faster, easier to execute
- **Risk**: May cause token overflow on complex features
- **Strategy**: **Try this first**

### 2. Token-Optimized Version (`UAT-[FEATURE].md`)
- **Tools**: Custom interceptors + `evaluate_script` polling
- **Reliability**: Bulletproof, even with massive DOMs
- **Complexity**: More setup, but guaranteed success
- **Strategy**: **Fallback if simple version overflows**

---

# UAT DOCUMENT STRUCTURE

## Standard Sections (Required Order)

```markdown
# [Feature Name]: UAT Testing Protocol
## [Brief Description]

**Purpose**: [What this UAT validates]
**Prerequisites**: [Implementation requirements]
**Testing Method**: Automated via chrome-devtools MCP
**Last Updated**: [Date]

---

## ⚠️ Session Prerequisites

### Required MCP Tools
- `mcp__chrome-devtools__navigate_page`
- `mcp__chrome-devtools__click`
- `mcp__chrome-devtools__evaluate_script`
- `mcp__chrome-devtools__wait_for` (simple) OR custom polling (optimized)

### Implementation Status Check
- [ ] Feature X implemented
- [ ] Edge function Y deployed
- [ ] Database migration Z applied

---

## Test Environment Setup

### Setup 0: Install Interceptors (Token-Optimized Only)
[Install console/network interceptors]

### Setup 1: Get Initial Button UIDs
[Capture element selectors for interactions]

---

## Test Suite 1: [Feature Area]

### Test 1.1: [Specific Test]
**Actions**:
1. Navigate to page
2. Click button
3. Verify result

**Success Criteria**:
- [ ] Expected behavior occurred
- [ ] No console errors
- [ ] Database state correct

## ✅ CHECKPOINT 1: [Summary]
**Pass Criteria**: All Test Suite 1 tests passed
**If PASS**: Continue to Test Suite 2 ✅
**If FAIL**: [Recovery actions]

---

## Final Report Generation

[Generate summary of test results]

---

## Test Execution Checklist

- [ ] Suite 1: [Feature Area]
  - [ ] Test 1.1: [Test Name]
  - [ ] Test 1.2: [Test Name]
- [ ] Suite 2: [Feature Area]
  - [ ] Test 2.1: [Test Name]

---

## Tags
#uat #testing #[feature] #automated
```

---

# TOKEN OVERFLOW PREVENTION

## Problem: Native Tools Can Overflow

| Tool | Risk | Token Count | When to Use |
|------|------|-------------|-------------|
| `list_console_messages` | ⚠️ Medium | 5K-284K | Try first, fallback if overflow |
| `list_network_requests` | ⚠️ Medium | 1K-50K | Try first, fallback if overflow |
| `take_snapshot` | 🔴 High | 50K-328K | **AVOID** - use selectors instead |
| `wait_for` | ⚠️ Medium | 5K-328K | Includes snapshot, use polling instead |

## Solution 1: Simple Version (Try First)

**File**: `UAT-[FEATURE]-SIMPLE.md`

Use native tools with overflow detection:

```markdown
### Test X.X: [Test Name]

**Actions**:

1. **Check console logs** ⭐ (OVERFLOW RISK POINT)
   - **MCP Tool**: `mcp__chrome-devtools__list_console_messages`

   **🚨 IF THIS OVERFLOWS**: STOP and switch to `UAT-[FEATURE].md`

**Success Criteria**:
- [ ] Expected result
- [ ] No token overflow
```

**Include this warning at top of simple version**:

```markdown
## ⚠️ CRITICAL: TOKEN OVERFLOW DETECTION

**THIS DOCUMENT USES NATIVE `list_console_messages` - MAY CAUSE TOKEN OVERFLOW**

### 🚨 IF YOU SEE TOKEN OVERFLOW (25K+ tokens in response):

1. **STOP IMMEDIATELY** - Do not continue with this document
2. **Mark deprecated** - Add `❌ DEPRECATED - TOKEN OVERFLOW` to title
3. **Switch to optimized version**: Use `UAT-[FEATURE].md` instead
4. **Document failure** - Note when/where overflow occurred
5. **Never use again** - Always use optimized version for future tests
```

## Solution 2: Token-Optimized Version (Fallback)

**File**: `UAT-[FEATURE].md`

### Setup 0: Install Interceptors (REQUIRED FIRST!)

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
  try {
    const response = await origFetch.apply(this, args);
    if (!response.ok) {
      window.__fetchErrors.push({
        url: args[0],
        status: response.status,
        statusText: response.statusText
      });
    }
    return response;
  } catch (error) {
    window.__fetchErrors.push({
      url: args[0],
      error: error.message
    });
    throw error;
  }
};
```

### Polling Pattern (Instead of wait_for)

```javascript
// Use evaluate_script with polling
const checkCondition = async () => {
  // Poll every 500ms for condition
  const result = await evaluateScript(`
    (function() {
      // Check your condition
      const button = document.querySelector('[data-testid="submit"]');
      return {
        found: !!button,
        enabled: button?.disabled === false,
        text: button?.textContent
      };
    })()
  `);

  return result;
};
```

---

# GIT WORKTREES TESTING EXAMPLE

## Purpose

Example UAT protocol for testing performance experiments using git worktrees.

**Use Case**: Testing different AI suggestions configurations in parallel

## Git Worktrees Setup

```bash
# Create experiment branches
git branch exp/control
git branch exp/chunk-5
git branch exp/chunk-20

# Create worktrees (separate directories)
git worktree add /Users/username/ballast-control exp/control
git worktree add /Users/username/ballast-exp-chunk5 exp/chunk-5
git worktree add /Users/username/ballast-exp-chunk20 exp/chunk-20
```

## Testing Protocol

### Step 1: Prepare Test Document
- [ ] Select consistent test document (30-50K words)
- [ ] Note: word count, file name, manuscript ID

### Step 2: Test Control Baseline
```bash
cd /Users/username/ballast-control
pnpm run dev
```
- [ ] Open browser: http://localhost:8080
- [ ] Navigate to test manuscript
- [ ] Open DevTools Console
- [ ] Click "Run AI Pass"
- [ ] Record metrics (see template below)
- [ ] Stop server (Ctrl+C)

### Step 3: Test Experiment
```bash
cd /Users/username/ballast-exp-chunk20
pnpm run dev
```
- [ ] Repeat testing procedure
- [ ] Record metrics
- [ ] Compare with baseline

## Metrics Template

```
Experiment: [Name] (chunkSize: X, BATCH_SIZE: Y)
Date/Time: ___________________
Document: _____________________ (_____ words)

Start Time: ___:___
End Time: ___:___
Total Duration: _____ minutes _____ seconds

Chunks Processed: _____
Total Suggestions: _____
Failed Chunks: _____
Success Rate: _____%

Console Errors: [ ] None  [ ] Some (describe): _________________
Browser Responsiveness: [ ] Smooth  [ ] Brief freeze  [ ] Long freeze

vs Baseline: [ ] Faster  [ ] Slower  [ ] Same
Difference: _____ seconds

Notes:
________________________________________________________________________________
```

## Cleanup After Testing

```bash
# Remove worktrees
git worktree remove /Users/username/ballast-control
git worktree remove /Users/username/ballast-exp-chunk5
git worktree remove /Users/username/ballast-exp-chunk20

# Delete experiment branches
git branch -d exp/control
git branch -d exp/chunk-5
git branch -d exp/chunk-20
```

---

# COMMON TESTING PATTERNS

## Pattern 1: Button Click Verification

```javascript
// 1. Get button UID
const button = await evaluateScript(`
  document.querySelector('[data-testid="run-ai-pass"]')?.getAttribute('data-uid')
`);

// 2. Click button
await click({ selector: `[data-uid="${button}"]` });

// 3. Verify state change
const result = await evaluateScript(`
  document.querySelector('[data-testid="status"]')?.textContent
`);
```

## Pattern 2: Database State Verification

```javascript
// Check database state after action
const dbState = await evaluateScript(`
  (async () => {
    const response = await fetch('/api/manuscripts/123');
    const data = await response.json();
    return {
      status: data.status,
      suggestionCount: data.suggestions.length
    };
  })()
`);
```

## Pattern 3: Console Log Verification (Token-Optimized)

```javascript
// Use interceptor logs (not list_console_messages)
const logs = await evaluateScript(`
  window.__consoleLogs.filter(l => l.message.includes('AI Pass'))
`);
```

## Pattern 4: Network Request Verification

```javascript
// Check for specific API call
const fetchErrors = await evaluateScript(`
  window.__fetchErrors.filter(e => e.url.includes('/ai-suggestions'))
`);
```

---

# BEST PRACTICES

## DO's ✅
- Always create BOTH simple and optimized versions
- Include overflow detection checkpoints in simple version
- Install interceptors FIRST in optimized version
- Use polling instead of `wait_for` for optimized version
- Document expected results clearly
- Include recovery steps for failures

## DON'Ts ❌
- Never use `take_snapshot` (huge token cost)
- Don't skip interceptor installation in optimized version
- Don't continue testing after token overflow
- Don't rely on simple version for complex features
- Don't forget to mark simple version as deprecated after overflow

---

**Last Updated**: January 2025 - Consolidated testing documentation

**Tags**: #testing #uat #chrome-devtools #mcp #worktrees #automation
