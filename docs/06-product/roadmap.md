# Product Documentation

## Overview

This directory contains product requirements, roadmaps, and planning documents.

## Product Vision

### Mission Statement
Provide professional-grade AI-powered manuscript editing tools that help writers improve their work with intelligent, context-aware suggestions.

### Target Users
- **Fiction Authors** - Novels, short stories, creative writing
- **Non-Fiction Authors** - Business books, memoirs, technical writing
- **Academic Writers** - Research papers, dissertations
- **Professional Editors** - Editorial agencies, freelance editors

## Core Value Propositions

### 1. Multi-Role AI Editorial Team
Replace expensive human editors with AI personas that mimic different editorial roles:
- Copy Editor for grammar/spelling
- Line Editor for sentence flow
- Style Editor for voice consistency
- Developmental Editor for structure/plot
- Fact Checker for accuracy

### 2. Large Document Capability
Handle full-length manuscripts (60K+ words) without timeouts or errors.

### 3. Inline Real-Time Suggestions
See suggestions directly in the editor, not in a separate panel.

### 4. Professional-Grade Quality
Match or exceed human editor quality for technical edits (grammar, clarity, consistency).

## User Personas

### Sarah - Fiction Author
- **Age**: 35-50
- **Experience**: Writing for 5+ years
- **Pain Points**: Can't afford professional editors, needs fast feedback
- **Goals**: Polish manuscript before querying agents
- **Usage**: Uploads 80K word novel, runs full editorial pass, reviews 500+ suggestions

### Mark - Academic Writer
- **Age**: 25-40
- **Experience**: PhD student or early career researcher
- **Pain Points**: English as second language, academic tone requirements
- **Goals**: Submit publication-ready papers
- **Usage**: Uploads 10K word paper, focuses on clarity and formal tone

### Lisa - Professional Editor
- **Age**: 30-60
- **Experience**: 10+ years editing experience
- **Pain Points**: Repetitive tasks, time pressure, scaling business
- **Goals**: Increase throughput, focus on high-value edits
- **Usage**: Uses AI for first pass, manually reviews, adds value with developmental edits

## Feature Prioritization Matrix

### Critical Priority

| Feature | User Value | Technical Effort | Status |
|---------|------------|------------------|--------|
| Custom LLM Resolver (2-min timeout fix) | Critical | High | 📋 Planned |
| Deprecate Standard Editor | Maintenance | Low | 📋 Planned |
| Export to DOCX | High | Medium | 📋 Planned |

### High Priority

| Feature | User Value | Technical Effort | Status |
|---------|------------|------------------|--------|
| Holistic Document Analysis | High | High | 📋 Planned |
| AI Editor Workflows | Medium | Medium | 📋 Planned |
| Version History | Medium | Medium | 📋 Planned |
| Batch Processing | Medium | Low | 📋 Planned |

### Future / Backlog

| Feature | User Value | Technical Effort | Status |
|---------|------------|------------------|--------|
| Real-time Collaboration | Medium | Very High | 📋 Backlog |
| Mobile App | Low | Very High | 📋 Backlog |
| API Access | Low | Medium | 📋 Backlog |
| White Label | Low | High | 📋 Backlog |

## User Journeys

### Journey 1: First-Time User Uploads Manuscript

```
1. User signs up with email/password
   └─> Lands on empty Dashboard
   
2. Clicks "Upload Manuscript" button
   └─> File picker opens
   
3. Selects 200-page novel DOCX file
   └─> Upload progress shown
   
4. File processes in background (10s)
   └─> Status badge updates: "Uploaded" → "Processing" → "Ready"
   
5. Clicks manuscript title to open
   └─> ManuscriptEditor loads with full content
   
6. Reviews "AI Editor Rules" panel
   └─> Understands available editorial roles
   
7. Clicks "Run AI Pass" button
   └─> AI analyzes document (30s for large doc)
   
8. Reviews suggestions in ChangeList
   └─> Sees 350 suggestions organized by type
   
9. Accepts/rejects suggestions individually
   └─> Document updates in real-time
   
10. Downloads edited manuscript
    └─> Improved version ready for next step
```

