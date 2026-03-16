import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// AWS Database Connection Credentials Table
export const awsDatabaseCredentials = pgTable('aws_database_credentials', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  connectionName: text('connection_name').notNull().unique(),
  awsRegion: text('aws_region').notNull(),
  rdsInstanceId: text('rds_instance_id').notNull(),
  hostname: text('hostname').notNull(),
  port: integer('port').notNull().default(5432),
  database: text('database').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(), // Will be encrypted
  sslMode: text('ssl_mode').notNull().default('require'),
  connectionTimeout: integer('connection_timeout').default(30),
  maxConnections: integer('max_connections').default(20),
  isActive: boolean('is_active').notNull().default(true),
  isPrimary: boolean('is_primary').notNull().default(false),
  backupFrequency: text('backup_frequency').default('daily'), // daily, weekly, monthly
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastConnected: timestamp('last_connected'),
  connectionStatus: text('connection_status').default('pending') // pending, connected, failed
});

// Database Sync Log Table - Track what data has been synced
export const databaseSyncLog = pgTable('database_sync_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  awsCredentialId: integer('aws_credential_id').notNull().references(() => awsDatabaseCredentials.id),
  tableName: text('table_name').notNull(),
  syncType: text('sync_type').notNull(), // full_sync, incremental, backup, restore
  recordsProcessed: integer('records_processed').default(0),
  recordsSuccessful: integer('records_successful').default(0),
  recordsFailed: integer('records_failed').default(0),
  syncStatus: text('sync_status').notNull(), // pending, in_progress, completed, failed
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  errorDetails: text('error_details'),
  dataChecksum: text('data_checksum'), // For data integrity verification
  syncSize: text('sync_size'), // Size of data synced (e.g., "2.5MB")
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Insert schemas
export const insertAwsDatabaseCredentialsSchema = createInsertSchema(awsDatabaseCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnected: true
});

export const insertDatabaseSyncLogSchema = createInsertSchema(databaseSyncLog).omit({
  id: true,
  createdAt: true,
  endTime: true
});

// Types
export type InsertAwsDatabaseCredentials = z.infer<typeof insertAwsDatabaseCredentialsSchema>;
export type SelectAwsDatabaseCredentials = typeof awsDatabaseCredentials.$inferSelect;
export type InsertDatabaseSyncLog = z.infer<typeof insertDatabaseSyncLogSchema>;
export type SelectDatabaseSyncLog = typeof databaseSyncLog.$inferSelect;