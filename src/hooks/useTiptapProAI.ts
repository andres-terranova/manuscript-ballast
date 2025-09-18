import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TiptapJWTResponse {
  token: string;
  appId: string;
  expiresAt: number;
}

export const useTiptapProAI = () => {
  const [jwtToken, setJwtToken] = useState<string>('');
  const [appId, setAppId] = useState<string>('pkry1n5m');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateJWT = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Requesting JWT token from Supabase function...');
      
      const { data, error: functionError } = await supabase.functions.invoke('generate-tiptap-jwt', {
        body: {}
      });

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(`Failed to generate JWT: ${functionError.message}`);
      }

      if (!data || !data.token) {
        console.error('Invalid response from JWT function:', data);
        throw new Error('Invalid response from JWT generation service');
      }

      console.log('JWT token received successfully');
      setJwtToken(data.token);
      setAppId(data.appId);
      
      // Store token with expiry in localStorage for caching
      const tokenData = {
        token: data.token,
        appId: data.appId,
        expiresAt: data.expiresAt
      };
      localStorage.setItem('tiptap_jwt', JSON.stringify(tokenData));
      
    } catch (err) {
      console.error('Error generating JWT:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate JWT token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load token from cache or generate new one
  useEffect(() => {
    const loadToken = async () => {
      try {
        // Try to load from cache first
        const cached = localStorage.getItem('tiptap_jwt');
        if (cached) {
          const tokenData: TiptapJWTResponse = JSON.parse(cached);
          
          // Check if token is still valid (with 5 minute buffer)
          if (tokenData.expiresAt > Date.now() + 5 * 60 * 1000) {
            console.log('Using cached JWT token');
            setJwtToken(tokenData.token);
            setAppId(tokenData.appId);
            setIsLoading(false);
            return;
          } else {
            console.log('Cached token expired, generating new one');
            localStorage.removeItem('tiptap_jwt');
          }
        }
        
        // Generate new token
        await generateJWT();
      } catch (err) {
        console.error('Error loading token:', err);
        await generateJWT();
      }
    };

    loadToken();
  }, [generateJWT]);

  const refreshToken = useCallback(async () => {
    localStorage.removeItem('tiptap_jwt');
    await generateJWT();
  }, [generateJWT]);

  return {
    jwtToken,
    appId,
    isLoading,
    error,
    refreshToken,
    isReady: !isLoading && !!jwtToken && !error
  };
};