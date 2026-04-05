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
      const { name, size, unit, price_per_package, description } = req.body;

      const result = await sql`
        UPDATE packaging_types 
        SET name = COALESCE(${name || null}, name),
            size = COALESCE(${size || null}, size),
            unit = COALESCE(${unit || null}, unit),
            price_per_package = COALESCE(${price_per_package || null}, price_per_package),
            description = COALESCE(${description || null}, description)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Packaging type not found' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error('PUT /api/packaging/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM packaging_types WHERE id = ${id} RETURNING *`;

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Packaging type not found' });
      }

      return res.status(200).json({ message: 'Packaging type deleted', packaging: result.rows[0] });
    } catch (error: any) {
      console.error('DELETE /api/packaging/[id] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
