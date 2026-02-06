import { Router } from 'express';
import { db } from '../../db';
import { taxProfiles, taxRules, insertTaxProfileSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// List profiles (optional filters: country, active)
router.get('/', async (req, res) => {
  try {
    const { country, active } = req.query as { country?: string; active?: string };
    
    // Get all profiles
    let profiles = await db.select().from(taxProfiles);
    
    // Apply filters
    if (country) {
      profiles = profiles.filter(p => (p.country || '').toUpperCase() === String(country).toUpperCase());
    }
    if (active !== undefined) {
      profiles = profiles.filter(p => Boolean(p.isActive) === (active === 'true'));
    }

    // Get rule counts for each profile and map to camelCase
    const profilesWithDetails = await Promise.all(
      profiles.map(async (profile) => {
        const rules = await db
          .select()
          .from(taxRules)
          .where(and(
            eq(taxRules.profileId, profile.id),
            eq(taxRules.isActive, true)
          ));

        return {
          id: profile.id,
          profileCode: profile.profileCode,
          name: profile.name,
          description: profile.description,
          country: profile.country,
          isActive: profile.isActive,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          ruleCount: rules.length
        };
      })
    );

    return res.json(profilesWithDetails);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch tax profiles', details: e?.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.select().from(taxProfiles).where(eq(taxProfiles.id, id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: row.id,
      profileCode: row.profileCode,
      name: row.name,
      description: row.description,
      country: row.country,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch tax profile', details: e?.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db.insert(taxProfiles).values({
      profileCode: String(body.profileCode || body.profile_code || '').toUpperCase(),
      name: body.name || '',
      description: body.description || null,
      country: body.country || null,
      isActive: body.isActive !== undefined ? body.isActive : (body.is_active !== undefined ? body.is_active : true),
    } as any).returning();
    return res.status(201).json({
      id: created.id,
      profileCode: created.profileCode,
      name: created.name,
      description: created.description,
      country: created.country,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = /unique|constraint|duplicate/i.test(msg) ? 409 : 400;
    return res.status(code).json({ error: 'Failed to create tax profile', details: msg });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    
    // Map camelCase to database schema
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.profileCode !== undefined) updateData.profileCode = String(body.profileCode).toUpperCase();
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.country !== undefined) updateData.country = body.country || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    const [updated] = await db.update(taxProfiles)
      .set(updateData)
      .where(eq(taxProfiles.id, id))
      .returning();
      
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: updated.id,
      profileCode: updated.profileCode,
      name: updated.name,
      description: updated.description,
      country: updated.country,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    console.error('Error updating tax profile:', e);
    const msg = e?.message || String(e);
    const code = /unique|constraint|duplicate/i.test(msg) ? 409 : 400;
    return res.status(code).json({ error: 'Failed to update tax profile', details: msg });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(taxProfiles).where(eq(taxProfiles.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted', id });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to delete tax profile', details: e?.message });
  }
});

export default router;


