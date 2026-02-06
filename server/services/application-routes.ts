/**
 * Comprehensive Application Routes Mapping
 * Provides complete route information for Jr Assistant navigation
 */

export interface RouteInfo {
  path: string;
  name: string;
  aliases: string[];
  category: string;
  description?: string;
}

export const applicationRoutes: RouteInfo[] = [
  // Main Modules
  { path: '/', name: 'dashboard', aliases: ['home', 'main', 'dashboard'], category: 'main' },
  { path: '/sales', name: 'sales', aliases: ['sales module', 'sales management'], category: 'sales' },
  { path: '/finance', name: 'finance', aliases: ['finance module', 'financial'], category: 'finance' },
  { path: '/inventory', name: 'inventory', aliases: ['inventory module', 'stock', 'warehouse'], category: 'inventory' },
  { path: '/production', name: 'production', aliases: ['production module', 'manufacturing'], category: 'production' },
  { path: '/purchasing', name: 'purchasing', aliases: ['purchasing module', 'procurement', 'buying'], category: 'purchasing' },
  { path: '/hr', name: 'hr', aliases: ['human resources', 'hr module', 'personnel'], category: 'hr' },
  { path: '/master-data', name: 'master data', aliases: ['master data', 'masterdata', 'data management'], category: 'master-data' },
  { path: '/reports', name: 'reports', aliases: ['reports', 'reporting', 'analytics'], category: 'reports' },
  { path: '/tools', name: 'tools', aliases: ['tools', 'utilities', 'workspace manager'], category: 'tools' },
  { path: '/admin', name: 'admin', aliases: ['admin', 'administration', 'settings'], category: 'admin' },
  { path: '/controlling', name: 'controlling', aliases: ['controlling', 'cost center', 'co'], category: 'controlling' },
  
  // Sales Sub-modules
  { path: '/sales/order-to-cash', name: 'order to cash', aliases: ['order to cash', 'otc', 'order-to-cash'], category: 'sales' },
  { path: '/sales/leads', name: 'sales leads', aliases: ['leads', 'sales leads'], category: 'sales' },
  { path: '/sales/opportunities', name: 'sales opportunities', aliases: ['opportunities', 'sales opportunities'], category: 'sales' },
  { path: '/sales/quotes', name: 'sales quotes', aliases: ['quotes', 'quotations'], category: 'sales' },
  { path: '/sales/orders', name: 'sales orders', aliases: ['sales orders', 'orders'], category: 'sales' },
  { path: '/sales/pricing-procedures', name: 'pricing procedures', aliases: ['pricing', 'pricing procedures'], category: 'sales' },
  
  // Finance Sub-modules
  { path: '/finance/credit-management', name: 'credit management', aliases: ['credit management', 'credit'], category: 'finance' },
  { path: '/finance/accounts-receivable', name: 'accounts receivable', aliases: ['accounts receivable', 'ar', 'receivables'], category: 'finance' },
  { path: '/finance/accounts-payable', name: 'accounts payable', aliases: ['accounts payable', 'ap', 'payables'], category: 'finance' },
  { path: '/finance/general-ledger', name: 'general ledger', aliases: ['general ledger', 'gl', 'ledger'], category: 'finance' },
  { path: '/general-ledger', name: 'general ledger', aliases: ['general ledger', 'gl', 'ledger'], category: 'finance' },
  { path: '/finance/reconciliation', name: 'reconciliation', aliases: ['reconciliation', 'bank reconciliation'], category: 'finance' },
  
  // Master Data Sub-modules
  { path: '/master-data/company-code', name: 'company code', aliases: ['company code', 'company'], category: 'master-data' },
  { path: '/master-data/plant', name: 'plant', aliases: ['plant', 'plants', 'factory'], category: 'master-data' },
  { path: '/master-data/customer-master', name: 'customer master', aliases: ['customer master', 'customers'], category: 'master-data' },
  { path: '/master-data/vendor-master', name: 'vendor master', aliases: ['vendor master', 'vendors', 'suppliers'], category: 'master-data' },
  { path: '/master-data/material-master', name: 'material master', aliases: ['material master', 'materials', 'products'], category: 'master-data' },
  { path: '/master-data/cost-centers', name: 'cost centers', aliases: ['cost centers', 'cost center'], category: 'master-data' },
  { path: '/master-data/work-centers', name: 'work centers', aliases: ['work centers', 'work center'], category: 'master-data' },
  { path: '/master-data/gl-accounts', name: 'gl accounts', aliases: ['gl accounts', 'general ledger accounts'], category: 'master-data' },
  { path: '/master-data/bank-master', name: 'bank master', aliases: ['bank master', 'banks'], category: 'master-data' },
  { path: '/master-data/asset-master', name: 'asset master', aliases: ['asset master', 'assets', 'fixed assets'], category: 'master-data' },
  
  // Transactions
  { path: '/transactions', name: 'transactions', aliases: ['transactions', 'transaction tiles'], category: 'transactions' },
  { path: '/transactions/sales-order', name: 'sales order transaction', aliases: ['sales order transaction'], category: 'transactions' },
  { path: '/transactions/invoice', name: 'invoice transaction', aliases: ['invoice transaction'], category: 'transactions' },
  { path: '/transactions/asset-accounting', name: 'asset accounting', aliases: ['asset accounting', 'fixed asset accounting'], category: 'transactions' },
  { path: '/transactions/bank-statement-processing', name: 'bank statement processing', aliases: ['bank statement', 'bank statements'], category: 'transactions' },
  { path: '/transactions/credit-management', name: 'credit management transaction', aliases: ['credit management transaction'], category: 'transactions' },
  { path: '/transactions/accounts-receivable', name: 'accounts receivable transaction', aliases: ['ar transaction'], category: 'transactions' },
  { path: '/transactions/accounts-payable', name: 'accounts payable transaction', aliases: ['ap transaction'], category: 'transactions' },
  { path: '/transactions/advanced-authorization-management', name: 'advanced authorization management', aliases: ['authorization management', 'user permissions'], category: 'transactions' },
  
  // Tools & Admin
  { path: '/workspace-manager', name: 'workspace manager', aliases: ['workspace manager', 'workspace'], category: 'tools' },
  { path: '/admin/users', name: 'user management', aliases: ['user management', 'users', 'rbac'], category: 'admin' },
  { path: '/admin/rbac', name: 'rbac', aliases: ['rbac', 'role based access control'], category: 'admin' },
  { path: '/api-key-manager', name: 'api key manager', aliases: ['api key manager', 'api keys'], category: 'admin' },
  
  // AI Agents
  { path: '/designer-agent', name: 'designer agent', aliases: ['designer agent'], category: 'ai-agents' },
  { path: '/developer-agent', name: 'developer agent', aliases: ['developer agent'], category: 'ai-agents' },
  { path: '/chief-agent', name: 'chief agent', aliases: ['chief agent'], category: 'ai-agents' },
  { path: '/coach-agent', name: 'coach agent', aliases: ['coach agent'], category: 'ai-agents' },
];

