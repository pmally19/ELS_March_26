import express from 'express';
import { AgentPlayerService } from '../services/agent-player-service';
import { db } from '../db';
import { agentPlayers, agentPlayerValidations, agentPlayerInteractions, agentPlayerReports } from '@shared/agent-player-schema';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();
const agentPlayerService = new AgentPlayerService();

// Initialize Agent Players
router.post('/initialize', async (req, res) => {
  try {
    const result = await agentPlayerService.initializeAgentPlayers();
    res.json(result);
  } catch (error) {
    console.error('Error initializing Agent Players:', error);
    res.status(500).json({ error: 'Failed to initialize Agent Players' });
  }
});

// Get all Agent Players
router.get('/', async (req, res) => {
  try {
    const players = await db.select().from(agentPlayers).where(eq(agentPlayers.isActive, true));
    res.json(players);
  } catch (error) {
    console.error('Error fetching Agent Players:', error);
    res.status(500).json({ error: 'Failed to fetch Agent Players' });
  }
});

// Get Agent Player by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await db.select().from(agentPlayers).where(eq(agentPlayers.id, id)).limit(1);
    
    if (!player.length) {
      return res.status(404).json({ error: 'Agent Player not found' });
    }

    const validations = await db.select()
      .from(agentPlayerValidations)
      .where(eq(agentPlayerValidations.playerId, id))
      .orderBy(desc(agentPlayerValidations.lastChecked));

    const interactions = await db.select()
      .from(agentPlayerInteractions)
      .where(eq(agentPlayerInteractions.initiatorPlayerId, id))
      .orderBy(desc(agentPlayerInteractions.createdAt))
      .limit(10);

    const reports = await db.select()
      .from(agentPlayerReports)
      .where(eq(agentPlayerReports.playerId, id))
      .orderBy(desc(agentPlayerReports.generatedAt))
      .limit(5);

    res.json({
      player: player[0],
      validations,
      interactions,
      reports
    });
  } catch (error) {
    console.error('Error fetching Agent Player details:', error);
    res.status(500).json({ error: 'Failed to fetch Agent Player details' });
  }
});

// Validate domain configuration
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const validations = await agentPlayerService.validateDomainConfiguration(id);
    res.json({ validations, message: 'Configuration validation completed' });
  } catch (error) {
    console.error('Error validating domain configuration:', error);
    res.status(500).json({ error: 'Failed to validate domain configuration' });
  }
});

// Exchange business information between players
router.post('/exchange', async (req, res) => {
  try {
    const { initiatorId, targetId, businessContext, data } = req.body;
    
    if (!initiatorId || !targetId || !businessContext) {
      return res.status(400).json({ error: 'Missing required fields for business exchange' });
    }

    const result = await agentPlayerService.exchangeBusinessInformation(
      initiatorId, 
      targetId, 
      businessContext, 
      data
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error exchanging business information:', error);
    res.status(500).json({ error: 'Failed to exchange business information' });
  }
});

// Generate compliance report
router.post('/:id/compliance-report', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await agentPlayerService.generateComplianceReport(id);
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

// Get players by business domain
router.get('/domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const players = await agentPlayerService.getPlayersByDomain(domain);
    res.json(players);
  } catch (error) {
    console.error('Error fetching players by domain:', error);
    res.status(500).json({ error: 'Failed to fetch players by domain' });
  }
});

// Get cross-domain interactions for a player
router.get('/:id/interactions', async (req, res) => {
  try {
    const { id } = req.params;
    const interactions = await agentPlayerService.getCrossDomainInteractions(id);
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching cross-domain interactions:', error);
    res.status(500).json({ error: 'Failed to fetch cross-domain interactions' });
  }
});

// Trigger cross-domain synchronization
router.post('/sync-domains', async (req, res) => {
  try {
    const { domains, syncType } = req.body;
    
    // Get all active players for specified domains
    const players = await db.select()
      .from(agentPlayers)
      .where(eq(agentPlayers.isActive, true));
    
    const targetPlayers = players.filter(p => domains.includes(p.businessDomain));
    
    const syncResults = [];
    
    // Trigger validations for each player
    for (const player of targetPlayers) {
      try {
        const validations = await agentPlayerService.validateDomainConfiguration(player.id);
        syncResults.push({
          playerId: player.id,
          domain: player.businessDomain,
          status: 'success',
          validationCount: validations.length
        });
      } catch (error) {
        syncResults.push({
          playerId: player.id,
          domain: player.businessDomain,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Cross-domain synchronization completed',
      syncType,
      results: syncResults
    });
  } catch (error) {
    console.error('Error in cross-domain synchronization:', error);
    res.status(500).json({ error: 'Failed to complete cross-domain synchronization' });
  }
});

// Get configuration standards for a domain
router.get('/:id/standards', async (req, res) => {
  try {
    const { id } = req.params;
    
    const player = await db.select().from(agentPlayers).where(eq(agentPlayers.id, id)).limit(1);
    
    if (!player.length) {
      return res.status(404).json({ error: 'Agent Player not found' });
    }

    res.json({
      playerId: id,
      businessDomain: player[0].businessDomain,
      standardsFramework: player[0].standardsFramework,
      configurationAccess: player[0].configurationAccess,
      neighborDomains: player[0].neighborDomains
    });
  } catch (error) {
    console.error('Error fetching configuration standards:', error);
    res.status(500).json({ error: 'Failed to fetch configuration standards' });
  }
});

export default router;