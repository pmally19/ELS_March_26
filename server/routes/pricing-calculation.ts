import express from 'express';
import { pricingCalculationService } from '../services/pricing-calculation';

const router = express.Router();

/**
 * POST /api/pricing/calculate
 * Calculate pricing for items using a pricing procedure
 */
router.post('/calculate', async (req, res) => {
    try {
        const {
            procedureCode,
            items = [],
            context = {}
        } = req.body;

        if (!procedureCode) {
            return res.status(400).json({ error: 'procedureCode is required' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'items array is required and must not be empty' });
        }

        const results = [];

        // Calculate pricing for each item
        for (const item of items) {
            const itemContext = {
                materialCode: item.materialCode || item.material_code,
                customerCode: context.customerCode || context.customer_code,
                salesOrgId: context.salesOrgId || context.sales_org_id,
                distributionChannelId: context.distributionChannelId || context.distribution_channel_id,
                divisionId: context.divisionId || context.division_id,
                materialGroup: item.materialGroup || item.material_group,
                customerGroup: context.customerGroup || context.customer_group,
                quantity: item.quantity || 1,
                plantCode: item.plantCode || item.plant_code,
                storageLocation: item.storageLocation || item.storage_location
            };

            const baseValue = item.baseValue || item.base_value || 0;

            const pricingResult = await pricingCalculationService.calculatePricing(
                procedureCode,
                baseValue,
                itemContext
            );

            results.push({
                itemId: item.itemId || item.id || `item_${results.length + 1}`,
                materialCode: itemContext.materialCode,
                quantity: itemContext.quantity,
                ...pricingResult
            });
        }

        res.json({
            procedureCode,
            items: results,
            calculatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error calculating pricing:', error);
        res.status(500).json({
            error: 'Failed to calculate pricing',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/pricing/determine-procedure
 * Determine which pricing procedure to use based on context
 */
router.post('/determine-procedure', async (req, res) => {
    try {
        const {
            documentType,
            salesOrgId,
            distributionChannelId,
            divisionId,
            customerPricingGroup,
            materialPricingGroup
        } = req.body;

        // This would query pricing_procedure_determination table
        // For now, return a simple default
        res.json({
            procedureCode: 'ZMDS01',
            procedureName: 'MCML - Standard Sales',
            message: 'Default procedure (determination logic to be implemented)'
        });

    } catch (error) {
        console.error('Error determining pricing procedure:', error);
        res.status(500).json({ error: 'Failed to determine pricing procedure' });
    }
});

export default router;
