import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TiptapJWTState {
  token: string | null;
  appId: string | null;
  isLoading: boolean;
  error: string | null;
  expiresAt: number | null;
}

interface UseTiptapJWTReturn extends TiptapJWTState {
  refreshToken: () => Promise<void>;
}

const TOKEN_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

export function useTiptapJWT(): UseTiptapJWTReturn {
  const { user } = useAuth();
  const [state, setState] = useState<TiptapJWTState>({
    token: null,
    appId: import.meta.env.VITE_TIPTAP_APP_ID || null,
    isLoading: false,
    error: null,
    expiresAt: null,
  });

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const fetchNewToken = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('generate-tiptap-jwt', {
        body: {
          userId: user?.id || 'anonymous'
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.jwt) {
        throw new Error('No JWT received from server');
      }

      const expiresAtTimestamp = data.expiresAt * 1000; // Convert to milliseconds

      setState({
        token: data.jwt,
        appId: data.appId,
        isLoading: false,
        error: null,
        expiresAt: expiresAtTimestamp,
      });

      // Schedule next refresh
      const timeUntilExpiry = expiresAtTimestamp - Date.now() - TOKEN_BUFFER_TIME;

      if (timeUntilExpiry > 0) {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        refreshTimerRef.current = setTimeout(() => {
          fetchNewToken();
        }, timeUntilExpiry);

        console.log(`🟢 Server-side JWT generated successfully. Next refresh in ${Math.round(timeUntilExpiry / 1000)} seconds`);
      }

      // Reset retry count on successful fetch
      retryCountRef.current = 0;

      return data.jwt;
    } catch (error) {
      console.error('Failed to fetch TipTap JWT:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Implement retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1);

        console.log(`Retrying JWT fetch (attempt ${retryCountRef.current}/${MAX_RETRIES}) in ${delay}ms`);

        refreshTimerRef.current = setTimeout(() => {
          fetchNewToken();
        }, delay);
      } else {
        console.error(`Failed to fetch JWT after ${MAX_RETRIES} retries`);
      }

      throw error;
    }
  }, [user]);

  const refreshToken = useCallback(async () => {
    return fetchNewToken().then(() => undefined);
  }, [fetchNewToken]);

  // TEMPORARILY: Use temp JWT first while debugging server generation
  useEffect(() => {
    // Check for temporary JWT first for debugging
    const tempJWT = import.meta.env.VITE_TIPTAP_JWT;
    const appId = import.meta.env.VITE_TIPTAP_APP_ID;

    if (tempJWT && appId) {
      console.log('🟡 Using temporary JWT from environment variable (debugging mode)');

      // Parse the JWT to check expiration
      try {
        const payload = JSON.parse(atob(tempJWT.split('.')[1]));
        const expiresAt = payload.exp * 1000;

        if (expiresAt > Date.now()) {
          setState({
            token: tempJWT,
            appId: appId,
            isLoading: false,
            error: null,
            expiresAt: expiresAt,
          });
          return; // Use temp JWT and exit
        } else {
          console.log('Temporary JWT has expired, trying server-side');
        }
      } catch (e) {
        console.error('Failed to parse temporary JWT:', e);
      }
    }

    // Only try server-side if no valid temp JWT
    fetchNewToken().catch((serverError) => {
      console.error('Server-side JWT generation failed:', serverError);

      if (tempJWT && appId) {
        console.log('🟡 Falling back to temporary JWT from environment variable (server-side failed)');

        // Parse the JWT to check expiration
        try {
          const payload = JSON.parse(atob(tempJWT.split('.')[1]));
          const expiresAt = payload.exp * 1000;

          if (expiresAt > Date.now()) {
            setState({
              token: tempJWT,
              appId: appId,
              isLoading: false,
              error: null,
              expiresAt: expiresAt,
            });

            // Schedule refresh before expiry to try server-side again
            const timeUntilExpiry = expiresAt - Date.now() - TOKEN_BUFFER_TIME;
            if (timeUntilExpiry > 0) {
              refreshTimerRef.current = setTimeout(() => {
                fetchNewToken(); // Try server-side again when temp expires
              }, timeUntilExpiry);
            } else {
              // Token is about to expire, fetch new one immediately
              fetchNewToken();
            }
            return;
          } else {
            console.log('Temporary JWT has also expired');
          }
        } catch (e) {
          console.error('Failed to parse temporary JWT:', e);
        }
      }

      // If both server-side and temporary JWT failed/unavailable, keep the error state
      console.error('No valid JWT available from server or temporary fallback');
    });
  }, [fetchNewToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refreshToken,
  };
}