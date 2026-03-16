import { Router, Request, Response } from 'express';
import { pool } from '../../db';

const router = Router();

// GET preview next available account number for a GL Account Group
// Does NOT update current_number — that only happens after successful account creation
router.get('/next-number/:glAccountGroupId', async (req: Request, res: Response) => {
    try {
        const glAccountGroupId = parseInt(req.params.glAccountGroupId);

        if (isNaN(glAccountGroupId)) {
            return res.status(400).json({ error: 'Invalid GL Account Group ID' });
        }

        // Get GL Account Group with its number range
        const groupResult = await pool.query(`
      SELECT 
        gag.id,
        gag.code,
        gag.name,
        gag.number_range_id,
        nr.id as nr_id,
        nr.number_range_code,
        nr.description as nr_description,
        nr.range_from,
        nr.range_to,
        nr.current_number,
        nr.external_numbering
      FROM gl_account_groups gag
      LEFT JOIN number_ranges nr ON gag.number_range_id = nr.id
      WHERE gag.id = $1
    `, [glAccountGroupId]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'GL Account Group not found' });
        }

        const group = groupResult.rows[0];

        // Check if group has a number range assigned
        if (!group.number_range_id) {
            return res.status(400).json({
                error: 'No number range assigned to this GL Account Group',
                requiresManualEntry: true
            });
        }

        // Check if external numbering is enabled (manual entry required)
        if (group.external_numbering) {
            return res.status(400).json({
                error: 'This number range uses external numbering. Please enter account number manually.',
                requiresManualEntry: true
            });
        }

        // Parse range values
        const currentNumber = parseInt(group.current_number || group.range_from);
        const rangeFrom = parseInt(group.range_from);
        const rangeTo = parseInt(group.range_to);

        // Determine next number (preview only — do NOT update DB here)
        const nextNumber = (currentNumber >= rangeFrom) ? currentNumber + 1 : rangeFrom;

        // Check if we've exhausted the range
        if (nextNumber > rangeTo) {
            return res.status(400).json({
                error: `Number range exhausted. Range: ${rangeFrom}-${rangeTo}, Current: ${currentNumber}`,
                requiresManualEntry: true
            });
        }

        // Return preview — current_number is NOT updated yet
        res.json({
            success: true,
            accountNumber: nextNumber.toString(),
            rawNumber: nextNumber,
            numberRangeId: group.nr_id,
            numberRangeCode: group.number_range_code,
            remaining: rangeTo - nextNumber,
            rangeInfo: {
                from: rangeFrom,
                to: rangeTo,
                current: currentNumber  // still the old value — not yet incremented
            }
        });

    } catch (error: any) {
        console.error('Error previewing next account number:', error);
        res.status(500).json({
            error: 'Failed to preview account number',
            message: error.message
        });
    }
});

export default router;
