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
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with Google');
      }

      const data = await response.json();
      
      // Store user info in localStorage
      localStorage.setItem('google_user_info', JSON.stringify(data.user));
      
      // Redirect to app
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Failed to sign in with Google');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory System</h1>
          <p className="text-gray-600">Sign in to manage your inventory</p>
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">{warning}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <div className="mb-4">
          {isLoading ? (
            <div className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin"
              theme="outline"
            />
          )}
        </div>

        {/* Info Section */}
        <div className="border-t pt-6 mt-6">
          <p className="text-gray-600 text-sm text-center mb-4">
            This app requires Google authentication to protect your inventory data.
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Secure Google authentication</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Your data syncs to Google Drive</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Works offline with full sync support</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