/**
 * Find route by name or alias (fuzzy matching)
 */
export function findRoute(query: string): RouteInfo | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // Exact match first
  for (const route of applicationRoutes) {
    if (route.name.toLowerCase() === lowerQuery || route.path === lowerQuery) {
      return route;
    }
    // Check aliases
    for (const alias of route.aliases) {
      if (alias.toLowerCase() === lowerQuery) {
        return route;
      }
    }
  }
  
  // Fuzzy matching - check if query contains route name or alias
  for (const route of applicationRoutes) {
    if (lowerQuery.includes(route.name.toLowerCase()) || route.name.toLowerCase().includes(lowerQuery)) {
      return route;
    }
    for (const alias of route.aliases) {
      if (lowerQuery.includes(alias.toLowerCase()) || alias.toLowerCase().includes(lowerQuery)) {
        return route;
      }
    }
  }
  
  // Partial word matching
  const queryWords = lowerQuery.split(/\s+/);
  for (const route of applicationRoutes) {
    const routeWords = route.name.toLowerCase().split(/\s+/);
    const aliasWords = route.aliases.flatMap(a => a.toLowerCase().split(/\s+/));
    const allWords = [...routeWords, ...aliasWords];
    
    // Check if all query words are found in route
    const allMatch = queryWords.every(qw => 
      allWords.some(rw => rw.includes(qw) || qw.includes(rw))
    );
    
    if (allMatch && queryWords.length > 0) {
      return route;
    }
  }
  
  return null;
}

/**
 * Get all routes in a category
 */
export function getRoutesByCategory(category: string): RouteInfo[] {
  return applicationRoutes.filter(route => route.category === category);
}

/**
 * Search routes by keyword
 */
export function searchRoutes(keyword: string): RouteInfo[] {
  const lowerKeyword = keyword.toLowerCase();
  return applicationRoutes.filter(route => 
    route.name.toLowerCase().includes(lowerKeyword) ||
    route.path.toLowerCase().includes(lowerKeyword) ||
    route.aliases.some(alias => alias.toLowerCase().includes(lowerKeyword)) ||
    (route.description && route.description.toLowerCase().includes(lowerKeyword))
  );
}

