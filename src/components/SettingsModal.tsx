import { useState, useEffect } from 'react';
import { LogOut, LogIn, Cloud, CloudOff, Loader } from 'lucide-react';
import { clearAuthData } from '../services/googleAuth';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: GoogleUser | null;
}

export function SettingsModal({ isOpen, onClose, onLogout, user }: SettingsProps) {
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(user);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setCurrentUser(user);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const handleLogin = async () => {
    // Get OAuth URL and redirect
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert('Failed to get Google OAuth URL');
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Error getting OAuth URL:', error);
      alert('Error initializing login');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (confirmed) {
      clearAuthData();
      onLogout();
      setCurrentUser(null);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Account Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <LogIn size={18} className="text-blue-600" />
              Account
            </h3>

            {currentUser ? (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
                <div className="flex items-center gap-3">
                  {currentUser.picture && <img src={currentUser.picture} alt={currentUser.name} className="w-10 h-10 rounded-full" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                    <p className="text-xs text-gray-500">{currentUser.email}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Connect your Google account to backup your inventory.</p>
                <button onClick={handleLogin} disabled={isLoggingIn} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isLoggingIn ? <><Loader size={16} className="animate-spin" /> Logging in...</> : <><LogIn size={16} /> Connect Google</>}
                </button>
              </div>
            )}
          </div>

          {/* Online Status */}
          <div className="space-y-3 border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {isOnline ? <><Cloud size={18} className="text-green-600" /><span>Online</span></> : <><CloudOff size={18} className="text-amber-600" /><span>Offline</span></>}
            </h3>
            <div className={`px-4 py-3 rounded-lg ${isOnline ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-amber-700'}`}>{isOnline ? '✅ Connected' : '🔴 No internet'}</p>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
