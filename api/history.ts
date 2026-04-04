import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM history ORDER BY created_at DESC`;
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error('GET /api/history error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM history RETURNING COUNT(*) as deleted`;
      return res.status(200).json({ message: 'All history cleared', deleted: result.rows[0]?.deleted || 0 });
    } catch (error: any) {
      console.error('DELETE /api/history error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
