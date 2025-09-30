# Feature Documentation

## Overview

This directory contains detailed documentation for individual features and their implementation.

## Available Documentation

### Large Document Processing
- **[LARGE_DOCUMENT_AI_PROCESSING_TODO.md](./LARGE_DOCUMENT_AI_PROCESSING_TODO.md)** - ✅ Implementation completed using TipTap native chunking
- **[LARGE_DOCUMENT_AI_PROCESSING_FEATURES.md](./LARGE_DOCUMENT_AI_PROCESSING_FEATURES.md)** - Feature specification and implementation details
- **[LARGE_DOCUMENT_AI_PROCESSING_RESEARCH_AND_IMPLEMENTATION_PLAN.md](./LARGE_DOCUMENT_AI_PROCESSING_RESEARCH_AND_IMPLEMENTATION_PLAN.md)** - Research and historical implementation approaches

### UI Features
- **[POPOVER_FROM_CHANGELIST_PLAN.md](./POPOVER_FROM_CHANGELIST_PLAN.md)** - Popover interaction design for suggestion management

## Feature Overview

### 1. AI-Powered Editing Suggestions ⭐ (Core Feature)

**Status**: ✅ Production Ready (Experimental Editor)

**What it does**: Provides real-time AI suggestions for grammar, style, clarity, and tone improvements.

**Key Components**:
- `ExperimentalEditor.tsx` - Main editor interface
- `@tiptap-pro/extension-ai-suggestion` - TipTap Pro AI extension
- `ChangeList.tsx` - Suggestion review panel
- `suggestionMapper.ts` - Maps AI responses to editor positions

**User Flow**:
1. User opens manuscript in Experimental Editor
2. Clicks "Run AI Pass" button
3. TipTap Pro AI analyzes document
4. Suggestions appear as underlined text
5. User reviews in ChangeList panel
6. User accepts/rejects individual suggestions

**Configuration**:
- Customizable AI rules (grammar, clarity, tone)
- Configurable via `AIEditorRuleSelector.tsx`
- 6 editorial roles available (see AI_EDITOR_RULES)

**Limitations**:
- Requires TipTap Pro subscription
- API rate limits apply
- JWT authentication required

---

### 2. Queue-Based Document Processing ⭐ (Critical Infrastructure)

**Status**: ✅ Production Ready

**What it does**: Processes DOCX uploads in background queue, eliminating timeout errors for large documents (60K+ words).

**Key Components**:
- `supabase/functions/queue-processor/` - Edge function processor
- `processing_queue` database table
- `useQueueProcessor.ts` - Auto-polling hook
- `manuscriptService.ts` - Queue management

**User Flow**:
1. User uploads DOCX file in Dashboard
2. File saved to Supabase Storage
3. Job added to processing_queue
4. Auto-polling detects pending job (10s interval)
5. queue-processor function processes DOCX
6. Real-time status updates (downloading → extracting_text → saving_results)
7. Manuscript ready for editing

**Key Features**:
- ✅ Handles 60K+ word documents
- ✅ CPU timeout protection (1.8s limit)
- ✅ Automatic retry (up to 3 attempts)
- ✅ Real-time progress tracking
- ✅ Stuck job detection and recovery

**Performance**:
- Small docs (189KB): ~1.5s
- Medium docs (240KB): ~2s
- Large docs (437KB): ~3s
- Auto-processing delay: Max 10s

---

### 3. Style Rule Validation

**Status**: ✅ Production Ready

**What it does**: Runs deterministic grammar and style checks alongside AI suggestions.

**Key Components**:
- `styleValidator.ts` - Rule validation logic
- `styleRuleConstants.ts` - Rule definitions
- `ChecksList.tsx` - Check results panel
- `checksPlugin.ts` - Editor decoration plugin

**Available Rules**:
- Grammar & punctuation
- Clarity & conciseness
- Professional tone
- Consistency checks
- Custom user-defined rules

**User Flow**:
1. User edits document
2. Deterministic checks run automatically
3. Issues highlighted in editor
4. Checks listed in "Checks" tab
5. User can accept/ignore suggestions

---

### 4. Dual Editor System (Legacy Migration)

**Status**: 🟡 In Transition

**What it does**: Maintains two editor modes during migration to TipTap Pro.

**Editors**:

#### Experimental Editor (Default)
- **Path**: `/manuscript/:id/experimental`
- **AI Engine**: TipTap Pro AI
- **Status**: Active development
- **Features**: Real-time suggestions, native chunking, JWT auth

#### Standard Editor (Deprecated)
- **Path**: `/manuscript/:id`
- **AI Engine**: Supabase edge function + OpenAI
- **Status**: Maintenance mode
- **Features**: Basic suggestions, legacy mapping

**Migration Strategy**:
1. Build Experimental Editor alongside Standard
2. Test with real users (feature flag)
3. Fix issues, improve UX
4. Set Experimental as default
5. Deprecate Standard Editor (future)

---

### 5. DOCX Import & Export

**Status**: ✅ Import Ready, ⏳ Export Planned

