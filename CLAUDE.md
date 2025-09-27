# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `pnpm run dev` (runs on port 8080)
- **Build for production**: `pnpm run build`
- **Build for development**: `pnpm run build:dev`
- **Lint code**: `pnpm run lint` (ESLint)
- **Preview production build**: `pnpm run preview`
- **Install dependencies**: `pnpm i`

## Architecture Overview

This is a **manuscript editing application** built with React, TypeScript, Vite, and TipTap editor. The app provides AI-powered editing suggestions for manuscripts through two editor modes:

### Core Structure

- **Experimental Editor** (`/manuscript/:id/experimental`): **Default/Main editor** - Uses TipTap Pro AI Suggestion extension with real-time inline suggestions and enhanced large document processing
- **Standard Editor** (`/manuscript/:id`): **Deprecated/Legacy editor** - Uses Supabase edge functions for AI suggestions

### Key Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components + Radix UI + Tailwind CSS
- **Editor**: TipTap v3 with extensions (AI Suggestion, Link, Placeholder, Starter Kit)
- **Backend**: Supabase (authentication, database, edge functions)
- **State Management**: React Context (AuthContext, ManuscriptsContext) + TanStack Query
- **Routing**: React Router v6

### Data Flow Architecture

1. **Manuscripts** are stored in Supabase database
2. **AI Suggestions** flow through:
   - Experimental Editor (default):
     - Small documents (<100K chars): TipTap Pro AI extension → direct inline suggestions
     - Large documents (>100K chars): Enhanced chunking → TipTap Pro AI → aggregated suggestions
   - Standard Editor (deprecated): Supabase edge functions → suggestion mapping → TipTap decorations
3. **Style Rules** are configurable editing guidelines (grammar, clarity, tone, etc.)
4. **Change Lists** display suggestions in a right panel for review/acceptance

### Enhanced Large Document Processing

The experimental editor includes advanced processing for large manuscripts:

- **Automatic Detection**: Documents >100K characters trigger enhanced mode
- **Smart Chunking**: Splits content into 4K character chunks respecting paragraph boundaries
- **Rate Limiting**: 2-second delays between chunks prevent API rate limits (429 errors)
- **Progress Tracking**: Real-time status updates during processing
- **100% Coverage**: Processes entire document without arbitrary limits
- **Custom Resolver**: Temporarily overrides TipTap's resolver for chunked processing

### Component Architecture

**Core Workspace Components:**
- `ExperimentalEditor.tsx`: **Default/Main editor** - TipTap Pro AI-powered editor
- `ManuscriptWorkspace.tsx`: **Deprecated/Legacy editor** interface
- `DocumentCanvas.tsx`: TipTap editor wrapper with plugins
- `ChangeList.tsx`: Suggestion review panel
- `ChecksList.tsx`: Style rule validation results

**Key Libraries:**
- `lib/suggestionMapper.ts`: Maps server suggestions to editor decorations
- `lib/editorUtils.ts`: Editor state management utilities
- `lib/styleValidator.ts`: Deterministic style rule checks
- `lib/types.ts`: Unified type definitions for suggestions

### Authentication & Data

- **Auth**: Supabase authentication with AuthContext
- **Manuscripts**: Context-based state management with local storage fallback
- **Database**: Supabase PostgreSQL with TypeScript types

## TipTap Pro Configuration

The main experimental editor requires TipTap Pro credentials:

```bash
# Required environment variables
VITE_TIPTAP_APP_ID=your_content_ai_app_id
VITE_TIPTAP_TOKEN=your_content_ai_secret
```

**Important**:
- Must configure "Allowed Origins" in TipTap Cloud Dashboard for local development
- See `EXPERIMENTAL_AI_SETUP.md` for complete setup instructions
- JWT tokens expire every 24 hours and need renewal

## File Structure Patterns

- `src/components/`: React components organized by feature
- `src/lib/`: Core utilities and business logic
- `src/contexts/`: React context providers
- `src/hooks/`: Custom React hooks
- `src/integrations/supabase/`: Supabase client and types
- `src/types/`: TypeScript type definitions

## Development Notes

- **Editor State**: Uses TipTap's plugin system for managing suggestions and decorations
- **Suggestion Flow**:
  - Small docs: TipTap AI → direct suggestions → UI components
  - Large docs: Custom chunking → TipTap AI per chunk → aggregated suggestions → UI components