**Pain Points**:
- ⚠️ 10s wait for processing (mitigated with status updates)
- ⚠️ 30s wait for AI pass on large docs (expected for quality)

**Delight Moments**:
- ✨ Instant upload feedback
- ✨ Real-time status updates
- ✨ Professional-quality suggestions
- ✨ Inline highlighting
- ✨ Paginated suggestion list (manageable review experience)

### Journey 2: Returning User Refines Chapter

```
1. User logs in
   └─> Dashboard shows 3 manuscripts
   
2. Opens in-progress novel
   └─> Editor loads, previous suggestions still visible
   
3. Navigates to Chapter 7
   └─> Scrolls to specific section
   
4. Selects 3 paragraphs
   └─> Text highlighted
   
5. Runs AI Pass on selection only (future feature)
   └─> Fast targeted suggestions (5s)
   
6. Reviews 12 suggestions
   └─> More manageable than full document
   
7. Accepts 10, rejects 2
   └─> Quick iteration
   
8. Auto-save preserves changes
   └─> No manual save needed
```

## Competitive Analysis

### Direct Competitors

**Grammarly Premium**
- ✅ Strengths: Brand recognition, browser integration, real-time
- ❌ Weaknesses: Expensive ($30/mo), limited to short texts, no editorial roles
- 🎯 Our Advantage: Full manuscript support, multiple AI roles, lower cost

**ProWritingAid**
- ✅ Strengths: Comprehensive reports, integrations
- ❌ Weaknesses: Clunky UX, slow processing, limited AI
- 🎯 Our Advantage: Modern UI, faster processing, better AI

**AutoCrit**
- ✅ Strengths: Fiction-specific, genre templates
- ❌ Weaknesses: Dated interface, limited AI, expensive
- 🎯 Our Advantage: Better AI quality, modern tech, more flexible

**Claude/ChatGPT (Direct)**
- ✅ Strengths: Free, powerful AI, conversational
- ❌ Weaknesses: No editor integration, manual copy-paste, no tracking
- 🎯 Our Advantage: Seamless integration, suggestion tracking, one-click accept

### Indirect Competitors

**Human Editors**
- ✅ Strengths: Nuanced feedback, creative insights
- ❌ Weaknesses: Expensive ($0.02-0.10/word), slow (weeks), limited availability
- 🎯 Our Position: Complement, not replace - AI for technical, human for creative

## Pricing Strategy (Future)

### Free Tier
- Up to 10K words/month AI processing
- Basic grammar and spelling
- 1 manuscript at a time
- Community support

### Pro Tier ($19/mo)
- Up to 100K words/month AI processing
- All editorial roles
- Unlimited manuscripts
- Priority processing
- Email support

### Team Tier ($49/mo)
- Up to 500K words/month AI processing
- All Pro features
- Team collaboration (future)
- Priority support
- Analytics dashboard

### Enterprise (Custom)
- Unlimited processing
- White label options
- API access
- Dedicated support
- Custom AI training

## Success Metrics

### User Acquisition
- Sign-ups per week
- Conversion rate (visitor → sign-up)
- Activation rate (sign-up → first upload)

### User Engagement
- Active users per week/month
- Manuscripts uploaded per user
- AI passes run per manuscript
- Suggestions accepted vs. rejected

### User Retention
- Day 7 retention
- Day 30 retention
- Churn rate
- Lifetime value

### Product Quality
- Suggestion acceptance rate
- Time to process documents
- Error rate (failed uploads, stuck jobs)
- User satisfaction (NPS)

## Critical Technical Decisions

### Large Document Processing Architecture

**Current State (October 2025)**:
- ✅ Successfully handles 27,782 words (155K characters)
- 🟡 85K+ word documents fail at ~2 minutes with Chrome timeout
- ✅ Console.log CPU load fix improved rate limiting from TipTap

**Root Cause**:
Chrome enforces a hard ~2-minute browser timeout for XMLHttpRequest/Fetch API requests. When TipTap's `loadAiSuggestions()` takes longer than 2 minutes, Chrome forcibly closes the connection with `ERR_CONNECTION_CLOSED` or 429 rate limit errors.

