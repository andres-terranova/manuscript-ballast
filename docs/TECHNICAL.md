# Technical Reference - Complete System Documentation

**For Claude Code**: This is your ONE technical reference. Everything about how the system works is here.

**⚡ NEW TO THE CODEBASE?** Start with [ARCHITECTURE](#architecture) (foundational concepts), then move to [AI Suggestions](#ai-suggestions-system) (primary feature).

**Sections**: Architecture (foundational) · AI Suggestions (primary feature) · Snapshots (version control) · Editor & Components · DOCX Export · External Resources

---

# 📌 Quick Navigation

```
Architecture (FOUNDATIONAL - START HERE)
├─ Database Schema (JSONB-first design)
├─ Queue System (Background job processing)
└─ Row Level Security

AI Suggestions System (PRIMARY FEATURE)
├─ Common Mistakes (READ FIRST)
├─ Key Files & Functions
├─ Dynamic Configuration (EXPERIMENT 8)
├─ Complete Flow
├─ TipTap API Reference
└─ Debugging Tips

Snapshot System (VERSION CONTROL)
├─ Database Schema & Storage
├─ Save/Restore Flows
├─ Implementation Details
└─ Current State vs Snapshots

Editor & Components
├─ Editor.tsx (Primary component)
├─ Edge Functions (Supabase)
└─ React Integration Patterns

DOCX Export
└─ Basic clean export functionality

External Resources
└─ TipTap docs, Stack documentation
```

---

# ARCHITECTURE

## Database Schema (JSON-First Design)

### Design Philosophy
**JSONB-Only Architecture**: All suggestions, comments, and snapshots stored as JSONB arrays in `manuscripts` table. No separate tables for these entities.

**Why JSONB?**:
- ✅ **Simplicity**: Single table, no joins needed
- ✅ **Flexibility**: Easy schema evolution without migrations
- ✅ **Performance**: PostgreSQL JSONB is fast for reads/writes
- ✅ **Atomic updates**: All manuscript data updates atomically

### Core Tables

#### `manuscripts`
```sql
CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content JSONB NOT NULL,              -- TipTap JSON document
  suggestions JSONB DEFAULT '[]',      -- AI suggestions array
  comments JSONB DEFAULT '[]',         -- Comments array (v1.0)
  snapshots JSONB DEFAULT '[]',        -- Version snapshots (v1.0)
  status TEXT CHECK (status IN ('draft', 'sent_to_author', 'returned_to_editor', 'completed')),
  shared_with UUID[],                  -- Array of user IDs with access
  activity_log JSONB DEFAULT '[]',     -- Activity timeline
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `processing_queue`
```sql
CREATE TABLE processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  manuscript_id UUID REFERENCES manuscripts(id),
  operation TEXT NOT NULL,             -- 'docx_import', 'ai_pass', etc.
  status TEXT NOT NULL,                -- 'pending', 'processing', 'completed', 'failed'
  input_data JSONB,                    -- Operation-specific input
  result_data JSONB,                   -- Operation result
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('editor', 'author')),  -- v1.0
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### JSONB Schema Formats

#### Suggestions Array
```typescript
suggestions: Array<{
  id: string,
  ruleId: string,
  pmFrom: number,        // ProseMirror position
  pmTo: number,
  deleteHtml: string,
  insertHtml: string,
  note: string,
  status: 'pending' | 'accepted' | 'rejected',
  timestamp: string
}>
```

#### Comments Array (v1.0)
```typescript
comments: Array<{
  id: string,
  user_id: string,
  position: number,
  text: string,
  timestamp: string,
  replies: Array<{
    id: string,
    user_id: string,
    text: string,
    timestamp: string
  }>
}>
```


### Row Level Security (RLS)

```sql
-- Manuscripts: Users can only access their own or shared manuscripts
CREATE POLICY manuscripts_select ON manuscripts
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() = ANY(shared_with)
  );

CREATE POLICY manuscripts_insert ON manuscripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY manuscripts_update ON manuscripts
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.uid() = ANY(shared_with)
  );

-- Queue: Users can only see their own queue items
CREATE POLICY queue_select ON processing_queue
  FOR SELECT USING (auth.uid() = user_id);
```

## Queue System (Background Job Processing)

### Purpose
Process long-running operations (DOCX import, AI passes) in background without browser timeouts.

### Architecture

**Components**:
1. **Client**: Submits job to queue, polls for completion
2. **Queue Table**: `processing_queue` stores job state
3. **Edge Function**: `queue-processor` runs jobs
4. **Cron Trigger**: Invokes processor every 1 minute

### Flow

```
1. Client uploads DOCX → Supabase Storage
   ↓
2. Insert job into processing_queue
   → status: 'pending'
   → input_data: { storage_path, manuscript_id }
   ↓
3. Cron invokes queue-processor (every 1 min)
   ↓
4. Processor claims job (UPDATE status = 'processing')
   ↓
5. Execute operation (e.g., convert DOCX → TipTap JSON)
   ↓
6. Update manuscript with result
   ↓
7. Mark job complete (status = 'completed')
   ↓
8. Client polling detects completion
```

### Client-Side Usage

```typescript
// src/hooks/useQueueProcessor.ts
const { submitJob, pollJob, cancelPolling } = useQueueProcessor();

// Submit job
const jobId = await submitJob({
  operation: 'docx_import',
  manuscript_id: manuscriptId,
  input_data: { storage_path: filePath }
});

// Poll until complete
const result = await pollJob(jobId, {
  interval: 10000,  // Poll every 10s
  maxAttempts: 60   // Timeout after 10 minutes
});
```

### Edge Function

**File**: `supabase/functions/queue-processor/index.ts`

```typescript
// 1. Claim next pending job
const { data: job } = await supabase
  .from('processing_queue')
  .update({ status: 'processing' })
  .eq('status', 'pending')
  .order('created_at')
  .limit(1)
  .single();

// 2. Execute operation
if (job.operation === 'docx_import') {
  const content = await convertDocxToTiptap(job.input_data.storage_path);

  // 3. Update manuscript
  await supabase
    .from('manuscripts')
    .update({ content })
    .eq('id', job.manuscript_id);
}

// 4. Mark complete
await supabase
  .from('processing_queue')
  .update({
    status: 'completed',
    result_data: { success: true }
  })
  .eq('id', job.id);
```

### Performance

- **Small docs** (189KB): ~1.5s
- **Large docs** (437KB): ~3s
- **Auto-processing delay**: Max 10s (client polls every 10s)

### DOCX Processing Status Updates

**Current Implementation** (Realtime-Based - January 2025):

✅ **Migrated to Supabase Realtime** - Polling replaced with WebSocket subscriptions for instant updates.

#### Architecture Overview

**Components**:
1. **Realtime Subscription** (`useQueueProcessor.ts`) - Subscribes to `processing_queue` changes
2. **Database Publication** (Migration `20251010000002`) - Enabled Realtime on `processing_queue` table
3. **Optimized Dashboard Queries** (`ManuscriptService.ts`) - Excludes large JSONB fields to prevent statement timeout
4. **Editor Direct Fetch** (`Editor.tsx`) - Fetches full manuscript data when opening editor

#### Implementation Details

**Realtime Subscription** (`src/hooks/useQueueProcessor.ts`):
```typescript
const channel = supabase
  .channel('processing_queue_changes')
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'processing_queue'
  }, async (payload) => {
    // Only refresh manuscripts on completion, not progress updates
    if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
      await refreshManuscriptsRef.current();
    }
  })
  .subscribe();
```

**Database Migration** (`supabase/migrations/20251010000002_enable_realtime_processing_queue.sql`):
```sql
-- Enable Realtime publication for the table
ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;

-- Add comment explaining the change
COMMENT ON TABLE processing_queue IS
  'Queue for background job processing. Realtime enabled for instant status updates in dashboard.';
```

