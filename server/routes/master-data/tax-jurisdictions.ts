import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { taxJurisdictions, insertTaxJurisdictionSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as xlsx from 'xlsx';

const router = Router();

// Get all jurisdictions with optional filters
router.get('/', async (req, res) => {
  try {
    const allJurisdictions = await db
      .select()
      .from(taxJurisdictions)
      .orderBy(taxJurisdictions.jurisdictionCode);
    
    return res.json(allJurisdictions);
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch tax jurisdictions', 
      details: e?.message 
    });
  }
});

// Get jurisdiction by ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [jurisdiction] = await db
      .select()
      .from(taxJurisdictions)
      .where(eq(taxJurisdictions.id, id));
    
    if (!jurisdiction) {
      return res.status(404).json({ error: 'Jurisdiction not found' });
    }
    
    return res.json(jurisdiction);
  } catch (e: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch tax jurisdiction', 
      details: e?.message 
    });
  }
});

// POST /api/master-data/tax-jurisdictions
router.post('/', async (req, res) => {
  try {
    const validatedData = insertTaxJurisdictionSchema.parse(req.body);
    
    const [newJurisdiction] = await db
      .insert(taxJurisdictions)
      .values(validatedData)
      .returning();

    res.status(201).json(newJurisdiction);
  } catch (error) {
    console.error('Error creating tax jurisdiction:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create tax jurisdiction' });
    }
  }
});

// PUT /api/master-data/tax-jurisdictions/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertTaxJurisdictionSchema.partial().parse(req.body);

    const [updatedJurisdiction] = await db
      .update(taxJurisdictions)
      .set(validatedData)
      .where(eq(taxJurisdictions.id, id))
      .returning();

    if (!updatedJurisdiction) {
      return res.status(404).json({ error: 'Tax jurisdiction not found' });
    }

    res.json(updatedJurisdiction);
  } catch (error) {
    console.error('Error updating tax jurisdiction:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update tax jurisdiction' });
    }
  }
});

// DELETE /api/master-data/tax-jurisdictions/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [deletedJurisdiction] = await db
      .delete(taxJurisdictions)
      .where(eq(taxJurisdictions.id, id))
      .returning();

    if (!deletedJurisdiction) {
      return res.status(404).json({ error: 'Tax jurisdiction not found' });
    }

    res.json({ message: 'Tax jurisdiction deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax jurisdiction:', error);
    res.status(500).json({ error: 'Failed to delete tax jurisdiction' });
  }
});

// POST /api/master-data/tax-jurisdictions/import
router.post('/import', async (req, res) => {
  try {
    if (!req.files || (Array.isArray(req.files) ? !req.files[0] : !(req.files as any).file)) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = Array.isArray(req.files) ? req.files[0] : (req.files as any).file;
    const workbook = xlsx.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let imported = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const jurisdictionData = {
          jurisdictionCode: (row as any).Code || (row as any).code || (row as any)['Jurisdiction Code'],
          jurisdictionName: (row as any).Name || (row as any).name || (row as any)['Jurisdiction Name'],
          jurisdictionType: (row as any).Type || (row as any).type || (row as any)['Jurisdiction Type'],
          parentJurisdictionId: (row as any)['Parent ID'] || (row as any).parentJurisdictionId || (row as any).parent_id,
          country: (row as any).Country || (row as any).country,
          stateProvince: (row as any)['State Province'] || (row as any).stateProvince || (row as any).state_province,
          county: (row as any).County || (row as any).county,
          city: (row as any).City || (row as any).city,
          postalCodePattern: (row as any)['Postal Code Pattern'] || (row as any).postalCodePattern || (row as any).postal_code_pattern,
          isActive: (row as any).Active !== 'No' && (row as any).isActive !== false
        };

        const validatedData = insertTaxJurisdictionSchema.parse(jurisdictionData);
        
        await db.insert(taxJurisdictions).values(validatedData).onConflictDoNothing();

        imported++;
      } catch (error) {
        errors.push(`Row ${imported + errors.length + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    res.json({ imported, errors });
  } catch (error) {
    console.error('Error importing tax jurisdictions:', error);
    res.status(500).json({ error: 'Failed to import tax jurisdictions' });
  }
});

export default router;

