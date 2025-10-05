# Backend Documentation

Server-side architecture, edge functions, and database schema.

## 📂 Backend Components

### Edge Functions
- **edge-functions.md** - Comprehensive edge function documentation
  - queue-processor (primary DOCX processor)
  - generate-tiptap-jwt (JWT token generation)
  - process-docx (deprecated)
  - suggest (deprecated)

### Queue System
- **queue-system.md** - Queue-based document processing architecture
  - processing_queue table
  - Auto-polling mechanism
  - Retry logic and error handling

## 🏗️ System Architecture

### Document Processing Flow
```
1. Upload DOCX
   ↓
2. Save to Supabase Storage
   ↓
3. Create job in processing_queue
   ↓
4. Auto-polling detects job (10s interval)
   ↓
5. queue-processor edge function processes
   ↓
6. Extract text with Mammoth.js
   ↓
7. Update manuscript record
   ↓
8. Mark job completed
```

### Authentication Flow
```
1. User authenticates with Supabase
   ↓
2. Frontend requests TipTap JWT
   ↓
3. generate-tiptap-jwt edge function
   ↓
4. Sign JWT with Content AI Secret
   ↓
5. Return JWT to frontend
   ↓
6. Use JWT for TipTap Pro AI requests
```

## 🔑 Key Technologies

- **Supabase**: Backend platform (PostgreSQL + Edge Functions)
- **Deno**: Edge function runtime
- **Mammoth.js**: DOCX text extraction
- **PostgreSQL**: Database
- **Row Level Security (RLS)**: Data access control

## 📊 Database Schema

### Core Tables
- **manuscripts**: User manuscripts
- **processing_queue**: DOCX processing jobs
- **profiles**: User profiles

### Key Patterns
- Service role key for elevated permissions
- RLS policies for user data isolation
- Queue-based async processing

## ⚡ Performance Metrics

### Edge Function Limits
- **CPU Timeout**: ~2 seconds
- **Memory**: Limited
- **Concurrent**: Multiple jobs can process

### Processing Times
- Small docs (189KB): ~1.5s
- Medium docs (240KB): ~2s
- Large docs (437KB): ~3s
- Tested capacity: 60K+ words

## 🎯 Common Tasks

**Deploy edge function**:
```bash
supabase functions deploy queue-processor
```

**View logs**:
```bash
supabase functions logs queue-processor
```

**Test locally**:
```bash
supabase functions serve queue-processor
```

**Check queue status**:
```sql
SELECT * FROM processing_queue WHERE status = 'pending';
```

## 📍 File Locations

**Edge Functions**: `/supabase/functions/`
- `queue-processor/index.ts`
- `generate-tiptap-jwt/index.ts`

**Migrations**: `/supabase/migrations/`

**Configuration**: `/supabase/config.toml`

---

**Last Updated**: October 2, 2025

## Tags

#backend #supabase #edge_function #database #queue #authentication #JWT #RLS #deployment #performance #architecture
