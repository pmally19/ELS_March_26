import { Router } from "express";
import { developmentTracker } from "../services/DevelopmentTracker";

const router = Router();

// Initialize development tracker
router.post('/initialize', async (req, res) => {
  try {
    await developmentTracker.initialize();
    res.json({ success: true, message: "Development tracker initialized" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Define a new development phase
router.post('/phases', async (req, res) => {
  try {
    const phaseId = await developmentTracker.definePhase(req.body);
    res.json({ success: true, phaseId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start a phase
router.post('/phases/:id/start', async (req, res) => {
  try {
    await developmentTracker.startPhase(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add evidence to a phase
router.post('/phases/:id/evidence', async (req, res) => {
  try {
    const { evidenceType, evidence } = req.body;
    await developmentTracker.addEvidence(parseInt(req.params.id), evidenceType, evidence);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run tests for a phase
router.post('/phases/:id/test', async (req, res) => {
  try {
    const results = await developmentTracker.runPhaseTests(parseInt(req.params.id));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a phase
router.post('/phases/:id/complete', async (req, res) => {
  try {
    await developmentTracker.completePhase(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate proof report
router.get('/phases/:id/proof', async (req, res) => {
  try {
    const reportPath = await developmentTracker.generateProofReport(parseInt(req.params.id));
    res.json({ success: true, reportPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all phases
router.get('/phases', async (req, res) => {
  try {
    const phases = developmentTracker.getAllPhases();
    res.json({ phases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current phase
router.get('/current-phase', async (req, res) => {
  try {
    const phase = developmentTracker.getCurrentPhase();
    res.json({ phase });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;