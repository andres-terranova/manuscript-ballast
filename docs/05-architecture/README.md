# Architecture Documentation

System design, architectural decisions, and data flow patterns.

## 📂 Architecture Docs

### System Design
- **queue-system.md** - Queue-based document processing architecture
- **react-suggestion-rendering.md** - React suggestion rendering strategy

## 🏗️ Architectural Patterns

### Queue-Based Processing
- Async DOCX processing
- Retry logic and error handling
- Progress tracking
- CPU timeout protection

### React Suggestion Rendering
- ProseMirror position mapping
- Decoration-based inline highlights
- UI suggestion conversion
- State management

## 🔑 Key Design Decisions

### Why Queue System?
- **Problem**: Direct DOCX processing hit WORKER_LIMIT errors
- **Solution**: Queue + edge function + polling
- **Benefits**: Reliable, retryable, progress tracking

### Why TipTap Pro AI?
- **Problem**: Custom AI integration complex, error-prone
- **Solution**: Use vendor's built-in AI with native chunking
- **Benefits**: Simplified, reliable, better quality

### Why ProseMirror Positions?
- **Problem**: Character offsets drift after edits
- **Solution**: Use PM positions that track document structure
- **Benefits**: Accurate position tracking, proper decoration rendering

## 📊 Data Flow Diagrams

### Document Upload Flow
```
User Upload → Storage → Queue → Edge Function → Database → UI Update
```

### AI Suggestion Flow
```
Click "AI Pass" → TipTap Chunking → AI API → Suggestions → PM Decorations → ChangeList
```

### Authentication Flow
```
Supabase Auth → JWT Request → Edge Function → Signed JWT → TipTap API
```

## 🎯 Architectural Principles

1. **Vendor Features First**: Use built-in features before custom solutions
2. **Queue for Async**: Use queues for long-running operations
3. **PM Positions**: Always use ProseMirror positions, not offsets
4. **Service Role Carefully**: Only use in edge functions, never client-side
5. **Type Safety**: TypeScript everywhere

## 📍 Related Documentation

- **Queue Implementation**: [../04-backend/queue-system.md](../04-backend/queue-system.md)
- **Component Architecture**: [../03-components/README.md](../03-components/README.md)
- **Large Document Strategy**: [../02-technical/large-documents/current-approach.md](../02-technical/large-documents/current-approach.md)

---

**Last Updated**: October 2, 2025
