import { useEffect, useState } from 'react';
import { getStoredToken, getStoredUser, fetchGoogleUserInfo, checkVerifiedAccount } from '../services/googleAuth';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;
  isUnverified: boolean;
  user: any | null;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Check if we have a stored token
        const token = getStoredToken();
        const storedUser = getStoredUser();

        console.log('[useAuth] Checking auth status:', { hasToken: !!token, hasUser: !!storedUser });

        if (token) {
          console.log('[useAuth] Token found; verifying user');

          let userData = storedUser;
          if (!userData) {
            console.log('[useAuth] No stored user info; fetching user info from API');
            userData = await fetchGoogleUserInfo();
            if (userData) {
              localStorage.setItem('google_user_info', JSON.stringify(userData));
            }
          }

          if (userData) {
            setUser(userData);

            // Verified accounts are now managed in the backend verified_accounts allowlist.
            const inSupabase = await checkVerifiedAccount(userData.email);
            const shouldVerify = inSupabase;

            if (shouldVerify) {
              setIsVerified(true);
              setIsUnverified(false);
              setIsAuthenticated(true);
            } else {
              setIsVerified(false);
              setIsUnverified(true);
              setIsAuthenticated(false);
              localStorage.removeItem('google_auth_token');
              localStorage.removeItem('google_user_info');
            }

            console.log('[useAuth] Account verification state:', shouldVerify, { inSupabase });
          } else {
            console.warn('[useAuth] Unable to obtain user info, treating as unverified');
            setUser(null);
            setIsVerified(false);
            setIsUnverified(true);
            setIsAuthenticated(false);
          }
        } else {
          console.log('[useAuth] No token found - user not authenticated');
          setIsAuthenticated(false);
          setUser(null);
          setIsVerified(false);
          setIsUnverified(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('google_auth_token');
    localStorage.removeItem('google_user_info');
    setIsAuthenticated(false);
    setIsVerified(false);
    setIsUnverified(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    isLoading,
    isVerified,
    isUnverified,
    user,
    logout
  };
}
