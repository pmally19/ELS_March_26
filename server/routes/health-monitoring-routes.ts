/**
 * Health Monitoring API Routes
 * Provides comprehensive application health metrics for Coach Agent dashboard
 */

import { Router } from "express";
import { applicationHealthMonitor } from "../services/application-health-monitor";
// Remove auth for now - will add back when needed
// import { isAuthenticated } from "../replitAuth";

const router = Router();

/**
 * Get comprehensive application health metrics
 */
router.get("/comprehensive-health", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics);
  } catch (error) {
    console.error("Error fetching comprehensive health metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch health metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get business domain health overview
 */
router.get("/business-domains", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics.businessDomains);
  } catch (error) {
    console.error("Error fetching business domain health:", error);
    res.status(500).json({ 
      error: "Failed to fetch business domain health",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get data integrity metrics
 */
router.get("/data-integrity", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics.dataIntegrity);
  } catch (error) {
    console.error("Error fetching data integrity metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch data integrity metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get agent health metrics
 */
router.get("/agent-health", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics.agentHealth);
  } catch (error) {
    console.error("Error fetching agent health metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch agent health metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get user activity metrics
 */
router.get("/user-activity", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics.userActivity);
  } catch (error) {
    console.error("Error fetching user activity metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch user activity metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get system overview metrics
 */
router.get("/system-overview", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    res.json(healthMetrics.systemOverview);
  } catch (error) {
    console.error("Error fetching system overview metrics:", error);
    res.status(500).json({ 
      error: "Failed to fetch system overview metrics",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get health metrics for specific business domain
 */
router.get("/business-domains/:domain", async (req, res) => {
  try {
    const { domain } = req.params;
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    
    const domainHealth = healthMetrics.businessDomains.find(d => d.domain === domain);
    if (!domainHealth) {
      return res.status(404).json({ error: "Business domain not found" });
    }
    
    res.json(domainHealth);
  } catch (error) {
    console.error(`Error fetching health for domain ${req.params.domain}:`, error);
    res.status(500).json({ 
      error: "Failed to fetch domain health",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * Get real-time health status summary
 */
router.get("/status-summary", async (req, res) => {
  try {
    const healthMetrics = await applicationHealthMonitor.getComprehensiveHealthMetrics();
    
    // Calculate summary statistics
    const businessDomainsHealthy = healthMetrics.businessDomains.filter(d => d.status === 'healthy').length;
    const businessDomainsWarning = healthMetrics.businessDomains.filter(d => d.status === 'warning').length;
    const businessDomainsCritical = healthMetrics.businessDomains.filter(d => d.status === 'critical').length;
    
    const summary = {
      timestamp: healthMetrics.timestamp,
      overallHealth: healthMetrics.systemOverview.overallHealth,
      businessDomains: {
        total: healthMetrics.businessDomains.length,
        healthy: businessDomainsHealthy,
        warning: businessDomainsWarning,
        critical: businessDomainsCritical
      },
      dataIntegrity: {
        score: healthMetrics.dataIntegrity.overallScore,
        status: healthMetrics.dataIntegrity.overallScore >= 90 ? 'excellent' : 
                healthMetrics.dataIntegrity.overallScore >= 80 ? 'good' : 
                healthMetrics.dataIntegrity.overallScore >= 70 ? 'fair' : 'poor'
      },
      agents: {
        total: healthMetrics.agentHealth.totalAgents,
        active: healthMetrics.agentHealth.activeAgents,
        healthy: healthMetrics.agentHealth.healthyAgents,
        statusDistribution: healthMetrics.agentHealth.agentsByStatus
      },
      users: {
        total: healthMetrics.userActivity.totalUsers,
        active: healthMetrics.userActivity.activeUsers,
        sessionHealth: healthMetrics.userActivity.sessionHealth
      },
      system: {
        uptime: healthMetrics.systemOverview.uptime,
        performance: healthMetrics.systemOverview.performanceScore,
        security: healthMetrics.systemOverview.securityScore
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error("Error fetching health status summary:", error);
    res.status(500).json({ 
      error: "Failed to fetch health summary",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;