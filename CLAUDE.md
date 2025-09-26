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

- **Experimental Editor** (`/manuscript/:id/experimental`): **Main editor** - Uses TipTap Pro AI Suggestion extension with real-time inline suggestions
- **Standard Editor** (`/manuscript/:id`): Legacy editor using Supabase edge functions for AI suggestions

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
   - Experimental Editor (main): TipTap Pro AI extension → direct inline suggestions
   - Standard Editor (legacy): Supabase edge functions → suggestion mapping → TipTap decorations
3. **Style Rules** are configurable editing guidelines (grammar, clarity, tone, etc.)
4. **Change Lists** display suggestions in a right panel for review/acceptance

### Component Architecture

**Core Workspace Components:**
- `ExperimentalEditor.tsx`: **Main editor** - TipTap Pro AI-powered editor
- `ManuscriptWorkspace.tsx`: Legacy standard editor interface
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
- **Suggestion Flow**: Server responses → mapping utilities → editor decorations → UI components
- **Style Rules**: Configurable editing rules with both AI and deterministic validation
- **Dual Editor Support**: Experimental (main) and standard (legacy) editors share data but use different AI backends
- **Real-time Features**: Main experimental editor provides live AI suggestions as you type

## Common Workflows

1. **Adding new suggestion types**: Modify `lib/types.ts` and update mapping in `suggestionMapper.ts`
2. **New style rules**: Add to `STYLE_RULES` in `styleRuleConstants.ts`
3. **Editor plugins**: Extend TipTap functionality in `lib/` utilities
4. **AI configuration**: Modify rule sets in `AIEditorRules.tsx` for the main experimental editor