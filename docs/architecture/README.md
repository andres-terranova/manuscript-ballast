# Architecture Documentation

## Overview

This directory contains system architecture documentation for Manuscript Ballast.

## Documents in This Section

- **[QUEUE_SYSTEM_ARCHITECTURE.md](./QUEUE_SYSTEM_ARCHITECTURE.md)** - Queue-based document processing system that eliminates WORKER_LIMIT errors and handles large manuscripts (60K+ words)

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ Experimental │  │  Standard    │     │
│  │              │→ │   Editor     │  │   Editor     │     │
│  │              │  │  (Default)   │  │ (Deprecated) │     │
│  └──────────────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────────────────────────┼──────────────────┼───────────┘
                              │                  │
                    ┌─────────┴──────────┐      │
                    │   TipTap Pro AI    │      │
                    │  (JWT Auth)        │      │
                    └─────────┬──────────┘      │
                              │                  │
┌─────────────────────────────┼──────────────────┼───────────┐
│                    Supabase Backend            │           │
│  ┌────────────┐  ┌────────────┐  ┌────────────▼────────┐  │
│  │ PostgreSQL │  │  Storage   │  │  Edge Functions     │  │
│  │            │  │            │  │  - queue-processor  │  │
│  │ - manuscripts │  │ - DOCX  │  │  - suggest          │  │
│  │ - processing_ │  │   files │  │  - generate-tiptap- │  │
│  │   queue      │  │          │  │    jwt              │  │
│  └────────────┘  └────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Document Upload Flow
```
User uploads DOCX
    ↓
Dashboard.tsx saves to Supabase Storage
    ↓
manuscriptService.queueDocxProcessing() creates queue job
    ↓
useQueueProcessor hook polls queue every 10s
    ↓
queue-processor edge function processes DOCX
    ↓
Extracts text, converts to HTML, calculates stats
    ↓
Updates manuscript record with content
    ↓
Dashboard displays "Ready" status
```

#### 2. AI Suggestion Flow (Experimental Editor)
```
User clicks "Run AI Pass"
    ↓
ExperimentalEditor.tsx triggers TipTap AI
    ↓
useTiptapEditor hook configures AI extension
    ↓
TipTap Pro API (with JWT auth)
    ↓
Returns suggestions with position data
    ↓
suggestionMapper.ts converts to UI format
    ↓
ChangeList.tsx displays in right panel
    ↓
User accepts/rejects suggestions
    ↓
Editor updates content
```

#### 3. Legacy Suggestion Flow (Standard Editor - Deprecated)
```
User clicks "Run AI Pass"
    ↓
ManuscriptWorkspace.tsx calls suggest edge function
    ↓
suggest function uses OpenAI API
    ↓
Returns plain text suggestions
    ↓
suggestionMapper.mapPlainTextToPM() maps to editor positions
    ↓
suggestionsPlugin.ts creates decorations
    ↓
ChangeList.tsx displays suggestions
```

### Component Hierarchy

```
App.tsx
├── AuthContext (authentication state)
├── ManuscriptsContext (manuscript data)
└── Router
    ├── Index.tsx (landing page)
    ├── Login.tsx
    └── Dashboard.tsx
        └── ExperimentalEditor.tsx (default)
            ├── DocumentCanvas.tsx
            │   └── TipTap Editor with plugins
            ├── ChangeList.tsx
            │   └── ChangeCard.tsx (suggestion items)
            ├── ChecksList.tsx
            │   └── CheckCard.tsx (style check items)
            ├── AIEditorRuleSelector.tsx
            └── ProcessingStatus.tsx
```

### Key Technologies & Integrations

#### Frontend Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query** - Server state management
- **shadcn/ui** - Component library (Radix UI + Tailwind)

#### Editor Stack
- **TipTap v3** - Rich text editor framework
- **@tiptap-pro/extension-ai-suggestion** - AI suggestion extension
- **ProseMirror** - Document model (underlying TipTap)

#### Backend Stack
- **Supabase PostgreSQL** - Database
- **Supabase Storage** - File storage for DOCX files
- **Supabase Edge Functions** - Deno-based serverless functions
- **Row Level Security (RLS)** - Database access control

#### AI & Processing
- **TipTap Pro AI** - Primary AI suggestion engine (experimental editor)
- **OpenAI API** - Legacy suggestion engine (standard editor)
- **Mammoth.js** - DOCX to HTML conversion

### Database Schema

#### Core Tables

