import { Router } from 'express';
import receivableConfirmationsRouter from './receivable-confirmations.js';
import payableConfirmationsRouter from './payable-confirmations.js';
import assetYearEndRouter from './asset-year-end.js';
import fiscalYearRouter from './fiscal-year.js';

const router = Router();

// Mount sub-routers
router.use('/receivables', receivableConfirmationsRouter);
router.use('/payables', payableConfirmationsRouter);
router.use('/assets', assetYearEndRouter);
router.use('/fiscal-years', fiscalYearRouter);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Year-End Closing API is running',
        modules: {
            receivables: 'active',
            payables: 'active',
            assets: 'active',
            fiscal_years: 'active'
        }
    });
});

export default router;
