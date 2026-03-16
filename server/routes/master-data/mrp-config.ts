import express from 'express';
import { db } from '../../db';
import { 
  procurementTypes,
  lotSizes,
  mrpTypes,
  mrpProcedures,
  insertProcurementTypeSchema,
  insertLotSizeSchema,
  insertMrpTypeSchema,
  insertMrpProcedureSchema
} from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Helper to handle generic CRUD
async function handleCRUD(app: express.Router, path: string, table: any, schema: any, label: string) {
  // GET all (already mostly there, but let's unify)
  app.get(path, async (req, res) => {
    try {
      const data = await db.select().from(table).orderBy(table.code);
      res.json(data);
    } catch (error) {
      console.error(`Error fetching ${label}:`, error);
      res.status(500).json({ error: `Failed to fetch ${label}` });
    }
  });

  // POST create
  app.post(path, async (req, res) => {
    try {
      const validated = schema.parse(req.body);
      const [inserted] = await db.insert(table).values(validated).returning();
      res.status(201).json(inserted);
    } catch (error: any) {
      console.error(`Error creating ${label}:`, error);
      res.status(400).json({ error: `Failed to create ${label}`, details: error.message });
    }
  });

  // PUT update
  app.put(`${path}/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = schema.parse(req.body);
      const [updated] = await db.update(table)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning();
      
      if (!updated) return res.status(404).json({ error: `${label} not found` });
      res.json(updated);
    } catch (error: any) {
      console.error(`Error updating ${label}:`, error);
      res.status(400).json({ error: `Failed to update ${label}`, details: error.message });
    }
  });

  // DELETE
  app.delete(`${path}/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [deleted] = await db.delete(table).where(eq(table.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: `${label} not found` });
      res.json({ message: `${label} deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${label}:`, error);
      res.status(500).json({ error: `Failed to delete ${label}` });
    }
  });
}

// Register CRUD for all 4
handleCRUD(router, '/procurement-types', procurementTypes, insertProcurementTypeSchema, 'procurement types');
handleCRUD(router, '/lot-sizes', lotSizes, insertLotSizeSchema, 'lot sizes');
handleCRUD(router, '/mrp-types', mrpTypes, insertMrpTypeSchema, 'MRP types');
handleCRUD(router, '/mrp-procedures', mrpProcedures, insertMrpProcedureSchema, 'MRP procedures');

export default router;
