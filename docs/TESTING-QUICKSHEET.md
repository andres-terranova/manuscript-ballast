# Testing Best Practices Quick Sheet

**For Tester Agent**: Token-optimized testing patterns for manual checks and UAT execution.

---

## 🚨 CRITICAL: Avoid Token Overflow

**NEVER use native tools that dump large responses** - They cause 50K-300K token overflow.

---

## 🚫 BANNED Tools

| Tool | Why | Token Cost |
|------|-----|------------|
| `list_console_messages` | Dumps all logs | 5K-284K |
| `list_network_requests` | Dumps all requests | 1K-50K |
| `take_snapshot` | Dumps entire DOM | 50K-328K |
| `wait_for` | Includes snapshot | 5K-328K |

---

## ✅ Use These Instead

### 1. Console Monitoring → Custom Interceptor
```javascript
// Install FIRST (Setup 0)
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

// Read logs later
const logs = await evaluateScript(`window.__consoleLogs`);
```

### 2. Network Monitoring → Custom Interceptor
```javascript
// Install FIRST (Setup 0)
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

// Check errors later
const errors = await evaluateScript(`window.__fetchErrors`);
```

### 3. Waiting for Elements → Polling with evaluate_script
```javascript
// NEVER use wait_for - use polling
const result = await evaluateScript(`
  (function() {
    const button = document.querySelector('[data-testid="submit"]');
    return {
      found: !!button,
      enabled: button?.disabled === false,
      text: button?.textContent
    };
  })()
`);
```

---

## 🎯 Quick Testing Workflow

### Step 1: Install Interceptors (ALWAYS FIRST!)
```javascript
// Run this BEFORE any testing
await navigate_page({ url: 'http://localhost:8080' });
await evaluate_script(`
  // Console interceptor
  window.__consoleLogs = [];
  const maxLogs = 50;
  ['log', 'warn', 'error', 'info'].forEach(level => {
    const original = console[level];
    console[level] = function(...args) {
      window.__consoleLogs.push({
        level: level,
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 100) : String(a).slice(0, 100)).join(' '),
        timestamp: Date.now()
      });
      if (window.__consoleLogs.length > maxLogs) window.__consoleLogs.shift();
      original.apply(console, args);
    };
  });

  // Network interceptor
  window.__fetchErrors = [];
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    try {
      const response = await origFetch.apply(this, args);
      if (!response.ok) {
        window.__fetchErrors.push({ url: args[0], status: response.status, statusText: response.statusText });
      }
      return response;
    } catch (error) {
      window.__fetchErrors.push({ url: args[0], error: error.message });
      throw error;
    }
  };
`);
```

### Step 2: Perform Test Actions
```javascript
// Navigate, click, fill forms, etc.
await click({ selector: '[data-testid="run-ai"]' });
```

### Step 3: Check Results (Use Polling)
```javascript
// Poll for completion (NOT wait_for)
const result = await evaluate_script(`
  (function() {
    const status = document.querySelector('[data-testid="status"]')?.textContent;
    const consoleLogs = window.__consoleLogs.filter(l => l.level === 'error');
    const fetchErrors = window.__fetchErrors;

    return {
      status,
      hasErrors: consoleLogs.length > 0 || fetchErrors.length > 0,
      errors: { console: consoleLogs, network: fetchErrors }
    };
  })()
`);
```

### Step 4: Report Findings
```markdown
## Test Results: [Feature Name]

**Status**: ✅ PASS / ❌ FAIL

**Actions Performed**:
- Navigated to [URL]
- Clicked [button]
- Verified [outcome]

**Observations**:
- Console errors: [count]
- Network errors: [count]
- Expected behavior: [yes/no]

**Details**: [specifics]
```

---

## 🔧 Common Patterns

### Pattern 1: Button Click
```javascript
// 1. Get UID
const uid = await evaluateScript(`
  document.querySelector('[data-testid="run-ai"]')?.getAttribute('data-uid')
`);

// 2. Click
await click({ selector: `[data-uid="${uid}"]` });

// 3. Verify via polling (NOT wait_for)
const status = await evaluateScript(`
  document.querySelector('[data-testid="status"]')?.textContent
`);
```

### Pattern 2: Database State
```javascript
const dbState = await evaluateScript(`
  (async () => {
    const response = await fetch('/api/manuscripts/123');
    const data = await response.json();
    return {
      status: data.status,
      count: data.suggestions.length
    };
  })()
`);
```

### Pattern 3: Console Check
```javascript
// Use interceptor (NOT list_console_messages)
const aiLogs = await evaluateScript(`
  window.__consoleLogs.filter(l => l.message.includes('AI Pass'))
`);
```

### Pattern 4: Network Check
```javascript
// Use interceptor (NOT list_network_requests)
const apiErrors = await evaluateScript(`
  window.__fetchErrors.filter(e => e.url.includes('/ai-suggestions'))
`);
```

---

## ✅ Testing Checklist

**Before Every Test Session**:
- [ ] Install interceptors FIRST (Step 1)
- [ ] Navigate to correct URL
- [ ] Clear previous state if needed

**During Testing**:
- [ ] Use `evaluate_script` for all checks
- [ ] Use polling (NEVER `wait_for`)
- [ ] Check both console and network errors
- [ ] Verify expected UI state changes

**After Testing**:
- [ ] Report clear PASS/FAIL status
- [ ] Include error details if failed
- [ ] Note any unexpected behavior
- [ ] Provide reproduction steps if bugs found

**NEVER Do**:
- [ ] ❌ Use `list_console_messages`
- [ ] ❌ Use `take_snapshot`
- [ ] ❌ Use `wait_for`
- [ ] ❌ Skip interceptor installation
- [ ] ❌ Test without verifying dev server is running

---

## 🚀 When Following UAT Documents

If executing a formal UAT (e.g., `UAT-AI-SUGGESTIONS.md`):
1. Follow the UAT structure exactly
2. Install interceptors from Setup 0
3. Execute test suites in order
4. Stop at checkpoints if failures occur
5. Generate final report as specified

If doing ad-hoc testing:
1. Use the Quick Testing Workflow above
2. Focus on the specific feature/bug
3. Report findings in simple PASS/FAIL format

---

**Last Updated**: January 2025
**Tags**: #testing #tester-agent #token-optimized #chrome-devtools #best-practices
