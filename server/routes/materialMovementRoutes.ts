import { Router } from 'express';
import { materialMovementService } from '../services/materialMovementService';

const router = Router();

// Create new movement (Issue/Receipt)
router.post('/', async (req, res) => {
    try {
        const movement = await materialMovementService.createMovement({
            ...req.body,
            userId: 1 // TODO: Get from auth context
        });
        res.status(201).json({ success: true, data: movement });
    } catch (error) {
        console.error('Error creating movement:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get history
router.get('/history', async (req, res) => {
    try {
        const history = await materialMovementService.getHistory(req.query);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching movement history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
