import express from 'express';
import { salesEmailService } from '../../services/sales-email-service';
import { quotationService } from '../../services/quotation-service';

const router = express.Router();

/**
 * Send quotation email
 * POST /api/sales/quotations/:id/send-email
 */
router.post('/:id/send-email', async (req, res) => {
    try {
        const quotationId = parseInt(req.params.id);

        if (isNaN(quotationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid quotation ID'
            });
        }

        const emailSent = await salesEmailService.sendQuotationEmail(quotationId);

        res.json({
            success: true,
            message: 'Quotation email sent successfully',
            emailSent
        });
    } catch (error: any) {
        console.error('Error sending quotation email:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send quotation email'
        });
    }
});

/**
 * Save quotation texts
 * POST /api/sales/quotations/:id/texts
 */
router.post('/:id/texts', async (req, res) => {
    try {
        const quotationId = parseInt(req.params.id);
        const { texts } = req.body;

        if (isNaN(quotationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid quotation ID'
            });
        }

        if (!Array.isArray(texts)) {
            return res.status(400).json({
                success: false,
                error: 'Texts must be an array'
            });
        }

        const result = await quotationService.saveQuotationTexts(quotationId, texts);

        res.json({
            success: true,
            message: 'Quotation texts saved successfully',
            data: result
        });
    } catch (error: any) {
        console.error('Error saving quotation texts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save quotation texts'
        });
    }
});

/**
 * Get quotation texts
 * GET /api/sales/quotations/:id/texts
 */
router.get('/:id/texts', async (req, res) => {
    try {
        const quotationId = parseInt(req.params.id);

        if (isNaN(quotationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid quotation ID'
            });
        }

        const texts = await quotationService.getQuotationTexts(quotationId);

        res.json({
            success: true,
            data: texts
        });
    } catch (error: any) {
        console.error('Error fetching quotation texts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch quotation texts'
        });
    }
});

export default router;
