// Offline sync and periodic sync functionality
import { getStoredToken, getLastSyncTime } from './googleAuth';
import { fetchBackupInfo, restoreFromDrive } from './googleAuth';

export function setupOfflineSync() {
  const handleOnline = async () => {
    console.log('Back online - syncing...');
    await syncToGoogleDrive();

    // If auto-restore is enabled, check remote backup and import if newer
    if (localStorage.getItem('autoRestore') === 'true') {
      try {
        await checkAndImportFromDrive();
      } catch (err) {
        console.error('Auto-restore failed:', err);
      }
    }
  };

  const handleOffline = () => {
    console.log('Gone offline - will sync when online');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function syncToGoogleDrive(): Promise<void> {
  try {
    const token = getStoredToken();
    if (!token) {
      console.log('Not authenticated, skipping sync');
      return;
    }

    const response = await fetch('/api/sync/google-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.access_token}`,
      },
    });

    if (response.ok) {
      localStorage.setItem('last_google_drive_sync', new Date().toISOString());
      console.log('✅ Synced to Google Drive');
    } else {
      const body = await response.text().catch(() => '');
      console.error('[offlineSync] Sync failed', response.status, body);
    }
  } catch (err) {
    console.error('Sync error:', err);
  }
}

export async function checkAndImportFromDrive(): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    console.log('Not authenticated, skipping import check');
    return;
  }

  try {
    const remote = await fetchBackupInfo();
    if (!remote || !remote.modifiedTime) {
      console.log('No remote backup found, skipping import');
      return;
    }

    const localLastSync = getLastSyncTime();
    const remoteTime = new Date(remote.modifiedTime).getTime();
    const localTime = localLastSync ? new Date(localLastSync).getTime() : 0;

    // If remote is newer than the last local upload, import it
    if (remoteTime > localTime) {
      console.log('Remote Drive backup is newer — importing database from Drive...');
      const result = await restoreFromDrive();
      if (result.success) {
        // update last sync time and reload so frontend picks up restored DB
        localStorage.setItem('last_google_drive_sync', new Date().toISOString());
        console.log('Import from Drive successful, reloading app');
        window.location.reload();
      } else {
        console.error('Import from Drive failed:', result.message);
      }
    } else {
      console.log('Remote Drive backup is not newer — skipping import');
    }
  } catch (err) {
    console.error('checkAndImportFromDrive error:', err);
  }
}

export function setupPeriodicSync(intervalMinutes: number = 5): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (navigator.onLine && localStorage.getItem('autoSync') === 'true') {
      syncToGoogleDrive();
    }
  }, intervalMinutes * 60 * 1000);
}

export function clearSyncTimer(timer: ReturnType<typeof setInterval>): void {
  clearInterval(timer);
}
