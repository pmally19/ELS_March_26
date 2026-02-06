/**
 * INTELLIGENT TABLE MATCHING SERVICE
 * Advanced table matching logic to prevent duplicate table suggestions
 * Recognizes existing tables and suggests field enhancements instead
 */

import { db } from "../db";
import fs from 'fs';
import path from 'path';

interface TableMatch {
  existingTable: string;
  suggestedTable: string;
  matchScore: number;
  matchReason: string;
  recommendedAction: 'enhance' | 'merge' | 'create_new' | 'already_exists';
  missingFields: string[];
  existingFields: string[];
  enhancementSuggestions: string[];
}

interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string;
}

export class IntelligentTableMatchingService {
  private synonymMap: Map<string, string[]> = new Map();
  private tableCache: Map<string, TableColumn[]> = new Map();
  
  constructor() {
    this.initializeSynonymMap();
  }

  private initializeSynonymMap() {
    // Define common business term synonyms
    this.synonymMap.set('material', ['material_master', 'materials', 'items', 'products', 'part_master']);
    this.synonymMap.set('vendor', ['vendor_master', 'suppliers', 'vendors', 'supplier_master']);
    this.synonymMap.set('customer', ['customer_master', 'clients', 'customers', 'client_master']);
    this.synonymMap.set('employee', ['employee_master', 'staff', 'personnel', 'workers']);
    this.synonymMap.set('purchase', ['purchase_orders', 'po', 'procurement', 'buying']);
    this.synonymMap.set('sales', ['sales_orders', 'so', 'revenue', 'selling']);
    this.synonymMap.set('inventory', ['stock', 'warehouse', 'materials', 'goods']);
    this.synonymMap.set('finance', ['financial', 'accounting', 'gl', 'ledger']);
    this.synonymMap.set('production', ['manufacturing', 'production_orders', 'work_orders']);
    this.synonymMap.set('quality', ['qc', 'quality_control', 'inspection', 'testing']);
  }

