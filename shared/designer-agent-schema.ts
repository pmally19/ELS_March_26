import { pgTable, text, varchar, timestamp, jsonb, boolean, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Designer Agent Document Uploads
export const designerDocuments = pgTable("designer_documents", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // pdf, docx, png, jpg
  fileSize: integer("file_size").notNull(),
  uploadPath: text("upload_path").notNull(),
  documentType: varchar("document_type").notNull(), // technical_spec, functional_req, flow_diagram
  status: varchar("status").default("uploaded"), // uploaded, analyzing, analyzed, approved, rejected
  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Designer Agent Analysis Results
export const designerAnalysis = pgTable("designer_analysis", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => designerDocuments.id),
  analysisStatus: varchar("analysis_status").default("pending"), // pending, in_progress, completed, failed
  
  // System Architecture Analysis
  existingTablesAnalyzed: jsonb("existing_tables_analyzed"), // Current table structures
  proposedTableChanges: jsonb("proposed_table_changes"), // Column additions, modifications
  newTablesRequired: jsonb("new_tables_required"), // Completely new tables if needed
  relationshipMappings: jsonb("relationship_mappings"), // Foreign key relationships
  dataIntegrityChecks: jsonb("data_integrity_checks"), // Constraint validations
  
  // UI Component Analysis  
  existingUIComponents: jsonb("existing_ui_components"), // Current UI mapping
  proposedUIChanges: jsonb("proposed_ui_changes"), // Screen modifications
  newUIComponents: jsonb("new_ui_components"), // New screens/components
  mockDataExamples: jsonb("mock_data_examples"), // Example data from documents
  
  // Agent Communication Plans
  agentNotifications: jsonb("agent_notifications"), // Which agents need updates
  implementationPlan: jsonb("implementation_plan"), // Step-by-step changes
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Designer Agent Review & Approval
export const designerReviews = pgTable("designer_reviews", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => designerAnalysis.id),
  reviewStatus: varchar("review_status").default("pending"), // pending, approved, changes_requested, rejected
  
  // Review Details
  reviewedBy: varchar("reviewed_by").notNull(),
  reviewComments: text("review_comments"),
  screenSpecificFeedback: jsonb("screen_specific_feedback"), // Screen # and specific changes
  approvalTimestamp: timestamp("approval_timestamp"),
  
  // Change Requests
  changeRequests: jsonb("change_requests"), // Specific modification requests
  changeRequestStatus: varchar("change_request_status"), // pending, addressed, rejected
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Designer Agent Implementation Tracking
export const designerImplementations = pgTable("designer_implementations", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => designerAnalysis.id),
  implementationStatus: varchar("implementation_status").default("pending"), // pending, in_progress, completed, failed
  
  // Implementation Progress
  databaseChangesApplied: jsonb("database_changes_applied"), // Completed DB changes
  uiChangesApplied: jsonb("ui_changes_applied"), // Completed UI changes
  agentUpdatesCompleted: jsonb("agent_updates_completed"), // Agent notifications sent
  
  // Testing & Validation
  testingResults: jsonb("testing_results"), // Implementation test results
  validationChecks: jsonb("validation_checks"), // Data integrity validation
  rollbackPlan: jsonb("rollback_plan"), // Rollback instructions if needed
  
  implementedBy: varchar("implemented_by").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Agent Communication Log
export const designerAgentCommunications = pgTable("designer_agent_communications", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => designerAnalysis.id),
  targetAgent: varchar("target_agent").notNull(), // chief, coach, player, rookie, jr
  communicationType: varchar("communication_type").notNull(), // notification, update, query
  message: text("message").notNull(),
  payload: jsonb("payload"), // Structured data for agent
  status: varchar("status").default("sent"), // sent, acknowledged, processed, failed
  sentAt: timestamp("sent_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
});

// Schema exports for type safety
export type DesignerDocument = typeof designerDocuments.$inferSelect;
export type InsertDesignerDocument = typeof designerDocuments.$inferInsert;

export type DesignerAnalysis = typeof designerAnalysis.$inferSelect;
export type InsertDesignerAnalysis = typeof designerAnalysis.$inferInsert;

export type DesignerReview = typeof designerReviews.$inferSelect;
export type InsertDesignerReview = typeof designerReviews.$inferInsert;

export type DesignerImplementation = typeof designerImplementations.$inferSelect;
export type InsertDesignerImplementation = typeof designerImplementations.$inferInsert;

export type DesignerAgentCommunication = typeof designerAgentCommunications.$inferSelect;
export type InsertDesignerAgentCommunication = typeof designerAgentCommunications.$inferInsert;

// Zod validation schemas
export const insertDesignerDocumentSchema = createInsertSchema(designerDocuments);
export const insertDesignerAnalysisSchema = createInsertSchema(designerAnalysis);
export const insertDesignerReviewSchema = createInsertSchema(designerReviews);
export const insertDesignerImplementationSchema = createInsertSchema(designerImplementations);
export const insertDesignerAgentCommunicationSchema = createInsertSchema(designerAgentCommunications);

// Designer Agent specific types
export type DocumentAnalysisRequest = {
  documentId: number;
  documentContent: string;
  documentType: 'technical_spec' | 'functional_req' | 'flow_diagram';
  analysisOptions: {
    prioritizeExistingTables: boolean;
    maintainDataIntegrity: boolean;
    generateMockData: boolean;
  };
};

export type SystemArchitectureAnalysis = {
  existingTables: {
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      constraints: string[];
    }>;
    relationships: Array<{
      type: 'foreign_key' | 'primary_key';
      references: string;
    }>;
  }[];
  proposedChanges: {
    tableModifications: Array<{
      tableName: string;
      action: 'add_column' | 'modify_column' | 'add_constraint';
      details: any;
      impactAssessment: string;
    }>;
    newTables: Array<{
      tableName: string;
      columns: any[];
      relationships: any[];
      justification: string;
    }>;
  };
  dataIntegrityValidation: {
    constraintChecks: string[];
    migrationStrategy: string;
    rollbackPlan: string;
  };
};

export type UIAnalysisResult = {
  existingComponents: Array<{
    componentName: string;
    route: string;
    affectedByChanges: boolean;
    requiredModifications: string[];
  }>;
  newComponents: Array<{
    componentName: string;
    purpose: string;
    mockData: any;
    dependencies: string[];
  }>;
  screenMockups: Array<{
    screenNumber: number;
    screenName: string;
    description: string;
    mockupData: any;
    relatedTables: string[];
  }>;
};