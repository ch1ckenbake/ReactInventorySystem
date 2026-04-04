import { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3001'}/auth/google/callback`;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Google credentials not configured' });
      }

      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens) {
        return res.status(401).json({ error: 'Failed to get tokens' });
      }

      // Get user info
      oauth2Client.setCredentials(tokens);
      const oauth2 = require('googleapis').google.oauth2('v2');
      const userInfo = await oauth2.userinfo.get({ auth: oauth2Client });

      const tokenData = {
        access_token: tokens.access_token,
        token_type: tokens.type || 'Bearer',
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        refresh_token: tokens.refresh_token || null,
      };

      // URL-encode the token and redirect
      const encodedToken = encodeURIComponent(JSON.stringify(tokenData));
      const redirectUrl = `/?auth_token=${encodedToken}`;

      res.redirect(302, redirectUrl);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      const errorMessage = encodeURIComponent(error.message || 'Authentication failed');
      res.redirect(302, `/?auth_error=${errorMessage}`);
    }
  } else if (req.method === 'GET') {
    try {
      const { code, error } = req.query;

      if (error) {
        const errorMessage = encodeURIComponent(String(error));
        return res.redirect(302, `http://localhost:5173/?auth_error=${errorMessage}`);
      }

      if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3001'}/auth/google/callback`;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Google credentials not configured' });
      }

      const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(String(code));

      if (!tokens) {
        return res.status(401).json({ error: 'Failed to get tokens' });
      }

      const tokenData = {
        access_token: tokens.access_token,
        token_type: tokens.type || 'Bearer',
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        refresh_token: tokens.refresh_token || null,
      };

      // URL-encode the token and redirect
      const encodedToken = encodeURIComponent(JSON.stringify(tokenData));
      const redirectUrl = `/?auth_token=${encodedToken}`;

      res.redirect(302, redirectUrl);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      const errorMessage = encodeURIComponent(error.message || 'Authentication failed');
      res.redirect(302, `/?auth_error=${errorMessage}`);
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
