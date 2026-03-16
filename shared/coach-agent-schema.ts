import { pgTable, text, varchar, timestamp, jsonb, boolean, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Coach Agent - Central oversight for all Player Agent activities
export const coachAgents = pgTable("coach_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("system_coach"),
  responsibilities: jsonb("responsibilities").notNull(),
  oversightScope: jsonb("oversight_scope").notNull(), // Which domains and systems coach oversees
  decisionAuthority: jsonb("decision_authority").notNull(), // What types of decisions coach can make
  crossDomainKnowledge: jsonb("cross_domain_knowledge").notNull(), // Understanding of business domain interactions
  status: varchar("status", { length: 20 }).notNull().default("active"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Agent Access Controls - Controls what agents can do (COACH AND ADMIN ONLY)
export const agentAccessControls = pgTable("agent_access_controls", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(), // References both player and coach agents
  agentType: varchar("agent_type", { length: 20 }).notNull(), // 'player' or 'coach'
  canDeleteData: boolean("can_delete_data").notNull().default(false),
  canUpdateData: boolean("can_update_data").notNull().default(false),
  canModifyUI: boolean("can_modify_ui").notNull().default(false),
  canCreateTables: boolean("can_create_tables").notNull().default(false),
  restrictedDomains: jsonb("restricted_domains").default([]), // Domains this agent cannot access
  approvalRequired: boolean("approval_required").notNull().default(true), // Whether coach approval needed
  accessValidFrom: timestamp("access_valid_from").defaultNow(), // When access becomes valid
  accessValidTo: timestamp("access_valid_to"), // When access expires (null = permanent)
  lastModifiedBy: varchar("last_modified_by", { length: 50 }).notNull(), // Only 'coach' or 'admin'
  modificationReason: text("modification_reason").notNull(), // Why permissions were changed
  businessJustification: text("business_justification"), // Business case for access change
  riskAssessment: text("risk_assessment"), // Risk evaluation for permission grant
  automaticRevocation: boolean("automatic_revocation").notNull().default(false), // Auto-revoke when expired
  notificationSent: boolean("notification_sent").notNull().default(false), // Access expiry notification
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Change Requests - Player Agents request changes through Coach
export const changeRequests = pgTable("change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestingAgentId: uuid("requesting_agent_id").notNull(), // Player Agent making request
  coachAgentId: uuid("coach_agent_id").notNull(), // Coach Agent receiving request
  requestType: varchar("request_type", { length: 50 }).notNull(), // 'data_change', 'ui_change', 'configuration_change'
  businessDomain: varchar("business_domain", { length: 50 }).notNull(),
  changeDescription: text("change_description").notNull(),
  businessJustification: text("business_justification").notNull(), // Why this change is needed
  affectedSystems: jsonb("affected_systems").notNull(), // Which systems will be impacted
  crossDomainImpact: jsonb("cross_domain_impact").notNull(), // How other domains are affected
  riskAssessment: jsonb("risk_assessment").notNull(), // Potential risks and mitigation
  proposedImplementation: text("proposed_implementation").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, implemented
  coachDecision: text("coach_decision"), // Coach's decision reasoning
  coachJustification: text("coach_justification"), // Cross-domain project justification
  implementationPlan: jsonb("implementation_plan"), // Coach's implementation guidance
  reviewedAt: timestamp("reviewed_at"),
  implementedAt: timestamp("implemented_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Coach Decisions - Track all Coach Agent decisions and justifications
export const coachDecisions = pgTable("coach_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachAgentId: uuid("coach_agent_id").notNull(),
  changeRequestId: uuid("change_request_id"), // Optional - can be standalone decision
  decisionType: varchar("decision_type", { length: 50 }).notNull(), // 'change_approval', 'policy_update', 'system_override'
  decisionSummary: text("decision_summary").notNull(),
  crossDomainAnalysis: jsonb("cross_domain_analysis").notNull(), // Analysis of cross-domain implications
  projectJustification: text("project_justification").notNull(), // How this fits into overall project goals
  affectedDomains: jsonb("affected_domains").notNull(), // Which business domains are impacted
  riskMitigation: jsonb("risk_mitigation"), // Risk mitigation strategies
  implementationGuidance: text("implementation_guidance"), // How the decision should be implemented
  followUpRequired: boolean("follow_up_required").notNull().default(false),
  followUpDate: timestamp("follow_up_date"),
  decisionImpact: varchar("decision_impact", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Player-Coach Communications - All communications between players and coach
export const playerCoachCommunications = pgTable("player_coach_communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerAgentId: uuid("player_agent_id").notNull(),
  coachAgentId: uuid("coach_agent_id").notNull(),
  communicationType: varchar("communication_type", { length: 30 }).notNull(), // 'request', 'report', 'question', 'update', 'status_report'
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  businessContext: jsonb("business_context").notNull(), // Business context for the communication
  urgencyLevel: varchar("urgency_level", { length: 20 }).notNull().default("normal"), // low, normal, high, critical
  responseRequired: boolean("response_required").notNull().default(true),
  coachResponse: text("coach_response"),
  responseGuidance: text("response_guidance"), // Coach's guidance based on cross-domain knowledge
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, read, responded, resolved
  readAt: timestamp("read_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Player Agent Status Updates - Automated status reporting system
export const playerAgentStatusUpdates = pgTable("player_agent_status_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerAgentId: uuid("player_agent_id").notNull(),
  coachAgentId: uuid("coach_agent_id").notNull(),
  statusLevel: varchar("status_level", { length: 10 }).notNull(), // 'green', 'amber', 'red'
  businessDomain: varchar("business_domain", { length: 50 }).notNull(),
  statusDescription: text("status_description").notNull(),
  issuesIdentified: jsonb("issues_identified").default([]), // Array of current issues
  resolutionProgress: text("resolution_progress"), // What's being done to resolve
  businessImpact: varchar("business_impact", { length: 20 }).default('low'), // 'low', 'medium', 'high', 'critical'
  estimatedResolutionTime: varchar("estimated_resolution_time", { length: 50 }),
  requiresCoachIntervention: boolean("requires_coach_intervention").notNull().default(false),
  automaticUpdate: boolean("automatic_update").notNull().default(true),
  nextUpdateDue: timestamp("next_update_due"),
  lastGreenStatus: timestamp("last_green_status"),
  consecutiveRedCount: integer("consecutive_red_count").default(0),
  escalationLevel: integer("escalation_level").default(0), // 0=normal, 1=escalated, 2=critical
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Export types for TypeScript
export type CoachAgent = typeof coachAgents.$inferSelect;
export type UpsertCoachAgent = typeof coachAgents.$inferInsert;

export type AgentAccessControl = typeof agentAccessControls.$inferSelect;
export type UpsertAgentAccessControl = typeof agentAccessControls.$inferInsert;

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type UpsertChangeRequest = typeof changeRequests.$inferInsert;

export type CoachDecision = typeof coachDecisions.$inferSelect;
export type UpsertCoachDecision = typeof coachDecisions.$inferInsert;

export type PlayerCoachCommunication = typeof playerCoachCommunications.$inferSelect;
export type UpsertPlayerCoachCommunication = typeof playerCoachCommunications.$inferInsert;

export type PlayerAgentStatusUpdate = typeof playerAgentStatusUpdates.$inferSelect;
export type UpsertPlayerAgentStatusUpdate = typeof playerAgentStatusUpdates.$inferInsert;

// Zod schemas for validation
export const insertCoachAgentSchema = createInsertSchema(coachAgents);
export const insertAgentAccessControlSchema = createInsertSchema(agentAccessControls);
export const insertChangeRequestSchema = createInsertSchema(changeRequests);
export const insertCoachDecisionSchema = createInsertSchema(coachDecisions);
export const insertPlayerCoachCommunicationSchema = createInsertSchema(playerCoachCommunications);
export const insertPlayerAgentStatusUpdateSchema = createInsertSchema(playerAgentStatusUpdates);

export type InsertCoachAgent = z.infer<typeof insertCoachAgentSchema>;
export type InsertAgentAccessControl = z.infer<typeof insertAgentAccessControlSchema>;
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;
export type InsertCoachDecision = z.infer<typeof insertCoachDecisionSchema>;
export type InsertPlayerCoachCommunication = z.infer<typeof insertPlayerCoachCommunicationSchema>;
export type InsertPlayerAgentStatusUpdate = z.infer<typeof insertPlayerAgentStatusUpdateSchema>;