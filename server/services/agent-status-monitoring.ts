/**
 * Agent Status Monitoring Service
 * Automated status reporting system for Player Agents
 * - Red: Immediate updates (1 second) for critical issues
 * - Amber: Priority updates for ongoing resolution efforts
 * - Green: 4-hourly routine status updates
 */

import { db } from "../db";
import { 
  playerAgentStatusUpdates, 
  playerCoachCommunications,
  type UpsertPlayerAgentStatusUpdate,
  type PlayerAgentStatusUpdate 
} from "@shared/coach-agent-schema";
// Remove unused import
import { eq, and, desc } from "drizzle-orm";

interface StatusReportData {
  playerAgentId: string;
  businessDomain: string;
  statusLevel: 'green' | 'amber' | 'red';
  statusDescription: string;
  issuesIdentified?: any[];
  resolutionProgress?: string;
  businessImpact?: 'low' | 'medium' | 'high' | 'critical';
  estimatedResolutionTime?: string;
  requiresCoachIntervention?: boolean;
}

class AgentStatusMonitoringService {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private redStatusQueue: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize monitoring for a Player Agent
   */
  async initializeAgentMonitoring(playerAgentId: string, businessDomain: string) {
    console.log(`Initializing status monitoring for Player Agent: ${playerAgentId} (${businessDomain})`);
    
    // Set up 4-hourly green status updates
    const greenInterval = setInterval(async () => {
      await this.checkAndSendGreenStatus(playerAgentId, businessDomain);
    }, 4 * 60 * 60 * 1000); // 4 hours

    this.monitoringIntervals.set(playerAgentId, greenInterval);

    // Send initial status
    await this.sendStatusUpdate({
      playerAgentId,
      businessDomain,
      statusLevel: 'green',
      statusDescription: 'Agent monitoring initialized - All systems operational',
      businessImpact: 'low'
    });
  }

  /**
   * Send immediate Red status (critical issues)
   */
  async sendRedStatus(reportData: StatusReportData) {
    if (reportData.statusLevel !== 'red') {
      throw new Error('Invalid status level for red alert');
    }

    console.log(`🔴 RED STATUS ALERT: ${reportData.playerAgentId} - ${reportData.statusDescription}`);

    const coachAgentId = await this.getCoachAgentId();
    
    // Clear any pending red status updates for this agent
    const existingRedTimeout = this.redStatusQueue.get(reportData.playerAgentId);
    if (existingRedTimeout) {
      clearTimeout(existingRedTimeout);
    }

    // Update consecutive red count
    const lastStatus = await this.getLastStatus(reportData.playerAgentId);
    const consecutiveRedCount = lastStatus?.statusLevel === 'red' 
      ? ((lastStatus.consecutiveRedCount ?? 0) + 1) 
      : 1;

    // Calculate escalation level
    const escalationLevel = consecutiveRedCount >= 3 ? 2 : (consecutiveRedCount >= 2 ? 1 : 0);

    // Create status update with immediate priority
    const statusUpdate: UpsertPlayerAgentStatusUpdate = {
      playerAgentId: reportData.playerAgentId,
      coachAgentId,
      statusLevel: 'red',
      businessDomain: reportData.businessDomain,
      statusDescription: reportData.statusDescription,
      issuesIdentified: reportData.issuesIdentified || [],
      resolutionProgress: reportData.resolutionProgress,
      businessImpact: reportData.businessImpact || 'critical',
      estimatedResolutionTime: reportData.estimatedResolutionTime,
      requiresCoachIntervention: reportData.requiresCoachIntervention ?? true,
      automaticUpdate: true,
      nextUpdateDue: new Date(Date.now() + 1000), // Next update in 1 second
      consecutiveRedCount,
      escalationLevel
    };

    await db.insert(playerAgentStatusUpdates).values(statusUpdate);

    // Send immediate communication to Coach
    await this.notifyCoachImmediate(reportData, escalationLevel);

    // Schedule next red status check in 1 second if issue persists
    const redTimeout = setTimeout(async () => {
      await this.checkRedStatusPersistence(reportData.playerAgentId);
    }, 1000);

    this.redStatusQueue.set(reportData.playerAgentId, redTimeout);
  }

