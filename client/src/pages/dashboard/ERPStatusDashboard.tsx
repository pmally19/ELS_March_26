import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Building2, Package, Users, CreditCard, DollarSign, Factory, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CompanyCode {
  id: number;
  code: string;
  name: string;
  currency: string;
  country: string;
  active: boolean;
}

interface ModuleStatus {
  tableName: string;
  count: number;
  screenName: string;
  isWorking: boolean;
  errors: string[];
  issues: string[];
  dataSource: string;
}

interface ERPStatus {
  companyCode: CompanyCode;
  hierarchy: {
    plants: ModuleStatus;
    customers: ModuleStatus;
    vendors: ModuleStatus;
    glAccounts: ModuleStatus;
    arItems: ModuleStatus;
    apItems: ModuleStatus;
    materials: ModuleStatus;
  };
  dataSourceInfo: {
    primary: string;
    status: string;
  };
}

interface DashboardTile {
  title: string;
  icon: React.ReactNode;
  moduleKey: keyof ERPStatus['hierarchy'];
  color: string;
  description: string;
}

const dashboardTiles: DashboardTile[] = [
  {
    title: 'Manufacturing Plants',
    icon: <Factory className="h-8 w-8" />,
    moduleKey: 'plants',
    color: 'bg-blue-500',
    description: 'Production facilities and manufacturing locations'
  },
  {
    title: 'Customer Master',
    icon: <Users className="h-8 w-8" />,
    moduleKey: 'customers',
    color: 'bg-green-500',
    description: 'Customer accounts and business partners'
  },
  {
    title: 'Vendor Master',
    icon: <Building2 className="h-8 w-8" />,
    moduleKey: 'vendors',
    color: 'bg-purple-500',
    description: 'Supplier and vendor management'
  },
  {
    title: 'Material Master',
    icon: <Package className="h-8 w-8" />,
    moduleKey: 'materials',
    color: 'bg-orange-500',
    description: 'Product catalog and inventory items'
  },
  {
    title: 'Chart of Accounts',
    icon: <DollarSign className="h-8 w-8" />,
    moduleKey: 'glAccounts',
    color: 'bg-emerald-500',
    description: 'Financial account structure'
  },
  {
    title: 'Accounts Receivable',
    icon: <CreditCard className="h-8 w-8" />,
    moduleKey: 'arItems',
    color: 'bg-cyan-500',
    description: 'Customer invoices and receivables'
  },
  {
    title: 'Accounts Payable',
    icon: <CreditCard className="h-8 w-8" />,
    moduleKey: 'apItems',
    color: 'bg-red-500',
    description: 'Vendor invoices and payables'
  }
];

