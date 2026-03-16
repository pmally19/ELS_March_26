import { db } from "../db";
import { 
  coachAgents, 
  agentAccessControls, 
  changeRequests, 
  coachDecisions, 
  playerCoachCommunications,
  type CoachAgent,
  type AgentAccessControl,
  type ChangeRequest,
  type CoachDecision,
  type PlayerCoachCommunication,
  type UpsertCoachAgent,
  type UpsertAgentAccessControl,
  type UpsertChangeRequest,
  type UpsertCoachDecision,
  type UpsertPlayerCoachCommunication
} from "@shared/coach-agent-schema";
import { agentPlayers } from "@shared/agent-player-schema";
import { eq, and, desc } from "drizzle-orm";

export class CoachAgentService {
  
  // Initialize default Coach Agent and set up access controls
  async initializeCoachAgent(): Promise<CoachAgent> {
    const existingCoach = await db.select().from(coachAgents).where(eq(coachAgents.role, 'system_coach')).limit(1);
    
    if (existingCoach.length > 0) {
      return existingCoach[0];
    }

    const coachData: UpsertCoachAgent = {
      name: "System Coach Agent",
      role: "system_coach",
      responsibilities: {
        oversight: [
          "Monitor all Player Agent activities",
          "Review and approve configuration change requests",
          "Provide cross-domain business justification",
          "Ensure enterprise-wide consistency",
          "Manage agent access controls",
          "Coordinate inter-domain business processes"
        ],
        decisionMaking: [
          "Approve/reject data modification requests",
          "Authorize UI changes based on business impact",
          "Set configuration standards across domains",
          "Resolve cross-domain conflicts",
          "Establish compliance policies"
        ],
        communication: [
          "Provide guidance to Player Agents",
          "Explain cross-domain implications",
          "Document decision rationale",
          "Facilitate business domain coordination"
        ]
      },
      oversightScope: {
        businessDomains: ["sales", "finance", "inventory", "procurement", "manufacturing", "controlling"],
        systemComponents: ["database", "ui", "configuration", "master_data", "transactions"],
        crossDomainProcesses: ["order_to_cash", "procure_to_pay", "plan_to_produce", "record_to_report"]
      },
      decisionAuthority: {
        dataChanges: {
          level: "full_authority",
          scope: "all_business_domains",
          requiresJustification: true
        },
        uiModifications: {
          level: "full_authority", 
          scope: "all_interfaces",
          requiresBusinessCase: true
        },
        configurationChanges: {
          level: "full_authority",
          scope: "enterprise_wide",
          requiresCrossDomainAnalysis: true
        },
        accessControlManagement: {
          level: "exclusive_authority",
          scope: "all_agents",
          adminOnly: true
        }
      },
      crossDomainKnowledge: {
        salesFinanceIntegration: {
          processes: ["revenue_recognition", "credit_management", "pricing_controls"],
          keyIntegrationPoints: ["customer_master", "payment_terms", "credit_limits"]
        },
        inventoryFinanceIntegration: {
          processes: ["valuation_methods", "cost_allocation", "variance_analysis"],
          keyIntegrationPoints: ["material_master", "standard_costs", "inventory_accounts"]
        },
        procurementFinanceIntegration: {
          processes: ["three_way_matching", "accrual_accounting", "vendor_payments"],
          keyIntegrationPoints: ["vendor_master", "purchase_commitments", "ap_accounts"]
        },
        manufacturingIntegration: {
          processes: ["cost_absorption", "wip_valuation", "capacity_planning"],
          keyIntegrationPoints: ["bom_costing", "work_centers", "production_orders"]
        },
        controllingIntegration: {
          processes: ["profitability_analysis", "cost_center_accounting", "internal_orders"],
          keyIntegrationPoints: ["all_business_domains"]
        }
      }
    };

    const [newCoach] = await db.insert(coachAgents).values(coachData).returning();

    // Set up access controls for the coach (full privileges)
    await this.setupCoachAccessControls(newCoach.id);
    
    // Restrict all existing player agents
    await this.setupPlayerAccessRestrictions();

    return newCoach;
  }