  /**
   * Send Amber status (priority issues being resolved)
   */
  async sendAmberStatus(reportData: StatusReportData) {
    if (reportData.statusLevel !== 'amber') {
      throw new Error('Invalid status level for amber alert');
    }

    console.log(`🟡 AMBER STATUS: ${reportData.playerAgentId} - ${reportData.statusDescription}`);

    const coachAgentId = await this.getCoachAgentId();

    const statusUpdate: UpsertPlayerAgentStatusUpdate = {
      playerAgentId: reportData.playerAgentId,
      coachAgentId,
      statusLevel: 'amber',
      businessDomain: reportData.businessDomain,
      statusDescription: reportData.statusDescription,
      issuesIdentified: reportData.issuesIdentified || [],
      resolutionProgress: reportData.resolutionProgress || 'Issue resolution in progress',
      businessImpact: reportData.businessImpact || 'medium',
      estimatedResolutionTime: reportData.estimatedResolutionTime,
      requiresCoachIntervention: reportData.requiresCoachIntervention ?? false,
      automaticUpdate: true,
      nextUpdateDue: new Date(Date.now() + 30 * 60 * 1000), // Next update in 30 minutes
      consecutiveRedCount: 0,
      escalationLevel: 0
    };

    await db.insert(playerAgentStatusUpdates).values(statusUpdate);

    // Notify Coach with priority level
    await this.notifyCoachPriority(reportData);
  }

  /**
   * Send Green status (normal operations)
   */
  async sendGreenStatus(reportData: StatusReportData) {
    if (reportData.statusLevel !== 'green') {
      throw new Error('Invalid status level for green status');
    }

    console.log(`🟢 GREEN STATUS: ${reportData.playerAgentId} - ${reportData.statusDescription}`);

    const coachAgentId = await this.getCoachAgentId();

    const statusUpdate: UpsertPlayerAgentStatusUpdate = {
      playerAgentId: reportData.playerAgentId,
      coachAgentId,
      statusLevel: 'green',
      businessDomain: reportData.businessDomain,
      statusDescription: reportData.statusDescription,
      issuesIdentified: [],
      resolutionProgress: null,
      businessImpact: 'low',
      estimatedResolutionTime: null,
      requiresCoachIntervention: false,
      automaticUpdate: true,
      nextUpdateDue: new Date(Date.now() + 4 * 60 * 60 * 1000), // Next update in 4 hours
      lastGreenStatus: new Date(),
      consecutiveRedCount: 0,
      escalationLevel: 0
    };

    await db.insert(playerAgentStatusUpdates).values(statusUpdate);
  }

  /**
   * Generic status update method
   */
  async sendStatusUpdate(reportData: StatusReportData) {
    switch (reportData.statusLevel) {
      case 'red':
        await this.sendRedStatus(reportData);
        break;
      case 'amber':
        await this.sendAmberStatus(reportData);
        break;
      case 'green':
        await this.sendGreenStatus(reportData);
        break;
      default:
        throw new Error(`Invalid status level: ${reportData.statusLevel}`);
    }
  }

  /**
   * Check for automatic green status updates
   */
  private async checkAndSendGreenStatus(playerAgentId: string, businessDomain: string) {
    const lastStatus = await this.getLastStatus(playerAgentId);
    
    // Only send green if current status is not red or amber
    if (!lastStatus || lastStatus.statusLevel === 'green') {
      await this.sendGreenStatus({
        playerAgentId,
        businessDomain,
        statusLevel: 'green',
        statusDescription: 'Routine 4-hourly status update - Operations normal',
        businessImpact: 'low'
      });
    }
  }

  /**
   * Check if red status persists and needs escalation
   */
  private async checkRedStatusPersistence(playerAgentId: string) {
    const lastStatus = await this.getLastStatus(playerAgentId);
    
    if (lastStatus?.statusLevel === 'red') {
      console.log(`Red status persists for ${playerAgentId}, escalating...`);
      
      // Auto-escalate if red status continues
      const escalatedReport: StatusReportData = {
        playerAgentId,
        businessDomain: lastStatus.businessDomain,
        statusLevel: 'red',
        statusDescription: `ESCALATED: ${lastStatus.statusDescription} - Issue persists after ${(lastStatus.consecutiveRedCount ?? 0) + 1} alerts`,
        issuesIdentified: lastStatus.issuesIdentified as any[],
        resolutionProgress: lastStatus.resolutionProgress || 'No progress reported',
        businessImpact: 'critical',
        requiresCoachIntervention: true
      };

      await this.sendRedStatus(escalatedReport);
    }
  }

