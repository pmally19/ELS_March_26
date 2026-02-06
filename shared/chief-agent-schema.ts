import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  uuid,
  boolean,
  integer,
  decimal
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Chief Agent - Ultimate Authority and System Oversight
export const chiefAgentSessions = pgTable("chief_agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionType: varchar("session_type").notNull(), // 'monitoring', 'review', 'approval'
  status: varchar("status").notNull().default('active'), // 'active', 'completed', 'escalated'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  summary: text("summary"),
  decisions: jsonb("decisions"), // All decisions made during session
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chief Agent Change Requests - All data changes must go through Chief Agent
export const chiefAgentChangeRequests = pgTable("chief_agent_change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: varchar("request_id").notNull().unique(), // CHF-YYYY-NNNNNN
  requestType: varchar("request_type").notNull(), // 'data_update', 'ui_change', 'configuration', 'policy_update'
  originAgent: varchar("origin_agent").notNull(), // 'player', 'coach'
  originAgentId: varchar("origin_agent_id").notNull(),
  businessDomain: varchar("business_domain").notNull(), // 'finance', 'sales', 'inventory', 'hr', etc.
  
  // Request Details
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  businessJustification: text("business_justification").notNull(),
  impactAnalysis: text("impact_analysis").notNull(),
  
  // Change Details
  targetTable: varchar("target_table"),
  targetField: varchar("target_field"),
  currentValue: text("current_value"),
  proposedValue: text("proposed_value"),
  changeScope: jsonb("change_scope"), // Detailed change information
  
  // Approval Workflow
  playerAgentApproval: varchar("player_agent_approval").default('pending'), // 'pending', 'approved', 'rejected'
  playerAgentNotes: text("player_agent_notes"),
  playerAgentTimestamp: timestamp("player_agent_timestamp"),
  
  coachAgentApproval: varchar("coach_agent_approval").default('pending'),
  coachAgentNotes: text("coach_agent_notes"),
  coachAgentTimestamp: timestamp("coach_agent_timestamp"),
  
  chiefAgentReview: varchar("chief_agent_review").default('pending'), // 'pending', 'approved', 'rejected', 'needs_human'
  chiefAgentNotes: text("chief_agent_notes"),
  chiefAgentTimestamp: timestamp("chief_agent_timestamp"),
  
  humanManagerApproval: varchar("human_manager_approval").default('not_required'), // 'not_required', 'pending', 'approved', 'rejected'
  humanManagerNotes: text("human_manager_notes"),
  humanManagerTimestamp: timestamp("human_manager_timestamp"),
  humanManagerId: varchar("human_manager_id"),
  
  // Final Status
  finalStatus: varchar("final_status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'implemented', 'failed'
  implementationDate: timestamp("implementation_date"),
  implementationNotes: text("implementation_notes"),
  
  priority: varchar("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  urgency: varchar("urgency").notNull().default('normal'), // 'low', 'normal', 'high', 'emergency'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chief Agent System Monitoring - Comprehensive oversight of all systems
export const chiefAgentSystemMonitoring = pgTable("chief_agent_system_monitoring", {
  id: uuid("id").primaryKey().defaultRandom(),
  monitoringId: varchar("monitoring_id").notNull().unique(), // CHF-MON-YYYY-NNNNNN
  
  // System Areas
  businessDomain: varchar("business_domain").notNull(),
  systemComponent: varchar("system_component").notNull(), // 'ui', 'database', 'api', 'workflow'
  monitoringType: varchar("monitoring_type").notNull(), // 'real_time', 'scheduled', 'triggered'
  
  // Monitoring Data
  metricsData: jsonb("metrics_data").notNull(),
  healthStatus: varchar("health_status").notNull(), // 'green', 'amber', 'red', 'critical'
  performanceMetrics: jsonb("performance_metrics"),
  errorLogs: jsonb("error_logs"),
  warningFlags: jsonb("warning_flags"),
  
  // Agent Activity Monitoring
  coachAgentActivity: jsonb("coach_agent_activity"),
  playerAgentActivity: jsonb("player_agent_activity"),
  rookieAgentActivity: jsonb("rookie_agent_activity"),
  
  // Business Domain Application Logs
  applicationLogData: jsonb("application_log_data"),
  userInteractionLogs: jsonb("user_interaction_logs"),
  dataAccessLogs: jsonb("data_access_logs"),
  
  // Analysis Results
  anomaliesDetected: jsonb("anomalies_detected"),
  trendsAnalysis: jsonb("trends_analysis"),
  predictiveInsights: jsonb("predictive_insights"),
  recommendedActions: jsonb("recommended_actions"),
  
  // Chief Agent Assessment
  chiefAgentAssessment: text("chief_agent_assessment"),
  riskLevel: varchar("risk_level").notNull().default('low'), // 'low', 'medium', 'high', 'critical'
  actionRequired: boolean("action_required").default(false),
  escalationNeeded: boolean("escalation_needed").default(false),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

// Chief Agent Business Documentation Analysis
export const chiefAgentDocumentationAnalysis = pgTable("chief_agent_documentation_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: varchar("analysis_id").notNull().unique(), // CHF-DOC-YYYY-NNNNNN
  
  // Document Context
  documentType: varchar("document_type").notNull(), // 'policy', 'procedure', 'guideline', 'compliance'
  businessDomain: varchar("business_domain").notNull(),
  documentName: varchar("document_name").notNull(),
  documentVersion: varchar("document_version"),
  
  // Analysis Results
  documentContent: text("document_content"),
  keyPoints: jsonb("key_points"),
  complianceRequirements: jsonb("compliance_requirements"),
  businessRules: jsonb("business_rules"),
  approvalAuthorities: jsonb("approval_authorities"),
  
  // Change Request Context
  relatedChangeRequestId: varchar("related_change_request_id"),
  complianceCheck: varchar("compliance_check").notNull(), // 'compliant', 'non_compliant', 'needs_review'
  complianceNotes: text("compliance_notes"),
  
  // Chief Agent Review
  chiefAgentAnalysis: text("chief_agent_analysis"),
  recommendedDecision: varchar("recommended_decision"), // 'approve', 'reject', 'needs_human_review'
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }), // 0.00 to 100.00
  
  analysisDate: timestamp("analysis_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

// Chief Agent Human Manager Interactions
export const chiefAgentHumanInteractions = pgTable("chief_agent_human_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  interactionId: varchar("interaction_id").notNull().unique(), // CHF-HUM-YYYY-NNNNNN
  
  // Interaction Context
  interactionType: varchar("interaction_type").notNull(), // 'approval_request', 'escalation', 'consultation', 'notification'
  humanManagerId: varchar("human_manager_id").notNull(),
  humanManagerName: varchar("human_manager_name").notNull(),
  humanManagerRole: varchar("human_manager_role").notNull(),
  
  // Request Details
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  urgencyLevel: varchar("urgency_level").notNull(), // 'low', 'medium', 'high', 'critical'
  businessImpact: text("business_impact"),
  
  // Related Context
  relatedChangeRequestId: varchar("related_change_request_id"),
  relatedMonitoringId: varchar("related_monitoring_id"),
  businessDomain: varchar("business_domain").notNull(),
  
  // Supporting Data
  analysisData: jsonb("analysis_data"),
  documentationReferences: jsonb("documentation_references"),
  riskAssessment: jsonb("risk_assessment"),
  chiefAgentRecommendation: text("chief_agent_recommendation"),
  
  // Human Response
  humanResponse: varchar("human_response"), // 'approved', 'rejected', 'needs_more_info', 'deferred'
  humanNotes: text("human_notes"),
  humanDecisionDate: timestamp("human_decision_date"),
  
  // Follow-up
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  
  status: varchar("status").notNull().default('pending'), // 'pending', 'responded', 'completed', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Chief Agent Decision Audit Trail
export const chiefAgentDecisionAudit = pgTable("chief_agent_decision_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  auditId: varchar("audit_id").notNull().unique(), // CHF-AUD-YYYY-NNNNNN
  
  // Decision Context
  decisionType: varchar("decision_type").notNull(), // 'change_approval', 'system_action', 'escalation', 'policy_enforcement'
  decisionCategory: varchar("decision_category").notNull(), // 'automatic', 'rule_based', 'human_assisted'
  businessDomain: varchar("business_domain").notNull(),
  
  // Input Data
  inputData: jsonb("input_data").notNull(),
  contextData: jsonb("context_data"),
  businessRules: jsonb("business_rules"),
  documentationReferences: jsonb("documentation_references"),
  
  // Decision Process
  analysisSteps: jsonb("analysis_steps"),
  evaluationCriteria: jsonb("evaluation_criteria"),
  riskFactors: jsonb("risk_factors"),
  complianceChecks: jsonb("compliance_checks"),
  
  // Decision Output
  decision: varchar("decision").notNull(), // 'approved', 'rejected', 'escalated', 'deferred'
  reasoning: text("reasoning").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
  alternativeOptions: jsonb("alternative_options"),
  
  // Implementation
  actionsTaken: jsonb("actions_taken"),
  notificationsSent: jsonb("notifications_sent"),
  followUpRequired: boolean("follow_up_required").default(false),
  
  // Audit Information
  decisionTimestamp: timestamp("decision_timestamp").defaultNow(),
  executionTime: integer("execution_time"), // milliseconds
  dataVersion: varchar("data_version"),
  systemVersion: varchar("system_version"),
  
  createdAt: timestamp("created_at").defaultNow()
});

// Type exports for the Chief Agent system
export type ChiefAgentSession = typeof chiefAgentSessions.$inferSelect;
export type InsertChiefAgentSession = typeof chiefAgentSessions.$inferInsert;

export type ChiefAgentChangeRequest = typeof chiefAgentChangeRequests.$inferSelect;
export type InsertChiefAgentChangeRequest = typeof chiefAgentChangeRequests.$inferInsert;

export type ChiefAgentSystemMonitoring = typeof chiefAgentSystemMonitoring.$inferSelect;
export type InsertChiefAgentSystemMonitoring = typeof chiefAgentSystemMonitoring.$inferInsert;

export type ChiefAgentDocumentationAnalysis = typeof chiefAgentDocumentationAnalysis.$inferSelect;
export type InsertChiefAgentDocumentationAnalysis = typeof chiefAgentDocumentationAnalysis.$inferInsert;

export type ChiefAgentHumanInteraction = typeof chiefAgentHumanInteractions.$inferSelect;
export type InsertChiefAgentHumanInteraction = typeof chiefAgentHumanInteractions.$inferInsert;

export type ChiefAgentDecisionAudit = typeof chiefAgentDecisionAudit.$inferSelect;
export type InsertChiefAgentDecisionAudit = typeof chiefAgentDecisionAudit.$inferInsert;

// Zod schemas for validation
export const insertChiefAgentSessionSchema = createInsertSchema(chiefAgentSessions);
export const insertChiefAgentChangeRequestSchema = createInsertSchema(chiefAgentChangeRequests);
export const insertChiefAgentSystemMonitoringSchema = createInsertSchema(chiefAgentSystemMonitoring);
export const insertChiefAgentDocumentationAnalysisSchema = createInsertSchema(chiefAgentDocumentationAnalysis);
export const insertChiefAgentHumanInteractionSchema = createInsertSchema(chiefAgentHumanInteractions);
export const insertChiefAgentDecisionAuditSchema = createInsertSchema(chiefAgentDecisionAudit);