**Import Features**:
- ✅ DOCX file upload
- ✅ Text extraction (Mammoth.js)
- ✅ HTML conversion
- ✅ Statistics calculation (word count, character count)
- ✅ Large file support (queue-based)

**Export Features** (Planned):
- ⏳ Export to DOCX with formatting
- ⏳ Export to Markdown
- ⏳ Export to PDF
- ⏳ Track changes export

---

### 6. AI Editor Roles

**Status**: 🟡 Partial Implementation

**What it does**: Provides specialized AI editing personas for different editorial tasks.

**Available Roles**:
1. **Copy Editor** ✅ - Grammar, spelling, punctuation
2. **Line Editor** ✅ - Sentence structure, clarity, flow
3. **Style Editor** ✅ - Tone, voice, consistency
4. **Fact Checker** ⏳ - Verify claims, check sources
5. **Manuscript Evaluator** ⏳ - Holistic document analysis
6. **Developmental Editor** ⏳ - Plot, structure, pacing

**Implementation**:
- ✅ Rule definitions in `AIEditorRules.tsx`
- ✅ UI selector in `AIEditorRuleSelector.tsx`
- ✅ TipTap integration for inline suggestions
- ⏳ Holistic analysis system (evaluator, developmental)
- ⏳ Structured reports for document-wide feedback

**User Flow**:
1. User selects active editor roles
2. Clicks "Run AI Pass"
3. Each active role analyzes document
4. Suggestions categorized by role
5. User reviews by category

---

### 7. Real-Time Collaboration (Future)

**Status**: 📋 Planned

**Vision**: Multiple users edit same manuscript with real-time sync.

**Planned Features**:
- Real-time cursor positions
- Collaborative suggestion review
- User permissions (editor, reviewer, viewer)
- Comment threads
- Change tracking

**Technical Approach**:
- TipTap Collaboration extension
- Supabase Realtime
- Y.js CRDT for conflict resolution

---

### 8. Version History & Change Tracking (Future)

**Status**: 📋 Planned

**Vision**: Track all changes with ability to revert.

**Planned Features**:
- Automatic version snapshots
- Manual version creation
- Diff view between versions
- Revert to previous version
- Export change log

---

## Feature Comparison Matrix

| Feature | Experimental Editor | Standard Editor |
|---------|---------------------|-----------------|
| AI Suggestions | ✅ TipTap Pro | ✅ OpenAI (legacy) |
| Real-time highlighting | ✅ Yes | ✅ Yes |
| Large document support | ✅ Native chunking | ⚠️ Limited |
| Style checks | ✅ Yes | ✅ Yes |
| JWT Auth | ✅ Yes | ❌ No |
| Rate limiting | ✅ Built-in | ⚠️ Manual |
| Caching | ✅ Built-in | ❌ No |
| Production ready | ✅ Yes (default) | 🟡 Deprecated |

## Performance Benchmarks

### Document Processing Times

| Document Size | Word Count | Processing Time | Status |
|---------------|------------|-----------------|--------|
| Small | 1-10K | ~1.5s | ✅ Excellent |
| Medium | 10-30K | ~2s | ✅ Good |
| Large | 30-60K | ~3s | ✅ Good |
| Very Large | 60K+ | ~4-5s | ✅ Acceptable |

### AI Suggestion Generation Times

| Document Size | Character Count | Generation Time | Method |
|---------------|-----------------|-----------------|--------|
| Small | <100K | 2-5s | Direct |
| Large | 100K-300K | 10-30s | Chunked |
| Very Large | 300K+ | 1-2min | Chunked + cache |

## Known Issues & Limitations

### TipTap JWT Authentication 🔴
- **Issue**: Server-generated JWT rejected by TipTap API
- **Workaround**: Using temporary JWT from TipTap dashboard
- **Impact**: JWT expires every 24 hours, needs manual renewal
- **Documentation**: [../guides/TIPTAP_JWT_GUIDE.md](../guides/TIPTAP_JWT_GUIDE.md)

### Large Document UI Performance 🟡
- **Issue**: 1000+ suggestions can slow browser
- **Mitigation**: Decoration capping (200 visible), toggle controls
- **Future**: Pagination, virtualized lists

### Suggestion Positioning 🟡
- **Issue**: Position drift after document edits
- **Mitigation**: Use ProseMirror positions, not character offsets
- **Future**: Better position tracking with document mutations

## Roadmap

### Q4 2025
- ✅ Queue system implementation
- ✅ TipTap Pro integration
- ✅ Large document support
- ⏳ JWT authentication resolution

### Q1 2026
- Deprecate Standard Editor
- Export functionality
- Enhanced AI role system
- Collaborative editing foundation

### Q2 2026
- Real-time collaboration
- Version history
- Advanced analytics
- Enterprise features

## Related Documentation

- [Architecture Documentation](../architecture/README.md)
- [Development Guides](../guides/README.md)
- [Component Documentation](../../src/components/workspace/CLAUDE.md)

---

**Last Updated**: September 30, 2025
