# Claude Code Agent Specializations

These are specialized roles that Claude Code can adopt to provide focused expertise. Invoke with slash commands.

## Performance & Scale Agents

### `/chunking` - Large Document Processing Specialist
**When to use**: Documents timing out, memory issues, browser freeze on large suggestion sets
**Expertise**:
- Phase 1 parallel batch processing (DEPLOYED - handles up to 85K words)
- Custom apiResolver implementation
- Promise.allSettled() error tolerance
- Memory profiling and optimization
**Key files**:
- src/hooks/useTiptapEditor.ts:116-188 (custom apiResolver)
- supabase/functions/ai-suggestions-html/
- docs/02-technical/large-documents/UAT-PHASE1-FINDINGS.md
**Current capabilities**:
- ✅ Optimal: < 30K words (2-40 min, < 200 MB memory)
- ✅ Supported: Up to 85K words (~15-20 min, 1.5 GB memory)
- ⚠️ Known limit: Browser freeze when rendering 5,000+ suggestions
**v1.0 note**: Phase 2 background queue under consideration for production scale

### `/performance` - Performance Optimization Specialist
**When to use**: Slow rendering, memory leaks, profiling needs, browser freeze issues
**Expertise**:
- React DevTools profiling
- Browser performance monitoring
- Progressive rendering for large suggestion sets
- Memory management strategies
**Key strategies**:
- Virtual scrolling for 5,000+ suggestions
- Debounce validation (500ms)
- React.memo() for list items
- Memory profiling with DevTools

## Core System Agents

### `/tiptap` - TipTap Integration Specialist
**When to use**: Editor issues, JWT authentication, AI suggestions, extensions, snapshot API
**Expertise**:
- TipTap v3 configuration
- Pro AI Suggestion extension (under review for v1.0)
- JWT token management (24hr expiration - RESOLVED)
- TipTap Snapshot API for versioning
- ProseMirror plugin development
- Custom apiResolver for batch processing
**Key files**:
- src/hooks/useTiptapEditor.ts
- src/components/workspace/Editor.tsx
- docs/02-technical/authentication/tiptap-jwt.md
**Context7 MCP Usage**:
```typescript
// Fetch TipTap documentation dynamically
mcp__context7__resolve-library-id({ libraryName: "tiptap" })
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiptap/editor",
  topic: "snapshots" // or "AI suggestions", "extensions", etc.
})
```
**Official Documentation**:
- General: https://tiptap.dev/docs/editor/introduction
- Content AI: https://tiptap.dev/docs/content-ai/introduction
- Snapshots: https://tiptap.dev/docs/collaboration/snapshots
**v1.0 focus**:
- ✅ JWT authentication resolved (24hr tokens)
- 🔍 AI suggestions architecture under review
- 📍 TipTap Snapshot API for Send/Return versioning

### `/queue` - Queue System Specialist
**When to use**: DOCX processing stuck, background jobs, upload issues
**Expertise**:
- Current queue-based DOCX processing
- Supabase edge functions
- Mammoth.js DOCX to HTML conversion
- Progress tracking and recovery
**Key files**:
- supabase/functions/queue-processor/index.ts
- src/hooks/useQueueProcessor.ts
**v1.0 note**: Queue system working for DOCX uploads; Phase 2 background queue planned for AI processing
**Database queries**:
```sql
SELECT * FROM processing_queue WHERE status = 'processing';
UPDATE processing_queue SET status = 'pending' WHERE status = 'processing' AND started_at < NOW() - INTERVAL '2 minutes';
```

### `/supabase` - Database & Backend Specialist
**When to use**: Database queries, RLS policies, edge functions, storage, JSON data management
**Expertise**:
- PostgreSQL queries with JSONB columns
- Row Level Security policies
- Edge function deployment and monitoring
- Storage management
- Supabase Auth integration
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
**v1.0 focus**:
- JSON database approach for flexibility (JSONB columns)
- No complex migrations planned for v1.0
- TipTap snapshots stored as JSON
- Simple schema optimized for Send/Return workflow

### `/architecture` - System Design Specialist
**When to use**: Planning v1.0 features, understanding data flow, Send/Return workflow design
**Expertise**:
- JSON-first database architecture
- TipTap snapshot storage and versioning
- Send/Return workflow patterns
- Component relationships
- State management for editor versions
**Key docs**:
- docs/05-architecture/ (system design)
- docs/02-technical/ (implementation details)
**v1.0 critical flows**:
1. DOCX Upload → Queue → Processing → Editor
2. Send/Return → TipTap Snapshots → Version management
3. AI Pass → Custom apiResolver → Batch processing
**v1.0 focus**:
- JSON database approach (no complex schema migrations)
- TipTap Snapshot API for version control
- Simple, flexible architecture supporting Send/Return workflow
- Performance optimization for 85K word documents

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
- src/components/workspace/Editor.tsx (TipTap AI positions)
- docs/guides/archive/debug-suggestion-positions.md
**Critical concept**: Always use ProseMirror positions, never character offsets
```typescript
// ✅ Correct
const from = state.doc.resolve(offset).pos;
// ❌ Wrong
const from = text.indexOf(searchString);
```