export default function ERPStatusDashboard() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all company codes
  const { data: companyCodes, isLoading: loadingCompanies } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    enabled: true
  });

  // Set default company to Benjamin Moore if available
  useEffect(() => {
    if (companyCodes && !selectedCompanyId) {
      const benjaminMoore = companyCodes.find((cc: CompanyCode) => cc.code === 'BMUS');
      if (benjaminMoore) {
        setSelectedCompanyId(benjaminMoore.id.toString());
      } else if (companyCodes.length > 0) {
        setSelectedCompanyId(companyCodes[0].id.toString());
      }
    }
  }, [companyCodes, selectedCompanyId]);

  // Fetch ERP status for selected company
  const { data: erpStatus, isLoading: loadingStatus, error } = useQuery({
    queryKey: ['/api/agents/data-integrity-comparison', selectedCompanyId, refreshKey],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const response = await fetch(`/api/agents/data-integrity-comparison/${selectedCompanyId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ERP status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedCompanyId,
    retry: 1,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: false
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusColor = (module: ModuleStatus) => {
    if (module.errors.length > 0) return 'text-red-600';
    if (module.issues.length > 0) return 'text-yellow-600';
    if (module.count === 0) return 'text-gray-500';
    return 'text-green-600';
  };

  const getStatusIcon = (module: ModuleStatus) => {
    if (module.errors.length > 0) return <XCircle className="h-5 w-5 text-red-600" />;
    if (module.issues.length > 0) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    if (module.count === 0) return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = (module: ModuleStatus) => {
    if (module.errors.length > 0) return 'Error';
    if (module.issues.length > 0) return 'Warning';
    if (module.count === 0) return 'No Data';
    return 'Operational';
  };

  const getOverallHealth = () => {
    if (!erpStatus) return { status: 'Unknown', color: 'gray' };
    
    const modules = Object.values(erpStatus.hierarchy);
    const hasErrors = modules.some(m => m.errors.length > 0);
    const hasIssues = modules.some(m => m.issues.length > 0);
    const hasNoData = modules.some(m => m.count === 0);
    
    if (hasErrors) return { status: 'Critical Issues', color: 'red' };
    if (hasIssues) return { status: 'Minor Issues', color: 'yellow' };
    if (hasNoData) return { status: 'Incomplete Data', color: 'gray' };
    return { status: 'Healthy', color: 'green' };
  };

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading companies...</span>
      </div>
    );
  }

  const overallHealth = getOverallHealth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ERP System Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor the health and status of all ERP modules</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Company Selection with Error Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-80">
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companyCodes?.map((company: CompanyCode) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.code} - {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {erpStatus && (
                <div className="flex items-center gap-2">
                  <Badge variant={overallHealth.color === 'green' ? 'default' : 'destructive'}>
                    {overallHealth.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {erpStatus.dataSourceInfo.primary} - {erpStatus.dataSourceInfo.status}
                  </span>
                </div>
              )}
            </div>

            {/* Error Summary Boxes */}
            {erpStatus && (
              <div className="flex items-center gap-2">
                {(() => {
                  const modules = Object.values(erpStatus.hierarchy);
                  const totalErrors = modules.reduce((sum, m) => sum + m.errors.length, 0);
                  const totalIssues = modules.reduce((sum, m) => sum + m.issues.length, 0);
                  const modulesWithErrors = modules.filter(m => m.errors.length > 0).length;
                  const modulesWithIssues = modules.filter(m => m.issues.length > 0 && m.errors.length === 0).length;
                  const emptyTables = modules.filter(m => m.count === 0).length;

                  return (
                    <>
                      {totalErrors > 0 && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm font-medium">
                          {totalErrors} Database errors
                        </div>
                      )}
                      {totalIssues > 0 && (
                        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm font-medium">
                          {totalIssues} UI Errors
                        </div>
                      )}
                      {emptyTables > 0 && (
                        <div className="bg-orange-100 border border-orange-400 text-orange-700 px-3 py-2 rounded text-sm font-medium">
                          {emptyTables} table contains
                        </div>
                      )}
                      {totalErrors === 0 && totalIssues === 0 && emptyTables === 0 && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm font-medium">
                          All Systems Operational
                        </div>
                      )}
                      {(totalErrors > 0 || totalIssues > 0 || emptyTables > 0) && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleRefresh}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Fix All
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loadingStatus && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading ERP status...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>Failed to load ERP status: {error.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Tiles */}
      {erpStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardTiles.map((tile) => {
            const moduleData = erpStatus.hierarchy[tile.moduleKey];
            
            const hasProblems = moduleData.errors.length > 0 || moduleData.issues.length > 0 || moduleData.count === 0;
            
            return (
              <Card 
                key={tile.moduleKey} 
                className={`hover:shadow-lg transition-shadow ${
                  hasProblems ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${tile.color} text-white`}>
                      {tile.icon}
                    </div>
                    {getStatusIcon(moduleData)}
                  </div>
                  <CardTitle className={`text-lg ${hasProblems ? 'text-red-700' : ''}`}>
                    {tile.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${hasProblems ? 'text-red-700' : ''}`}>
                        {moduleData.count}
                      </span>
                      <Badge 
                        variant={moduleData.errors.length > 0 ? 'destructive' : 'default'}
                        className={getStatusColor(moduleData)}
                      >
                        {getStatusText(moduleData)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">{tile.description}</p>
                    
                    {moduleData.errors.length > 0 && (
                      <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-700">
                        <strong>Database Errors:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {moduleData.errors.slice(0, 2).map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                          {moduleData.errors.length > 2 && (
                            <li>... and {moduleData.errors.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {moduleData.issues.length > 0 && moduleData.errors.length === 0 && (
                      <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-sm text-yellow-700">
                        <strong>Issues Found:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {moduleData.issues.slice(0, 2).map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                          {moduleData.issues.length > 2 && (
                            <li>... and {moduleData.issues.length - 2} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {moduleData.count === 0 && moduleData.errors.length === 0 && (
                      <div className="bg-orange-100 border border-orange-300 rounded p-2 text-sm text-orange-700">
                        <strong>No Data:</strong> This module contains no records for the selected company.
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Source: {moduleData.dataSource}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detailed Issues Summary */}
      {erpStatus && (() => {
        const modules = Object.values(erpStatus.hierarchy);
        const modulesWithProblems = modules.filter(m => m.errors.length > 0 || m.issues.length > 0 || m.count === 0);
        
        if (modulesWithProblems.length > 0) {
          return (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Issues Detected for {erpStatus.companyCode.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {modulesWithProblems.map((module, idx) => {
                    const tile = dashboardTiles.find(t => erpStatus.hierarchy[t.moduleKey] === module);
                    return (
                      <div key={idx} className="bg-white border border-red-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-700">{tile?.title || module.screenName}</span>
                          <Badge variant="destructive">
                            {module.errors.length > 0 ? 'Error' : module.issues.length > 0 ? 'Issue' : 'No Data'}
                          </Badge>
                        </div>
                        {module.errors.length > 0 && (
                          <ul className="text-sm text-red-600 list-disc list-inside">
                            {module.errors.map((error, errorIdx) => (
                              <li key={errorIdx}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {module.issues.length > 0 && module.errors.length === 0 && (
                          <ul className="text-sm text-yellow-600 list-disc list-inside">
                            {module.issues.map((issue, issueIdx) => (
                              <li key={issueIdx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                        {module.count === 0 && module.errors.length === 0 && module.issues.length === 0 && (
                          <p className="text-sm text-orange-600">No records found in this module</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Summary Statistics */}
      {erpStatus && (
        <Card>
          <CardHeader>
            <CardTitle>System Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(erpStatus.hierarchy).filter(m => m.errors.length === 0 && m.issues.length === 0 && m.count > 0).length}
                </div>
                <div className="text-sm text-gray-600">Healthy Modules</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(erpStatus.hierarchy).filter(m => m.issues.length > 0 && m.errors.length === 0).length}
                </div>
                <div className="text-sm text-gray-600">Modules with Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(erpStatus.hierarchy).filter(m => m.errors.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Modules with Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(erpStatus.hierarchy).reduce((sum, m) => sum + m.count, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}