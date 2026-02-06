import { Router } from "express";
import { CoachAgentService } from "../services/coach-agent-service";
import { 
  insertChangeRequestSchema, 
  insertPlayerCoachCommunicationSchema 
} from "@shared/coach-agent-schema";

const router = Router();
const coachService = new CoachAgentService();

// Initialize Coach Agent system
router.post('/initialize', async (req, res) => {
  try {
    const coach = await coachService.initializeCoachAgent();
    res.json({ 
      message: "Coach Agent initialized successfully", 
      coach: coach 
    });
  } catch (error) {
    console.error('Coach initialization error:', error);
    res.status(500).json({ 
      message: "Failed to initialize Coach Agent", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all Coach Agents
router.get('/', async (req, res) => {
  try {
    const coaches = await coachService.getAllCoaches();
    res.json(coaches);
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ 
      message: "Failed to retrieve coaches", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific Coach Agent with dashboard data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const coach = await coachService.getCoachById(id);
    
    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const dashboard = await coachService.getCoachDashboard(id);
    
    res.json({
      coach,
      dashboard
    });
  } catch (error) {
    console.error('Get coach error:', error);
    res.status(500).json({ 
      message: "Failed to retrieve coach", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Player Agent submits change request to Coach
router.post('/change-requests', async (req, res) => {
  try {
    const validatedData = insertChangeRequestSchema.parse(req.body);
    
    // Get the first active coach (in a real system, this might be more sophisticated)
    const coaches = await coachService.getAllCoaches();
    if (coaches.length === 0) {
      return res.status(400).json({ message: "No active coach available to handle request" });
    }
    
    const requestData = {
      ...validatedData,
      coachAgentId: coaches[0].id // Assign to first available coach
    };
    
    const changeRequest = await coachService.submitChangeRequest(requestData);
    res.json({ 
      message: "Change request submitted successfully", 
      request: changeRequest 
    });
  } catch (error) {
    console.error('Submit change request error:', error);
    res.status(500).json({ 
      message: "Failed to submit change request", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Coach reviews and decides on change request
router.put('/change-requests/:requestId/review', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { 
      coachId, 
      decision, 
      justification, 
      crossDomainAnalysis, 
      implementationPlan 
    } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: "Decision must be 'approved' or 'rejected'" });
    }

    if (!justification || justification.trim().length === 0) {
      return res.status(400).json({ message: "Justification is required" });
    }

    const updatedRequest = await coachService.reviewChangeRequest(
      requestId,
      coachId,
      decision,
      justification,
      crossDomainAnalysis || {},
      implementationPlan
    );

    res.json({ 
      message: `Change request ${decision}`, 
      request: updatedRequest 
    });
  } catch (error) {
    console.error('Review change request error:', error);
    res.status(500).json({ 
      message: "Failed to review change request", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pending change requests for Coach
router.get('/:coachId/pending-requests', async (req, res) => {
  try {
    const { coachId } = req.params;
    const pendingRequests = await coachService.getPendingChangeRequests(coachId);
    res.json(pendingRequests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ 
      message: "Failed to retrieve pending requests", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Player Agent sends communication to Coach
router.post('/communications', async (req, res) => {
  try {
    const validatedData = insertPlayerCoachCommunicationSchema.parse(req.body);
    
    // Get the first active coach
    const coaches = await coachService.getAllCoaches();
    if (coaches.length === 0) {
      return res.status(400).json({ message: "No active coach available" });
    }
    
    const communicationData = {
      ...validatedData,
      coachAgentId: coaches[0].id
    };
    
    const communication = await coachService.sendCommunicationToCoach(communicationData);
    res.json({ 
      message: "Communication sent to coach", 
      communication 
    });
  } catch (error) {
    console.error('Send communication error:', error);
    res.status(500).json({ 
      message: "Failed to send communication", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Coach responds to Player communication
router.put('/communications/:communicationId/respond', async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { coachResponse, guidance } = req.body;

    if (!coachResponse || coachResponse.trim().length === 0) {
      return res.status(400).json({ message: "Coach response is required" });
    }

    const updatedCommunication = await coachService.respondToCommunication(
      communicationId,
      coachResponse,
      guidance || ""
    );

    res.json({ 
      message: "Response sent to player agent", 
      communication: updatedCommunication 
    });
  } catch (error) {
    console.error('Respond to communication error:', error);
    res.status(500).json({ 
      message: "Failed to respond to communication", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update agent access controls with timestamp ranges and detailed reasoning
router.put('/access-control/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { 
      permissions, 
      validFrom, 
      validTo, 
      modificationReason, 
      businessJustification, 
      riskAssessment, 
      automaticRevocation,
      modifiedBy 
    } = req.body;

    const updatedAccess = await coachService.updateAgentAccess(
      agentId,
      permissions,
      {
        validFrom: new Date(validFrom),
        validTo: validTo ? new Date(validTo) : undefined,
        modificationReason,
        businessJustification,
        riskAssessment,
        automaticRevocation
      },
      modifiedBy || "coach"
    );

    res.json({ 
      message: 'Agent access updated successfully', 
      accessControl: updatedAccess 
    });
  } catch (error) {
    console.error('Error updating agent access:', error);
    res.status(500).json({ message: 'Failed to update agent access' });
  }
});

// Check agent access permissions
router.get('/access-control/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const access = await coachService.checkAgentAccess(agentId);
    
    if (!access) {
      return res.status(404).json({ message: "No access control found for agent" });
    }

    res.json(access);
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ 
      message: "Failed to check agent access", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Revoke temporary access (Coach only)
router.post('/access-control/:agentId/revoke', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Reason for access revocation is required" });
    }

    await coachService.revokeTemporaryAccess(agentId, reason);
    res.json({ message: "Access revoked successfully" });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ 
      message: "Failed to revoke access", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get change request history
router.get('/change-requests/history/:agentId?', async (req, res) => {
  try {
    const { agentId } = req.params;
    const history = await coachService.getChangeRequestHistory(agentId);
    res.json(history);
  } catch (error) {
    console.error('Get change request history error:', error);
    res.status(500).json({ 
      message: "Failed to retrieve change request history", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Coach dashboard endpoint
router.get('/:coachId/dashboard', async (req, res) => {
  try {
    const { coachId } = req.params;
    const dashboard = await coachService.getCoachDashboard(coachId);
    res.json(dashboard);
  } catch (error) {
    console.error('Get coach dashboard error:', error);
    res.status(500).json({ 
      message: "Failed to retrieve coach dashboard", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;