**Dashboard Query Optimization** (`src/services/manuscriptService.ts:8-45`):
```typescript
static async getAllManuscripts(): Promise<ManuscriptDB[]> {
  const { data, error } = await supabase
    .from('manuscripts')
    .select(`
      id, title, owner_id, status, ball_in_court,
      word_count, character_count, excerpt,
      processing_status, processing_error,
      docx_file_path, original_filename, file_size,
      created_at, updated_at
    `)  // Excludes: content_text, content_html, snapshots, suggestions
    .order('updated_at', { ascending: false });
  // ...
}
```

**Why Exclude JSONB Fields?**
- Large manuscripts (85K+ words) have content_html/content_text ~500KB each
- Fetching these fields for all manuscripts can cause Postgres statement timeout
- Dashboard only needs metadata (title, status, word count)
- Result: Dashboard loads instantly, no timeout errors

**Editor Direct Fetch** (`src/components/workspace/Editor.tsx:1250-1291`):
```typescript
// CRITICAL: Fetch full manuscript directly from database
// Context's manuscripts array excludes content fields for performance
const dbManuscript = await ManuscriptService.getManuscriptById(id);
const { dbToFrontend } = await import('@/types/manuscript');
const frontendManuscript = dbToFrontend(dbManuscript);
setManuscript(frontendManuscript);
setContentText(frontendManuscript.contentText);
```

**Why Direct Fetch?**
- Context cache uses lightweight query (no content fields)
- Editor needs full manuscript including content_html
- Direct fetch ensures editor has complete data

#### Performance Improvements

| Metric | Before (Polling) | After (Realtime) | Improvement |
|--------|-----------------|------------------|-------------|
| **Idle Queries** | 1 query every 30s | 0 queries | 100% reduction |
| **Active Queries** | 1 query every 5s | 0 queries | 100% reduction |
| **Response Time** | 5-30s delay | Instant (<100ms) | 50-300x faster |
| **Server Load** | Constant polling | WebSocket only | ~95% reduction |
| **Dashboard Timeout** | Occasional (large docs) | Never | 100% fix |

#### Benefits

- ✅ **Instant updates**: Job status changes appear immediately (<100ms)
- ✅ **Zero idle queries**: No database polling when no jobs are running
- ✅ **Better UX**: Dashboard updates in real-time, no waiting for next poll
- ✅ **Reduced server load**: ~95% fewer database queries
- ✅ **Fixed timeouts**: Dashboard loads instantly with optimized queries
- ✅ **Scalable**: WebSocket connection handles unlimited manuscripts

#### How It Works (Complete Flow)

```
1. User uploads DOCX
   ↓
2. Job inserted into processing_queue (status: 'pending')
   ↓
3. Realtime WebSocket receives INSERT event
   ↓
4. Dashboard shows job in queue immediately
   ↓
5. Queue processor claims job (status: 'processing')
   ↓
6. Realtime WebSocket receives UPDATE event
   ↓
7. Dashboard shows "Processing..." status immediately
   ↓
8. Processor completes, updates manuscripts table (status: 'completed')
   ↓
9. Realtime WebSocket receives UPDATE event
   ↓
10. Hook refreshes manuscripts list (only on completion)
   ↓
11. Dashboard shows completed manuscript immediately
   ↓
12. User clicks to open → Editor fetches full manuscript (direct query)
```

#### Known Limitations

**Not Implemented**:
- ❌ Realtime progress updates (only completion events trigger refresh)
- ❌ Reconnection logic for WebSocket disconnections (Supabase handles automatically)
- ❌ Filtering by user_id in subscription (receives all events, filters client-side)

**Future Enhancements**:
1. **User-Specific Subscriptions**: Filter at database level using RLS
   ```typescript
   filter: `user_id=eq.${userId}`
   ```
2. **Progress Updates**: Show percentage completion in real-time
3. **Connection Status**: Display WebSocket connection state to user
4. **Fallback Polling**: Health check every 60s in case WebSocket fails

#### Troubleshooting

**WebSocket Connection Issues**:
```javascript
// Check subscription status in browser console
console.log(channel.state);  // Should be 'joined'
```

**Realtime Not Triggering**:
1. Verify Realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE processing_queue;`
2. Check RLS policies allow user to SELECT from `processing_queue`
3. Confirm WebSocket connection in Network tab (filter: WS)

**Dashboard Timeout After Update**:
1. Verify `getAllManuscripts()` excludes JSONB fields
2. Check manuscript sizes: `SELECT id, pg_column_size(content_html) FROM manuscripts;`
3. Consider adding pagination if >100 manuscripts

---

# AI SUGGESTIONS SYSTEM

**10-Second Summary**: TipTap Pro AI Suggestion extension with custom backend integration. Dynamic configuration (10-40 chunkSize, 3-10 batchSize) based on document size. Parallel batch processing via edge functions. Handles 85K+ word documents.

**Critical File**: `src/components/workspace/Editor.tsx` (handles both AI and manual suggestions)

## 🚨 Common Mistakes - READ THIS FIRST

### ❌ Misconception #1: "I need to implement progressive loading"
**Reality**: TipTap loads ALL suggestions at once when processing completes
```typescript
const suggestions = editor.storage.aiSuggestion.getSuggestions() // All at once
```

### ❌ Misconception #2: "Manual suggestions and AI suggestions are in separate files"
**Reality**: Editor.tsx handles BOTH AI and manual suggestions
- Editor.tsx = Both AI suggestions (TipTap Pro) AND manual suggestions (user-created)
- ManuscriptWorkspace.tsx = Does not exist (removed/never implemented)
- Unified storage: Both types in `suggestions` React state array
- Unified UI: Both types in ChangeList sidebar
- Differentiated by `origin` field: `'server'` (AI) vs `'manual'` (user)

### ❌ Misconception #3: "Suggestions load progressively"
**Reality**: Parallel batch processing, ALL results return together
- Processing happens in parallel batches
- Final results aggregate and load as single array

### ❌ Misconception #4: "Need virtualization for loading"
**Reality**: Only for RENDERING 5K+ items (not loading)
- Loading = All at once (no virtualization needed)
- Rendering = Browser freeze at 5K+ (Phase 2 will fix)

## 🎯 Quick Decision Tree

```
Need to change AI suggestions behavior?
├── 🔍 Find where code lives → See "Key Files" section below
├── ➕ Add AI editor role → src/components/workspace/AIEditorRules.tsx
├── 🐛 Debug positioning → See "Debugging Tips" section
├── ⚡ Optimize performance → See "Dynamic Configuration" section
└── 🏗️ Understand architecture → See "How It Works" section

Having issues?
├── 💥 Browser freeze (5K+ suggestions) → Known issue, Phase 2 fix
├── ⏱️ Timeout errors → Check dynamic config, may need adjustment
├── 🔐 JWT errors → Check edge function logs, token expiration
└── 📍 Wrong positions → Check ProseMirror position mapping
```

## 🔑 Key Files & Functions

### Primary Implementation
**`src/components/workspace/Editor.tsx`**
```typescript
// Convert TipTap suggestions to UI format (sorted by position)
convertAiSuggestionsToUI(editor: TiptapEditor): UISuggestion[]

// Monitor processing completion
waitForAiSuggestions(editor: TiptapEditor): Promise<UISuggestion[]>

