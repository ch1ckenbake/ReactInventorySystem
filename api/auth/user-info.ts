import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const accessToken = authHeader.replace('Bearer ', '');

      // Call Google's userinfo endpoint
      const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userData = await response.json();
      res.json({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        email_verified: userData.verified_email ?? userData.email_verified ?? false,
      });
    } catch (error: any) {
      console.error('GET /api/auth/user-info error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