  // Set up Coach Agent access controls (full privileges)
  private async setupCoachAccessControls(coachId: string): Promise<void> {
    const coachAccessData: UpsertAgentAccessControl = {
      agentId: coachId,
      agentType: "coach",
      canDeleteData: true,
      canUpdateData: true,
      canModifyUI: true,
      canCreateTables: true,
      restrictedDomains: [],
      approvalRequired: false,
      accessValidFrom: new Date(),
      accessValidTo: null, // Permanent access for coach
      lastModifiedBy: "system",
      modificationReason: "Initial coach setup with full system privileges",
      businessJustification: "Coach Agent requires unrestricted access to oversee all Player Agent activities, approve change requests, and maintain enterprise-wide consistency across all business domains.",
      riskAssessment: "Low risk - Coach Agent is designed for oversight and governance. Access is permanent and necessary for system operation.",
      automaticRevocation: false,
      notificationSent: false
    };

    await db.insert(agentAccessControls).values(coachAccessData);
  }

  // Set up Player Agent access restrictions (no direct changes allowed)
  private async setupPlayerAccessRestrictions(): Promise<void> {
    const players = await db.select().from(agentPlayers);
    
    for (const player of players) {
      const playerAccessData: UpsertAgentAccessControl = {
        agentId: player.id,
        agentType: "player",
        canDeleteData: false,
        canUpdateData: false,
        canModifyUI: false,
        canCreateTables: false,
        restrictedDomains: [],
        approvalRequired: true,
        accessValidFrom: new Date(),
        accessValidTo: null, // Permanent restrictions
        lastModifiedBy: "coach",
        modificationReason: "Default player restrictions - all changes require coach approval",
        businessJustification: `${player.name} is restricted from direct data/UI modifications to ensure proper oversight and enterprise-wide consistency. All changes must be approved through Coach Agent.`,
        riskAssessment: "High risk if unrestricted - Player Agents could make uncoordinated changes affecting multiple business domains without proper cross-domain impact analysis.",
        automaticRevocation: false,
        notificationSent: false
      };

      await db.insert(agentAccessControls).values(playerAccessData).onConflictDoNothing();
    }
  }

  // Player Agent requests a change through Coach
  async submitChangeRequest(requestData: UpsertChangeRequest): Promise<ChangeRequest> {
    // Validate that the requesting agent has restricted access
    const agentAccess = await this.checkAgentAccess(requestData.requestingAgentId!);
    
    if (!agentAccess?.approvalRequired) {
      throw new Error("Agent already has direct access - change request not required");
    }

    const [newRequest] = await db.insert(changeRequests).values({
      ...requestData,
      status: "pending"
    }).returning();

    // Notify coach about the new request
    await this.notifyCoachOfRequest(newRequest);

    return newRequest;
  }

