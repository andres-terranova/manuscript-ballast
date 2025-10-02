# Claude Code Agent Specializations

These are specialized roles that Claude Code can adopt to provide focused expertise. Invoke with slash commands.

## Performance & Scale Agents

### `/chunking` - Large Document Chunking Specialist
**When to use**: Documents timing out, 500+ suggestions causing failures, memory issues
**Expertise**:
- TipTap chunkSize optimization
- Section-based processing strategies
- Suggestion pagination techniques
- Memory management for large documents
**Key files**:
- src/components/workspace/ExperimentalEditor.tsx:1068-1080 (chunkSize config)
- docs/guides/LARGE_DOCUMENT_TIMEOUT_GUIDE.md
**Critical knowledge**:
- Timeout occurs at ~2 minutes
- Current chunkSize: 5 HTML nodes
- Increase chunkSize for very large documents - not optimal as it does not get rid of the issue, just works around it
- Consider processing in 20K word sections

### `/performance` - Performance Optimization Specialist
**When to use**: Slow rendering, memory leaks, profiling needs
**Expertise**:
- React DevTools profiling
- Browser performance monitoring
- Decoration rendering optimization
- State management efficiency
**Key strategies**:
- Cap decorations at 200 visible
- Debounce validation (500ms)
- React.memo() for list items
- Virtual scrolling for long lists

## Core System Agents

### `/tiptap` - TipTap Integration Specialist
**When to use**: Editor issues, JWT authentication, AI suggestions, extensions
**Expertise**:
- TipTap v3 configuration
- Pro AI Suggestion extension
- JWT token management
- ProseMirror plugin development
- Large document chunking and caching
- Decoration management
- Editor command chains
**Key files**:
- src/hooks/useTiptapEditor.ts
- src/components/workspace/ExperimentalEditor.tsx
- docs/guides/TIPTAP_JWT_GUIDE.md
- docs/guides/EXPERIMENTAL_AI_SETUP.md
**Context7 MCP Usage**:
```typescript
// Fetch TipTap documentation dynamically
mcp__context7__resolve-library-id({ libraryName: "tiptap" })
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiptap/editor",
  topic: "AI suggestions" // or "extensions", "prosemirror", etc.
})
```
**Official Documentation**:
- General: https://tiptap.dev/docs/editor/introduction
- Content AI: https://tiptap.dev/docs/content-ai/introduction
- JWT Auth: https://tiptap.dev/docs/content-ai/capabilities/suggestion/use-with-content-ai-cloud
- Extensions: https://tiptap.dev/docs/editor/extensions/overview
**Critical issues**:
- Server-generated JWT tokens rejected (401 auth_cloud_failed)
- Using temporary dashboard token as workaround

### `/queue` - Queue System Specialist
**When to use**: DOCX processing stuck, background jobs, upload issues
**Expertise**:
- Queue-based architecture
- Supabase edge functions
- Mammoth.js DOCX processing
- Progress tracking
- Stuck job recovery
**Key files**:
- supabase/functions/queue-processor/index.ts
- src/hooks/useQueueProcessor.ts
- docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md
**Database queries**:
```sql
SELECT * FROM processing_queue WHERE status = 'processing';
UPDATE processing_queue SET status = 'pending' WHERE status = 'processing' AND started_at < NOW() - INTERVAL '2 minutes';
```

### `/supabase` - Database & Backend Specialist
**When to use**: Database queries, RLS policies, edge functions, storage
**Expertise**:
- PostgreSQL queries
- Row Level Security
- Edge function deployment
- Storage management
- Authentication
**MCP tools**:
- `mcp__supabase__execute_sql`
- `mcp__supabase__list_tables`
- `mcp__supabase__get_logs`
- `mcp__supabase__deploy_edge_function`
**Key commands**:
```bash
supabase functions deploy <name>
supabase functions logs <name>
supabase db reset
```

### `/architecture` - System Design Specialist
**When to use**: Planning features, understanding data flow, refactoring
**Expertise**:
- System architecture patterns
- Component relationships
- Data flow design
- State management
- Integration patterns
**Key docs**:
- docs/architecture/README.md
- docs/architecture/QUEUE_SYSTEM_ARCHITECTURE.md
**Critical flows**:
1. DOCX Upload → Queue → Processing → Editor
2. AI Pass → TipTap API → Suggestions → Decorations → UI

## Domain Expert Agents

