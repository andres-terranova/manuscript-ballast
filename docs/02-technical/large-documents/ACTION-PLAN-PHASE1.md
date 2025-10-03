# Phase 1 Implementation: Custom Resolver Action Plan
## Execution Guide for Large Document AI Processing

**Target**: Process 85K+ word documents without browser timeout
**Strategy**: Custom `apiResolver` with sequential chunk processing
**Time Estimate**: 2-3 hours implementation + testing
**Confidence**: 95%

---

## Prerequisites Checklist

Before starting, verify:

- [ ] Supabase MCP tools available and configured
- [ ] OpenAI API key set in Supabase secrets
- [ ] Test manuscripts available in database (verified IDs below)
- [ ] Editor instance accessible via `window.__editor` in browser
- [ ] Current branch: `feature/searchMCPs` (or create new branch)

**Test Manuscripts** (Already in Supabase):
```
Small:  b080ddf6-f72e-441b-9061-73aa54ef9b02 | Love Prevails 1st Chapter | 1,247 words
Medium: 0e972f2d-c88b-4a0c-8bbc-3213d7958b1c | Tip of the Spear | 27,782 words
Large:  a44cbca8-9748-44b2-9775-73cb77de853c | Knights of Mairia | 85,337 words
XLarge: fa425244-6d54-45ce-8f9d-fd7e2519d6ea | Jensen FINAL DRAFT | 61,658 words
```

---

## Part 1: Create Edge Function (30-45 minutes)

### Task 1.1: Create Edge Function File

- [ ] Create new file: `supabase/functions/ai-suggestions-html/index.ts`

**Command**:
```bash
mkdir -p supabase/functions/ai-suggestions-html
touch supabase/functions/ai-suggestions-html/index.ts
```

### Task 1.2: Implement Edge Function

