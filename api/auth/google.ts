import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

// Initialize OAuth client with credentials
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // Redirect URI for browser flow
);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Check if environment variables are set
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[Auth] Missing Google credentials in environment');
    return res.status(503).json({ error: 'Google credentials not configured on server' });
  }

  try {
    // Verify the token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.error('[Auth] No payload in ticket');
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const { email, name, picture } = payload;
    
    console.log(`[Auth] Token verified for: ${email}`);

    // Store user info in Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data, error } = await supabase
        .from('users')
        .upsert({ email, name, picture }, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        console.error('[Auth] Supabase error:', error);
        // Don't fail if Supabase is down - still return success with user data
      }

      return res.status(200).json({ user: { email, name, picture } });
    } else {
      console.warn('[Auth] Supabase not configured, returning user without storing');
      return res.status(200).json({ user: { email, name, picture } });
    }
  } catch (error) {
    console.error('[Auth] Token verification error:', error instanceof Error ? error.message : String(error));
    return res.status(401).json({ 
      error: 'Token verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
