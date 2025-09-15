# Ballast

An AI-powered manuscript editing platform that streamlines the editorial workflow with intelligent suggestions, track changes, and collaborative features.

## Overview

Ballast is a modern manuscript editing application designed for publishers, editors, and authors. It combines the power of AI with sophisticated document processing to provide an intuitive editing experience with professional-grade features.

### Key Features

- **DOCX-First Workflow**: Import Word documents and maintain formatting
- **AI-Powered Suggestions**: Intelligent spelling, grammar, and style recommendations
- **Track Changes**: Visual diff system with accept/reject functionality
- **Real-time Collaboration**: Multi-editor support with live updates
- **Advanced Position Mapping**: Accurate suggestion placement using ProseMirror
- **Status Management**: Manuscript workflow states (In Progress, Under Review, Reviewed)

## Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **TipTap Editor** (ProseMirror-based) for rich text editing
- **Tailwind CSS** + **shadcn/ui** for consistent design system
- **React Router** for navigation
- **TanStack Query** for server state management

### Backend
- **Supabase** for database, authentication, and file storage
- **Supabase Edge Functions** for AI processing and DOCX conversion
- **OpenAI API** for intelligent suggestions
- **Row-Level Security (RLS)** for data protection

### AI Integration
- **OpenAI GPT Models** for content analysis and suggestions
- **Custom Edge Functions** for processing workflows
- **Real-time suggestion mapping** with position persistence

## Project Structure

```
src/
├── components/
│   ├── auth/                  # Authentication components
│   │   ├── Login.tsx
│   │   └── PasswordReset.tsx
│   ├── dashboard/             # Dashboard and manuscript list
│   │   └── Dashboard.tsx
│   ├── workspace/             # Manuscript editing workspace
│   │   ├── ManuscriptWorkspace.tsx  # Main editing interface
│   │   ├── DocumentCanvas.tsx       # TipTap editor wrapper
│   │   ├── ChangeList.tsx          # Track changes sidebar
│   │   ├── ChecksList.tsx          # AI checks panel
│   │   └── ProcessingStatus.tsx    # Upload/processing state
│   └── ui/                    # Reusable UI components (shadcn/ui)
├── contexts/
│   ├── AuthContext.tsx        # User authentication state
│   └── ManuscriptsContext.tsx # Manuscript data management
├── hooks/
│   ├── useTiptapEditor.ts     # Custom TipTap editor hook
│   └── useActiveStyleRules.ts # Style rule management
├── lib/
│   ├── prosemirrorPositionMapper.ts # Position mapping system
│   ├── suggestionMapper.ts          # AI suggestion positioning
│   ├── suggestionsPlugin.ts         # TipTap suggestions extension
│   ├── checksPlugin.ts              # TipTap checks extension
│   ├── docxUtils.ts                 # DOCX processing utilities
│   ├── markdownUtils.ts             # Markdown conversion
│   └── types.ts                     # Shared TypeScript types
├── services/
│   └── manuscriptService.ts   # Supabase data layer
└── pages/
    ├── Index.tsx             # Landing/login page
    └── NotFound.tsx          # 404 error page
```

## Database Schema

### Core Tables
- **manuscripts**: Document metadata, content, and processing status
- **Storage bucket**: `manuscripts` for DOCX file uploads

### Key Fields
```sql
manuscripts:
  - id (uuid, primary key)
  - title (text)
  - content_html (text) -- TipTap editor content
  - content_text (text) -- Plain text for AI processing
  - source_markdown (text) -- Original markdown conversion
  - suggestions (jsonb) -- AI-generated suggestions
  - comments (jsonb) -- Editorial comments
  - status ('in_progress' | 'under_review' | 'reviewed')
  - processing_status ('pending' | 'processing' | 'completed' | 'error')
  - word_count, character_count
  - owner_id (uuid, references auth.users)
  - docx_file_path (text) -- Storage path
```

## Setup & Configuration

### Environment Variables
Supabase configuration is automatically managed by Lovable. For reference:

