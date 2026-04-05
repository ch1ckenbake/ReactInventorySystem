import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const result = await sql`SELECT * FROM categories ORDER BY created_at DESC`;
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error('GET /api/categories error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, currency = 'PHP' } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const id = randomUUID();
      const result = await sql`
        INSERT INTO categories (id, name, description, currency)
        VALUES (${id}, ${name}, ${description || null}, ${currency})
        RETURNING *
      `;

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('POST /api/categories error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
