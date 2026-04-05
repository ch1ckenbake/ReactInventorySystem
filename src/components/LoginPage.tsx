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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Subtle gradient background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30 -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30 -z-10"></div>
      
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 border-2 border-blue-500">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory</h1>
          <p className="text-gray-600 text-sm">Sign in to manage your stocks</p>
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-900 text-sm">{warning}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-900 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <div className="mb-8 flex justify-center">
          {isLoading ? (
            <div className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
            />
          )}
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">or continue anonymously</span>
          </div>
        </div>

        {/* Info Section */}
        <p className="text-gray-600 text-xs text-center leading-relaxed">
          Secure authentication with your Google account. Your data is encrypted and safe.
        </p>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