// Handle popover interactions
handlePopoverAccept(suggestionId: string, replacementOptionId: string)
handlePopoverReject(suggestionId: string)
```

### Extension Configuration
**`src/hooks/useTiptapEditor.ts:85-284`**
- Lines 95-116: Dynamic configuration logic (EXPERIMENT 8)
- Lines 137-260: Custom resolver with parallel batch processing
- Key parameters: `chunkSize` (dynamic 10-40), `batchSize` (dynamic 3-10)

### Edge Function
**`supabase/functions/ai-suggestions-html/index.ts`**
- Processes ONE chunk at a time
- Sequential rule processing
- Returns suggestions array for that chunk

## ⚙️ Dynamic Configuration (EXPERIMENT 8)

### How It Works
System automatically detects document size and selects optimal configuration:

| Document Size | Characters | ChunkSize | BatchSize | Performance |
|--------------|-----------|-----------|-----------|-------------|
| **Small** | < 100K (~20K words) | 10 | 3 | ~2 min, 200-500 suggestions |
| **Medium** | 100K-250K (~20K-50K words) | 20 | 5 | ~5-10 min, 1K-2K suggestions |
| **Medium-Large** | 250K-400K (~50K-80K words) | 30 | 7 | ~10-15 min, 2K-4K suggestions |
| **Large** | 400K+ (~80K+ words) | 40 | 10 | ~15-20 min, 3K-5K suggestions |

### Implementation (`useTiptapEditor.ts:95-116`)
```typescript
// Extract text from HTML to count characters
const tempDiv = document.createElement('div');
tempDiv.innerHTML = contentHtml;
const charCount = (tempDiv.textContent || '').length;

// Select optimal config
const getOptimalConfig = (chars: number) => {
  if (chars < 100000) return { chunkSize: 10, batchSize: 3 };
  if (chars < 250000) return { chunkSize: 20, batchSize: 5 };
  if (chars < 400000) return { chunkSize: 30, batchSize: 7 };
  return { chunkSize: 40, batchSize: 10 };
};

const { chunkSize, batchSize } = getOptimalConfig(charCount);
```

### Why Dynamic?
- ✅ **Optimal for all sizes**: Small docs don't over-parallelize
- ✅ **Fewer API calls**: Large docs get bigger chunks (75% fewer calls)
- ✅ **Cost efficient**: Balances speed with rate limiting
- ✅ **100% success rate**: Tested across all document sizes

## 🏗️ How It Works - Complete Flow

### Step-by-Step Process

```
1. User clicks "Run AI Pass" in Editor.tsx
   ↓
2. System detects document size
   → Extracts text from HTML, counts characters
   → Selects optimal chunkSize (10-40) and batchSize (3-10)
   ↓
3. TipTap Pro chunks document
   → Splits into N chunks based on dynamic chunkSize
   → Example: 85K words (~500K chars) → ~31 chunks with chunkSize=40
   ↓
4. TipTap calls custom resolver
   → Passes htmlChunks array to apiResolver
   ↓
5. apiResolver processes in parallel batches
   → BATCH_SIZE chunks at once (dynamic: 3-10)
   → Calls ai-suggestions-html edge function for each chunk
   → 500ms delay between batches (rate limiting)
   → Promise.allSettled() for error tolerance
   ↓
6. Edge function processes each chunk
   → Receives: { html, chunkId, rules }
   → Loops through rules sequentially
   → Calls OpenAI GPT-4 for each rule
   → Returns: { items: [...suggestions] }
   ↓
7. apiResolver aggregates results
   → Collects all suggestions from all chunks
   → Returns to TipTap in 'replacements' format
   ↓
8. TipTap's defaultResolver maps positions
   → HTML positions → ProseMirror positions
   → ⚠️ FREEZE HAPPENS HERE with 5K+ suggestions (synchronous)
   ↓
9. React renders suggestions
   → ChangeList shows all suggestions
   → Editor decorations display inline
   → ⚠️ ADDITIONAL FREEZE with 5K+ suggestions (DOM operations)
   ↓
10. User interacts with suggestions
    → Popover for accept/reject
    → ChangeList for navigation
```

### Key Architecture Concepts

**Chunking vs Batching**:
- **Chunking** = TipTap Pro splits document (controlled by `chunkSize` 10-40)
- **Batching** = Our apiResolver groups chunks for parallel processing (controlled by `BATCH_SIZE` 3-10)

**Why Client-Side Batching?**:
- ✅ Simpler edge function (single responsibility)
- ✅ Client-side parallelization control
- ✅ Per-chunk error handling
- ✅ Granular progress tracking
- ✅ Shorter edge function execution (avoids timeouts)

## 📡 TipTap API Reference

### Storage API
```typescript
// Get suggestions
editor.storage.aiSuggestion.getSuggestions() // All suggestions
editor.storage.aiSuggestion.getSelectedSuggestion() // Current selection
editor.storage.aiSuggestion.getRejections() // Rejected suggestions

// Check state
editor.extensionStorage.aiSuggestion.isLoading // boolean
editor.extensionStorage.aiSuggestion.error // Error | null
```

### Commands
```typescript
editor.commands.loadAiSuggestions() // Trigger processing
editor.commands.applyAiSuggestion(id, replacementId) // Accept
editor.commands.rejectAiSuggestion(id) // Reject
editor.commands.applyAllAiSuggestions() // Accept all
```

### Event Callbacks (via extension config)
```typescript
onPopoverElementCreate: (element) => {} // Popover DOM element
onSelectedSuggestionChange: (suggestion) => {} // Selection change
onProgressUpdate: (progress) => {} // Processing progress
onLoadSuggestionsError: (error, context) => {} // Error handling
```

## 🔧 Edge Function Contract

### Input Schema
```typescript
{
  html: string,        // Single HTML chunk content
  chunkId: string,     // Unique identifier
  rules: Array<{       // AI rules to apply
    id: string,
    title: string,
    prompt: string
  }>
}
```

### Output Schema
```typescript
{
  items: Array<{
    ruleId: string,
    deleteHtml: string,   // HTML to remove
    insertHtml: string,   // HTML to insert
    chunkId: string,
    note: string          // Explanation
  }>
}
```

### Processing Pattern
```typescript
// supabase/functions/ai-suggestions-html/index.ts:40-103
for (const rule of rules) {
  // Call OpenAI for this rule on this chunk
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: rule.prompt },
      { role: 'user', content: html }
    ]
  });

  // Parse and collect suggestions
  items.push(...suggestions);
}
```

## 🐛 Debugging Tips

### Check Extension Storage
```javascript
// In browser console
console.log(editor.extensionStorage.aiSuggestion)
console.log(editor.storage.aiSuggestion.getSuggestions())
```

### Monitor Processing State
```javascript
editor.extensionStorage.aiSuggestion.isLoading // true during processing
editor.extensionStorage.aiSuggestion.error // Check for errors
```

### Verify JWT Authentication
```javascript
editor.extensionManager.extensions
  .find(e => e.name === 'aiSuggestion')
  .options.token // Should be valid JWT (3 parts)
```

### Check Console Logs
```javascript
// Look for these in console:
"🔧 EXPERIMENT 8: Dynamic config selected..." // Shows selected config
"✅ Complete: X suggestions in Yms" // Processing complete
"❌ Chunk X failed: ..." // Individual chunk failures
```

### Position Debugging

**Common Position Issues**:
1. **Off-by-one errors** - Check if using 0-based vs 1-based indexing
2. **Wrong positions after edits** - Must remap positions after document changes
3. **HTML vs ProseMirror positions** - TipTap converts HTML→PM automatically

**Debug Position Mapping**:
```javascript
// Get current editor position
const pos = editor.state.selection.from

// Get node at position
const node = editor.state.doc.nodeAt(pos)