  // Coach reviews and decides on change request
  async reviewChangeRequest(
    requestId: string, 
    coachId: string, 
    decision: 'approved' | 'rejected',
    justification: string,
    crossDomainAnalysis: any,
    implementationPlan?: any
  ): Promise<ChangeRequest> {
    
    const coachDecisionText = `Coach Decision: ${decision.toUpperCase()}\n\nJustification: ${justification}`;
    
    const [updatedRequest] = await db.update(changeRequests)
      .set({
        status: decision,
        coachDecision: coachDecisionText,
        coachJustification: justification,
        implementationPlan: implementationPlan || null,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(changeRequests.id, requestId))
      .returning();

    // Record the coach decision
    await this.recordCoachDecision(coachId, requestId, decision, justification, crossDomainAnalysis, implementationPlan);

    // If approved, temporarily grant access for implementation
    if (decision === 'approved') {
      await this.grantTemporaryAccess(updatedRequest.requestingAgentId, updatedRequest.requestType);
    }

    return updatedRequest;
  }

  // Record Coach decision with cross-domain analysis
  private async recordCoachDecision(
    coachId: string,
    requestId: string,
    decision: string,
    justification: string,
    crossDomainAnalysis: any,
    implementationPlan?: any
  ): Promise<CoachDecision> {
    
    const decisionData: UpsertCoachDecision = {
      coachAgentId: coachId,
      changeRequestId: requestId,
      decisionType: 'change_approval',
      decisionSummary: `${decision.toUpperCase()}: ${justification}`,
      crossDomainAnalysis: crossDomainAnalysis,
      projectJustification: justification,
      affectedDomains: crossDomainAnalysis.affectedDomains || [],
      riskMitigation: crossDomainAnalysis.riskMitigation || {},
      implementationGuidance: implementationPlan ? JSON.stringify(implementationPlan) : null,
      followUpRequired: decision === 'approved',
      followUpDate: decision === 'approved' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null, // 7 days
      decisionImpact: crossDomainAnalysis.impact || 'medium'
    };

    const [newDecision] = await db.insert(coachDecisions).values(decisionData).returning();
    return newDecision;
  }

  // Grant temporary access for approved changes
  private async grantTemporaryAccess(agentId: string, requestType: string): Promise<void> {
    // Calculate access expiration (72 hours from now)
    const accessValidTo = new Date();
    accessValidTo.setHours(accessValidTo.getHours() + 72);
    
    const accessUpdates: Partial<UpsertAgentAccessControl> = {
      accessValidFrom: new Date(),
      accessValidTo: accessValidTo,
      lastModifiedBy: "coach",
      modificationReason: `Temporary access granted for approved ${requestType}`,
      businessJustification: `Coach-approved temporary access for ${requestType} implementation. Agent requires modification capabilities to execute approved changes with business justification and cross-domain impact analysis.`,
      riskAssessment: `Medium risk - Time-limited access (72 hours) with automatic expiration. Changes are pre-approved with implementation plan and rollback procedures.`,
      automaticRevocation: true,
      notificationSent: false,
      updatedAt: new Date()
    };

    if (requestType.includes('data')) {
      accessUpdates.canUpdateData = true;
      if (requestType.includes('delete')) {
        accessUpdates.canDeleteData = true;
      }
    }

    if (requestType.includes('ui')) {
      accessUpdates.canModifyUI = true;
    }

    await db.update(agentAccessControls)
      .set(accessUpdates)
      .where(eq(agentAccessControls.agentId, agentId));
  }

  // Check agent access permissions
  async checkAgentAccess(agentId: string): Promise<AgentAccessControl | null> {
    const [access] = await db.select()
      .from(agentAccessControls)
      .where(eq(agentAccessControls.agentId, agentId))
      .limit(1);

    return access || null;
  }

  // Player communicates with Coach
  async sendCommunicationToCoach(communicationData: UpsertPlayerCoachCommunication): Promise<PlayerCoachCommunication> {
    const [newCommunication] = await db.insert(playerCoachCommunications)
      .values({
        ...communicationData,
        status: "sent"
      })
      .returning();

    return newCommunication;
  }

  // Coach responds to Player communication
  async respondToCommunication(
    communicationId: string,
    coachResponse: string,
    guidance: string
  ): Promise<PlayerCoachCommunication> {
    
    const [updatedCommunication] = await db.update(playerCoachCommunications)
      .set({
        coachResponse: coachResponse,
        responseGuidance: guidance,
        status: "responded",
        respondedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(playerCoachCommunications.id, communicationId))
      .returning();

    return updatedCommunication;
  }

  // Get all pending change requests for Coach review
  async getPendingChangeRequests(coachId: string): Promise<ChangeRequest[]> {
    return await db.select()
      .from(changeRequests)
      .where(and(
        eq(changeRequests.coachAgentId, coachId),
        eq(changeRequests.status, "pending")
      ))
      .orderBy(desc(changeRequests.createdAt));
  }

  // Get Coach dashboard data
  async getCoachDashboard(coachId: string): Promise<any> {
    const pendingRequests = await this.getPendingChangeRequests(coachId);
    
    const recentDecisions = await db.select()
      .from(coachDecisions)
      .where(eq(coachDecisions.coachAgentId, coachId))
      .orderBy(desc(coachDecisions.createdAt))
      .limit(10);

    const pendingCommunications = await db.select()
      .from(playerCoachCommunications)
      .where(and(
        eq(playerCoachCommunications.coachAgentId, coachId),
        eq(playerCoachCommunications.status, "sent")
      ))
      .orderBy(desc(playerCoachCommunications.createdAt));

    const agentAccessSummary = await db.select()
      .from(agentAccessControls)
      .orderBy(agentAccessControls.agentType);

    return {
      pendingRequests: pendingRequests.length,
      pendingCommunications: pendingCommunications.length,
      recentDecisions: recentDecisions.length,
      requests: pendingRequests,
      decisions: recentDecisions,
      communications: pendingCommunications,
      accessControls: agentAccessSummary
    };
  }

  // Notify coach about new request (internal notification)
  private async notifyCoachOfRequest(request: ChangeRequest): Promise<void> {
    // This could be extended to send actual notifications
    console.log(`Coach notification: New ${request.requestType} request from ${request.businessDomain} domain`);
  }

  // Get all Coach Agents
  async getAllCoaches(): Promise<CoachAgent[]> {
    return await db.select().from(coachAgents).where(eq(coachAgents.isActive, true));
  }

  // Get specific Coach Agent
  async getCoachById(id: string): Promise<CoachAgent | null> {
    const [coach] = await db.select().from(coachAgents).where(eq(coachAgents.id, id)).limit(1);
    return coach || null;
  }

  // Update agent access controls with timestamp ranges and detailed reasoning
  async updateAgentAccess(
    agentId: string, 
    permissions: {
      canDeleteData?: boolean;
      canUpdateData?: boolean;
      canModifyUI?: boolean;
      canCreateTables?: boolean;
    },
    accessDetails: {
      validFrom: Date;
      validTo?: Date;
      modificationReason: string;
      businessJustification: string;
      riskAssessment: string;
      automaticRevocation?: boolean;
    },
    modifiedBy: string = "coach"
  ): Promise<AgentAccessControl> {
    const updateData: Partial<UpsertAgentAccessControl> = {
      ...permissions,
      accessValidFrom: accessDetails.validFrom,
      accessValidTo: accessDetails.validTo || null,
      lastModifiedBy: modifiedBy,
      modificationReason: accessDetails.modificationReason,
      businessJustification: accessDetails.businessJustification,
      riskAssessment: accessDetails.riskAssessment,
      automaticRevocation: accessDetails.automaticRevocation || false,
      notificationSent: false,
      updatedAt: new Date()
    };

    const [updatedAccess] = await db
      .update(agentAccessControls)
      .set(updateData)
      .where(eq(agentAccessControls.agentId, agentId))
      .returning();

    return updatedAccess;
  }

  // Revoke temporary access after implementation
  async revokeTemporaryAccess(agentId: string, reason: string): Promise<void> {
    await db.update(agentAccessControls)
      .set({
        canDeleteData: false,
        canUpdateData: false,
        canModifyUI: false,
        accessValidTo: new Date(), // Expire access immediately
        lastModifiedBy: "coach",
        modificationReason: `Access revoked: ${reason}`,
        businessJustification: `Emergency access revocation due to: ${reason}. Immediate security measure to prevent unauthorized changes.`,
        riskAssessment: `High priority revocation - Access terminated to mitigate potential security or business impact.`,
        automaticRevocation: false,
        notificationSent: false,
        updatedAt: new Date()
      })
      .where(eq(agentAccessControls.agentId, agentId));
  }

  // Get change request history
  async getChangeRequestHistory(agentId?: string): Promise<ChangeRequest[]> {
    const query = db.select().from(changeRequests);
    
    if (agentId) {
      return await query.where(eq(changeRequests.requestingAgentId, agentId))
        .orderBy(desc(changeRequests.createdAt));
    }
    
    return await query.orderBy(desc(changeRequests.createdAt));
  }
}