### `/prosemirror` - ProseMirror Position Specialist
**When to use**: Position mapping errors, decoration issues, node resolution
**Expertise**:
- ProseMirror position calculations
- Document node resolution
- Decoration management
- Position drift debugging
**Key files**:
- src/lib/suggestionMapper.ts (legacy - only for ManuscriptWorkspace)
- src/lib/suggestionsPlugin.ts
- src/components/workspace/ExperimentalEditor.tsx (TipTap AI positions)
- docs/guides/archive/debug-suggestion-positions.md
**Critical concept**: Always use ProseMirror positions, never character offsets
```typescript
// ✅ Correct
const from = state.doc.resolve(offset).pos;
// ❌ Wrong
const from = text.indexOf(searchString);
```

### `/auth` - Authentication Specialist
**When to use**: JWT errors, Supabase auth, token generation
**Expertise**:
- Dual auth system (Supabase + TipTap)
- JWT token structure
- Token generation & validation
- Session management
**Key files**:
- supabase/functions/generate-tiptap-jwt/index.ts
- src/hooks/useTiptapJWT.ts
- docs/guides/TIPTAP_JWT_GUIDE.md
**Known issue**: Server-generated TipTap tokens rejected

### `/suggestions` - Suggestion System Specialist
**When to use**: Mapping issues, rendering problems, acceptance/rejection flow
**Expertise**:
- Server → UI suggestion mapping
- Decoration rendering
- ChangeList optimization
- Position accuracy
**Key files**:
- src/lib/suggestionMapper.ts
- src/lib/types.ts
- src/components/workspace/ChangeList.tsx
- src/components/workspace/ChangeCard.tsx
**Data flow**:
```
TipTap API Response → mapServerSuggestionToUI() → UISuggestion → Decorations → UI
```

### `/ui` - React UI Specialist
**When to use**: Component development, shadcn/ui, styling
**Expertise**:
- React component patterns
- shadcn/ui components
- Tailwind CSS
- Component optimization
**Key patterns**:
- Use shadcn/ui components from src/components/ui/
- Never edit ui/ components directly
- Use cn() for className merging
- React.memo() for expensive components

## Meta & Debug Agents

### `/product` - Product Strategy Specialist
**When to use**: Feature planning, roadmap, user needs
**Expertise**:
- Product vision
- User personas
- Feature prioritization
- Success metrics
**Key docs**:
- docs/product/README.md
- docs/product/Future_Cleanup_Checklist.md
**Target users**:
- Fiction authors
- Non-fiction authors
- Professional editors

### `/debug` - Debugging Specialist
**When to use**: Complex bugs, error tracing, performance issues
**Expertise**:
- Browser DevTools
- Console log analysis
- Network debugging
- Performance profiling
**Key tools**:
- Browser console (errors, warnings)
- Network tab (API failures)
- Performance tab (profiling)
- Supabase MCP get_logs

### `/mcp` - MCP Operations Specialist
**When to use**: Database queries via MCP, Context7 lookups
**Expertise**:
- Supabase MCP tools
- Context7 documentation fetches
- Efficient MCP usage patterns
**Available MCPs**:
- Supabase: Database operations, edge functions
- Context7: Library documentation
**Example queries**:
```typescript
// Check manuscript sizes
mcp__supabase__execute_sql("SELECT MAX(character_count) FROM manuscripts")

// Get TipTap docs
mcp__context7__get-library-docs("/tiptap/editor")
```

## Agent Invocation Examples

```
User: "AI Pass times out on my 80K word manuscript"
→ Invoke: /chunking
→ Actions: Reduce chunkSize, implement section processing

User: "JWT token keeps getting 401 errors"
→ Invoke: /auth or /tiptap
→ Check: Token format, TipTap dashboard settings, expiration

User: "Suggestions show up in wrong places after editing"
→ Invoke: /prosemirror
→ Debug: Position mapping, document mutations

User: "Need to add export to PDF feature"
→ Invoke: /architecture
→ Plan: Data flow, integration points, UI components
```

## Quick Reference Matrix

| Problem Area | Primary Agent | Secondary Agent | Key File |
|-------------|--------------|----------------|----------|
| Timeout on large docs | `/chunking` | `/performance` | ExperimentalEditor.tsx |
| JWT authentication | `/auth` | `/tiptap` | TIPTAP_JWT_GUIDE.md |
| Position mapping | `/prosemirror` | `/suggestions` | suggestionMapper.ts |
| DOCX processing | `/queue` | `/supabase` | queue-processor/index.ts |
| UI components | `/ui` | `/architecture` | workspace/docs/ |
| Database issues | `/supabase` | `/mcp` | Supabase MCP |
| Feature planning | `/architecture` | `/product` | architecture/README.md |

---

**Last Updated**: September 30, 2025
**Note**: Agents are Claude Code role specializations, not separate tools