  /**
   * Immediate notification to Coach for red status
   */
  private async notifyCoachImmediate(reportData: StatusReportData, escalationLevel: number) {
    const coachAgentId = await this.getCoachAgentId();
    
    const urgencyLevel = escalationLevel >= 2 ? 'critical' : 'high';
    const subject = escalationLevel >= 2 
      ? `🚨 CRITICAL ESCALATION: ${reportData.businessDomain.toUpperCase()}`
      : `🔴 IMMEDIATE ACTION REQUIRED: ${reportData.businessDomain.toUpperCase()}`;

    await db.insert(playerCoachCommunications).values({
      playerAgentId: reportData.playerAgentId,
      coachAgentId,
      communicationType: 'status_report',
      subject,
      message: `IMMEDIATE INTERVENTION REQUIRED\n\nStatus: ${reportData.statusDescription}\n\nBusiness Impact: ${reportData.businessImpact}\n\nIssues: ${JSON.stringify(reportData.issuesIdentified, null, 2)}\n\nResolution Progress: ${reportData.resolutionProgress || 'No progress reported'}\n\nEstimated Resolution: ${reportData.estimatedResolutionTime || 'Unknown'}`,
      businessContext: {
        domain: reportData.businessDomain,
        severity: 'critical',
        escalationLevel,
        requiresIntervention: true
      },
      urgencyLevel,
      responseRequired: true
    });
  }

  /**
   * Priority notification to Coach for amber status
   */
  private async notifyCoachPriority(reportData: StatusReportData) {
    const coachAgentId = await this.getCoachAgentId();

    await db.insert(playerCoachCommunications).values({
      playerAgentId: reportData.playerAgentId,
      coachAgentId,
      communicationType: 'status_report',
      subject: `🟡 Priority Issue Resolution: ${reportData.businessDomain.toUpperCase()}`,
      message: `Issue being actively resolved\n\nStatus: ${reportData.statusDescription}\n\nResolution Progress: ${reportData.resolutionProgress}\n\nEstimated Completion: ${reportData.estimatedResolutionTime || 'Working on timeline'}`,
      businessContext: {
        domain: reportData.businessDomain,
        severity: 'medium',
        inProgress: true
      },
      urgencyLevel: 'normal',
      responseRequired: false
    });
  }

  /**
   * Get the last status for a player agent
   */
  private async getLastStatus(playerAgentId: string): Promise<PlayerAgentStatusUpdate | undefined> {
    const [lastStatus] = await db
      .select()
      .from(playerAgentStatusUpdates)
      .where(eq(playerAgentStatusUpdates.playerAgentId, playerAgentId))
      .orderBy(desc(playerAgentStatusUpdates.createdAt))
      .limit(1);

    return lastStatus;
  }

  /**
   * Get Coach Agent ID (assuming single coach for now)
   */
  private async getCoachAgentId(): Promise<string> {
    // For demo purposes, return a fixed coach ID
    // In production, this would query the actual coach agent
    return "0dbd4201-e841-4157-8aac-d2fff7494731";
  }

  /**
   * Stop monitoring for a Player Agent
   */
  stopAgentMonitoring(playerAgentId: string) {
    const interval = this.monitoringIntervals.get(playerAgentId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(playerAgentId);
    }

    const redTimeout = this.redStatusQueue.get(playerAgentId);
    if (redTimeout) {
      clearTimeout(redTimeout);
      this.redStatusQueue.delete(playerAgentId);
    }

    console.log(`Stopped monitoring for Player Agent: ${playerAgentId}`);
  }

  /**
   * Get current status overview for all agents
   */
  async getStatusOverview() {
    const statusUpdates = await db
      .select()
      .from(playerAgentStatusUpdates)
      .orderBy(desc(playerAgentStatusUpdates.createdAt));

    const overview = {
      red: statusUpdates.filter(s => s.statusLevel === 'red').length,
      amber: statusUpdates.filter(s => s.statusLevel === 'amber').length,
      green: statusUpdates.filter(s => s.statusLevel === 'green').length,
      totalAgents: new Set(statusUpdates.map(s => s.playerAgentId)).size,
      lastUpdated: new Date()
    };

    return overview;
  }
}

// Export singleton instance
export const agentStatusMonitoring = new AgentStatusMonitoringService();

// Export types for external use
export type { StatusReportData };