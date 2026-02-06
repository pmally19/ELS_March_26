import { Router } from 'express';
import ChiefAgentService from '../services/chief-agent-service';
import { z } from 'zod';

const router = Router();
const chiefAgentService = ChiefAgentService.getInstance();

// Get Chief Agent dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await chiefAgentService.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    console.error('Chief Agent dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Create new change request
router.post('/change-requests', async (req, res) => {
  try {
    const requestSchema = z.object({
      requestType: z.string(),
      originAgent: z.string(),
      originAgentId: z.string(),
      businessDomain: z.string(),
      title: z.string(),
      description: z.string(),
      businessJustification: z.string(),
      targetTable: z.string().optional(),
      targetField: z.string().optional(),
      currentValue: z.string().optional(),
      proposedValue: z.string().optional(),
      changeScope: z.any(),
      priority: z.string().optional(),
      urgency: z.string().optional()
    });

    const validatedData = requestSchema.parse(req.body);
    const changeRequest = await chiefAgentService.createChangeRequest(validatedData);
    
    res.status(201).json(changeRequest);
  } catch (error) {
    console.error('Create change request error:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

// Review change request
router.post('/change-requests/:requestId/review', async (req, res) => {
  try {
    const { requestId } = req.params;
    const reviewResult = await chiefAgentService.reviewChangeRequest(requestId);
    
    res.json(reviewResult);
  } catch (error) {
    console.error('Review change request error:', error);
    res.status(500).json({ error: 'Failed to review change request' });
  }
});

// Process human manager approval
router.post('/human-interactions/:interactionId/approve', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const approvalSchema = z.object({
      response: z.string(),
      notes: z.string(),
      managerId: z.string()
    });

    const validatedApproval = approvalSchema.parse(req.body);
    await chiefAgentService.processHumanApproval(interactionId, validatedApproval);
    
    res.json({ message: 'Approval processed successfully' });
  } catch (error) {
    console.error('Process human approval error:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

export default router;