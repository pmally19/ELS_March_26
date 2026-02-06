/**
 * Agent Status Monitoring API Routes
 * Handles automated status reporting and monitoring for Player Agents
 */

import { Router } from "express";
import { agentStatusMonitoring, type StatusReportData } from "../services/agent-status-monitoring";
import { db } from "../db";
import { playerAgentStatusUpdates, insertPlayerAgentStatusUpdateSchema } from "@shared/coach-agent-schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Send status update (used by Player Agents)
router.post("/status-update", async (req, res) => {
  try {
    const statusData = req.body as StatusReportData;
    
    // Validate required fields
    if (!statusData.playerAgentId || !statusData.businessDomain || !statusData.statusLevel) {
      return res.status(400).json({ 
        error: "Missing required fields: playerAgentId, businessDomain, statusLevel" 
      });
    }

    // Validate status level
    if (!['green', 'amber', 'red'].includes(statusData.statusLevel)) {
      return res.status(400).json({ 
        error: "Invalid status level. Must be 'green', 'amber', or 'red'" 
      });
    }

    await agentStatusMonitoring.sendStatusUpdate(statusData);

    res.json({ 
      success: true, 
      message: `${statusData.statusLevel.toUpperCase()} status update sent successfully`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error sending status update:", error);
    res.status(500).json({ error: "Failed to send status update" });
  }
});

// Initialize monitoring for a Player Agent
router.post("/initialize-monitoring", async (req, res) => {
  try {
    const { playerAgentId, businessDomain } = req.body;
    
    if (!playerAgentId || !businessDomain) {
      return res.status(400).json({ 
        error: "Missing required fields: playerAgentId, businessDomain" 
      });
    }

    await agentStatusMonitoring.initializeAgentMonitoring(playerAgentId, businessDomain);

    res.json({ 
      success: true, 
      message: "Agent monitoring initialized successfully",
      monitoring: {
        playerAgentId,
        businessDomain,
        greenStatusInterval: "4 hours",
        redStatusAlert: "1 second",
        amberStatusPriority: "30 minutes"
      }
    });
  } catch (error) {
    console.error("Error initializing monitoring:", error);
    res.status(500).json({ error: "Failed to initialize monitoring" });
  }
});

// Stop monitoring for a Player Agent
router.post("/stop-monitoring", async (req, res) => {
  try {
    const { playerAgentId } = req.body;
    
    if (!playerAgentId) {
      return res.status(400).json({ error: "Missing playerAgentId" });
    }

    agentStatusMonitoring.stopAgentMonitoring(playerAgentId);

    res.json({ 
      success: true, 
      message: "Agent monitoring stopped successfully" 
    });
  } catch (error) {
    console.error("Error stopping monitoring:", error);
    res.status(500).json({ error: "Failed to stop monitoring" });
  }
});

// Get status overview for all agents
router.get("/overview", async (req, res) => {
  try {
    const overview = await agentStatusMonitoring.getStatusOverview();
    res.json(overview);
  } catch (error) {
    console.error("Error getting status overview:", error);
    res.status(500).json({ error: "Failed to get status overview" });
  }
});

// Get status history for a specific agent
router.get("/history/:playerAgentId", async (req, res) => {
  try {
    const { playerAgentId } = req.params;
    const { limit = 50 } = req.query;

    const statusHistory = await db
      .select()
      .from(playerAgentStatusUpdates)
      .where(eq(playerAgentStatusUpdates.playerAgentId, playerAgentId))
      .orderBy(desc(playerAgentStatusUpdates.createdAt))
      .limit(Number(limit));

    res.json(statusHistory);
  } catch (error) {
    console.error("Error getting status history:", error);
    res.status(500).json({ error: "Failed to get status history" });
  }
});

// Get current status for all agents
router.get("/current-status", async (req, res) => {
  try {
    // Get latest status for each agent
    const currentStatuses = await db
      .select()
      .from(playerAgentStatusUpdates)
      .orderBy(desc(playerAgentStatusUpdates.createdAt));

    // Group by agent and get most recent
    const latestStatuses = new Map();
    currentStatuses.forEach(status => {
      if (!latestStatuses.has(status.playerAgentId)) {
        latestStatuses.set(status.playerAgentId, status);
      }
    });

    const result = Array.from(latestStatuses.values());
    res.json(result);
  } catch (error) {
    console.error("Error getting current status:", error);
    res.status(500).json({ error: "Failed to get current status" });
  }
});

// Get critical alerts (red status)
router.get("/critical-alerts", async (req, res) => {
  try {
    const criticalAlerts = await db
      .select()
      .from(playerAgentStatusUpdates)
      .where(eq(playerAgentStatusUpdates.statusLevel, 'red'))
      .orderBy(desc(playerAgentStatusUpdates.createdAt))
      .limit(20);

    res.json(criticalAlerts);
  } catch (error) {
    console.error("Error getting critical alerts:", error);
    res.status(500).json({ error: "Failed to get critical alerts" });
  }
});

// Manual status update endpoint for testing
router.post("/manual-update", async (req, res) => {
  try {
    const { 
      playerAgentId, 
      businessDomain, 
      statusLevel, 
      description,
      issuesIdentified,
      resolutionProgress,
      businessImpact,
      requiresCoachIntervention 
    } = req.body;

    const statusData: StatusReportData = {
      playerAgentId,
      businessDomain,
      statusLevel,
      statusDescription: description,
      issuesIdentified: issuesIdentified || [],
      resolutionProgress,
      businessImpact: businessImpact || 'medium',
      requiresCoachIntervention: requiresCoachIntervention || false
    };

    await agentStatusMonitoring.sendStatusUpdate(statusData);

    res.json({ 
      success: true, 
      message: "Manual status update sent successfully",
      statusData 
    });
  } catch (error) {
    console.error("Error sending manual status update:", error);
    res.status(500).json({ error: "Failed to send manual status update" });
  }
});

export default router;