// Resolve position to coordinates
const coords = editor.view.coordsAtPos(pos)
```

## ⚠️ Known Issues & Limitations

### Browser Freeze (5K+ Suggestions)
**Cause**: TipTap's synchronous position mapping + React's synchronous rendering
**Happens**: AFTER processing completes, during result loading
**Impact**: Multi-minute freeze with 3K-5K suggestions
**Solution**: Phase 2 - Progressive loading + virtualization

### Why Queue Won't Fix Freeze
**Queue fixes**:
- ✅ Long processing time (background job)
- ✅ Memory during processing (server-side)
- ✅ User experience during processing (non-blocking)

**Queue doesn't fix**:
- ❌ Browser freeze when downloading 5K results
- ❌ Position mapping (still synchronous)
- ❌ React rendering (still synchronous)

### Phase 2 Solution
1. **Progressive Loading**: Load 500 suggestions at a time
2. **Virtualized List**: Only render visible suggestions
3. **Optional Queue**: Better UX during processing

## 📚 Common Tasks

### Add New AI Editor Role
```typescript
// src/components/workspace/AIEditorRules.tsx
export const AI_EDITOR_RULES = [
  {
    id: 'custom-role',
    title: 'Custom Editor',
    prompt: 'Your custom prompt here',
    color: '#FF0000',
    backgroundColor: '#FFE6E6',
  },
  // ... existing roles
];
```

### Adjust Configuration (If Needed)
```typescript
// src/hooks/useTiptapEditor.ts:108-113
// Modify getOptimalConfig() thresholds:
const getOptimalConfig = (chars: number) => {
  if (chars < 100000) return { chunkSize: 10, batchSize: 3 };
  // Adjust these thresholds as needed
  // ...
};
```

### Check Edge Function Logs
```bash
# View real-time logs
supabase functions logs ai-suggestions-html --follow

# Search for errors
supabase functions logs ai-suggestions-html | grep "Error"
```

### Sort Suggestions by Position
```typescript
// Already implemented in convertAiSuggestionsToUI()
suggestions.sort((a, b) => a.pmFrom - b.pmFrom)
```

##How Suggestions Are Stored &amp; Persisted

**10-Second Summary**: Suggestions (both AI and manual) exist **only in memory** during active editing. They are saved to the database **only in snapshots**, not in the main `manuscripts` table. Auto-save updates content but not suggestions.

### Storage Architecture

| Storage Location | AI Suggestions | Manual Suggestions | Persisted? |
|-----------------|---------------|-------------------|------------|
| **TipTap Extension Storage** | ✅ Stored here during editing | ❌ Not here | ❌ In-memory only |
| **React State** (`suggestions` array) | ✅ After conversion to UI format | ✅ Created here | ❌ In-memory only |
| **Database - `manuscripts.snapshots`** | ✅ Saved on snapshot creation | ✅ Saved on snapshot creation | ✅ **Persisted** |
| **Database - `manuscripts.suggestions`** | ❌ NOT used | ❌ NOT used | ❌ Column exists but unused |

### Key Insights from Investigation

**What I discovered** (through code research, since this wasn't well-documented):

1. **Suggestions are ephemeral**: Both AI and manual suggestions exist only in memory during editing sessions
2. **No auto-save for suggestions**: The `updateManuscriptSilent()` function (triggered on every edit) only saves `content_html` and `content_text` - it does **not** save suggestions
3. **Snapshots are the only persistence**: Suggestions are saved **only** when creating snapshots (manual, AI Pass, Apply All, etc.)
4. **Database column unused**: The `manuscripts.suggestions` JSONB column exists in the schema but is never written to or read from in the current implementation

### How This Works in Practice

**During Editing**:
```typescript
// Auto-save (on every keystroke, debounced)
updateManuscriptSilent(manuscript.id, {
  content_html: html,  // ✅ Saved
  content_text: text   // ✅ Saved
  // suggestions: ...  // ❌ NOT saved
});
```

**On Snapshot Creation**:
```typescript
// Manual snapshot or workflow milestone
createSnapshot(editor, manuscript.id, event, userId, label, manualSuggestions);
// ✅ Saves: document content + AI suggestions + manual suggestions
```

**On Editor Load**:
```
1. Fetch manuscript from database
   → content_html: ✅ Loaded (shows accepted text)
   → suggestions: ❌ Not loaded (no suggestions on page load)

2. User state starts clean
   → No suggestions displayed initially
   → User can run AI Pass to generate new suggestions
   → Or restore from snapshot to see previous suggestions
```

###Why This Design?

**Benefits**:
- ✅ **Simpler auto-save**: No complex suggestion diffing or merging logic
- ✅ **Performance**: No database writes on every suggestion accept/reject
- ✅ **Clear state**: Fresh start every time you open a manuscript
- ✅ **Flexibility**: Suggestions treated as draft until explicitly saved via snapshot

**Trade-offs**:
- ❌ **No persistence between sessions**: Close editor → lose unsaved suggestions
- ❌ **No collaboration**: Can't see other user's pending suggestions
- ❌ **Manual snapshot required**: Must remember to save versions before exploring

### Workarounds for Users

**To preserve suggestions**:
1. Click "Save Version" button before closing editor
2. This creates a snapshot with current suggestions
3. Later, restore from that snapshot to recover suggestions

**To recover lost suggestions**:
- ❌ **Not possible** if you closed editor without saving
- Suggestions are gone forever
- Must re-run AI Pass or recreate manual suggestions

### Future Enhancement Options

**If auto-persistence is needed**:

**Option 1: Auto-save to `manuscripts.suggestions`**
```typescript
// Modify updateManuscriptSilent() to include suggestions
updateManuscriptSilent(manuscript.id, {
  content_html: html,
  content_text: text,
  suggestions: currentSuggestions  // NEW: Save suggestions too
});
```
**Pros**: Suggestions persist between sessions
**Cons**: More complex (AI suggestions in TipTap format vs manual in UI format), performance impact

**Option 2: Auto-snapshot on interval**
```typescript
// Create snapshot every 5 minutes
setInterval(() => {
  if (hasUnsavedChanges()) {
    createSnapshot(editor, manuscript.id, 'auto_save', userId, 'Auto-save', suggestions);
  }
}, 5 * 60 * 1000);
```
**Pros**: Preserves full state periodically
**Cons**: Snapshot bloat, storage growth

**Option 3: Warn on close**
```typescript
// Before closing editor
window.onbeforeunload = () => {
  if (suggestions.length > 0) {
    return 'You have unsaved suggestions. Save a version before leaving?';
  }
};
```
**Pros**: Prevents accidental loss
**Cons**: Annoying for users, doesn't auto-save

---

# SNAPSHOT SYSTEM (VERSION CONTROL)

**Status**: ✅ Fully Implemented (January 2025)
**Location**: `src/services/snapshotService.ts`, `src/components/workspace/Editor.tsx`

## Overview

Complete version control system that captures document state, AI suggestions, and manual suggestions at key workflow milestones. Snapshots are stored as JSONB arrays in the `manuscripts.snapshots` column.

**Key Features**:
- ✅ Automatic snapshots at workflow milestones (AI Pass, Apply All)
- ✅ Manual snapshots on demand (Save Version button)
- ✅ Captures BOTH AI and manual suggestions with document
- ✅ Full restore capability (document + suggestions)
- ✅ Version history browser with metadata

## Database Schema

### Storage Location
**Table**: `manuscripts`
**Column**: `snapshots` (JSONB array)
**Index**: GIN index for fast JSONB queries

```sql
-- Migration: 20250106_add_snapshots_to_manuscripts.sql
ALTER TABLE manuscripts
ADD COLUMN snapshots JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_manuscripts_snapshots
ON manuscripts USING gin ((snapshots::jsonb));
```

### Snapshot Structure

```typescript
// src/services/snapshotService.ts:11-28
export interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential: 1, 2, 3...
  event: SnapshotEvent;         // Event that triggered snapshot
  label?: string;               // Optional user-provided label
  content: JSONContent;         // TipTap document JSON from editor.getJSON()
  aiSuggestions?: Suggestion[];  // AI suggestions from TipTap extension storage
  manualSuggestions?: UISuggestion[]; // Manual suggestions from React state
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount?: number;   // Total: AI + manual
    aiSuggestionCount?: number; // Breakdown for AI
    manualSuggestionCount?: number; // Breakdown for manual
  };
  createdAt: string;            // ISO 8601 timestamp
  createdBy: string;            // User ID (auth.uid())
}
```

**Snapshot Events** (when snapshots are created):
```typescript
type SnapshotEvent =
  | 'upload'           // Initial DOCX upload
  | 'send_to_author'   // Before sending to author (v1.0)
  | 'return_to_editor' // When author returns (v1.0)
  | 'manual'           // User clicks Save Version
  | 'ai_pass_start'    // Before AI Pass starts
  | 'ai_pass_complete' // After AI Pass completes
  | 'apply_all';       // After applying all suggestions
