import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, price_per_kg, description } = req.body;

      const result = await sql`
        UPDATE varieties 
        SET name = COALESCE(${name || null}, name),
            price_per_kg = COALESCE(${price_per_kg || null}, price_per_kg),
            description = COALESCE(${description || null}, description)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Variety not found' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error('PUT /api/varieties/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM varieties WHERE id = ${id} RETURNING *`;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Variety not found' });
      }

      return res.status(200).json({ message: 'Variety deleted', variety: result.rows[0] });
    } catch (error: any) {
      console.error('DELETE /api/varieties/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
