import { Router } from "express";
import { RookieAgentService } from "../services/rookie-agent-service";

const router = Router();
const rookieAgentService = RookieAgentService.getInstance();

// Get Rookie Agent dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await rookieAgentService.getDashboardData();
    res.json(dashboard);
  } catch (error) {
    console.error('Rookie Agent dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get business domain data for screens
router.get('/business-domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const domainData = await rookieAgentService.getBusinessDomainData(domain);
    res.json(domainData);
  } catch (error) {
    console.error('Business domain data error:', error);
    res.status(500).json({ error: 'Failed to fetch business domain data' });
  }
});

// Search posted data across screens/UI
router.get('/search/:domain/:searchTerm', async (req, res) => {
  try {
    const { domain, searchTerm } = req.params;
    const searchResults = await rookieAgentService.searchDomainData(domain, searchTerm);
    res.json(searchResults);
  } catch (error) {
    console.error('Domain search error:', error);
    res.status(500).json({ error: 'Failed to search domain data' });
  }
});

// Get training materials for specific domain
router.get('/training/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const trainingData = await rookieAgentService.getTrainingMaterials(domain);
    res.json(trainingData);
  } catch (error) {
    console.error('Training materials error:', error);
    res.status(500).json({ error: 'Failed to fetch training materials' });
  }
});

// Submit data entry validation request
router.post('/validate-entry', async (req, res) => {
  try {
    const validationResult = await rookieAgentService.validateDataEntry(req.body);
    res.json(validationResult);
  } catch (error) {
    console.error('Data entry validation error:', error);
    res.status(500).json({ error: 'Failed to validate data entry' });
  }
});

// Get quality check guidelines
router.get('/quality-checks/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const qualityChecks = await rookieAgentService.getQualityChecks(domain);
    res.json(qualityChecks);
  } catch (error) {
    console.error('Quality checks error:', error);
    res.status(500).json({ error: 'Failed to fetch quality checks' });
  }
});

export default router;