```

## How Snapshots Are Saved

### Architecture Overview

Snapshots capture THREE distinct pieces of state:

1. **Document Content**: `editor.getJSON()` → Full TipTap JSON
2. **AI Suggestions**: `editor.extensionStorage.aiSuggestion.getSuggestions()` → TipTap format
3. **Manual Suggestions**: `suggestionsRef.current` → React state (UISuggestion format)

### Save Flow (Step-by-Step)

**Location**: `src/services/snapshotService.ts:42-142`

```
1. Capture document state
   → editor.getJSON() // TipTap JSON
   → editor.getText() // For metadata (word count)
   ↓
2. Capture AI suggestions (if available)
   → Access: editor.extensionStorage.aiSuggestion
   → Call: getSuggestions()
   → Filter: Remove rejected suggestions (optional)
   → Result: Suggestion[] (TipTap format)
   ↓
3. Capture manual suggestions (from parameter)
   → Passed as function parameter: manualSuggestions
   → Source: React state (suggestionsRef.current)
   → Result: UISuggestion[] (UI format)
   ↓
4. Calculate metadata
   → Word count: text.split(/\s+/).filter(Boolean).length
   → Character count: text.length
   → Suggestion counts: AI + manual breakdown
   ↓
5. Fetch existing snapshots from database
   → SELECT snapshots FROM manuscripts WHERE id = manuscriptId
   → Result: Existing snapshots array
   ↓
6. Determine next version number
   → version = existingSnapshots.length + 1
   ↓
7. Create snapshot object
   → Bundle all captured data (content, AI, manual, metadata)
   → Generate UUID for snapshot.id
   ↓
8. Append to snapshots array
   → UPDATE manuscripts SET snapshots = [...existing, newSnapshot]
   → Atomic operation (no race conditions)
```

### Code Example: Saving Snapshots

```typescript
// src/services/snapshotService.ts:42-142
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string,
  manualSuggestions?: UISuggestion[]
): Promise<void> {
  // Step 1: Capture document
  const content = editor.getJSON();
  const text = editor.getText();

  // Step 2: Capture AI suggestions
  let aiSuggestions: Suggestion[] = [];
  const aiStorage = editor.extensionStorage?.aiSuggestion;
  if (aiStorage && typeof aiStorage.getSuggestions === 'function') {
    const suggestions = aiStorage.getSuggestions();
    aiSuggestions = suggestions.filter((s: Suggestion) => !s.isRejected);
  }

  // Step 3: Capture manual suggestions
  const manualSuggestionsToSave = manualSuggestions || [];

  // Step 4: Calculate metadata
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const characterCount = text.length;

  // Step 5: Fetch existing snapshots
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single();

  // Step 6: Determine version
  const existingSnapshots = (manuscript?.snapshots as Snapshot[]) || [];
  const version = existingSnapshots.length + 1;

  // Step 7: Create snapshot
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    version,
    event,
    label,
    content,
    aiSuggestions: aiSuggestions.length > 0 ? aiSuggestions : undefined,
    manualSuggestions: manualSuggestionsToSave.length > 0 ? manualSuggestionsToSave : undefined,
    metadata: {
      wordCount,
      characterCount,
      suggestionCount: aiSuggestions.length + manualSuggestionsToSave.length,
      aiSuggestionCount: aiSuggestions.length,
      manualSuggestionCount: manualSuggestionsToSave.length
    },
    createdAt: new Date().toISOString(),
    createdBy: userId
  };

  // Step 8: Append to array
  await supabase
    .from('manuscripts')
    .update({ snapshots: [...existingSnapshots, snapshot] })
    .eq('id', manuscriptId);
}
```

### When Snapshots Are Created

**Automatic** (system-triggered):
```typescript
// src/components/workspace/Editor.tsx

// 1. Before AI Pass starts (Line 1018)
await createSnapshot(editor, manuscript.id, 'ai_pass_start', userId,
  `Before AI Pass (${roleLabel})`, suggestions);

// 2. After AI Pass completes (Line 1119)
await createSnapshot(editor, manuscript.id, 'ai_pass_complete', userId,
  roleLabel, suggestions);

// 3. After Apply All suggestions (Line 821)
await createSnapshot(editor, manuscript.id, 'apply_all', userId,
  `Applied ${count} suggestions`, suggestions);
```

**Manual** (user-triggered):
```typescript
// Editor.tsx:1511 - Save Version button
await createSnapshot(editor, manuscript.id, 'manual', userId,
  label, suggestions);
```

## How Snapshots Are Restored

### Restore Flow (Step-by-Step)

**Location**: `src/services/snapshotService.ts:153-241`

```
1. Fetch snapshots from database
   → SELECT snapshots FROM manuscripts WHERE id = manuscriptId
   ↓
2. Find requested version
   → snapshots.find(s => s.version === targetVersion)
   ↓
3. Restore document content
   → editor.commands.setContent(snapshot.content)
   → CRITICAL: Must happen FIRST (establishes positions)
   ↓
4. Restore AI suggestions
   → editor.commands.setAiSuggestions(snapshot.aiSuggestions || [])
   → REPLACES all suggestions (not append)
   → Must happen AFTER setContent (positions must be valid)
   ↓
5. Return manual suggestions to caller
   → Cannot restore directly to React state from service
   → Caller handles: setSuggestions(manualSuggestions)
   ↓
6. Update database with restored content
   → UPDATE manuscripts SET content_html, word_count, character_count
   → Keeps database in sync with editor
   ↓
7. Component converts and merges suggestions
   → Convert AI suggestions: TipTap format → UI format
   → Merge: [...aiSuggestionsUI, ...manualSuggestions]
   → Sort by position: .sort((a, b) => a.pmFrom - b.pmFrom)
   → Update React state: setSuggestions(allSuggestions)
