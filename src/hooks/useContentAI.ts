import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContentAIConfig {
  jwt: string;
  appId: string;
  expiresAt: number;
}

export const useContentAI = () => {
  const [config, setConfig] = useState<ContentAIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateJWT = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-tiptap-jwt');
      
      if (error) {
        console.error('Error generating Tiptap JWT:', error);
        setError('Failed to generate Content AI token');
        return null;
      }

      if (data?.jwt) {
        const newConfig = {
          jwt: data.jwt,
          appId: data.appId,
          expiresAt: data.expiresAt
        };
        setConfig(newConfig);
        return newConfig;
      }
      
      setError('No JWT token received');
      return null;
    } catch (err) {
      console.error('Failed to generate JWT:', err);
      setError('Network error generating token');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const ensureValidToken = async () => {
    // Check if we have a token and it's not expired
    if (config && config.expiresAt > Math.floor(Date.now() / 1000) + 300) { // 5 min buffer
      return config;
    }
    
    // Generate new token
    return await generateJWT();
  };

  // Initialize token on mount
  useEffect(() => {
    generateJWT();
  }, []);

  return {
    config,
    isLoading,
    error,
    generateJWT,
    ensureValidToken
  };
};