- [ ] Copy the following code to `supabase/functions/ai-suggestions-html/index.ts`

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { html, chunkId, rules } = await req.json();

    console.log(`Processing chunk ${chunkId} with ${html.length} characters`);

    // Validate input
    if (!html || typeof html !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid HTML input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const items = [];

    // Call OpenAI for each rule
    for (const rule of rules) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a ${rule.title}. ${rule.prompt}

CRITICAL INSTRUCTIONS:
1. Return suggestions in JSON format with this exact structure:
{
  "suggestions": [
    {
      "deleteHtml": "<p>exact HTML snippet to delete</p>",
      "insertHtml": "<p>exact HTML snippet to insert</p>",
      "note": "Brief explanation of the change"
    }
  ]
}

2. The deleteHtml MUST be an exact match from the input HTML (preserve all formatting, whitespace, tags)
3. Only suggest changes that improve the text according to your role
4. If no changes needed, return empty suggestions array`
            },
            {
              role: 'user',
              content: `Analyze this HTML content:\n\n${html}`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`OpenAI API error: ${response.status} - ${error}`);
        throw new Error(`OpenAI API failed: ${response.status}`);
      }

      const result = await response.json();
      const content = JSON.parse(result.choices[0].message.content || '{"suggestions":[]}');

      if (content.suggestions && Array.isArray(content.suggestions)) {
        items.push(...content.suggestions.map(s => ({
          ruleId: rule.id,
          deleteHtml: s.deleteHtml,
          insertHtml: s.insertHtml,
          chunkId: chunkId,
          note: `${rule.title}: ${s.note || 'Suggestion'}`
        })));
      }
    }

    console.log(`Chunk ${chunkId} complete: ${items.length} suggestions`);

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### Task 1.3: Deploy Edge Function

- [ ] Deploy the edge function to Supabase

**Command** (via Supabase MCP):
```bash
# Use Supabase MCP tool: mcp__supabase__deploy_edge_function
# Parameters:
# - name: "ai-suggestions-html"
# - files: [{ name: "index.ts", content: <file contents> }]
# - entrypoint_path: "index.ts"
```

**Alternative** (if MCP doesn't work):
```bash
supabase functions deploy ai-suggestions-html
```

### Task 1.4: Verify OpenAI API Key

- [ ] Check if OpenAI API key exists in Supabase secrets

**Command** (via Supabase MCP or terminal):
```bash
supabase secrets list
```

- [ ] If missing, set it:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### ✅ CHECKPOINT 1: Test Edge Function

- [ ] Test the edge function directly with curl

**Command**:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/ai-suggestions-html \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<p>This is a test sentance with a mistake.</p>",
    "chunkId": 0,
    "rules": [{
      "id": "1",
      "title": "Spell Check",
      "prompt": "Fix spelling errors"
    }]
  }'
```

**Expected Response**:
```json
{
  "items": [
    {
      "ruleId": "1",
      "deleteHtml": "<p>This is a test sentance with a mistake.</p>",
      "insertHtml": "<p>This is a test sentence with a mistake.</p>",
      "chunkId": 0,
      "note": "Spell Check: Fixed 'sentance' to 'sentence'"
    }
  ]
}
```

**If test fails**: Check edge function logs
```bash
supabase functions logs ai-suggestions-html --tail
```

---

## Part 2: Implement Custom Resolver (30-45 minutes)

### Task 2.1: Locate Editor Configuration

- [ ] Open file: `src/hooks/useTiptapEditor.ts`
- [ ] Find the `AiSuggestion.configure()` block (around lines 95-180)

### Task 2.2: Add Custom Resolver

- [ ] Replace the existing `AiSuggestion.configure()` block with this implementation:

**Location**: `src/hooks/useTiptapEditor.ts` (Lines ~95-180)

```typescript
AiSuggestion.configure({
  rules: [
    {
      id: '1',
      title: 'Grammar & Spelling',
      prompt: 'Identify and correct any grammar, spelling, or style issues',
      color: '#DC143C',
      backgroundColor: '#FFE6E6',
    },
  ],
  appId: aiSuggestionConfig.appId,
  token: aiSuggestionConfig.token,
  loadOnStart: aiSuggestionConfig.loadOnStart ?? false,
  reloadOnUpdate: aiSuggestionConfig.reloadOnUpdate ?? false,
  modelName: 'gpt-4o-mini' as const,
  model: 'gpt-4o-mini' as const,
  enableCache: true,
  chunkSize: 5,

  // 🆕 CUSTOM RESOLVER FOR LARGE DOCUMENTS
  async resolver({ defaultResolver, rules, ...options }) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return await defaultResolver({
      ...options,
      rules,

      apiResolver: async ({ html, htmlChunks, rules }) => {
        const allSuggestions = [];
        const startTime = Date.now();

        console.log(`🔄 Custom Resolver: Processing ${htmlChunks.length} chunks (${html.length} chars)`);

        // Sequential chunk processing with throttling
        for (const [index, chunk] of htmlChunks.entries()) {
          try {
            console.log(`📝 Chunk ${index + 1}/${htmlChunks.length} (${chunk.html.length} chars)`);

            const response = await fetch(`${supabaseUrl}/functions/v1/ai-suggestions-html`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                html: chunk.html,
                chunkId: chunk.id,
                rules: rules.map(r => ({
                  id: r.id,
                  prompt: r.prompt,
                  title: r.title
                }))
              })
            });

            if (!response.ok) {
              const error = await response.json();
              console.error(`❌ Chunk ${index + 1} failed:`, error);
              throw new Error(`API failed: ${response.status} - ${error.message || error.error}`);
            }

            const { items } = await response.json();
            allSuggestions.push(...items);

            console.log(`✅ Chunk ${index + 1} complete: ${items.length} suggestions`);

            // 2.5s delay between chunks (prevents rate limiting)
            if (index < htmlChunks.length - 1) {
              console.log(`⏳ Waiting 2.5s before next chunk...`);
              await new Promise(resolve => setTimeout(resolve, 2500));
            }
          } catch (error) {
            console.error(`❌ Chunk ${index + 1} error:`, error);
            throw error;
          }
        }

        const totalTime = Date.now() - startTime;
        console.log(`✅ Complete: ${allSuggestions.length} suggestions in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

        // Return in TipTap's expected format
        return {
          format: 'replacements',
          content: {
            htmlChunks,
            items: allSuggestions
          }
        };
      }
    });
  },

  // ... rest of existing config (onLoadSuggestionsError, getCustomSuggestionDecoration, etc.)
})
```

**Important**: Keep all the existing code after the resolver (onLoadSuggestionsError, getCustomSuggestionDecoration, etc.)

### Task 2.3: Verify Environment Variables

- [ ] Check that these environment variables exist in `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Task 2.4: Build and Test Compilation

- [ ] Save all files
- [ ] Run build to check for TypeScript errors

**Command**:
```bash
pnpm run build
# or just start dev server
pnpm run dev
```

**If compilation errors**: Fix TypeScript issues before proceeding

---