  /**
   * Load all existing database tables with their schema
   */
  private async loadExistingTables(): Promise<Map<string, TableColumn[]>> {
    if (this.tableCache.size > 0) {
      return this.tableCache;
    }

    try {
      // Get all tables
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await db.execute(tablesQuery);
      
      // For each table, get its columns
      for (const table of tablesResult.rows) {
        const tableName = String(table.table_name);
        
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${tableName}'
          ORDER BY ordinal_position;
        `;
        
        const columnsResult = await db.execute(columnsQuery);
        const columns = columnsResult.rows.map(row => ({
          column_name: String(row.column_name),
          data_type: String(row.data_type),
          is_nullable: String(row.is_nullable),
          column_default: String(row.column_default || '')
        }));
        
        this.tableCache.set(tableName, columns);
      }
      
      console.log(`📊 Loaded ${this.tableCache.size} existing tables with schema`);
      return this.tableCache;
    } catch (error) {
      console.error('Error loading existing tables:', error);
      return new Map();
    }
  }

  /**
   * Check if a suggested table already exists and provide intelligent recommendations
   */
  public async analyzeTableRequirement(suggestedTable: string, requiredFields: string[] = []): Promise<TableMatch> {
    await this.loadExistingTables();
    
    // Find exact match first
    if (this.tableCache.has(suggestedTable)) {
      const existingColumns = this.tableCache.get(suggestedTable)!;
      return {
        existingTable: suggestedTable,
        suggestedTable,
        matchScore: 1.0,
        matchReason: 'Exact table name match',
        recommendedAction: 'already_exists',
        missingFields: this.findMissingFields(existingColumns, requiredFields),
        existingFields: existingColumns.map(col => col.column_name),
        enhancementSuggestions: this.generateEnhancementSuggestions(existingColumns, requiredFields)
      };
    }

    // Find synonym-based matches
    const synonymMatches = this.findSynonymMatches(suggestedTable);
    
    for (const match of synonymMatches) {
      if (this.tableCache.has(match.tableName)) {
        const existingColumns = this.tableCache.get(match.tableName)!;
        return {
          existingTable: match.tableName,
          suggestedTable,
          matchScore: match.score,
          matchReason: `Synonym match: ${match.tableName} matches ${suggestedTable}`,
          recommendedAction: 'enhance',
          missingFields: this.findMissingFields(existingColumns, requiredFields),
          existingFields: existingColumns.map(col => col.column_name),
          enhancementSuggestions: this.generateEnhancementSuggestions(existingColumns, requiredFields)
        };
      }
    }

    // Find partial name matches
    const partialMatches = this.findPartialMatches(suggestedTable);
    
    if (partialMatches.length > 0) {
      const bestMatch = partialMatches[0];
      const existingColumns = this.tableCache.get(bestMatch.tableName)!;
      return {
        existingTable: bestMatch.tableName,
        suggestedTable,
        matchScore: bestMatch.score,
        matchReason: `Partial name match: ${bestMatch.tableName} contains similar terms to ${suggestedTable}`,
        recommendedAction: bestMatch.score > 0.7 ? 'enhance' : 'merge',
        missingFields: this.findMissingFields(existingColumns, requiredFields),
        existingFields: existingColumns.map(col => col.column_name),
        enhancementSuggestions: this.generateEnhancementSuggestions(existingColumns, requiredFields)
      };
    }

    // No match found - suggest new table
    return {
      existingTable: '',
      suggestedTable,
      matchScore: 0,
      matchReason: 'No existing table matches found',
      recommendedAction: 'create_new',
      missingFields: requiredFields,
      existingFields: [],
      enhancementSuggestions: [`Create new table: ${suggestedTable} with fields: ${requiredFields.join(', ')}`]
    };
  }

  private findSynonymMatches(suggestedTable: string): Array<{tableName: string, score: number}> {
    const matches: Array<{tableName: string, score: number}> = [];
    
    // Check if the suggested table matches any synonym patterns
    for (const [baseWord, synonyms] of Array.from(this.synonymMap.entries())) {
      if (synonyms.some(synonym => suggestedTable.toLowerCase().includes(synonym.toLowerCase()))) {
        // Find existing tables that match this base word
        for (const [tableName] of Array.from(this.tableCache.entries())) {
          if (synonyms.some(synonym => tableName.toLowerCase().includes(synonym.toLowerCase()))) {
            matches.push({
              tableName,
              score: 0.9 // High confidence for synonym matches
            });
          }
        }
      }
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }

  private findPartialMatches(suggestedTable: string): Array<{tableName: string, score: number}> {
    const matches: Array<{tableName: string, score: number}> = [];
    const suggestedWords = suggestedTable.toLowerCase().split(/[_-]/);
    
    for (const tableName of Array.from(this.tableCache.keys())) {
      const tableWords = tableName.toLowerCase().split(/[_-]/);
      const matchingWords = suggestedWords.filter(word => 
        tableWords.some(tableWord => 
          tableWord.includes(word) || word.includes(tableWord)
        )
      );
      
      if (matchingWords.length > 0) {
        const score = matchingWords.length / Math.max(suggestedWords.length, tableWords.length);
        matches.push({ tableName, score });
      }
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }

  private findMissingFields(existingColumns: TableColumn[], requiredFields: string[]): string[] {
    const existingFieldNames = existingColumns.map(col => col.column_name.toLowerCase());
    return requiredFields.filter(field => 
      !existingFieldNames.includes(field.toLowerCase())
    );
  }

  private generateEnhancementSuggestions(existingColumns: TableColumn[], requiredFields: string[]): string[] {
    const suggestions: string[] = [];
    const missingFields = this.findMissingFields(existingColumns, requiredFields);
    
    if (missingFields.length > 0) {
      suggestions.push(`Add ${missingFields.length} missing fields: ${missingFields.join(', ')}`);
    }
    
    // Check for common enhancement patterns
    const hasCreatedAt = existingColumns.some(col => col.column_name.includes('created'));
    const hasUpdatedAt = existingColumns.some(col => col.column_name.includes('updated'));
    
    if (!hasCreatedAt) {
      suggestions.push('Consider adding created_at timestamp for audit trail');
    }
    
    if (!hasUpdatedAt) {
      suggestions.push('Consider adding updated_at timestamp for change tracking');
    }
    
    return suggestions;
  }

  /**
   * Get comprehensive analysis of existing vs suggested tables
   */
  public async analyzeMultipleTables(suggestedTables: string[]): Promise<TableMatch[]> {
    const results: TableMatch[] = [];
    
    for (const table of suggestedTables) {
      const analysis = await this.analyzeTableRequirement(table);
      results.push(analysis);
    }
    
    return results;
  }

  /**
   * Get summary statistics about table matching
   */
  public async getSystemSummary(): Promise<{
    totalExistingTables: number;
    tablesWithData: number;
    recentlyCreated: number;
    enhancementOpportunities: number;
  }> {
    await this.loadExistingTables();
    
    return {
      totalExistingTables: this.tableCache.size,
      tablesWithData: 0, // This would need additional query
      recentlyCreated: 0, // This would need additional query
      enhancementOpportunities: 0 // This would need additional analysis
    };
  }
}