### `/auth` - Authentication Specialist
**When to use**: JWT errors, Supabase auth, token generation, session management
**Expertise**:
- Dual auth system (Supabase + TipTap)
- JWT token structure and validation
- 24-hour token expiration
- Session management
**Key files**:
- supabase/functions/generate-tiptap-jwt/index.ts
- src/hooks/useTiptapJWT.ts
- docs/02-technical/authentication/tiptap-jwt.md
**v1.0 status**:
- ✅ TipTap JWT authentication RESOLVED
- ✅ 24-hour token expiration prevents editor reload
- ✅ Server-generated tokens working in production

### `/suggestions` - Suggestion System Specialist
**When to use**: AI suggestions rendering, batch processing, position accuracy
**Expertise**:
- Custom apiResolver for parallel batch processing
- Server → UI suggestion mapping
- Large suggestion set rendering (5,000+)
- Position accuracy in ProseMirror
**Key files**:
- src/hooks/useTiptapEditor.ts (apiResolver lines 116-188)
- src/lib/suggestionMapper.ts (legacy mapping)
- src/components/workspace/ChangeList.tsx
**v1.0 data flow**:
```
TipTap API → Custom apiResolver → Parallel batches → UISuggestion → UI
```
**v1.0 focus**:
- AI suggestions architecture under review
- Phase 1 parallel processing deployed (handles 85K words)
- Browser freeze mitigation needed for 5,000+ suggestions

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
**When to use**: v1.0 feature planning, Send/Return workflow design, user stories
**Expertise**:
- Simplified v1.0 scope (not full PRD)
- Send/Return workflow as priority feature
- User personas and workflows
- MVP feature prioritization
**Key docs**:
- docs/06-product/ (product strategy)
- CLAUDE.md (v1.0 roadmap priorities)
**v1.0 focus**:
- Send/Return workflow (primary feature)
- Author-to-editor collaboration
- TipTap snapshot-based versioning
- No admin portal in v1.0
- No production editor workflows in v1.0
**Target users**:
- Authors sending manuscripts to editors
- Editors returning manuscripts with tracked changes

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
User: "AI Pass freezes browser on large manuscripts"
→ Invoke: /chunking or /performance
→ Actions: Review Phase 1 parallel processing, optimize rendering for 5K+ suggestions

User: "How do I implement Send/Return workflow?"
→ Invoke: /architecture or /product
→ Plan: TipTap snapshots, version management, UI flow

User: "Need to store manuscript versions in database"
→ Invoke: /supabase or /tiptap
→ Solution: JSONB columns for TipTap snapshots, no complex migrations

User: "Suggestions show up in wrong places after editing"
→ Invoke: /prosemirror
→ Debug: Position mapping, document mutations
```

## Quick Reference Matrix

| Problem Area | Primary Agent | Secondary Agent | Key File |
|-------------|--------------|----------------|----------|
| Large doc browser freeze | `/chunking` | `/performance` | useTiptapEditor.ts |
| JWT authentication | `/auth` | `/tiptap` | tiptap-jwt.md |
| Position mapping | `/prosemirror` | `/suggestions` | suggestionMapper.ts |
| DOCX processing | `/queue` | `/supabase` | queue-processor/index.ts |
| Send/Return workflow | `/architecture` | `/product` | v1.0 roadmap |
| Database/snapshots | `/supabase` | `/tiptap` | JSONB columns |
| v1.0 feature planning | `/product` | `/architecture` | CLAUDE.md |

---

**Last Updated**: October 5, 2025
**Note**: Agents are Claude Code role specializations, not separate tools

## v1.0 Context

All agents should be aware of the streamlined v1.0 focus:
- **Primary goal**: Send/Return workflow using TipTap snapshots
- **Database strategy**: JSON-first (JSONB columns), no complex migrations
- **AI suggestions**: Phase 1 deployed (85K words), architecture under review
- **Authentication**: Resolved (24hr JWT tokens)
- **Out of scope for v1.0**: Admin portal, production editor workflows, complex schema changes

## Tags
#claude_code #agents #specialization #tiptap #prosemirror #performance #queue #supabase #JWT #authentication #architecture #debugging #ui #react #mcp