import { Router } from 'express';
import { db } from '../../db';
import { taxRules, taxProfiles, taxJurisdictions, insertTaxRuleSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getPool } from '../../database';

const router = Router();

// List rules with profile information (filters: profileId, jurisdiction, active)
router.get('/', async (req, res) => {
  try {
    const { profileId, jurisdiction, active } = req.query as { profileId?: string; jurisdiction?: string; active?: string };

    // Get all rules with profile info and tax jurisdiction
    let rules = await db
      .select({
        id: taxRules.id,
        profileId: taxRules.profileId,
        ruleCode: taxRules.ruleCode,
        title: taxRules.title,
        ratePercent: taxRules.ratePercent,
        jurisdiction: taxRules.jurisdiction,
        taxJurisdictionId: taxRules.taxJurisdictionId,
        taxCategoryId: taxRules.taxCategoryId,
        appliesTo: taxRules.appliesTo,
        effectiveFrom: taxRules.effectiveFrom,
        effectiveTo: taxRules.effectiveTo,
        isActive: taxRules.isActive,
        createdAt: taxRules.createdAt,
        updatedAt: taxRules.updatedAt,
        profileName: taxProfiles.name,
        profileCode: taxProfiles.profileCode,
        taxJurisdictionCode: taxJurisdictions.jurisdictionCode,
        taxJurisdictionName: taxJurisdictions.jurisdictionName,
      })
      .from(taxRules)
      .innerJoin(taxProfiles, eq(taxRules.profileId, taxProfiles.id))
      .leftJoin(taxJurisdictions, eq(taxRules.taxJurisdictionId, taxJurisdictions.id));

    // Enrich with tax category info from raw SQL (tax_categories not in Drizzle)
    const categoryResult = await getPool().query(`SELECT id, tax_category_code, description FROM tax_categories`);
    const categoryMap = new Map(categoryResult.rows.map((c: any) => [c.id, c]));

    rules = rules.map((r: any) => {
      const cat = r.taxCategoryId ? categoryMap.get(r.taxCategoryId) : null;
      return {
        ...r,
        taxCategoryCode: cat?.tax_category_code || null,
        taxCategoryName: cat?.description || null,
      };
    });

    // Apply filters
    if (profileId) {
      rules = rules.filter(r => r.profileId === Number(profileId));
    }
    if (jurisdiction) {
      rules = rules.filter(r => (r.jurisdiction || '').toLowerCase() === String(jurisdiction).toLowerCase());
    }
    if (active !== undefined) {
      rules = rules.filter(r => Boolean(r.isActive) === (active === 'true'));
    }

    return res.json(rules);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch tax rules', details: e?.message });
  }
});

// Get tax categories for dropdown (must be before /:id)
router.get('/tax-categories', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT id, tax_category_code, description, tax_type
      FROM tax_categories
      WHERE is_active = true
      ORDER BY tax_category_code
    `);
    return res.json(result.rows);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch tax categories', details: e?.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.select().from(taxRules).where(eq(taxRules.id, id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch tax rule', details: e?.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Insert with proper schema mapping
    const [created] = await db.insert(taxRules).values({
      profileId: body.profileId,
      ruleCode: String(body.ruleCode).toUpperCase(),
      title: body.title,
      ratePercent: body.ratePercent,
      jurisdiction: body.jurisdiction || null,
      taxJurisdictionId: body.taxJurisdictionId || null,
      taxCategoryId: body.taxCategoryId || null,
      appliesTo: body.appliesTo || null,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    } as any).returning();

    return res.status(201).json(created);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const code = /unique|constraint|duplicate/i.test(msg) ? 409 : 400;
    return res.status(code).json({ error: 'Failed to create tax rule', details: msg });
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

    if (body.profileId !== undefined) updateData.profileId = body.profileId;
    if (body.ruleCode !== undefined) updateData.ruleCode = String(body.ruleCode).toUpperCase();
    if (body.title !== undefined) updateData.title = body.title;
    if (body.ratePercent !== undefined) updateData.ratePercent = body.ratePercent;
    if (body.jurisdiction !== undefined) updateData.jurisdiction = body.jurisdiction || null;
    if (body.taxJurisdictionId !== undefined) updateData.taxJurisdictionId = body.taxJurisdictionId || null;
    if (body.taxCategoryId !== undefined) updateData.taxCategoryId = body.taxCategoryId || null;
    if (body.appliesTo !== undefined) updateData.appliesTo = body.appliesTo || null;
    if (body.effectiveFrom !== undefined) updateData.effectiveFrom = body.effectiveFrom;
    if (body.effectiveTo !== undefined) updateData.effectiveTo = body.effectiveTo || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db.update(taxRules)
      .set(updateData)
      .where(eq(taxRules.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (e: any) {
    console.error('Error updating tax rule:', e);
    const msg = e?.message || String(e);
    const code = /unique|constraint|duplicate/i.test(msg) ? 409 : 400;
    return res.status(code).json({ error: 'Failed to update tax rule', details: msg });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db.delete(taxRules).where(eq(taxRules.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted', id });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to delete tax rule', details: e?.message });
  }
});

export default router;