**Planned Solution - Custom LLM Resolver**:
Implement TipTap's [custom apiResolver](https://tiptap.dev/docs/content-ai/capabilities/suggestion/custom-llms#replace-the-api-endpoint-recommended) to replace their cloud API with our own backend:

```typescript
AiSuggestion.configure({
  async resolver({ defaultResolver, rules, ...options }) {
    return defaultResolver({
      ...options,
      rules,
      apiResolver: async ({ html, htmlChunks, rules }) => {
        // Process chunks with custom backend LLM
        // Each request < 30-60 seconds
        // Return format: { format: 'replacements', content: {...} }
      },
    });
  },
})
```

**Benefits**:
- Bypass browser timeout by processing chunks separately
- Each chunk processes in < 30 seconds
- Support unlimited document length
- Control over LLM provider and costs
- Better error handling and retry logic

**Technical Requirements**:
- Backend endpoint that accepts HTML chunks
- Response format matching TipTap's `replacements` API
- Must include `htmlChunks` with all chunks for caching
- Each suggestion must reference correct `chunkId`

**Priority**: Critical - Blocking 85K+ word support

## Technical Roadmap Alignment

### Q4 2025 - Foundation
- ✅ Queue system (completed)
- ✅ TipTap Pro integration (completed)
- ✅ JWT authentication (completed)
- 🟡 Large document optimization (partial - 27K words working, custom resolver for 85K+ planned)
- 📋 Export functionality (planned)

### Q1 2026 - Enhancement
- 📋 Holistic analysis system
- 📋 Enhanced AI roles (evaluator, developmental)
- 📋 Suggestion pagination
- 📋 Version history

### Q2 2026 - Scale
- 📋 Real-time collaboration
- 📋 Team features
- 📋 Analytics dashboard
- 📋 API access

### Q3 2026 - Monetization
- 📋 Launch paid tiers
- 📋 Usage-based billing
- 📋 Referral program
- 📋 Partner integrations

## User Feedback Synthesis

### Most Requested Features
1. **Export to DOCX** - "I need to send edited version to my agent"
2. **Process only selection** - "Full document takes too long"
3. ~~**Better organization**~~ - ✅ Implemented via ChangeList pagination
4. **Track changes view** - "Like Word's track changes"
5. **Mobile support** - "Want to review on iPad"

### Common Pain Points
1. **2-minute timeout on 85K+ word docs** - Chrome browser timeout kills long requests (custom resolver planned)
2. **Processing time** - "Large docs take a while" (expected, but communicate better)
3. **No undo** - "Accidentally accepted wrong suggestion"

### Positive Feedback
1. **Suggestion quality** - "Better than Grammarly"
2. **Large document support** - "Finally works with 27K+ word documents"
3. **Inline highlighting** - "Love seeing suggestions in context"
4. **Processing reliability** - "No more timeouts on medium-sized docs"
5. **JWT authentication** - "No more daily token refresh needed" (resolved)

## Go-to-Market Strategy

### Phase 1: Beta (Current)
- Target: Fiction writers in writing communities
- Channels: Reddit (r/writing), Twitter, writing Discord servers
- Messaging: "AI editor that handles full manuscripts"
- Goal: 100 active users, gather feedback

### Phase 2: Launch
- Target: Self-published authors, writing coaches
- Channels: Content marketing, SEO, partnerships
- Messaging: "Professional editing at 1/10th the cost"
- Goal: 1,000 users, validate pricing

### Phase 3: Growth
- Target: Expand to academic, business writers
- Channels: Paid ads, affiliates, integrations
- Messaging: "AI-powered writing assistant for professionals"
- Goal: 10,000 users, profitability

## Related Documentation

- [Feature Documentation](./features.md)
- [Large Document Timeout Guide](../02-technical/large-documents/timeout-guide.md)
- [TipTap JWT Guide](../02-technical/authentication/tiptap-jwt.md)

---

**Last Updated**: October 2, 2025

## Tags

#product #roadmap #features #architecture #performance #JWT #authentication #queue #tiptap #backend #deployment