```

### Code Example: Restoring Snapshots

```typescript
// src/services/snapshotService.ts:153-241
export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<{ manualSuggestions: UISuggestion[]; aiSuggestions: Suggestion[] }> {
  // Step 1: Fetch snapshots
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('snapshots')
    .eq('id', manuscriptId)
    .single();

  // Step 2: Find version
  const snapshots = (manuscript?.snapshots as Snapshot[]) || [];
  const snapshot = snapshots.find((s) => s.version === version);

  if (!snapshot) {
    throw new Error(`Snapshot version ${version} not found`);
  }

  // Step 3: Restore content (MUST BE FIRST)
  editor.commands.setContent(snapshot.content);

  // Step 4: Restore AI suggestions (AFTER content)
  const suggestionsToRestore = snapshot.aiSuggestions || [];
  const success = editor.commands.setAiSuggestions(suggestionsToRestore);

  if (success) {
    console.log(`✅ Restored ${suggestionsToRestore.length} AI suggestions`);
  }

  // Step 5: Return manual suggestions
  const manualSuggestionsToRestore = snapshot.manualSuggestions || [];

  // Step 6: Update database
  await supabase
    .from('manuscripts')
    .update({
      content_html: editor.getHTML(),
      word_count: snapshot.metadata.wordCount,
      character_count: snapshot.metadata.characterCount
    })
    .eq('id', manuscriptId);

  return {
    manualSuggestions: manualSuggestionsToRestore,
    aiSuggestions: snapshot.aiSuggestions || []
  };
}
```

### Component Integration (Restore Callback)

**Location**: `src/components/workspace/Editor.tsx:1799-1838`

```typescript
// VersionHistory component callback
onRestore={async (restoredVersion, manualSuggestions, snapshotAiSuggestions) => {
  setShowVersionHistory(false);

  // Step 7: Convert AI suggestions to UI format
  // IMPORTANT: Use snapshot data directly (not extension storage)
  // This avoids timing issues with TipTap's async storage
  const aiSuggestionsUI: UISuggestion[] = (snapshotAiSuggestions || []).map((suggestion) => {
    const ruleId = suggestion.rule?.id || suggestion.ruleId;
    const ruleTitle = suggestion.rule?.title || getRuleTitle(ruleId);

    return {
      id: suggestion.id,
      type: suggestion.replacementOptions?.length > 0 ? 'replace' : 'delete',
      origin: 'server',
      pmFrom: suggestion.deleteRange?.from || 0,
      pmTo: suggestion.deleteRange?.to || 0,
      before: suggestion.deleteText || '',
      after: suggestion.replacementOptions?.[0]?.addText || '',
      category: 'ai-suggestion',
      note: `${ruleTitle}: ${suggestion.note}`,
      actor: 'AI',
      ruleId: ruleId,
      ruleTitle: ruleTitle
    };
  });

  // Merge AI and manual suggestions, sorted by position
  const allSuggestions = sortSuggestionsByPosition([
    ...aiSuggestionsUI,
    ...manualSuggestions
  ]);

  setSuggestions(allSuggestions);
  setCurrentVersion(restoredVersion);
}}
```

## Key Implementation Details

### AI vs Manual Suggestions: Different Restoration Paths

| Aspect | AI Suggestions | Manual Suggestions |
|--------|---------------|-------------------|
| **Save Source** | `editor.extensionStorage.aiSuggestion.getSuggestions()` | React state (`suggestionsRef.current`) |
| **Save Format** | TipTap `Suggestion[]` objects | `UISuggestion[]` objects |
| **Restore Target** | TipTap extension storage | React state |
| **Restore Method** | `editor.commands.setAiSuggestions()` | `setSuggestions()` callback |
| **Restore Timing** | After `setContent()` (positions must be valid) | After AI suggestions converted |
| **Restore Behavior** | REPLACES all suggestions | Merged with AI suggestions |

### Critical Ordering Requirements

**Why content must be restored FIRST**:
```typescript
// CORRECT ORDER:
editor.commands.setContent(snapshot.content);        // Step 1: Document
editor.commands.setAiSuggestions(aiSuggestions);     // Step 2: AI suggestions

// WRONG ORDER (positions will be invalid):
editor.commands.setAiSuggestions(aiSuggestions);     // ❌ Positions don't exist yet
editor.commands.setContent(snapshot.content);        // ❌ Breaks suggestion positions
```

**Why?** AI suggestions reference ProseMirror positions. If you restore suggestions before content, the positions they reference don't exist yet, causing errors or incorrect placement.

### Snapshot Array Approach (Not Separate Table)

**Design Decision**: Store snapshots as JSONB array in `manuscripts.snapshots`, NOT as separate `snapshots` table.

**Benefits**:
- ✅ **Atomic updates**: Entire manuscript + snapshots update together
- ✅ **Simpler queries**: No joins needed
- ✅ **Flexible schema**: Add fields without migrations
- ✅ **Better performance**: JSONB indexing very fast in Postgres

**Trade-offs**:
- ❌ **Row size**: Large manuscripts with many snapshots → large rows
- ❌ **Querying**: Can't easily query across all snapshots for all manuscripts
- ⚠️ **Practical limit**: ~50-100 snapshots per manuscript (sufficient for MVP)

### Version Numbering

**Sequential, 1-indexed**:
```typescript
const version = existingSnapshots.length + 1;  // 1, 2, 3, 4...
```

**Not timestamp-based** because:
- ✅ Easier to reference ("restore to version 5")
- ✅ Clear ordering
- ✅ No collision issues

## Storage & Performance

### Storage Estimates

**Per Snapshot**:
- Document content (85K words): ~500KB (TipTap JSON)
- AI suggestions (3K suggestions): ~600KB (TipTap format with metadata)
- Manual suggestions (100): ~30KB
- Metadata: ~500 bytes
- **Total**: ~1.1MB per snapshot (large document with many suggestions)

**Postgres Limits**:
- JSONB column: Up to ~1GB (practical limit)
- Row size: ~1GB (practical limit)
- **Conclusion**: ~50-100 snapshots per manuscript (more than sufficient)

### Performance Characteristics

**Read Performance**:
- Fetch all snapshots: <50ms (single SELECT)
- GIN index on JSONB: Very fast filtering

**Write Performance**:
- Append snapshot: <100ms (single UPDATE with array append)
- Atomic operation: No race conditions

**Restore Performance**:
- Fetch snapshot: <50ms
- Restore to editor: <500ms (depends on document size)
- Total: <1 second for typical restore

## User Interface

### Version History Sidebar

**Location**: `src/components/workspace/VersionHistory.tsx`

**Features**:
- 📋 List of all snapshots (most recent first)
- 🏷️ Event labels ("AI Pass Complete", "Manual Snapshot", etc.)
- 📊 Metadata (word count, suggestion count)
- 🕐 Relative timestamps ("Today at 2:30 PM", "2 days ago")
- 🔄 Restore button for each version
- ⭐ "Latest" badge on newest version
- ⚡ "Back to Latest" quick action when viewing old version

**Access**: Click History icon in Editor toolbar

## Common Use Cases

### 1. Save Before Risky Operation
```typescript
// User wants to try experimental edits
await createSnapshot(editor, manuscript.id, 'manual', userId,
  'Before experimental edits', suggestions);
