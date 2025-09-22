# Experimental AI Suggestions Setup Guide

This guide explains how to set up and use the new Experimental AI Suggestions editor that uses TipTap Pro's AI Suggestion extension instead of the standard Supabase edge function.

## ✨ Features

The Experimental Editor provides:

- **Real-time AI suggestions** that appear directly in the editor as underlined text
- **Advanced grammar and style checking** with customizable rules
- **Inline suggestion management** - accept or reject suggestions directly in the text
- **Integration with existing Change List** - suggestions appear in both the editor and the right panel
- **Customizable AI rules** - define your own grammar, style, and tone rules

## 🚀 Setup Instructions

### 1. TipTap Pro Account Setup

1. Sign up for a [TipTap Pro account](https://tiptap.dev/pricing) (Team plan required for AI features)
2. Create a new application in your TipTap dashboard
3. Get your App ID and Token from the dashboard

### 2. Environment Variables

Add the following environment variables to your project:

```bash
# Add to your .env file (in project root)
VITE_TIPTAP_APP_ID=pkry1n5m  # Use your "Content AI App ID" from TipTap dashboard
VITE_TIPTAP_TOKEN=TKAy9iyz13rrux9P3U4m4ysaYayFE9Kr9Ff36DPFJAER0eGpDU8siu1UXJBUtco  # Use your "Content AI Secret" from TipTap dashboard
```

**Important**: 
- In Vite, environment variables are accessed via `import.meta.env.VARIABLE_NAME` (not `process.env`)
- `VITE_TIPTAP_APP_ID` should be your **"Content AI App ID"** from the TipTap dashboard
- `VITE_TIPTAP_TOKEN` should be your **"Content AI Secret"** from the TipTap dashboard (not the OpenAI API key)

### 3. Configure Allowed Origins

**CRITICAL**: In your TipTap Cloud Dashboard:
1. Go to **Configuration** → **Content AI settings**
2. Scroll down to **"Allowed Origins"**
3. Add your development URL: `http://localhost:8082` (or whatever port your dev server uses)
4. **Save the settings**

Without this, you'll get 401 Unauthorized errors even with correct credentials.

### 4. TipTap Pro Registry Access

Make sure your `.npmrc` file is configured for TipTap Pro registry access (this appears to already be set up based on your existing `.npmrc`).

## 🎯 How to Use

### Accessing the Experimental Editor

1. Open any manuscript in the standard editor
2. Click the purple **"Experimental"** button in the header
3. You'll be taken to the experimental editor for that manuscript

### Using AI Suggestions

1. **Manual Trigger**: Click "Run AI Pass" to generate suggestions for the entire document
2. **Automatic Generation**: AI suggestions can be configured to generate as you type (currently disabled by default)
3. **Review Suggestions**: 
   - Suggestions appear as underlined text in the editor
   - They also appear in the "Changes" tab in the right panel
4. **Accept/Reject**: 
   - Click on underlined text to select a suggestion
   - Use accept/reject buttons in the Change List
   - Or use the inline controls that appear when suggestions are selected

### AI Suggestion Rules

The experimental editor comes with three pre-configured rule types:

- **Grammar & Style**: Identifies grammar, spelling, and punctuation issues
- **Clarity**: Suggests improvements for readability and conciseness  
- **Professional Tone**: Maintains professional and engaging tone

## 🔧 Configuration

### Custom AI Rules

You can customize AI suggestion rules by modifying the `aiSuggestionConfig` in the `ExperimentalEditor.tsx` file:

```typescript
rules: [
  {
    id: 'custom-rule',
    title: 'Custom Rule Title',
    prompt: 'Describe what the AI should look for and suggest',
    color: '#ff6b6b',
    backgroundColor: '#ffe0e0',
  },
]
```

### Extension Settings

Key configuration options:

- `loadOnStart: false` - Don't generate suggestions immediately (as requested)
- `reloadOnUpdate: false` - Don't regenerate on every edit
- `debounceTimeout: 1000` - Wait 1 second after typing stops before triggering

## 🎨 Visual Styling

AI suggestions are styled with:

- **Underlined text** with colored borders
- **Background highlights** when selected or hovered
- **Color coding** by rule type:
  - Grammar: Red (#dc143c)
  - Clarity: Blue (#0066cc) 
  - Tone: Green (#009900)
  - Style: Purple (#9333ea)

## 🔄 Switching Between Editors

- **From Standard to Experimental**: Click "Experimental" button
- **From Experimental to Standard**: Click "Standard" button
- All changes are synchronized between both editors

## 📝 Current Limitations

1. **Credentials Required**: You need a TipTap Pro Team plan account
2. **API Costs**: AI suggestions consume TipTap Cloud API credits
3. **Beta Feature**: The AI Suggestion extension is in beta
4. **No Offline Mode**: Requires internet connection for AI processing

## 🐛 Troubleshooting

### 1. 401 Unauthorized Error

**Symptoms**: Console shows `POST https://api.tiptap.dev/v1/ai/suggestions 401 (Unauthorized)`

**Primary Solution**: **Add your development URL to Allowed Origins**
1. Go to TipTap Cloud Dashboard → Configuration → Content AI settings
2. Scroll to "Allowed Origins" section
3. Add `http://localhost:8082` (or your dev server port)
4. Save settings
5. Restart your dev server

**Secondary Checks**:
- Verify `.env` has correct `VITE_TIPTAP_APP_ID` and `VITE_TIPTAP_TOKEN`
- Check browser console for JWT validation warnings
- Ensure TipTap Pro subscription is active

### 2. No Suggestions Generated

**Check Browser Console** - The experimental editor now includes authentication testing:
```bash
# Good signs:
Testing TipTap authentication...
Auth test result: {success: true}
Configuring AI Suggestion extension with: {appId: "pkry1n5m", hasToken: true, isValidJWT: true}
Extensions: [..., "aiSuggestion", ...]

# Bad signs:
Auth test result: {success: false, error: "HTTP 401: Unauthorized"}
Token does not appear to be a valid JWT format
AI Suggestion extension not loaded
```

**Solutions**:
- Follow the 401 Unauthorized fix above
- Verify JWT token format (should have 3 parts separated by dots)
- Check API credits remaining in TipTap dashboard

### 3. Extension Not Loading

**Symptoms**: Console shows `AI Suggestion extension not loaded`

**Solutions**:
- Check your `.npmrc` has TipTap Pro registry access
- Verify `@tiptap-pro/extension-ai-suggestion` is installed
- Check import errors in browser network tab

### 4. Commands Not Available

**Symptoms**: Console shows `loadAiSuggestions command not available`

**Solutions**:
- Confirm extension is properly registered (check Extensions array in console)
- Verify credentials are being passed correctly
- Try clearing browser cache and reloading

### 5. JWT Token Format Issues

**Symptoms**: Console shows `Token does not appear to be a valid JWT format`

**Check**:
1. **Token Structure**: JWT tokens have 3 parts separated by dots (header.payload.signature)
2. **Correct Field**: Use "Content AI Secret" from dashboard, not OpenAI API key
3. **Environment Variable**: Must be `VITE_TIPTAP_TOKEN` in Vite projects

### 6. Document Content Issues

**Requirements**:
- Document must have some text content (empty documents won't generate suggestions)
- Try with sample text like: "This is some text with grammer mistakes and awkward phrasing."

## 🚀 Next Steps

After setting up:

1. Test with a small document first
2. Customize AI rules for your specific use case
3. Monitor API usage and costs
4. Provide feedback on suggestion quality and performance

## 🔗 Resources

- [TipTap Pro Documentation](https://tiptap.dev/docs/content-ai/capabilities/suggestion/overview)
- [AI Suggestion API Reference](https://tiptap.dev/docs/content-ai/capabilities/suggestion/api-reference)
- [TipTap Pricing](https://tiptap.dev/pricing)

---

## Route Information

- **Standard Editor**: `/manuscript/:id`
- **Experimental Editor**: `/manuscript/:id/experimental`

Both editors work with the same manuscript data and are fully interchangeable.
