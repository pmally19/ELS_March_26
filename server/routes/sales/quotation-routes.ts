import { Router } from 'express';
import { quotationService } from '../../services/quotation-service';

const router = Router();

// Get all quotations
router.get('/', async (req, res) => {
    try {
        const quotations = await quotationService.getAllQuotations();
        res.json({ success: true, data: quotations });
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quotations' });
    }
});

// Get quotation by ID
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const quotation = await quotationService.getQuotationById(id);

        if (!quotation) {
            return res.status(404).json({ success: false, error: 'Quotation not found' });
        }

        res.json({ success: true, data: quotation });
    } catch (error) {
        console.error('Error fetching quotation:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quotation' });
    }
});

// Create new quotation
router.post('/', async (req, res) => {
    try {
        const quotation = await quotationService.createQuotation({
            ...req.body,
            documentType: req.body.documentType || req.body.document_type || 'QT',  // Accept both camelCase and snake_case
            userId: req.body.userId || 1  // TODO: Replace with authenticated user ID from req.user.id
        });
        res.status(201).json({ success: true, data: quotation });
    } catch (error) {
        console.error('Error creating quotation:', error);
        res.status(500).json({ success: false, error: 'Failed to create quotation' });
    }
});

// Update quotation status
router.patch('/:id/status', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        const updated = await quotationService.updateQuotationStatus(id, status);
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error updating quotation status:', error);
        res.status(500).json({ success: false, error: 'Failed to update quotation status' });
    }
});

// Convert to Sales Order
router.post('/:id/convert', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // TODO: Replace with authenticated user ID from req.user.id
        const userId = req.body.userId || 1;
        const order = await quotationService.convertToSalesOrder(id, userId);
        res.json({ success: true, data: order });
    } catch (error: any) {
        console.error('Error converting quotation:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to convert to sales order' });
    }
});

// Save quotation texts
router.post('/:id/texts', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { texts } = req.body;  // Array of { textType, textContent }

        await quotationService.saveQuotationTexts(id, texts);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving quotation texts:', error);
        res.status(500).json({ success: false, error: 'Failed to save quotation texts' });
    }
});

// Delete quotation
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await quotationService.deleteQuotation(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        res.status(500).json({ success: false, error: 'Failed to delete quotation' });
    }
});

export default router;
