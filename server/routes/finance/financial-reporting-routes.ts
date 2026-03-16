import { Router } from 'express';
import { financialReportingService } from '../../services/financial-reporting-service.js';

const router = Router();

router.get('/balance-sheet', async (req, res) => {
    try {
        const { fiscalPeriodId } = req.query;
        if (!fiscalPeriodId) return res.status(400).json({ success: false, error: 'fiscalPeriodId is required' });

        const data = await financialReportingService.getBalanceSheet(parseInt(fiscalPeriodId as string));
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Balance Sheet Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/income-statement', async (req, res) => {
    try {
        const { fiscalPeriodId } = req.query;
        if (!fiscalPeriodId) return res.status(400).json({ success: false, error: 'fiscalPeriodId is required' });

        const data = await financialReportingService.getIncomeStatement(parseInt(fiscalPeriodId as string));
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Income Statement Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
