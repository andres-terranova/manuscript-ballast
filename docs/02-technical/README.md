# Technical Documentation

Implementation guides, troubleshooting, and technical deep dives.

## 📂 Sections

### [Large Documents](./large-documents/)
Processing 27K-85K+ word manuscripts
- **timeout-guide.md** - Console.log fix, browser timeout, custom resolver
- **current-approach.md** - Rate limiting vs browser timeout, implementation journey

### [Authentication](./authentication/)
TipTap JWT and Supabase authentication
- **tiptap-jwt.md** - JWT generation, payload structure, resolution

### [Integrations](./integrations/)
Third-party integrations and deployment
- **react-suggestions.md** - React suggestion rendering integration (not needed at the moment)
- **vercel-deployment.md** - Deployment guide for Vercel

### [Troubleshooting](./troubleshooting/)
Debug guides and solutions
- **debug-suggestion-positions.md** - Position mapping issues and fixes

## 🔍 Quick Reference

**Large document failing?** → [large-documents/timeout-guide.md](./large-documents/timeout-guide.md)

**JWT issues?** → [authentication/tiptap-jwt.md](./authentication/tiptap-jwt.md)

**Suggestions in wrong place?** → [troubleshooting/debug-suggestion-positions.md](./troubleshooting/debug-suggestion-positions.md)

**Deploying?** → [integrations/vercel-deployment.md](./integrations/vercel-deployment.md)

---

## 🎯 By Problem Type

### Performance Issues
- Console.log CPU load: [large-documents/timeout-guide.md](./large-documents/timeout-guide.md#console-log-cpu-load-fix)
- Browser timeout (85K+ words): [large-documents/timeout-guide.md](./large-documents/timeout-guide.md#two-minute-browser-timeout)
- Rate limiting: [large-documents/timeout-guide.md](./large-documents/timeout-guide.md#pre-console-log-fix-attempts)

### Authentication Issues
- JWT rejected: [authentication/tiptap-jwt.md](./authentication/tiptap-jwt.md)
- Token expiration: [authentication/tiptap-jwt.md](./authentication/tiptap-jwt.md#key-discovery)

### UI/Rendering Issues
- Position drift: [troubleshooting/debug-suggestion-positions.md](./troubleshooting/debug-suggestion-positions.md)
- Suggestion rendering: [integrations/react-suggestions.md](./integrations/react-suggestions.md)

---

**Last Updated**: October 2, 2025
