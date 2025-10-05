// Utility to test TipTap authentication
export const testTiptapAuth = async (appId: string, token: string) => {
  const testPayload = {
    html: "<p>This is a test sentence with some grammer mistakes.</p>",
    rules: [
      {
        id: "test",
        title: "Test Rule",
        prompt: "Fix any grammar mistakes",
        color: "#DC143C",
        backgroundColor: "#FFE6E6"
      }
    ]
  };

  console.log('Testing TipTap authentication:', {
    appId,
    tokenStart: token?.substring(0, 20) + '...',
    tokenLength: token?.length,
    isValidJWT: token?.split('.').length === 3,
    origin: window.location.origin,
    userAgent: navigator.userAgent
  });

  try {
    const response = await fetch('https://api.tiptap.dev/v1/ai/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-App-Id': appId,
      },
      body: JSON.stringify(testPayload)
    });

    console.log('TipTap API Test Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TipTap API Error Response:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: errorText
      };
    }

    const data = await response.json();
    console.log('TipTap API Success Response:', data);
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('TipTap API Network Error:', error);
    return {
      success: false,
      error: error.message,
      type: 'network'
    };
  }
};

// Helper to validate JWT format
export const validateJWTFormat = (token: string): boolean => {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Try to decode the header to see if it's valid base64
    const header = JSON.parse(atob(parts[0]));
    console.log('JWT Header:', header);
    return true;
  } catch (e) {
    console.warn('Invalid JWT header:', e);
    return false;
  }
};
