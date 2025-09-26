# TipTap JWT Authentication Implementation Guide

## 🎯 Current Status: WORKING ✅

**Working Solution**: Using temporary JWT from TipTap dashboard
- JWT Token: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQ...` (Fresh from TipTap)
- App ID: `pkry1n5m`
- Authentication: ✅ Working with TipTap API

## 🧠 **KEY LEARNINGS**

### **Authentication Confusion - What Each Token Does:**

1. **NPM Registry Token** (`QLxOMgjn...`) - For installing @tiptap-pro packages
2. **Content AI Secret** (`TkAy9iyz...`) - Used to GENERATE JWTs, not used directly
3. **JWT Token** (`eyJ0eXAi...`) - What TipTap API actually needs
4. **Conversion Secret** (`2hjv1rnl...`) - For TipTap Conversion API (different service)

### **The Real Problem:**
- ❌ TipTap AI Suggestions API requires **JWT tokens**, not raw secrets
- ❌ Content AI Secret is for **generating** JWTs, not direct API usage
- ❌ We tried using wrong secrets for the wrong APIs
- ✅ Temporary JWTs from TipTap dashboard work perfectly

### **Why Previous Approaches Failed:**
1. **Tried direct secret usage**: TipTap API rejected raw Content AI Secret
2. **Wrong secret for signing**: Used Conversion Secret (wrong service) to sign JWTs
3. **Over-complicated**: Built unnecessary JWT generation when TipTap provides temp tokens

## 📋 **Issues Fixed:**
- [x] ~~Hardcoded JWT tokens~~ Now using environment variable `VITE_TIPTAP_JWT`
- [x] ~~Hardcoded App ID~~ Now using `VITE_TIPTAP_APP_ID`
- [x] ~~Not using environment variables~~ All credentials now in `.env`
- [x] ~~Authentication failing~~ Working with proper JWT token

## 🚀 **FUTURE: Production JWT Implementation Plan**

### **Goal**: Replace temporary JWT with auto-renewing production system

### **Current Working Setup**:
```env
VITE_TIPTAP_APP_ID=pkry1n5m
VITE_TIPTAP_JWT=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (temporary)
VITE_TIPTAP_CONTENT_AI_SECRET=TkAy9iyz... (for generating JWTs)
```

### **Phase 1: JWT Generation (Server-side)**
- [ ] Create Supabase edge function to generate JWTs using Content AI Secret
- [ ] Use HS256 algorithm with exact payload structure:
  ```json
  {
    "iat": <timestamp>,
    "nbf": <timestamp>,
    "exp": <timestamp>,
    "iss": "https://cloud.tiptap.dev",
    "aud": "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8"
  }
  ```
- [ ] Sign with Content AI Secret (NOT conversion secret)

### **Phase 2: Client-side JWT Management**
- [ ] Create `useTiptapJWT` hook for automatic token refresh
- [ ] Implement token caching (memory only)
- [ ] Add 5-minute buffer before expiration
- [ ] Handle authentication errors gracefully

### **Phase 3: Integration**
- [ ] Update ExperimentalEditor to use JWT hook
- [ ] Remove temporary JWT from environment
- [ ] Add loading states during token refresh
- [ ] Test token renewal flow

### **Phase 4: Production Hardening**
- [ ] Add retry logic for failed JWT generation
- [ ] Implement exponential backoff
- [ ] Add monitoring/logging for JWT issues
- [ ] Test edge cases (network failures, etc.)

## 🔑 JWT Structure
```javascript
{
  // Header
  "alg": "HS256",
  "typ": "JWT"
}
{
  // Payload
  "sub": "user_id_from_supabase",
  "iat": 1758552488,
  "exp": 1758556088, // 1 hour expiration
  "iss": "https://cloud.tiptap.dev",
  "aud": "c1b32a92-3c1f-4b49-ab6b-fb5a7a6178a8"
}
```

## 📁 Files to Modify
1. `package.json` - Add jsonwebtoken
2. `src/components/workspace/ExperimentalEditor.tsx`
3. `src/hooks/useTiptapEditor.ts`
4. `.env` - Add conversion secret (server-side only)

## 📁 Files to Create
1. `src/utils/jwtGenerator.ts`
2. `src/hooks/useTiptapJWT.ts`
3. `supabase/functions/generate-tiptap-jwt/index.ts`

## ⚠️ Important Notes
- **NEVER** expose conversion secret to client-side code
- Generate JWTs **server-side only**
- Use Supabase edge functions for JWT generation
- Implement proper token expiration and renewal
- No hardcoded credentials in production code

## 🔄 **Current Session Progress**
- [x] Research current implementation
- [x] Understand TipTap JWT requirements
- [x] ~~Install jsonwebtoken package~~ (Not needed for temp solution)
- [x] ~~Create complex JWT generation system~~ (Over-engineered)
- [x] **DISCOVERED**: Content AI Secret ≠ JWT token
- [x] **DISCOVERED**: NPM token ≠ API authentication token
- [x] **DISCOVERED**: TipTap provides temporary JWTs via dashboard
- [x] **FIXED**: Updated to use proper JWT from TipTap dashboard
- [x] **WORKING**: Authentication now successful with proper JWT
- [x] **TESTED**: "Run AI Pass" button works correctly

## 🏆 **FINAL WORKING STATE:**
```env
VITE_TIPTAP_APP_ID=pkry1n5m
VITE_TIPTAP_JWT=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (fresh JWT)
```

## 📚 **Next Steps (Future Implementation):**
1. Implement proper JWT generation using Content AI Secret
2. Add automatic token renewal before expiration
3. Remove dependency on temporary JWTs from dashboard