```bash
SUPABASE_URL=https://etybjqtfkclugpahsgcj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Secrets
Required secrets for Edge Functions:
- `OPENAI_API_KEY` - OpenAI API key for AI suggestions
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations
- `SUPABASE_DB_URL` - Database connection string

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## Core Systems

### 1. DOCX Processing Workflow

1. **File Upload**: DOCX files uploaded to Supabase Storage
2. **Edge Function Processing**: `process-docx` function converts to HTML/Markdown
3. **Content Storage**: Processed content stored in `manuscripts` table
4. **Editor Loading**: TipTap editor initialized with HTML content

### 2. AI Suggestion Pipeline

1. **Content Analysis**: Plain text sent to `suggest` Edge Function
2. **OpenAI Processing**: GPT models analyze content for improvements
3. **Position Mapping**: Text indices converted to ProseMirror positions
4. **Visual Rendering**: Suggestions displayed as editor decorations
5. **User Interaction**: Accept/reject suggestions update document

### 3. Position Mapping System

**Challenge**: AI suggestions are generated from plain text, but must be displayed in rich text editor.

**Solution**: `ProseMirrorPositionMapper` class:
- Walks ProseMirror document structure
- Maps plain text indices to editor positions
- Validates positions within text nodes
- Handles document changes via `DecorationSet.map()`

### 4. Track Changes Implementation

- **Visual Indicators**: Insertions (green), deletions (red), replacements (blue)
- **Change List**: Sidebar showing all suggestions with context
- **Accept/Reject**: Individual or bulk operations
- **Position Persistence**: Changes maintain correct positions during edits

## Editor Architecture

### TipTap Extensions
- **StarterKit**: Basic editing functionality
- **Link Extension**: Hyperlink support
- **Placeholder**: Empty state guidance
- **SuggestionsExtension**: Custom plugin for AI suggestions
- **ChecksExtension**: Style and grammar checks

### Plugin System
- **suggestionsPlugin**: Manages suggestion decorations
- **checksPlugin**: Handles grammar/style validations
- **Position Mapping**: Real-time coordinate updates

## API Integration

### Supabase Edge Functions

#### `/functions/process-docx`
- Converts DOCX files to HTML and Markdown
- Extracts metadata (word count, excerpts)
- Updates manuscript processing status

#### `/functions/suggest`
- Analyzes manuscript content for improvements
- Integrates with OpenAI GPT models
- Returns suggestions with text position indices

### OpenAI Models Used
- **GPT-4o-mini**: Fast, cost-effective text analysis
- **GPT-4o**: More sophisticated content review
- Custom prompts for editorial suggestions

## Development Guide

### Adding New Suggestion Types
1. Update `types.ts` with new suggestion category
2. Modify Edge Function prompts in `/functions/suggest`
3. Add visual styling in `suggestionsPlugin.ts`
4. Update UI components in `ChangeCard.tsx`

### Debugging Position Mapping
- Check browser console for mapping diagnostics
- Use `mappingDiagnostics.ts` for detailed logging
- Verify text consistency between editor and AI processing

### Testing Workflows
1. **Upload Test**: Import various DOCX formats
2. **AI Processing**: Verify suggestions appear correctly
3. **Position Accuracy**: Edit document, ensure suggestions stay aligned
4. **Accept/Reject**: Confirm changes apply properly

## Deployment

### Supabase Configuration
1. Database migrations applied automatically
2. Edge Functions deployed on code changes
3. Storage buckets configured for file uploads
4. RLS policies secure user data

### Production Setup
- Secrets configured in Supabase Dashboard
- SSL certificates managed by Supabase
- CDN for static assets via Lovable

## Troubleshooting

### Common Issues

**Suggestions appear in wrong locations**
- Check text consistency between editor and AI processing
- Verify position mapping in browser console
- Ensure document hasn't changed during processing

**DOCX processing failures**
- Verify file size limits (check storage quota)
- Check Edge Function logs in Supabase Dashboard
- Confirm OpenAI API key is configured

**Editor performance issues**
- Large documents may need pagination
- Consider debouncing frequent updates
- Monitor suggestion count and complexity

## Architecture Decisions

### Why ProseMirror?
- Precise position control for suggestion mapping
- Extensible plugin system for custom features
- Professional-grade document editing capabilities

### Why Supabase?
- Real-time collaboration features
- Integrated authentication and file storage
- Edge Functions for AI processing
- Automatic scaling and management

### Position Mapping Approach
- Native ProseMirror APIs for accuracy
- Document traversal for text index conversion
- DecorationSet auto-mapping for change handling
- Validation to prevent invalid positions

## Contributing

This project follows clean architecture principles:
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Type Safety**: Comprehensive TypeScript coverage
- **Testability**: Modular components and services
- **Performance**: Optimized re-renders and efficient data flow

## License

Built with Lovable - AI-powered web application development platform.

## Support

For technical issues or feature requests, check the Supabase Dashboard logs and browser console for detailed error information.