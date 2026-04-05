import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3001'}/auth/google/callback`;

      if (!clientId) {
        return res.status(500).json({ error: 'Google Client ID not configured' });
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline`;

      res.json({ authUrl });
    } catch (error: any) {
      console.error('GET /api/auth/google/url error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