## Part 3: Testing & Validation (1-2 hours)

### Test 3.1: Small Document (1K words) - Baseline

- [ ] Open app in browser: `http://localhost:8080`
- [ ] Open manuscript: **Love Prevails 1st Chapter** (ID: `b080ddf6-f72e-441b-9061-73aa54ef9b02`)
- [ ] Open browser DevTools → Console tab
- [ ] Click "Run AI Pass" button
- [ ] Observe console logs

**Expected Console Output**:
```
🔄 Custom Resolver: Processing X chunks (7145 chars)
📝 Chunk 1/X (... chars)
✅ Chunk 1 complete: Y suggestions
✅ Complete: Y suggestions in ...ms
```

**Validation**:
- [ ] No errors in console
- [ ] Suggestions appear in editor
- [ ] Can accept/reject suggestions

### ✅ CHECKPOINT 2: Baseline Validation

**If test fails**:
1. Check edge function logs: `supabase functions logs ai-suggestions-html`
2. Check browser console for errors
3. Verify Supabase URL and anon key are correct
4. Test edge function directly with curl (Task 1.4)

**If test passes**: Proceed to medium document

---

### Test 3.2: Medium Document (27K words) - Rate Limit Test

- [ ] Open manuscript: **Tip of the Spear** (ID: `0e972f2d-c88b-4a0c-8bbc-3213d7958b1c`)
- [ ] Clear browser console
- [ ] Click "Run AI Pass"
- [ ] Monitor console for 2.5s delays between chunks

**Expected Behavior**:
- Processing takes ~1-3 minutes (depending on chunk count)
- See "⏳ Waiting 2.5s before next chunk..." between chunks
- No 429 rate limit errors
- All chunks complete successfully

**Validation Checklist**:
- [ ] No 429 errors (rate limiting)
- [ ] All chunks processed
- [ ] Memory usage acceptable: Check `performance.memory.usedJSHeapSize`

**Memory Check** (Browser Console):
```javascript
const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
console.log(`Memory usage: ${memoryMB} MB`);
// Should be < 500 MB
```

### ✅ CHECKPOINT 3: Rate Limiting & Memory

**If 429 errors occur**:
- Increase delay between chunks (change 2500 to 3000 or higher)
- Check OpenAI API rate limits

**If memory exceeds 500MB**:
- Reduce `chunkSize` from 5 to 3
- Monitor if it helps

**If test passes**: Proceed to large document

---

### Test 3.3: Large Document (85K words) - Critical Test ⭐

