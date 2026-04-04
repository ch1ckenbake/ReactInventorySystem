// Google OAuth token management
interface GoogleAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

const STORAGE_KEYS = {
  AUTH_TOKEN: 'google_auth_token',
  USER_INFO: 'google_user_info',
  LAST_SYNC: 'last_google_drive_sync',
};

export function getStoredToken(): GoogleAuthToken | null {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return token ? JSON.parse(token) : null;
}

export function storeToken(token: GoogleAuthToken): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(token));
}

export function getStoredUser(): GoogleUser | null {
  const user = localStorage.getItem(STORAGE_KEYS.USER_INFO);
  return user ? JSON.parse(user) : null;
}

export function clearAuthData(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
}

export async function fetchGoogleUserInfo(): Promise<GoogleUser | null> {
  try {
    const token = getStoredToken();
    if (!token) return null;

    const response = await fetch('/api/auth/user-info', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
      },
    });

    if (!response.ok) return null;

    const userData = await response.json();
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userData));
    return userData;
  } catch (err) {
    console.error('Error fetching user info:', err);
    return null;
  }
}

export async function fetchBackupInfo(): Promise<null | { id: string; name: string; modifiedTime?: string; size?: string }>{
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/sync/backup-info', {
      headers: { 'Authorization': `Bearer ${token.access_token}` }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.found ? data : null;
  } catch (err) {
    console.error('fetchBackupInfo error:', err);
    return null;
  }
}

export async function restoreFromDrive(): Promise<{ success: boolean; message?: string }>{
  const token = getStoredToken();
  if (!token) return { success: false, message: 'Not authenticated' };

  try {
    const res = await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.access_token}` }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, message: `Restore failed: ${res.status} ${text}` };
    }

    return { success: true };
  } catch (err) {
    console.error('restoreFromDrive error:', err);
    return { success: false, message: String(err) };
  }
}

export async function exportDatabaseFile(): Promise<Blob | null> {
  try {
    const res = await fetch('/api/db/download');
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob;
  } catch (err) {
    console.error('exportDatabaseFile error:', err);
    return null;
  }
}

export async function fetchVerifiedAccountsFromServer(): Promise<string[]> {
  try {
    const res = await fetch('/api/verified-accounts');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error fetching verified accounts from server:', err);
    return [];
  }
}

export async function checkVerifiedAccount(email: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/verified-accounts/check?email=${encodeURIComponent(email)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.verified === true;
  } catch (err) {
    console.error('Error checking verified account:', err);
    return false;
  }
}

export async function addVerifiedAccountToServer(email: string): Promise<boolean> {
  try {
    const res = await fetch('/api/verified-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    return res.ok;
  } catch (err) {
    console.error('Error adding verified account:', err);
    return false;
  }
}

export async function removeVerifiedAccountFromServer(email: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/verified-accounts?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.error('Error removing verified account:', err);
    return false;
  }
}

export function isTokenExpired(_token: GoogleAuthToken): boolean {
  // Token expiration check - simplified
  return false;
}
