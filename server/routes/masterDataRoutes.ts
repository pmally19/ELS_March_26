import { Router } from 'express';
import { db } from '../db';
import { chartOfAccounts, fiscalYearVariants, globalCompanyCodes, vatRegistrationNumbers } from '@shared/schema';
import { creditControlAreas } from '@shared/organizational-schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Chart of Accounts routes
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const charts = await db.select().from(chartOfAccounts);
    res.json(charts);
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ error: 'Failed to fetch chart of accounts' });
  }
});

router.post('/chart-of-accounts', async (req, res) => {
  try {
    const [chart] = await db.insert(chartOfAccounts).values(req.body).returning();
    res.json(chart);
  } catch (error) {
    console.error('Error creating chart of accounts:', error);
    res.status(500).json({ error: 'Failed to create chart of accounts' });
  }
});

router.put('/chart-of-accounts/:id', async (req, res) => {
  try {
    const [chart] = await db
      .update(chartOfAccounts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(chartOfAccounts.id, parseInt(req.params.id)))
      .returning();
    res.json(chart);
  } catch (error) {
    console.error('Error updating chart of accounts:', error);
    res.status(500).json({ error: 'Failed to update chart of accounts' });
  }
});

router.delete('/chart-of-accounts/:id', async (req, res) => {
  try {
    await db.delete(chartOfAccounts).where(eq(chartOfAccounts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart of accounts:', error);
    res.status(500).json({ error: 'Failed to delete chart of accounts' });
  }
});

// Credit Control Areas routes
router.get('/credit-control-areas', async (req, res) => {
  try {
    const areas = await db.select().from(creditControlAreas);
    res.json(areas);
  } catch (error) {
    console.error('Error fetching credit control areas:', error);
    res.status(500).json({ error: 'Failed to fetch credit control areas' });
  }
});

router.post('/credit-control-areas', async (req, res) => {
  try {
    const [area] = await db.insert(creditControlAreas).values(req.body).returning();
    res.json(area);
  } catch (error) {
    console.error('Error creating credit control area:', error);
    res.status(500).json({ error: 'Failed to create credit control area' });
  }
});

router.put('/credit-control-areas/:id', async (req, res) => {
  try {
    const [area] = await db
      .update(creditControlAreas)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(creditControlAreas.id, parseInt(req.params.id)))
      .returning();
    res.json(area);
  } catch (error) {
    console.error('Error updating credit control area:', error);
    res.status(500).json({ error: 'Failed to update credit control area' });
  }
});

router.delete('/credit-control-areas/:id', async (req, res) => {
  try {
    await db.delete(creditControlAreas).where(eq(creditControlAreas.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting credit control area:', error);
    res.status(500).json({ error: 'Failed to delete credit control area' });
  }
});

// Fiscal Year Variants routes
router.get('/fiscal-year-variants', async (req, res) => {
  try {
    console.log('📋 Fetching fiscal year variants...');
    const variants = await db.select().from(fiscalYearVariants);
    console.log('✅ Successfully fetched fiscal year variants:', variants.length);
    res.json(variants);
  } catch (error: any) {
    console.error('❌ Error fetching fiscal year variants:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch fiscal year variants',
      message: error.message,
      details: error.toString()
    });
  }
});

router.post('/fiscal-year-variants', async (req, res) => {
  try {
    const [variant] = await db.insert(fiscalYearVariants).values(req.body).returning();
    res.json(variant);
  } catch (error) {
    console.error('Error creating fiscal year variant:', error);
    res.status(500).json({ error: 'Failed to create fiscal year variant' });
  }
});

router.put('/fiscal-year-variants/:id', async (req, res) => {
  try {
    const [variant] = await db
      .update(fiscalYearVariants)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(fiscalYearVariants.id, parseInt(req.params.id)))
      .returning();
    res.json(variant);
  } catch (error) {
    console.error('Error updating fiscal year variant:', error);
    res.status(500).json({ error: 'Failed to update fiscal year variant' });
  }
});

router.delete('/fiscal-year-variants/:id', async (req, res) => {
  try {
    await db.delete(fiscalYearVariants).where(eq(fiscalYearVariants.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fiscal year variant:', error);
    res.status(500).json({ error: 'Failed to delete fiscal year variant' });
  }
});

// Global Company Codes routes
router.get('/global-company-codes', async (req, res) => {
  try {
    const codes = await db.select().from(globalCompanyCodes);
    res.json(codes);
  } catch (error) {
    console.error('Error fetching global company codes:', error);
    res.status(500).json({ error: 'Failed to fetch global company codes' });
  }
});

router.post('/global-company-codes', async (req, res) => {
  try {
    const [code] = await db.insert(globalCompanyCodes).values(req.body).returning();
    res.json(code);
  } catch (error) {
    console.error('Error creating global company code:', error);
    res.status(500).json({ error: 'Failed to create global company code' });
  }
});

router.put('/global-company-codes/:id', async (req, res) => {
  try {
    const [code] = await db
      .update(globalCompanyCodes)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(globalCompanyCodes.id, parseInt(req.params.id)))
      .returning();
    res.json(code);
  } catch (error) {
    console.error('Error updating global company code:', error);
    res.status(500).json({ error: 'Failed to update global company code' });
  }
});

router.delete('/global-company-codes/:id', async (req, res) => {
  try {
    await db.delete(globalCompanyCodes).where(eq(globalCompanyCodes.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting global company code:', error);
    res.status(500).json({ error: 'Failed to delete global company code' });
  }
});

// VAT Registration Numbers routes
router.get('/vat-registration', async (req, res) => {
  try {
    const registrations = await db.select().from(vatRegistrationNumbers);
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching VAT registrations:', error);
    res.status(500).json({ error: 'Failed to fetch VAT registrations' });
  }
});

router.post('/vat-registration', async (req, res) => {
  try {
    const [registration] = await db.insert(vatRegistrationNumbers).values(req.body).returning();
    res.json(registration);
  } catch (error) {
    console.error('Error creating VAT registration:', error);
    res.status(500).json({ error: 'Failed to create VAT registration' });
  }
});

router.put('/vat-registration/:id', async (req, res) => {
  try {
    const [registration] = await db
      .update(vatRegistrationNumbers)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(vatRegistrationNumbers.id, parseInt(req.params.id)))
      .returning();
    res.json(registration);
  } catch (error) {
    console.error('Error updating VAT registration:', error);
    res.status(500).json({ error: 'Failed to update VAT registration' });
  }
});

router.delete('/vat-registration/:id', async (req, res) => {
  try {
    await db.delete(vatRegistrationNumbers).where(eq(vatRegistrationNumbers.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting VAT registration:', error);
    res.status(500).json({ error: 'Failed to delete VAT registration' });
  }
});

export default router;