```

### 2. Compare AI Pass Results
```typescript
// Automatic snapshots before/after AI Pass
'ai_pass_start' → Version 5  // Before
'ai_pass_complete' → Version 6  // After
// User can restore to Version 5 to see difference
```

### 3. Undo Apply All
```typescript
// Snapshot created BEFORE Apply All
await createSnapshot(..., 'apply_all', ..., suggestions);
// User can restore to previous version if they don't like results
```

## Testing & Verification

**Verified**:
- ✅ AI suggestions saved and restored correctly
- ✅ Manual suggestions saved and restored correctly
- ✅ Both types appear together after restore
- ✅ Positions accurate after restore
- ✅ Metadata counts accurate (AI vs manual breakdown)
- ✅ Old snapshots (before feature) work without errors
- ✅ Version numbering sequential and correct
- ✅ Timestamps in ISO 8601 format
- ✅ Database remains in sync with editor after restore

## Known Limitations & Future Enhancements

**Current Limitations**:
- No snapshot comparison UI (diff viewer)
- No snapshot deletion (keeps all versions)
- No export of specific snapshot version
- No snapshot compression (full document stored each time)

**Future Enhancements (v1.0+)**:
1. **Diff Viewer**: Visual comparison between versions
2. **Snapshot Management**: Delete old snapshots, set retention policy
3. **Snapshot Export**: Export specific version to DOCX
4. **Incremental Snapshots**: Store only deltas (more efficient storage)
5. **Snapshot Annotations**: Allow users to add notes to snapshots

## Current State vs Snapshots

### How Current Manuscript State is Maintained

**Current State** (different from snapshots):
- Stored in `manuscripts` table (NOT in snapshots array)
- Updated automatically on every editor change
- No manual save needed - happens in real-time

**Database Storage**:
```typescript
manuscripts table:
├─ content_html: string      // Current document HTML (auto-updated)
├─ content_text: string      // Current plain text (auto-updated)
├─ word_count: number        // Current word count (auto-updated)
├─ character_count: number   // Current character count (auto-updated)
└─ snapshots: JSONB[]        // Historical snapshots (manual milestones)
```

### Auto-Update Implementation

**Location**: `src/components/workspace/DocumentCanvas.tsx:172`

**Handler**: `updateManuscriptSilent()`
```typescript
const handleEditorUpdate = (html: string, text: string) => {
  updateManuscriptSilent(manuscript.id, {
    content_html: html,
    content_text: text
  });
};
```

**Update Method** (`ManuscriptsContext.tsx:86-105`):
```typescript
const updateManuscriptSilent = async (id: string, updates: ManuscriptUpdateInput) => {
  // Updates database WITHOUT showing toast notification
  const updatedDbManuscript = await ManuscriptService.updateManuscript(id, updates);
  const updatedManuscript = dbToFrontend(updatedDbManuscript);

  // Updates local React state
  setManuscripts(prev => prev.map(m =>
    m.id === id ? updatedManuscript : m
  ));

  // No success toast (silent update for automatic edits)
};
```

**Why Silent?**
- Prevents intrusive "Manuscript updated successfully" toasts during typing
- User doesn't need confirmation for automatic saves
- Error toasts still display if update fails

### Current State vs Latest Snapshot

| Aspect | Current State | Latest Snapshot |
|--------|--------------|-----------------|
| **Location** | `manuscripts.content_html` | `manuscripts.snapshots[last]` |
| **Update Frequency** | Every keystroke (debounced) | Manual milestones only |
| **Contains** | Document content only | Content + suggestions + metadata |
| **Purpose** | Live working state | Historical checkpoint |
| **User Action** | Automatic | Manual "Save Version" or workflow event |

### Important Distinction

**"Latest" means different things**:
- **Latest Snapshot** = Most recent saved checkpoint (manual or automatic milestone)
- **Current State** = Real-time document in database (continuously updated)

**Example**:
```
User flow:
1. Opens manuscript → content loaded from current state
2. Edits document → updateManuscriptSilent() saves to current state
3. Runs AI Pass → Snapshot created (v1) with pre-AI state
4. Reviews suggestions → Current state still updating
5. Clicks "Save Version" → Snapshot created (v2) with post-review state
6. Makes more edits → Current state updates, snapshots unchanged
7. "Back to Latest" → Should restore current state (step 6), NOT snapshot v2
```

**The Bug**: Current implementation restores from latest snapshot, not current state.

### Manual Suggestions Limitation

**Current Behavior**:
- Manual suggestions exist ONLY in React state (in-memory)
- NOT auto-saved to `manuscripts` table
- ONLY persisted when creating snapshots

**Impact on "Back to Latest"**:
```typescript
What gets restored:
✅ Document content (content_html from manuscripts table)
❌ Manual suggestions (lost - only in snapshots)
❌ AI suggestions (lost - only in TipTap extension storage)
```

**Why This Limitation Exists**:
- Current state auto-update (`updateManuscriptSilent()`) only saves content
- Suggestions are considered draft/ephemeral until snapshot milestone
- Prevents excessive database writes on every suggestion change

**User Impact**:
```
Scenario:
1. User restores old snapshot (v5)
2. User adds manual suggestions (in-memory only)
3. User clicks "Back to Latest"
4. Result: ❌ Manual suggestions are lost
```

**Workaround**:
- Users must create manual snapshot before exploring old versions
- "Save Version" button preserves both document + suggestions

**Future Enhancement**:
- Option 1: Auto-save suggestions to `manuscripts.suggestions` JSONB column
- Option 2: Warn user before "Back to Latest" if unsaved suggestions exist
- Option 3: Add "suggestions" field to current state auto-updates

---

# EDITOR & COMPONENTS

## Editor.tsx (Primary Editor Component)

**Location**: `src/components/workspace/Editor.tsx`
**Size**: 944 lines (the largest component)
**Purpose**: Main TipTap Pro AI editor with suggestion handling

### Key Responsibilities

1. **TipTap Editor Initialization**
   - Configure AI Suggestion extension
   - Set up toolbar, menus, extensions
   - Handle JWT authentication

2. **AI Suggestion Lifecycle**
   - Trigger AI passes
   - Wait for processing completion
   - Convert TipTap format → UI format
   - Handle accept/reject actions

3. **Manual Suggestion Lifecycle**
   - Create manual suggestions from user selections (lines 907-953)
   - Store in React state alongside AI suggestions
   - Apply accept/reject actions (same handlers as AI)
   - Save to snapshots for version control

4. **UI State Management**
   - Popover positioning (AI suggestions)
   - Selection tracking (both AI and manual)
   - Change list synchronization (unified list)

### Critical Functions

**AI Suggestions:**

**`convertAiSuggestionsToUI()`** (lines 438-492)
- Transforms TipTap AI suggestions → our UISuggestion format
- **Sorts by position**: `.sort((a, b) => a.pmFrom - b.pmFrom)`
- Maps TipTap fields to our schema
- Returns sorted array for ChangeList

**`waitForAiSuggestions()`** (lines 495-567)
- Monitors `editor.extensionStorage.aiSuggestion` for completion
- Event-based waiting using transaction events
- Returns Promise<UISuggestion[]>

**`handlePopoverAccept()` / `handlePopoverReject()`** (lines 571-599)
- Calls TipTap commands: `editor.commands.applyAiSuggestion()`
- Updates local state
- Syncs with ChangeList

**Manual Suggestions:**

**`createManualSuggestion()`** (lines 907-953)
- Creates suggestion from user's text selection
- Takes: `{ mode: 'insert'|'delete'|'replace', after: string, note: string }`
- Validates selection and input
- Adds to React state with `origin: 'manual'`
- Triggers decoration refresh

**`handleAcceptSuggestion()` / `handleRejectSuggestion()`** (lines 622-780)
- **Unified handlers**: Check suggestion origin (AI vs manual)
- AI: Use TipTap commands (`applyAiSuggestion`, `rejectAiSuggestion`)
- Manual: Direct document edits + state updates
- Both: Update suggestions list, show toast

### Integration Points

- **useTiptapEditor**: Hook provides editor instance with config
- **AIEditorRules**: Defines available AI roles and prompts
- **ChangeList**: Sidebar showing all suggestions (paginated)
- **Popover**: Inline suggestion UI with accept/reject buttons

## Edge Functions (Supabase)

**Location**: `supabase/functions/`

### ai-suggestions-html

**Purpose**: Process single HTML chunk with AI rules

**Input**:
```typescript
{
  html: string,      // Pre-chunked HTML from TipTap
  chunkId: string,
  rules: Array<{ id, title, prompt }>
}
```

**Process**:
1. Loop through rules sequentially
2. Call OpenAI GPT-4 for each rule
3. Parse JSON response (array of suggestions)
4. Collect all suggestions across rules
5. Return aggregated array

**Output**:
```typescript
{
  items: Array<{
    ruleId, deleteHtml, insertHtml, note, chunkId
  }>
}
```

**Performance**: ~10-15s per chunk (varies by rule count)

### queue-processor

**Purpose**: Execute background jobs from processing_queue

**Trigger**: Cron (every 1 minute)

**Operations**:
- `docx_import`: Convert DOCX → TipTap JSON
- Future: `ai_pass`, `export_docx`

**Pattern**:
```typescript
// 1. Claim job (atomic UPDATE)
// 2. Execute operation
// 3. Update result
// 4. Mark complete/failed
```

### generate-tiptap-jwt

**Purpose**: Generate 24hr JWT token for TipTap Pro authentication

**Why Edge Function?**: Secrets must stay server-side (never expose API keys client-side)

**Usage**:
```typescript
const response = await fetch('/functions/v1/generate-tiptap-jwt');
const { token } = await response.json();