- **Style Rules**: Configurable editing rules with both AI and deterministic validation
- **Dual Editor Support**: Experimental (default) and standard (deprecated) editors share data but use different AI backends
- **Real-time Features**: Default experimental editor provides live AI suggestions as you type
- **Performance Optimization**: Large document processing prevents browser blocking and memory issues
- **Rate Limiting**: Built-in delays and chunking prevent TipTap Cloud API rate limit errors

## Common Workflows

1. **Adding new suggestion types**: Modify `lib/types.ts` and update mapping in `suggestionMapper.ts`
2. **New style rules**: Add to `STYLE_RULES` in `styleRuleConstants.ts`
3. **Editor plugins**: Extend TipTap functionality in `lib/` utilities
4. **AI configuration**: Modify rule sets in `AIEditorRules.tsx` for the default experimental editor
5. **Large document tuning**: Adjust `CHUNK_SIZE` (4000), `DELAY_BETWEEN_CHUNKS` (2000ms), or size threshold (100K chars) in `ExperimentalEditor.tsx`
6. **Performance monitoring**: Check browser console for chunking progress and rate limiting status

## TipTap AI Implementation Mistakes to Avoid

### Common Implementation Errors

1. **❌ Dynamic Resolver Override (WRONG)**
   ```typescript
   // This DOES NOT WORK - resolver cannot be overridden at runtime
   editor.storage.aiSuggestion.resolver = async (options) => {
     // Custom logic here
   };
   ```
   **Problem**: TipTap AI resolver must be configured at extension initialization, not at runtime.

2. **❌ Content Replacement Approach (WRONG)**
   ```typescript
   // This DESTROYS document formatting
   editor.commands.setContent(chunkHtml);
   // Process chunk
   editor.commands.setContent(originalHtml); // Loses paragraph breaks!
   ```
   **Problem**: Temporarily replacing editor content destroys document structure and formatting.

3. **❌ Queue-Based Backend Processing (WRONG)**
   ```typescript
   // This bypasses TipTap entirely
   const response = await fetch('/functions/suggest', {
     body: JSON.stringify({ text, rules })
   });
   ```
   **Problem**: TipTap Pro AI must be used directly; cannot replace with OpenAI API calls.

### ✅ Correct Implementation: Custom Resolver Configuration

Configure the custom resolver during extension initialization in `useTiptapEditor.ts`:

```typescript
AiSuggestion.configure({
  // ... other config
  resolver: async ({ defaultResolver, html, htmlChunks, rules, ...options }) => {
    const documentLength = html?.length || 0;
    const LARGE_DOCUMENT_THRESHOLD = 100000; // 100K characters

    // Small documents: use default resolver
    if (documentLength <= LARGE_DOCUMENT_THRESHOLD) {
      return await defaultResolver({ html, htmlChunks, rules, ...options });
    }

    // Large documents: implement custom chunking with rate limiting
    const chunks = smartChunkText(plainText, 4000);
    let allSuggestions = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkHtml = createChunkHtml(chunks[i]);
      const chunkSuggestions = await defaultResolver({
        ...options,
        html: chunkHtml,
        htmlChunks: [{ html: chunkHtml, start: offset, end: offset + chunks[i].length }],
        rules
      });

      // Adjust positions and add to results
      allSuggestions.push(...adjustSuggestionPositions(chunkSuggestions, offset));

      // Rate limiting: 2-second delay between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return allSuggestions;
  }
})
```

### Key Principles

1. **Configuration Time**: TipTap resolver must be configured at extension initialization
2. **Content Preservation**: Never replace editor content; work with HTML/text chunks separately
3. **TipTap Integration**: Always use TipTap's `defaultResolver`; never replace with external APIs
4. **Rate Limiting**: Implement delays between chunk processing to avoid 429 errors
5. **Position Adjustment**: Suggestions from chunks must have positions adjusted for the full document

### Testing Guidelines

- **Small Documents** (<100K chars): Should use default resolver directly
- **Large Documents** (>100K chars): Should trigger custom chunking with console logging
- **Rate Limiting**: Monitor console for "Waiting 2000ms" messages between chunks
- **Suggestion Quality**: Verify suggestions appear correctly in the editor, not just the change list