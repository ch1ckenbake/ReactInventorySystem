import { useState } from 'react';
import { Lock, Loader } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';

interface LoginPageProps {
  warning?: string;
}

export function LoginPage({ warning }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[LoginPage] Sending token to /api/auth/google...');
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      console.log(`[LoginPage] Auth response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LoginPage] Auth error:', errorData);
        throw new Error(errorData.error || 'Failed to authenticate with Google');
      }

      const data = await response.json();
      console.log('[LoginPage] Auth successful, storing user:', data.user.email);
      
      // Store user info in localStorage
      localStorage.setItem('google_user_info', JSON.stringify(data.user));
      localStorage.setItem('google_auth_token', JSON.stringify(credentialResponse.credential));
      
      // Redirect to app
      window.location.href = '/';
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      console.error('[LoginPage] Error:', errorMsg);
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Failed to sign in with Google');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100/80 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory System</h1>
          <p className="text-gray-600 text-sm">Sign in to manage your inventory</p>
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="mb-6 p-4 bg-yellow-50/90 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{warning}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50/90 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <div className="mb-6 flex justify-center">
          {isLoading ? (
            <div className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="filled_blue"
            />
          )}
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/50"></div>
          </div>
        </div>

        {/* Info Section */}
        <p className="text-gray-600 text-xs text-center">
          Secure authentication with your Google account
        </p>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
