# Technical Reference - Complete System Documentation

**For Claude Code**: This is your ONE technical reference. Everything about how the system works is here.

**Sections**: AI Suggestions · Architecture · Editor & Components · Database · Edge Functions · React Patterns

---

# 📌 Quick Navigation

```
AI Suggestions
├─ Common Mistakes (READ FIRST)
├─ Key Files & Functions
├─ Dynamic Configuration
├─ Complete Flow
├─ TipTap API Reference
└─ Debugging

Architecture
├─ Database Schema (JSONB-first)
├─ Queue System (Background jobs)
└─ Versioning Strategy (TipTap snapshots)

Editor & Components
├─ Editor.tsx (Primary editor)
├─ Edge Functions (Supabase)
└─ React Integration Patterns
```

---

# AI SUGGESTIONS SYSTEM

**10-Second Summary**: TipTap Pro AI Suggestion extension with custom backend integration. Dynamic configuration (10-40 chunkSize, 3-10 batchSize) based on document size. Parallel batch processing via edge functions. Handles 85K+ word documents.

**Critical File**: `src/components/workspace/Editor.tsx` (NOT ManuscriptWorkspace.tsx!)

## 🚨 Common Mistakes - READ THIS FIRST

### ❌ Misconception #1: "I need to implement progressive loading"
**Reality**: TipTap loads ALL suggestions at once when processing completes
```typescript
const suggestions = editor.storage.aiSuggestion.getSuggestions() // All at once
```

### ❌ Misconception #2: "I'll work with ManuscriptWorkspace.tsx"
**Reality**: That's a DIFFERENT system (manual suggestions with decorations)
- ManuscriptWorkspace.tsx = Manual suggestions (legacy)
- Editor.tsx = AI suggestions (TipTap Pro)

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

#### Snapshots Array (v1.0)
```typescript
snapshots: Array<{
  id: string,
  version: number,
  timestamp: string,
  user_id: string,
  content: JSON,         // Full TipTap snapshot
  metadata: {
    trigger: 'manual' | 'send' | 'return' | 'auto',
    label?: string,
    stats: {
      wordCount: number,
      suggestionCount: number,
      acceptedCount: number,
      rejectedCount: number
    }
  }
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

## Versioning Strategy (TipTap Snapshots)

### TipTap Native Snapshots

Uses TipTap's [Document Snapshot API](https://tiptap.dev/docs/collaboration/documents/snapshot) for version history.

**Key Concept**: Store full TipTap JSON snapshots in `manuscripts.snapshots` JSONB array.

### Snapshot Creation

```typescript
// Manual snapshot
const snapshot = {
  id: uuid(),
  version: currentVersion + 1,
  timestamp: new Date().toISOString(),
  user_id: userId,
  content: editor.getJSON(),  // Full TipTap document
  metadata: {
    trigger: 'manual',
    label: 'Before author review',
    stats: {
      wordCount: getWordCount(editor),
      suggestionCount: suggestions.length,
      acceptedCount: acceptedSuggestions.length,
      rejectedCount: rejectedSuggestions.length
    }
  }
};

// Append to snapshots array
await supabase
  .from('manuscripts')
  .update({
    snapshots: [...existingSnapshots, snapshot]
  })
  .eq('id', manuscriptId);
```

### Auto-Snapshot Triggers (v1.0)

1. **Send to Author**: Snapshot before sharing
2. **Return to Editor**: Snapshot when author returns
3. **Manual**: User clicks "Create Snapshot"

### Snapshot Restoration

```typescript
// Load snapshot by version
const snapshot = snapshots.find(s => s.version === targetVersion);

// Restore to editor
editor.commands.setContent(snapshot.content);

// Optional: Create new snapshot before restoring (safety)
await createSnapshot({ trigger: 'restore', label: 'Before restore' });
```

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

3. **UI State Management**
   - Popover positioning
   - Selection tracking
   - Change list synchronization

### Critical Functions

**`convertAiSuggestionsToUI()`**
- Transforms TipTap AI suggestions → our UISuggestion format
- **Sorts by position**: `.sort((a, b) => a.pmFrom - b.pmFrom)`
- Maps TipTap fields to our schema
- Returns sorted array for ChangeList

**`waitForAiSuggestions()`**
- Monitors `editor.extensionStorage.aiSuggestion` for completion
- Polls every 100ms until `isLoading === false`
- Returns Promise<UISuggestion[]>

**`handlePopoverAccept()` / `handlePopoverReject()`**
- Calls TipTap commands: `editor.commands.applyAiSuggestion()`
- Updates local state
- Syncs with ChangeList

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
└── ManuscriptWorkspace (route: /manuscript/:id)
    └── Editor.tsx (TipTap Pro editor)
        ├── Toolbar (Run AI Pass button, format controls)
        ├── EditorContent (TipTap's editor view)
        │   └── AI Suggestion Decorations (inline highlights)
        └── ChangeList (sidebar)
            └── SuggestionCards (paginated, 25/page)
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
