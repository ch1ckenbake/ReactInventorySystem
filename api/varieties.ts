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
      const result = await sql`SELECT * FROM varieties ORDER BY created_at DESC`;
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error('GET /api/varieties error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { category_id, name, price_per_kg, description } = req.body;

      if (!category_id || !name) {
        return res.status(400).json({ error: 'Category ID and name are required' });
      }

      const id = randomUUID();
      const result = await sql`
        INSERT INTO varieties (id, category_id, name, price_per_kg, description)
        VALUES (${id}, ${category_id}, ${name}, ${price_per_kg || 0}, ${description || null})
        RETURNING *
      `;

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      console.error('POST /api/varieties error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
