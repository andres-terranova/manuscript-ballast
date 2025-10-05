# Feature Documentation

### NOTE:

**Status Update (October 2, 2025)**: This file has been updated to reflect recent breakthroughs (JWT resolution, console.log fix). However, a comprehensive revision based on an updated Product Requirements Document (PRD) is planned. This will include more detailed feature specifications and updated roadmaps for both this file and the main CLAUDE.md guide.

For now, this document reflects current technical status as of October 2, 2025.

## Overview

This directory contains detailed documentation for individual features and their implementation.

## Available Documentation

### Large Document Processing
- **[Current Approach and Implementation Plan](../02-technical/large-documents/current-approach.md)** - Current approach and implementation roadmap
- **[Large Document Timeout Guide](../02-technical/large-documents/timeout-guide.md)** - Technical deep-dive on console.log fix and browser timeout issue
- **[TipTap JWT Guide](../02-technical/authentication/tiptap-jwt.md)** - JWT authentication resolution

## Feature Overview

### 1. AI-Powered Editing Suggestions ⭐ (Core Feature)

**Status**: ✅ Production Ready

**What it does**: Provides real-time AI suggestions for grammar, style, clarity, and tone improvements.

**Key Components**:
- `ManuscriptEditor.tsx` (Editor) - Main editor interface
- `@tiptap-pro/extension-ai-suggestion` - TipTap Pro AI extension
- `ChangeList.tsx` - Suggestion review panel
- `convertAiSuggestionsToUI()` - Inline conversion of TipTap AI responses (Editor.tsx)

**User Flow**:
1. User opens manuscript in editor
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
- 27K words working (console.log fix applied Oct 1, 2025)
- 85K+ word documents require custom resolver (browser timeout - planned)
- JWT authentication: ✅ Resolved (Oct 1, 2025)

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

### 4. Primary Editor (Production)

**Status**: ✅ Production Ready

**What it does**: Provides a modern, AI-powered editing experience built on TipTap Pro.

**Editors**:

#### ManuscriptEditor (Editor) - Production
- **Path**: `/manuscript/:id`
- **AI Engine**: TipTap Pro AI
- **Status**: Production ready
- **Features**: Real-time suggestions, native chunking, JWT auth

#### Standard Editor (Legacy)
- **Path**: `/manuscript/:id/legacy`
- **AI Engine**: Supabase edge function + OpenAI
- **Status**: Deprecated, maintenance mode only
- **Features**: Basic suggestions, legacy mapping

**Migration Complete**:
The primary editor is now the default production interface. The legacy editor is maintained for backward compatibility only.

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

| Feature | Editor (Production) | Standard Editor (Legacy) |
|---------|---------------------|-----------------|
| AI Suggestions | ✅ TipTap Pro | ✅ OpenAI (legacy) |
| Real-time highlighting | ✅ Yes | ✅ Yes |
| Large document support | ✅ Native chunking | ⚠️ Limited |
| Style checks | ✅ Yes | ✅ Yes |
| JWT Auth | ✅ Yes | ❌ No |
| Rate limiting | ✅ Built-in | ⚠️ Manual |
| Caching | ✅ Built-in | ❌ No |
| Production status | ✅ Default | ❌ Deprecated |

## Performance Benchmarks

### Document Processing Times

| Document Size | Word Count | Processing Time | Status |
|---------------|------------|-----------------|--------|
| Small | 1-10K | ~1.5s | ✅ Excellent |
| Medium | 10-30K | ~2s | ✅ Good |
| Large | 30-60K | ~3s | ✅ Good |
| Very Large | 60K+ | ~4-5s | ✅ Acceptable |

### AI Suggestion Generation Times (Post Console.log Fix)

| Document Size | Word/Character Count | Generation Time | Status |
|---------------|---------------------|-----------------|--------|
| Small | <10K words / <100K chars | 2-5s | ✅ Working |
| Medium | 10K-27K words / 100K-155K chars | 10-30s | ✅ Working (console.log fix) |
| Large | 27K-85K words / 155K-488K chars | 30s-120s | 🟡 Untested (likely browser timeout) |
| Very Large | 85K+ words / 488K+ chars | N/A (times out) | ❌ Needs custom resolver |

**Note**: Console.log CPU load fix (Oct 1, 2025) enabled 27K word processing. 85K+ word documents blocked by Chrome's 2-minute browser timeout.

## Recently Resolved ✅

### TipTap JWT Authentication (Resolved October 1, 2025)
- **Issue**: Server-generated JWT was rejected by TipTap API
- **Solution**: Simplified JWT payload structure - TipTap accepts any valid JWT signed with Content AI Secret
- **Status**: ✅ RESOLVED - No more manual token renewal needed
- **Documentation**: [TipTap JWT Guide](../02-technical/authentication/tiptap-jwt.md)

### Large Document Rate Limiting (Partially Resolved October 1, 2025)
- **Issue**: 429 rate limit errors on medium/large documents
- **Root Cause**: Console.log() CPU load disrupting TipTap's throttling
- **Solution**: Reduced polling log frequency from 1s → 5s
- **Status**: 🟡 PARTIALLY RESOLVED
  - ✅ 27K words (155K chars): Working
  - ❌ 85K+ words: Browser timeout at ~2 minutes (custom resolver needed)
- **Documentation**: [Large Document Timeout Guide](../02-technical/large-documents/timeout-guide.md)

---

## Known Limitations 🟡

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
- ✅ JWT authentication resolution
- 🟡 Large document support (27K words working, 85K+ needs custom resolver)
- ⏳ Custom resolver for browser timeout bypass

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

- [Large Document Timeout Guide](../02-technical/large-documents/timeout-guide.md)
- [TipTap JWT Guide](../02-technical/authentication/tiptap-jwt.md)
- [Product Roadmap](./roadmap.md)
- [Component Documentation](../03-components/editors/manuscript-editor.md)
- [Supabase Functions](../04-backend/edge-functions.md)

---

**Last Updated**: October 5, 2025

## Tags

#features #product #tiptap #queue #JWT #authentication #editor #AI #docx #performance #troubleshooting #backend
