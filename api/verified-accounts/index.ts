import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = req.query.email as string;

  try {
    if (req.method === 'GET') {
      if (email) {
        // Check if an email is verified
        const { data, error } = await supabase
          .from('verified_accounts')
          .select('email')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (error && error.code !== 'PGRST116') {
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ verified: !!data });
      } else {
        // Get all verified accounts
        const { data, error } = await supabase
          .from('verified_accounts')
          .select('email');

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data?.map(d => d.email) || []);
      }
    }

    if (req.method === 'POST') {
      const { email: bodyEmail } = req.body;

      if (!bodyEmail) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { error } = await supabase
        .from('verified_accounts')
        .insert([{ email: bodyEmail.trim().toLowerCase() }]);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { error } = await supabase
        .from('verified_accounts')
        .delete()
        .eq('email', email.trim().toLowerCase());

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Verified Accounts] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
