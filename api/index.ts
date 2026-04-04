import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM categories`;
      return res.status(200).json({
        status: 'ok',
        message: 'Backend is running',
        database: 'connected',
        categories: result.rows[0]?.count || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
      });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
