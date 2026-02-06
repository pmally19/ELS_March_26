import { db } from "../db";
import fs from 'fs';
import path from 'path';

/**
 * SYSTEM ANALYSIS AGENT
 * Scans actual codebase, database, and API routes to provide true "existing vs missing" comparison
 * Works with Designer Agent to provide authentic system analysis
 */

interface DatabaseTable {
  table_name: string;
  column_count: number;
  has_data: boolean;
  record_count: number;
}

interface APIEndpoint {
  path: string;
  method: string;
  file: string;
  handler: string;
}

interface UIComponent {
  name: string;
  path: string;
  type: 'page' | 'component';
  module: string;
  exports: string[];
}

interface SystemCapability {
  name: string;
  status: 'implemented' | 'partial' | 'missing';
  components: {
    database: DatabaseTable[];
    api: APIEndpoint[];
    ui: UIComponent[];
  };
  confidence: number;
}

export class SystemAnalysisAgent {
  private projectRoot: string;
  
  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Main analysis function - scans entire system for capabilities
   */
  async analyzeSystem(targetModule?: string): Promise<{
    overview: any;
    modules: Record<string, SystemCapability>;
    recommendations: string[];
  }> {
    console.log('🔍 Starting comprehensive system analysis...');
    
    const [databases, apis, uiComponents] = await Promise.all([
      this.scanDatabase(),
      this.scanAPIRoutes(),
      this.scanUIComponents()
    ]);

    const modules = this.analyzeModuleCapabilities(databases, apis, uiComponents, targetModule);
    const overview = this.generateSystemOverview(databases, apis, uiComponents);
    const recommendations = this.generateRecommendations(modules);

    return {
      overview,
      modules,
      recommendations
    };
  }

  /**
   * Scan actual database tables and data
   */
  private async scanDatabase(): Promise<DatabaseTable[]> {
    try {
      // Get all tables with column counts
      const tablesQuery = `
        SELECT 
          t.table_name,
          COUNT(c.column_name) as column_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name
        ORDER BY t.table_name;
      `;
      
      const tablesResult = await db.execute(tablesQuery);
      const tables: DatabaseTable[] = [];

      for (const table of tablesResult.rows) {
        try {
          // Check if table has data
          const tableName = String(table.table_name || '');
          const countQuery = `SELECT COUNT(*) as count FROM "${tableName}"`;
          const countResult = await db.execute(countQuery);
          const firstRow = countResult.rows[0] as any;
          const recordCount = parseInt(String(firstRow?.count || '0'));

          tables.push({
            table_name: tableName,
            column_count: parseInt(String((table as any).column_count || '0')),
            has_data: recordCount > 0,
            record_count: recordCount
          });
        } catch (error) {
          // Table might have issues, but continue with other tables
          const tableName = String((table as any).table_name || '');
          tables.push({
            table_name: tableName,
            column_count: parseInt(String((table as any).column_count || '0')),
            has_data: false,
            record_count: 0
          });
        }
      }

      console.log(`📊 Found ${tables.length} database tables`);
      return tables;
    } catch (error) {
      console.error('Error scanning database:', error);
      return [];
    }
  }

  /**
   * Scan actual API routes from server files
   */
  private async scanAPIRoutes(): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    const serverDir = path.join(this.projectRoot, 'server');
    
    try {
      const routeFiles = await this.findRouteFiles(serverDir);
      
      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const fileEndpoints = this.extractEndpoints(content, file);
        endpoints.push(...fileEndpoints);
      }