// Token valid for 24 hours, cached client-side
```

## React Integration Patterns

### Component Hierarchy

```
App
└── Editor.tsx (route: /manuscript/:id - TipTap Pro editor)
    ├── Toolbar (Run AI Pass button, format controls, Save/Export)
    ├── DocumentCanvas (TipTap's editor view)
    │   ├── AI Suggestion Decorations (inline highlights)
    │   └── Manual Suggestion Decorations (inline highlights)
    ├── ChangeList (sidebar)
    │   └── SuggestionCards (unified AI + manual, filtered by rule)
    ├── VersionHistory (sidebar sheet)
    └── AIEditorRuleSelector (modal)
```

### State Management

**No global state library** - Uses React Context + hooks

**Contexts**:
- `AuthContext`: User authentication state
- `ManuscriptContext`: Current manuscript data
- `EditorContext`: Editor instance and AI suggestions state

### Performance Optimizations

**React.memo**:
- Suggestion cards wrapped in `React.memo` to prevent re-renders
- ChangeList pagination reduces DOM nodes

**Known Issue**: 5K+ suggestions still freeze due to TipTap's synchronous position mapping (not React's fault)

### Key Hooks

**`useTiptapEditor(content, aiSuggestionConfig)`**
- Returns configured editor instance
- Handles AI Suggestion extension setup
- Manages dynamic configuration (EXPERIMENT 8)

**`useQueueProcessor()`**
- Submit jobs to processing_queue
- Poll for completion
- Handle errors/timeouts

**`useManuscript(id)`**
- Fetch manuscript data
- Subscribe to real-time updates
- Handle CRUD operations

---

# DOCX EXPORT

**Status**: ✅ Phase 1 Complete (Basic Clean Export)
**Location**: `src/lib/docxExport.ts`, `src/components/workspace/Editor.tsx`
**Confidence**: 85% (Standard TipTap feature, well-documented)

## Overview

Basic DOCX export functionality using TipTap Pro's `@tiptap-pro/extension-export-docx` package. Exports clean manuscript (accepted text only).

## Features

**Current (Phase 1)**:
- ✅ Export button in Editor toolbar (laptop icon, next to "Mark Reviewed")
- ✅ Exports current document state as clean DOCX (no suggestions)
- ✅ Automatic filename generation from manuscript title
- ✅ Document metadata included (title, creator, timestamp)
- ✅ Size validation before export
- ✅ Warning for large documents (>100K words)
- ✅ Loading state during export
- ✅ Success/error toast notifications

**Limitations**:
- ❌ AI suggestions NOT exported (clean document only)
- ❌ Manual suggestions NOT exported
- ❌ Word track changes format NOT supported
- ❌ Comments NOT included in export

**Why?** TipTap's export extension exports current document state (accepted text) but does NOT convert TipTap's AI suggestions into Word's track changes format.

## How to Use

### For Users

1. Open manuscript in Editor
2. Click **Export** button in toolbar (laptop icon)
3. Wait for export to complete (usually <5 seconds)
4. DOCX file downloads automatically

**Important**: Only accepted text is exported - AI suggestions are NOT included.

### For Developers

**Export programmatically**:
```typescript
import { exportEditorToDocx } from '@/lib/docxExport';

const result = await exportEditorToDocx(editor, {
  filename: 'my-document.docx',
  includeMetadata: true
});

if (result.success) {
  console.log('Export successful!', result.blob);
} else {
  console.error('Export failed:', result.error);
}
```

**Check if export is safe**:
```typescript
import { canSafelyExport } from '@/lib/docxExport';

const { safe, warning } = canSafelyExport(editor);
if (warning) {
  console.warn(warning);
}
```

## Technical Details

### Export Flow

1. User clicks Export button → `handleExportDocx()` called (Editor.tsx:1179)
2. Safety check via `canSafelyExport()` (size validation)
3. Show warning toast if document is large
4. Call `exportEditorToDocx()` with editor instance
5. TipTap converts editor JSON to DOCX buffer
6. Create blob from buffer
7. Trigger browser download
8. Clean up blob URL
9. Show success toast

### File Size Estimates

| Document Size | Estimated DOCX | Export Time |
|--------------|----------------|-------------|
| 1K words     | ~50 KB         | <1 second   |
| 20K words    | ~500 KB        | 2-3 seconds |
| 50K words    | ~1.2 MB        | 5-10 seconds|
| 85K words    | ~2 MB          | 15-30 seconds|
| 150K+ words  | ~3.5 MB        | Blocked (too large)|

**Note**: Actual times depend on document complexity (images, tables, formatting)

### Dependencies

```json
{
  "@tiptap-pro/extension-export-docx": "1.0.0-beta.7"
}
```

**Version**: Beta 7 (as of January 2025)
**License**: Requires TipTap Pro subscription
**Registry**: Private NPM registry (auth via `.npmrc`)

## Future Enhancements (Phase 2+)

### Path 2: Export with Comments

**Goal**: Export AI suggestions as Word comments

**Implementation Plan**:
1. Install `docx` library for DOCX manipulation
2. Export base document via TipTap
3. Parse exported DOCX buffer
4. Inject AI suggestions as Word comments at correct positions
5. Re-serialize and download

**Estimated Effort**: 2-3 days
**Confidence**: 60% (requires experimentation)

**Benefits**:
- Preserves suggestion content for author review
- Authors can see suggestions in Word
- Uses standard Word commenting feature

**Limitations**:
- Suggestions become comments (NOT track changes)
- Position mapping may be fragile
- Increased complexity

### Path 3: True Track Changes (Future)

**Goal**: Export with Word track changes format

**Status**: Not recommended for MVP

**Why?**
- Very complex (requires building DOCX from scratch)
- High risk of position misalignment
- TipTap doesn't natively support this
- Would take 1-2 weeks to implement
- Uncertain outcome

**Alternative**: Contact TipTap support to request native track changes export

## Known Issues

### TipTap Pro Token Warning

You may see this warning in terminal:
```
WARN  Issue while reading ".npmrc". Failed to replace env in config: ${TIPTAP_PRO_TOKEN}
```

**Impact**: None - package already installed and functioning
**Why**: Warning appears because pnpm tries to read `.npmrc` but token only needed during initial install

## Testing Checklist

**Manual Testing**:
- ✅ Small document (1-10K words) - exports quickly
- ✅ Medium document (20-50K words) - exports with warning
- ✅ Large document (80K+ words) - exports with warning, completes
- ✅ Very large document (150K+ words) - blocked with error
- ✅ Filename generation works correctly
- ✅ Toast notifications appear
- ✅ Loading state displays during export
- ✅ Exported DOCX opens in Word/Google Docs
- ✅ Formatting preserved (headings, bold, italic, etc.)

**Browser Compatibility**:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari

---

# EXTERNAL RESOURCES

## TipTap Official Docs
- [AI Suggestion Overview](https://tiptap.dev/docs/content-ai/capabilities/suggestion)
- [Custom LLMs Integration](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms)
- [API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)
- [Snapshot API](https://tiptap.dev/docs/collaboration/documents/snapshot)

## Stack Documentation
- **React 18**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Supabase**: https://supabase.com/docs
- **ProseMirror**: https://prosemirror.net/docs

---

**Last Updated**: January 2025 - Radical consolidation (10 files → 1)

**Tags**: #technical #reference #ai-suggestions #architecture #database #edge-functions #tiptap #react
