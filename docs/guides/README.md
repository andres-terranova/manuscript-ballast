# Development Guides

## Overview

This directory contains practical guides for development, setup, and troubleshooting.

## Available Guides

### Setup & Configuration
- **[EXPERIMENTAL_AI_SETUP.md](./EXPERIMENTAL_AI_SETUP.md)** - Complete setup guide for TipTap Pro AI editor including credentials, configuration, and testing

### Authentication & Security
- **[TIPTAP_JWT_GUIDE.md](./TIPTAP_JWT_GUIDE.md)** - Comprehensive guide to TipTap JWT authentication, including current issues and workarounds

### Performance & Optimization
- **[TIPTAP_AI_RATE_LIMITING_GUIDE.md](./TIPTAP_AI_RATE_LIMITING_GUIDE.md)** - Rate limiting strategies and troubleshooting for TipTap AI API

## Quick Reference: Common Tasks

### Setting Up Development Environment

```bash
# 1. Clone repository
git clone <repo-url>
cd manuscript-ballast

# 2. Install dependencies (use pnpm only!)
pnpm install

# 3. Set up environment variables
# Create .env file with:
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TIPTAP_APP_ID=your-tiptap-app-id
VITE_TIPTAP_JWT=your-temporary-jwt

# 4. Start development server
pnpm run dev  # Runs on port 8080
```

### Troubleshooting TipTap Authentication

**Problem**: 401 Unauthorized when generating suggestions

**Solutions**:
1. Check TipTap dashboard → Configuration → Content AI → Allowed Origins
2. Add your dev URL (e.g., `http://localhost:8080`)
3. Verify JWT token format (3 parts separated by dots)
4. See [TIPTAP_JWT_GUIDE.md](./TIPTAP_JWT_GUIDE.md) for details

### Debugging DOCX Processing Issues

**Problem**: Documents stuck in "Processing" status

**Solutions**:
1. Check browser console for queue processor errors
2. Review Supabase edge function logs: `supabase functions logs queue-processor`
3. Query processing_queue table: `SELECT * FROM processing_queue WHERE status = 'processing'`
4. Manually trigger processing: Click "⚡ Process Now" in Dashboard
5. See [../architecture/QUEUE_SYSTEM_ARCHITECTURE.md](../architecture/QUEUE_SYSTEM_ARCHITECTURE.md)

### Working with Supabase Edge Functions

```bash
# Deploy a function
supabase functions deploy <function-name>

# View logs
supabase functions logs <function-name>

# Test locally
supabase functions serve <function-name>

# Set environment variables
# Go to Supabase Dashboard → Edge Functions → <function-name> → Environment Variables
```

### Adding New shadcn/ui Components

```bash
# Use npx (not pnpm) for shadcn CLI
npx shadcn@latest add <component-name>

# Example: Add a new button variant
npx shadcn@latest add button

# ⚠️ DO NOT manually edit files in src/components/ui/
```

### Database Migrations

```bash
# Create a new migration
supabase migration new <migration-name>

# Edit migration file in supabase/migrations/

# Apply migrations
supabase db push

# Reset database (⚠️ destructive)
supabase db reset
```

## Environment Variables Reference

### Client-Side (Public)
These are exposed to the browser and must be prefixed with `VITE_`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TIPTAP_APP_ID=your-app-id
VITE_TIPTAP_JWT=temporary-jwt-token  # Temporary for development
```

### Server-Side (Supabase Edge Functions)
Set in Supabase Dashboard → Edge Functions → Environment Variables:

```bash
TIPTAP_CONTENT_AI_SECRET=your-content-ai-secret
TIPTAP_APP_ID=your-app-id
OPENAI_API_KEY=your-openai-key  # For legacy suggest function
```

## Code Style & Best Practices

### TypeScript
- Use explicit types for function parameters and return values
- Avoid `any` - use `unknown` if type is truly unknown
- Prefer interfaces for object shapes, types for unions/intersections

### React
- Use functional components with hooks (no class components)
- Extract complex logic into custom hooks
- Keep components under 300 lines (split if larger)
- Use React.memo() for expensive list items

### TipTap/ProseMirror
- Never manipulate DOM directly - use commands and plugins
- Use decorations for non-editable highlights (suggestions, checks)
- Use marks for editable formatting (bold, italic)
- Always use editor.chain() for multiple commands

### Supabase
- Always use RLS policies for data access control
- Use edge functions for CPU-intensive operations
- Keep edge functions under 2-minute execution time
- Use queue system for long-running tasks

## Testing Strategies

### Manual Testing Checklist

**Upload & Processing**:
- [ ] Small DOCX (<100KB) uploads successfully
- [ ] Large DOCX (>400KB) processes without timeout
- [ ] Queue status updates correctly in UI
- [ ] Processing completes within 10 seconds

**AI Suggestions**:
- [ ] "Run AI Pass" generates suggestions
- [ ] Suggestions appear in editor and change list
- [ ] Accept/reject buttons work correctly
- [ ] Large documents (100K+ chars) process with chunking

**Authentication**:
- [ ] Login/logout works
- [ ] Session persists on page reload
- [ ] Protected routes redirect to login
- [ ] TipTap JWT authentication succeeds

### Browser Console Debug Flags

Look for these messages to verify functionality:

```javascript
// Good signs:
"Testing TipTap authentication..."
"Auth test result: {success: true}"
"Queue processor started..."
"Successfully processed DOCX: X words"
"📝 Converting X AI suggestions to UI format"

// Bad signs:
"Auth test result: {success: false, error: '401'}"
"Rate limiting error: 429"
"WORKER_LIMIT exceeded"
"Token does not appear to be a valid JWT"
```

## Common Error Messages & Solutions

### `WORKER_LIMIT exceeded`
**Cause**: Edge function timeout (old issue, should be fixed)
**Solution**: Ensure queue system is being used, not direct edge function calls

### `401 Unauthorized` from TipTap API
**Cause**: JWT token invalid or missing, or Allowed Origins not configured
**Solution**: See [TIPTAP_JWT_GUIDE.md](./TIPTAP_JWT_GUIDE.md)

### `429 Too Many Requests` from TipTap API
**Cause**: Rate limit exceeded
**Solution**: Reduce chunk size, add delays between requests, upgrade TipTap plan

### `RLS policy violation`
**Cause**: User doesn't have permission to access data
**Solution**: Check RLS policies in Supabase, ensure user_id is set correctly

### `Module not found: @tiptap-pro/extension-ai-suggestion`
**Cause**: Missing .npmrc configuration for TipTap Pro registry
**Solution**: Verify .npmrc has TipTap Pro registry token, run `pnpm install`

## Performance Optimization Tips

### For Large Documents
1. Enable TipTap caching: `enableCache: true`
2. Adjust chunk size: `chunkSize: 10` (HTML nodes)
3. Cap visible decorations: max 200 checks, 200 suggestions
4. Toggle visibility when editing

### For API Costs
1. Use TipTap's built-in caching to avoid redundant calls
2. Process selectively (current chapter vs. full document)
3. Batch operations when possible
4. Monitor usage in TipTap dashboard

### For Browser Performance
1. Use React.memo() for ChangeCard and CheckCard
2. Virtualize long lists (consider react-window)
3. Debounce editor onChange handlers
4. Lazy load heavy components

## Related Documentation

- [Architecture Overview](../architecture/README.md)
- [Feature Documentation](../features/README.md)
- [Component Documentation](../../src/components/workspace/CLAUDE.md)
- [Library Documentation](../../src/lib/CLAUDE.md)

---

**Last Updated**: September 30, 2025