- [ ] Open manuscript: **Knights of Mairia** (ID: `a44cbca8-9748-44b2-9775-73cb77de853c`)
- [ ] Clear browser console
- [ ] **Set up position validation** (copy script below to console, don't run yet)
- [ ] Click "Run AI Pass"
- [ ] Wait for completion (~5-15 minutes)

**Position Validation Script** (Prepare in Console):
```javascript
// DO NOT RUN until AI Pass completes
function validatePositions() {
  const editor = window.__editor;
  if (!editor) {
    console.error('Editor not found on window.__editor');
    return;
  }

  const storage = editor.extensionStorage?.aiSuggestion;
  const suggestions = storage.getSuggestions();

  console.log(`\n=== POSITION VALIDATION (${suggestions.length} suggestions) ===\n`);

  let successCount = 0;
  let failCount = 0;

  suggestions.forEach((s, idx) => {
    const actual = editor.state.doc.textBetween(s.deleteRange.from, s.deleteRange.to);
    const expected = s.deleteText;
    const match = actual === expected;

    if (match) {
      successCount++;
    } else {
      failCount++;
      console.error(`❌ Mismatch #${idx + 1}:`, {
        id: s.id,
        expected: expected.substring(0, 50) + '...',
        actual: actual.substring(0, 50) + '...',
        positions: { from: s.deleteRange.from, to: s.deleteRange.to }
      });
    }
  });

  console.log(`\n=== RESULTS ===`);
  console.log(`✅ Success: ${successCount} / ${suggestions.length}`);
  console.log(`❌ Failed: ${failCount} / ${suggestions.length}`);
  console.log(`📊 Accuracy: ${((successCount / suggestions.length) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log(`\n🎉 PERFECT! All positions are accurate!`);
  } else {
    console.log(`\n⚠️  Position mapping has issues - see errors above`);
  }

  return { successCount, failCount, total: suggestions.length };
}
```

**After AI Pass completes**:
- [ ] Run validation: `validatePositions()`
- [ ] Check results

**Expected Results**:
```
=== RESULTS ===
✅ Success: X / X
❌ Failed: 0 / X
📊 Accuracy: 100.0%

🎉 PERFECT! All positions are accurate!
```

### ✅ CHECKPOINT 4: Critical Validation ⭐

**Success Criteria** (ALL must pass):
- [ ] ✅ No browser timeout (processing completes within 15 minutes)
- [ ] ✅ Position accuracy: 100% (validatePositions shows 0 failures)
- [ ] ✅ No 429 rate limit errors
- [ ] ✅ Browser memory < 500MB
- [ ] ✅ Suggestions visible in editor
- [ ] ✅ Accept/reject functionality works

**If position accuracy < 100%**:
1. ❌ **STOP - Critical issue with HTML matching**
2. Examine failed suggestions in console
3. Check if HTML format from edge function matches document
4. May need to adjust LLM prompt or HTML extraction
5. Consult Phase 2 may not be viable if this fails

**If browser timeout occurs**:
1. Check if individual chunks are timing out
2. Verify chunk processing time in console logs
3. May need to reduce chunk size further

**If memory exceeds 500MB**:
1. Check for memory leaks in console
2. Consider reducing chunk size
3. Monitor with: `performance.memory.usedJSHeapSize`

**If test passes**: Phase 1 is SUCCESSFUL! ✅

---

### Test 3.4: Accept/Reject Functionality

- [ ] Click on a suggestion in the editor
- [ ] Test "Accept" button → suggestion should apply
- [ ] Test "Reject" button → suggestion should disappear
- [ ] Verify no position drift after accepting multiple suggestions

### Test 3.5: Edge Cases

- [ ] Test with special characters (Unicode, em dashes, etc.)
- [ ] Test with nested HTML (lists, tables if present)
- [ ] Test accept suggestion → run AI Pass again (positions should still work)

---

## Part 4: Performance Metrics Collection

### Task 4.1: Gather Metrics

- [ ] Record metrics from Knights of Mairia test:

```javascript
// Run in browser console after AI Pass
const metrics = {
  documentSize: 488451, // chars
  chunkCount: '?', // from console logs
  suggestionCount: '?', // from validatePositions()
  totalTime: '?', // from console logs (ms)
  memoryUsage: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
  positionAccuracy: '?%' // from validatePositions()
};
console.table(metrics);
```

**Save these metrics** - they'll inform Phase 2 decisions

---

## Part 5: Decision Point - Ship or Continue?

### Evaluate Phase 1 Results

**Option A: Ship Phase 1 to Production** ✅

Choose this if:
- [ ] Position accuracy = 100%
- [ ] Processing time < 15 minutes for 85K words
- [ ] Memory usage < 500MB
- [ ] No browser crashes
- [ ] Users can tolerate keeping browser open
- [ ] Error rate < 5%

**Action**: Deploy with feature flag, monitor usage, document limitations

---

**Option B: Proceed to Phase 2** ⏭️

Choose this if:
- [ ] Position mapping works BUT UX is poor (15+ minute wait)
- [ ] Users complain about browser requirement
- [ ] Need progress tracking across sessions
- [ ] Memory approaching limits
- [ ] Want enterprise-grade monitoring

**Action**: Begin Phase 2 implementation (12-week job queue)

---

**Option C: Investigate Alternatives** 🔴

Choose this if:
- [ ] Position accuracy < 95% (HTML matching failed)
- [ ] Browser timeout still occurs
- [ ] Memory exceeds 500MB regularly
- [ ] Individual chunks timing out

**Action**: Consult TipTap support, consider different architecture

---

## Troubleshooting Guide

### Issue: Edge Function Returns Empty Suggestions

**Symptoms**: `items: []` in response

**Solutions**:
1. Check OpenAI API key: `supabase secrets list`
2. Check edge function logs: `supabase functions logs ai-suggestions-html`
3. Verify LLM is returning valid JSON
4. Test with simpler prompt

### Issue: Position Mismatch (validatePositions fails)

**Symptoms**: Accuracy < 100%

**Solutions**:
1. Check if `deleteHtml` exactly matches document HTML
2. Verify whitespace preservation in LLM response
3. Check for HTML entity encoding issues (e.g., `&amp;` vs `&`)
4. May need to normalize HTML before matching

### Issue: Browser Memory High

**Symptoms**: > 500MB usage

**Solutions**:
1. Reduce `chunkSize` from 5 to 3
2. Clear suggestions before running new AI Pass
3. Check for memory leaks in DevTools Memory tab
4. Consider Phase 2 (server-side processing)

### Issue: 429 Rate Limit Errors

**Symptoms**: "Rate limit exceeded" in console

**Solutions**:
1. Increase delay: Change 2500ms to 3000ms or 4000ms
2. Check OpenAI API tier limits
3. Reduce number of rules being processed
4. Consider upgrading OpenAI API tier

### Issue: Individual Chunk Timeout

**Symptoms**: Single chunk takes > 30 seconds

**Solutions**:
1. Reduce chunk size (chunkSize: 3 instead of 5)
2. Check OpenAI API response times in edge function logs
3. Simplify LLM prompts
4. Consider using faster model (gpt-3.5-turbo)

### Issue: TypeScript Compilation Errors

**Symptoms**: Build fails

**Solutions**:
1. Verify all imports are correct
2. Check `import.meta.env` usage (Vite-specific)
3. Ensure types are installed: `pnpm install @supabase/supabase-js`
4. Check for missing semicolons or brackets

---

## Rollback Instructions

**If Phase 1 needs to be reverted**:

### Task: Rollback Custom Resolver

- [ ] Open `src/hooks/useTiptapEditor.ts`
- [ ] Remove the custom `resolver` block
- [ ] Restore original `AiSuggestion.configure()` (without resolver)
- [ ] Commit: `git commit -m "Revert: Remove custom resolver - Phase 1 rollback"`

### Task: Disable Edge Function

- [ ] Don't delete, just stop using it (no calls from client)
- [ ] Or delete: `supabase functions delete ai-suggestions-html`

---

## Success Criteria Summary

### Phase 1 Complete When:

- [x] Edge function deployed and tested
- [x] Custom resolver implemented in `useTiptapEditor.ts`
- [x] Small document (1K) processes successfully
- [x] Medium document (27K) processes without rate limiting
- [x] Large document (85K) processes without timeout
- [x] Position validation shows 100% accuracy
- [x] Memory usage < 500MB
- [x] Accept/reject functionality works
- [x] Decision made: Ship, Phase 2, or Investigate

---

## Next Steps After Phase 1

### If Shipping to Production:

1. [ ] Create feature flag: `ENABLE_LARGE_DOC_PROCESSING`
2. [ ] Deploy to staging environment
3. [ ] Test with real users (beta group)
4. [ ] Monitor metrics (processing time, error rate, memory)
5. [ ] Gradual rollout (10% → 50% → 100%)
6. [ ] Document known limitations (must keep browser open)

### If Proceeding to Phase 2:

1. [ ] Review Phase 2 implementation guide: `implementation-guide-phased-approach.md`
2. [ ] Begin database schema design for job queue
3. [ ] Plan 12-week implementation timeline
4. [ ] Keep Phase 1 as fallback for medium documents

### If Investigating Alternatives:

1. [ ] Document specific failures (position accuracy, timeouts, etc.)
2. [ ] Consult TipTap support with error details
3. [ ] Research alternative approaches:
   - TipTap Collaboration extension
   - Different LLM provider
   - Client-side Web Workers
   - Server-Sent Events (SSE)

---

## Key Files Modified

**Created**:
- ✅ `supabase/functions/ai-suggestions-html/index.ts`

**Modified**:
- ✅ `src/hooks/useTiptapEditor.ts` (Lines ~95-180)

**Environment**:
- ✅ `OPENAI_API_KEY` in Supabase secrets
- ✅ `VITE_SUPABASE_URL` in `.env.local`
- ✅ `VITE_SUPABASE_ANON_KEY` in `.env.local`

---

## Commands Quick Reference

```bash
# Deploy edge function
supabase functions deploy ai-suggestions-html

# Check logs
supabase functions logs ai-suggestions-html --tail

# Test edge function
curl -X POST https://your-project.supabase.co/functions/v1/ai-suggestions-html \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"html":"<p>test</p>","chunkId":0,"rules":[{"id":"1","title":"Test","prompt":"test"}]}'

# Start dev server
pnpm run dev

# Build for production
pnpm run build

# Check Supabase secrets
supabase secrets list

# Set secret
supabase secrets set OPENAI_API_KEY=sk-...
```

---

**Implementation Status**: Ready to Execute
**Estimated Time**: 2-3 hours
**Last Updated**: October 3, 2025