      console.log(`🔗 Found ${endpoints.length} API endpoints`);
      return endpoints;
    } catch (error) {
      console.error('Error scanning API routes:', error);
      return [];
    }
  }

  /**
   * Scan actual UI components and pages
   */
  public async scanUIComponents(): Promise<UIComponent[]> {
    const components: UIComponent[] = [];
    const clientDir = path.join(this.projectRoot, 'client', 'src');
    
    try {
      const componentFiles = await this.findComponentFiles(clientDir);
      
      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const component = this.analyzeComponent(content, file);
        if (component) {
          components.push(component);
        }
      }

      console.log(`🎨 Found ${components.length} UI components`);
      return components;
    } catch (error) {
      console.error('Error scanning UI components:', error);
      return [];
    }
  }

  /**
   * Find all route files in server directory
   */
  private async findRouteFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          scan(fullPath);
        } else if (entry.isFile() && 
                  (entry.name.includes('route') || entry.name.includes('api')) && 
                  (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Find all component files in client directory
   */
  private async findComponentFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
          scan(fullPath);
        } else if (entry.isFile() && 
                  (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Extract API endpoints from route file content
   */
  private extractEndpoints(content: string, filePath: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    
    for (const method of methods) {
      const regex = new RegExp(`router\\.${method}\\s*\\(\\s*["']([^"']+)["']`, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        endpoints.push({
          path: match[1],
          method: method.toUpperCase(),
          file: path.relative(this.projectRoot, filePath),
          handler: `${method}_${match[1].replace(/[^a-zA-Z0-9]/g, '_')}`
        });
      }
    }
    
    return endpoints;
  }

  /**
   * Analyze UI component file
   */
  private analyzeComponent(content: string, filePath: string): UIComponent | null {
    const relativePath = path.relative(this.projectRoot, filePath);
    const name = path.basename(filePath, path.extname(filePath));
    
    // Determine if it's a page or component
    const isPage = relativePath.includes('/pages/') || name.toLowerCase().includes('page');
    
    // Determine module based on path
    let module = 'common';
    if (relativePath.includes('/sales/')) module = 'sales';
    else if (relativePath.includes('/finance/')) module = 'finance';
    else if (relativePath.includes('/inventory/')) module = 'inventory';
    else if (relativePath.includes('/production/')) module = 'production';
    else if (relativePath.includes('/purchasing/')) module = 'purchasing';
    else if (relativePath.includes('/hr/')) module = 'hr';
    
    // Extract exports
    const exports: string[] = [];
    const exportMatches = content.match(/export\s+(?:default\s+)?(?:function\s+)?(\w+)/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const name = match.replace(/export\s+(?:default\s+)?(?:function\s+)?/, '');
        exports.push(name);
      });
    }

    return {
      name,
      path: relativePath,
      type: isPage ? 'page' : 'component',
      module,
      exports
    };
  }

  /**
   * Analyze module capabilities based on database, API, and UI components
   */
  private analyzeModuleCapabilities(
    databases: DatabaseTable[], 
    apis: APIEndpoint[], 
    uiComponents: UIComponent[],
    targetModule?: string
  ): Record<string, SystemCapability> {
    const modules: Record<string, SystemCapability> = {};
    const moduleNames = ['sales', 'finance', 'inventory', 'production', 'purchasing', 'hr'];
    
    for (const moduleName of moduleNames) {
      if (targetModule && moduleName !== targetModule) continue;
      
      const moduleComponents = {
        database: this.getModuleTables(databases, moduleName),
        api: this.getModuleAPIs(apis, moduleName),
        ui: uiComponents.filter(c => c.module === moduleName)
      };
      
      const status = this.determineModuleStatus(moduleComponents);
      const confidence = this.calculateConfidence(moduleComponents);
      
      modules[moduleName] = {
        name: moduleName,
        status,
        components: moduleComponents,
        confidence
      };
    }
    
    return modules;
  }

  /**
   * Get database tables related to a module
   */
  private getModuleTables(tables: DatabaseTable[], module: string): DatabaseTable[] {
    const modulePatterns: Record<string, string[]> = {
      sales: ['sales', 'customer', 'order', 'quote', 'lead', 'opportunity', 'invoice'],
      finance: ['finance', 'gl_', 'account', 'payment', 'journal', 'budget'],
      inventory: ['inventory', 'stock', 'warehouse', 'material', 'product'],
      production: ['production', 'work_center', 'bom', 'manufacturing', 'mrp'],
      purchasing: ['purchase', 'vendor', 'supplier', 'procurement', 'requisition'],
      hr: ['employee', 'payroll', 'hr_', 'personnel', 'benefit']
    };
    
    const patterns = modulePatterns[module] || [];
    return tables.filter(table => 
      patterns.some(pattern => table.table_name.toLowerCase().includes(pattern))
    );
  }

  /**
   * Get API endpoints related to a module
   */
  private getModuleAPIs(apis: APIEndpoint[], module: string): APIEndpoint[] {
    return apis.filter(api => 
      api.path.toLowerCase().includes(module) || 
      api.file.toLowerCase().includes(module)
    );
  }

  /**
   * Determine module implementation status
   */
  private determineModuleStatus(components: any): 'implemented' | 'partial' | 'missing' {
    const hasDatabase = components.database.length > 0;
    const hasAPI = components.api.length > 0;
    const hasUI = components.ui.length > 0;
    
    if (hasDatabase && hasAPI && hasUI) return 'implemented';
    if (hasDatabase || hasAPI || hasUI) return 'partial';
    return 'missing';
  }

  /**
   * Calculate confidence score for module analysis
   */
  private calculateConfidence(components: any): number {
    let score = 0;
    
    // Database component weight: 40%
    if (components.database.length > 0) {
      const tablesWithData = components.database.filter((t: DatabaseTable) => t.has_data).length;
      score += (tablesWithData / Math.max(components.database.length, 1)) * 40;
    }
    
    // API component weight: 35%
    if (components.api.length > 0) {
      score += Math.min(components.api.length / 5, 1) * 35;
    }
    
    // UI component weight: 25%
    if (components.ui.length > 0) {
      score += Math.min(components.ui.length / 3, 1) * 25;
    }
    
    return Math.round(score);
  }

  /**
   * Public method to scan API endpoints
   */
  public async scanAPIEndpoints(): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    const serverDir = path.join(this.projectRoot, 'server');
    
    try {
      const routeFiles = await this.findRouteFiles(serverDir);
      
      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const fileEndpoints = this.extractEndpoints(content, file);
        endpoints.push(...fileEndpoints);
      }
      
      return endpoints;
    } catch (error) {
      console.error('Error scanning API endpoints:', error);
      return [];
    }
  }

  /**
   * Public method to scan database tables
   */
  public async scanDatabaseTables(): Promise<DatabaseTable[]> {
    const tables: DatabaseTable[] = [];
    
    try {
      const result = await db.execute(`
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      for (const row of result.rows) {
        const tableName = row.table_name as string;
        const columnCount = parseInt(row.column_count as string);
        
        // Check if table has data
        try {
          const countResult = await db.execute(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const recordCount = parseInt(countResult.rows[0].count as string);
          
          tables.push({
            table_name: tableName,
            column_count: columnCount,
            has_data: recordCount > 0,
            record_count: recordCount
          });
        } catch (error) {
          // Table might not be accessible
          tables.push({
            table_name: tableName,
            column_count: columnCount,
            has_data: false,
            record_count: 0
          });
        }
      }
      
      return tables;
    } catch (error) {
      console.error('Error scanning database tables:', error);
      return [];
    }
  }

  /**
   * Generate system overview
   */
  private generateSystemOverview(databases: DatabaseTable[], apis: APIEndpoint[], uiComponents: UIComponent[]) {
    const tablesWithData = databases.filter(t => t.has_data).length;
    const totalRecords = databases.reduce((sum, t) => sum + t.record_count, 0);
    
    return {
      database: {
        totalTables: databases.length,
        tablesWithData,
        totalRecords,
        dataIntegrity: Math.round((tablesWithData / databases.length) * 100)
      },
      api: {
        totalEndpoints: apis.length,
        modules: Array.from(new Set(apis.map(a => a.file.split('/')[1] || 'unknown'))).length
      },
      ui: {
        totalComponents: uiComponents.length,
        pages: uiComponents.filter(c => c.type === 'page').length,
        modules: Array.from(new Set(uiComponents.map(c => c.module))).length
      }
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(modules: Record<string, SystemCapability>): string[] {
    const recommendations: string[] = [];
    
    for (const [name, module] of Object.entries(modules)) {
      if (module.status === 'missing') {
        recommendations.push(`Implement ${name} module - no components found`);
      } else if (module.status === 'partial') {
        if (module.components.database.length === 0) {
          recommendations.push(`Add database tables for ${name} module`);
        }
        if (module.components.api.length === 0) {
          recommendations.push(`Add API endpoints for ${name} module`);
        }
        if (module.components.ui.length === 0) {
          recommendations.push(`Add UI components for ${name} module`);
        }
      } else if (module.confidence < 70) {
        recommendations.push(`Enhance ${name} module - low confidence score (${module.confidence}%)`);
      }
    }
    
    return recommendations;
  }

  /**
   * Compare document requirements against actual system capabilities
   */
  async compareWithDocument(documentAnalysis: any, targetModule?: string): Promise<{
    alreadyHave: any[];
    needToAdd: any[];
    confidence: number;
  }> {
    const systemAnalysis = await this.analyzeSystem(targetModule);
    const alreadyHave: any[] = [];
    const needToAdd: any[] = [];
    
    // If we have document requirements, compare them
    if (documentAnalysis && documentAnalysis.requirements) {
      for (const requirement of documentAnalysis.requirements) {
        const isImplemented = this.checkRequirementImplementation(requirement, systemAnalysis);
        
        if (isImplemented.exists) {
          alreadyHave.push({
            ...requirement,
            implementation: isImplemented.details
          });
        } else {
          needToAdd.push({
            ...requirement,
            reason: isImplemented.reason
          });
        }
      }
    }
    
    const confidence = this.calculateOverallConfidence(systemAnalysis);
    
    return {
      alreadyHave,
      needToAdd,
      confidence
    };
  }

  /**
   * Check if a specific requirement is implemented in the system
   */
  private checkRequirementImplementation(requirement: any, systemAnalysis: any): {
    exists: boolean;
    details?: any;
    reason?: string;
  } {
    const moduleName = requirement.module?.toLowerCase() || 'unknown';
    const module = systemAnalysis.modules[moduleName];
    
    if (!module) {
      return {
        exists: false,
        reason: `Module ${moduleName} not found in system`
      };
    }
    
    // Check if requirement matches existing capabilities
    const requirementName = requirement.name?.toLowerCase() || '';
    
    // Check database tables
    const hasTable = module.components.database.some((table: DatabaseTable) => 
      table.table_name.toLowerCase().includes(requirementName) ||
      requirementName.includes(table.table_name.toLowerCase())
    );
    
    // Check API endpoints
    const hasAPI = module.components.api.some((api: APIEndpoint) =>
      api.path.toLowerCase().includes(requirementName) ||
      requirementName.includes(api.path.toLowerCase())
    );
    
    // Check UI components
    const hasUI = module.components.ui.some((ui: UIComponent) =>
      ui.name.toLowerCase().includes(requirementName) ||
      requirementName.includes(ui.name.toLowerCase())
    );
    
    if (hasTable && hasAPI && hasUI) {
      return {
        exists: true,
        details: {
          database: hasTable,
          api: hasAPI,
          ui: hasUI,
          confidence: module.confidence
        }
      };
    }
    
    return {
      exists: false,
      reason: `Missing components: ${!hasTable ? 'database ' : ''}${!hasAPI ? 'api ' : ''}${!hasUI ? 'ui' : ''}`
    };
  }

  /**
   * Calculate overall system confidence
   */
  private calculateOverallConfidence(systemAnalysis: any): number {
    const modules = Object.values(systemAnalysis.modules) as SystemCapability[];
    const totalConfidence = modules.reduce((sum, module) => sum + module.confidence, 0);
    return Math.round(totalConfidence / modules.length);
  }
}