import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    const { email, name, picture } = payload;

    // Upsert user into Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert({ email, name, picture }, { onConflict: 'email' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ user: data });
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
}