**manuscripts**
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key to auth.users)
- title: text
- content: text (HTML)
- original_text: text (plain text)
- word_count: integer
- character_count: integer
- docx_file_path: text (storage path)
- created_at: timestamp
- updated_at: timestamp
```

**processing_queue**
```sql
- id: uuid (primary key)
- manuscript_id: uuid (foreign key to manuscripts)
- job_type: text ('process_docx', 'generate_suggestions')
- status: text ('pending', 'processing', 'completed', 'failed')
- priority: integer (1-10)
- attempts: integer
- max_attempts: integer (default: 3)
- error_message: text
- progress_data: jsonb
- created_at: timestamp
- started_at: timestamp
- completed_at: timestamp
```

### State Management Patterns

#### Context-Based Global State
- **AuthContext** - User authentication state
- **ManuscriptsContext** - Manuscript CRUD operations with local storage fallback

#### Local Component State
- **ExperimentalEditor** - Editor content, suggestions, checks, UI state
- **Dashboard** - Manuscript list, filters, processing status

#### Server State (TanStack Query)
- Supabase data fetching
- Automatic cache invalidation
- Optimistic updates

### Plugin System (TipTap/ProseMirror)

#### suggestionsPlugin
- Manages AI suggestion decorations
- Handles suggestion selection
- Provides commands for accept/reject

#### checksPlugin
- Manages style check decorations
- Highlights grammar/style issues
- Provides check resolution commands

### Critical Design Decisions

#### 1. Queue-Based Processing (Not Direct Edge Function Calls)
**Why**: Eliminates WORKER_LIMIT errors, handles large documents, automatic retry
**Trade-off**: 10s polling delay vs. immediate processing

#### 2. Dual Editor System (Experimental + Standard)
**Why**: Gradual migration to TipTap Pro without breaking existing functionality
**Trade-off**: Code duplication vs. zero-downtime migration

#### 3. JWT Authentication for TipTap (Not Direct API Keys)
**Why**: Security - secrets stay server-side, tokens expire
**Trade-off**: Complex token management vs. simple API key

#### 4. Native TipTap Chunking (Not Custom Resolver)
**Why**: Vendor-supported, less code, built-in caching
**Trade-off**: Less control vs. simpler implementation

#### 5. ProseMirror Decorations (Not DOM Manipulation)
**Why**: Performance, editor integration, proper position tracking
**Trade-off**: Learning curve vs. maintainability

## Performance Considerations

### Large Document Handling
- TipTap native chunking splits documents automatically
- Queue processor has 1.8s CPU timeout protection
- Progress tracking prevents user confusion

### Browser Performance
- Decoration capping (max 200 visible checks/suggestions)
- Toggle visibility for heavy documents
- Virtualized scrolling in long change lists

### API Rate Limiting
- TipTap Pro AI has built-in rate limiting
- Queue processor respects Supabase edge function limits
- Exponential backoff for failed jobs

## Security Architecture

### Authentication Flow
```
User login
    ↓
Supabase Auth (email/password)
    ↓
Session stored in browser
    ↓
AuthContext provides user state
    ↓
RLS policies enforce data isolation
```

### Data Access Control
- **Row Level Security (RLS)** on all tables
- Users can only access their own manuscripts
- Edge functions verify user identity via JWT
- TipTap JWT tokens scoped per user session

### Secrets Management
- Client: Only public App ID and JWT tokens (short-lived)
- Server: Content AI Secret, database credentials (Supabase env vars)
- No secrets in git repository

## Scalability Considerations

### Current Limits
- TipTap Pro API rate limits (plan-dependent)
- Supabase edge function 2-minute timeout
- Browser memory for very large documents (500K+ characters)

### Scaling Strategies
- Queue system handles concurrent processing
- Edge functions auto-scale with load
- Supabase PostgreSQL scales vertically
- TipTap caching reduces redundant API calls

## Monitoring & Observability

### Available Logs
- Browser console (client-side errors, auth status)
- Supabase edge function logs (processing errors)
- PostgreSQL query logs (performance issues)

### Key Metrics to Monitor
- Queue processing time (processing_queue table)
- Edge function success rate (Supabase dashboard)
- TipTap API usage (TipTap dashboard)
- Suggestion acceptance rate (future analytics)

## Related Documentation

- [Queue System Architecture](./QUEUE_SYSTEM_ARCHITECTURE.md) - Deep dive into queue processing
- [Component Documentation](../../src/components/workspace/CLAUDE.md) - UI component details
- [Library Documentation](../../src/lib/CLAUDE.md) - Core utilities
- [Edge Functions](../../supabase/functions/CLAUDE.md) - Backend processing

---

**Last Updated**: September 30, 2025
