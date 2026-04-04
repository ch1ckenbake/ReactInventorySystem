import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Ensure environment variables are loaded when this module initializes.
dotenv.config({ path: path.join(process.cwd(), '.env') });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('[googleDrive] Missing Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Please add them to your `.env` file.');
}

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const BACKUP_FILE_NAME = 'inventory-system-backup.db';

export function getAuthorizationUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function exchangeCodeForToken(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (err: any) {
    // Log detailed response from Google when available (don't log client_secret)
    if (err?.response?.data) {
      console.error('[googleDrive] token exchange response:', JSON.stringify(err.response.data));
    } else {
      console.error('[googleDrive] token exchange error:', err?.message || err);
    }
    throw err;
  }
}

export async function getUserInfo(accessToken: string) {
  try {
    // Set the access token on the OAuth2 client so it can make authorized requests
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const response = await oauth2.userinfo.get();
    const userInfo = response.data;

    return {
      id: userInfo.id || '',
      email: userInfo.email || '',
      name: userInfo.name || '',
      picture: userInfo.picture || '',
    };
  } catch (err) {
    console.error('[googleDrive] Error getting user info:', (err as Error)?.message || err);
    throw err;
  }
}

export async function uploadDatabaseToGoogleDrive(
  dbPath: string,
  accessToken: string
): Promise<{ fileId: string; name: string }> {
  try {
    console.log('[googleDrive] uploadDatabaseToGoogleDrive - access token present:', !!accessToken);
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // List existing files
    const listResponse = await drive.files.list({
      spaces: 'drive',
      fields: 'files(id, name)',
      q: `name='${BACKUP_FILE_NAME}' and trashed=false`,
      pageSize: 1,
    });

    const existingFileId = listResponse.data.files?.[0]?.id;

    const fileMetadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/octet-stream',
    };

    const fileStream = fs.createReadStream(dbPath);

    if (existingFileId) {
      // Update existing file (use stream)
      await drive.files.update({
        fileId: existingFileId,
        media: {
          mimeType: 'application/octet-stream',
          body: fileStream,
        },
      });
      console.log(`[OK] Updated file on Google Drive: ${BACKUP_FILE_NAME}`);
      return { fileId: existingFileId, name: BACKUP_FILE_NAME };
    } else {
      // Create new file (use stream)
      const createResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: 'application/octet-stream',
          body: fs.createReadStream(dbPath),
        },
        fields: 'id',
      });
      const newFileId = createResponse.data.id;
      console.log(`[OK] Created file on Google Drive: ${BACKUP_FILE_NAME} (ID: ${newFileId})`);
      return { fileId: newFileId || '', name: BACKUP_FILE_NAME };
    }
  } catch (err) {
    console.error('[ERROR] Error uploading to Google Drive:', err);
    throw err;
  }
}

export async function downloadDatabaseFromGoogleDrive(
  accessToken: string,
  outputPath: string
): Promise<boolean> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const listResponse = await drive.files.list({
      spaces: 'drive',
      fields: 'files(id, name)',
      q: `name='${BACKUP_FILE_NAME}' and trashed=false`,
      pageSize: 1,
    });

    const fileId = listResponse.data.files?.[0]?.id;

    if (!fileId) {
      throw new Error(`File ${BACKUP_FILE_NAME} not found on Google Drive`);
    }

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const writeStream = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => {
          console.log(`[OK] Downloaded from Google Drive to: ${outputPath}`);
          resolve(true);
        })
        .on('error', (err) => {
          console.error('[ERROR] Error downloading file:', err);
          reject(err);
        })
        .pipe(writeStream);
    });
  } catch (err) {
    console.error('[ERROR] Error downloading from Google Drive:', err);
    throw err;
  }
}

// Return metadata (id, name, modifiedTime, size) for the backup file on Drive
export async function getBackupFileMetadata(accessToken: string): Promise<{ id: string; name: string; modifiedTime?: string; size?: string } | null> {
  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const listResponse = await drive.files.list({
      spaces: 'drive',
      fields: 'files(id, name, modifiedTime, size)',
      q: `name='${BACKUP_FILE_NAME}' and trashed=false`,
      pageSize: 1,
    });

    const file = listResponse.data.files?.[0];
    if (!file) return null;

    return {
      id: file.id || '',
      name: file.name || BACKUP_FILE_NAME,
      modifiedTime: file.modifiedTime || undefined,
      size: file.size || undefined,
    };
  } catch (err) {
    console.error('[googleDrive] getBackupFileMetadata error:', err);
    throw err;
  }
}
