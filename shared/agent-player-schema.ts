import { pgTable, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// Agent Player core table
export const agentPlayers = pgTable('agent_players', {
  id: varchar('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  businessDomain: varchar('business_domain', { length: 50 }).notNull(), // sales, finance, inventory, etc.
  playerType: varchar('player_type', { length: 30 }).notNull(), // 'domain_specialist', 'cross_domain_coordinator'
  configurationAccess: jsonb('configuration_access'), // Array of config areas accessible
  standardsFramework: jsonb('standards_framework'), // Configuration standards and validation rules
  neighborDomains: jsonb('neighbor_domains'), // Connected business domains for cross-integration
  status: varchar('status', { length: 20 }).default('active'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Agent Player configuration validations
export const agentPlayerValidations = pgTable('agent_player_validations', {
  id: varchar('id').primaryKey(),
  playerId: varchar('player_id').references(() => agentPlayers.id),
  configurationArea: varchar('configuration_area', { length: 100 }).notNull(),
  validationType: varchar('validation_type', { length: 50 }).notNull(), // 'standards_check', 'cross_domain_sync'
  validationRule: text('validation_rule').notNull(),
  expectedValue: text('expected_value'),
  currentValue: text('current_value'),
  complianceStatus: varchar('compliance_status', { length: 20 }).default('pending'),
  lastChecked: timestamp('last_checked'),
  createdAt: timestamp('created_at').defaultNow()
});

// Cross-domain interactions
export const agentPlayerInteractions = pgTable('agent_player_interactions', {
  id: varchar('id').primaryKey(),
  initiatorPlayerId: varchar('initiator_player_id').references(() => agentPlayers.id),
  targetPlayerId: varchar('target_player_id').references(() => agentPlayers.id),
  interactionType: varchar('interaction_type', { length: 50 }).notNull(), // 'config_sync', 'data_exchange', 'validation_request'
  businessContext: varchar('business_context', { length: 100 }).notNull(),
  exchangedData: jsonb('exchanged_data'),
  status: varchar('status', { length: 20 }).default('pending'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Agent Player reports and insights
export const agentPlayerReports = pgTable('agent_player_reports', {
  id: varchar('id').primaryKey(),
  playerId: varchar('player_id').references(() => agentPlayers.id),
  reportType: varchar('report_type', { length: 50 }).notNull(), // 'compliance_summary', 'cross_domain_analysis'
  reportData: jsonb('report_data'),
  complianceScore: integer('compliance_score'), // 0-100
  recommendedActions: jsonb('recommended_actions'),
  generatedAt: timestamp('generated_at').defaultNow()
});

export type AgentPlayer = typeof agentPlayers.$inferSelect;
export type AgentPlayerInsert = typeof agentPlayers.$inferInsert;
export type AgentPlayerValidation = typeof agentPlayerValidations.$inferSelect;
export type AgentPlayerInteraction = typeof agentPlayerInteractions.$inferSelect;
export type AgentPlayerReport = typeof agentPlayerReports.$inferSelect;