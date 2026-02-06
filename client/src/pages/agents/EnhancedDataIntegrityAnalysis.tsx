import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Database, Monitor, ArrowRight, AlertTriangle, CheckCircle, Users, Building, CreditCard, Package, RefreshCw, ExternalLink, ArrowLeft } from "lucide-react";


interface CompanyCodeData {
  id: number;
  code: string;
  name: string;
  currency: string;
  country: string;
  active: boolean;
}

interface ComparisonResult {
  companyCode: CompanyCodeData;
  hierarchy: {
    [key: string]: {
      tableName: string;
      count: number;
      sampleData: any[];
      tableStructure: Array<{column_name: string; data_type: string; is_nullable: string}>;
      dataSource: string;
      issues: string[];
      screenName: string;
      path: string;
      displayCount: number;
      isWorking: boolean;
      errors: string[];
    };
  };
  dataSourceInfo: {
    primary: string;
    endpoint: string;
    status: string;
  };
}

export default function EnhancedDataIntegrityAnalysis() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all company codes
  const { data: companyCodes, isLoading: loadingCompanies } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    enabled: true
  });

  // Fetch detailed comparison data for selected company
  const { data: comparisonData, isLoading: loadingDetails, error } = useQuery({
    queryKey: ['/api/agents/data-integrity-comparison', selectedCompanyId, refreshKey],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const response = await fetch(`/api/agents/data-integrity-comparison/${selectedCompanyId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch comparison data: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!selectedCompanyId,
    retry: 3
  });

  const refreshAnalysis = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderEntityCard = (entityKey: string, entityData: any) => {
    if (!entityData) return null;

    const isSync = entityData.count === entityData.displayCount && entityData.isWorking;
    const hasIssues = entityData.issues?.length > 0 || entityData.errors?.length > 0;
    
    const iconMap: { [key: string]: React.ReactNode } = {
      plants: <Building className="h-5 w-5 text-blue-600" />,
      customers: <Users className="h-5 w-5 text-green-600" />,
      vendors: <Users className="h-5 w-5 text-purple-600" />,
      glAccounts: <CreditCard className="h-5 w-5 text-orange-600" />,
      arItems: <CreditCard className="h-5 w-5 text-red-600" />,
      apItems: <CreditCard className="h-5 w-5 text-blue-600" />,
      materials: <Package className="h-5 w-5 text-teal-600" />
    };

    return (
      <Card key={entityKey} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {iconMap[entityKey]}
            <span>{entityData.screenName}</span>
            {isSync && !hasIssues ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Synchronized
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Issues Found
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Side */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Database Table</h4>
                <Badge variant="outline" className={`text-xs ${entityData.dataSource?.includes('AWS') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {entityData.dataSource || 'Local PostgreSQL'}
                </Badge>
              </div>
              
              {/* Table Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Table:</span>
                  <div className="font-medium">{entityData.tableName}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Record Count:</span>
                  <div className="font-medium">{entityData.count}</div>
                </div>
              </div>

              {/* Table Structure */}
              {entityData.tableStructure?.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600 font-medium">Table Structure:</span>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-200 px-2 py-1 text-left">Column</th>
                          <th className="border border-gray-200 px-2 py-1 text-left">Type</th>
                          <th className="border border-gray-200 px-2 py-1 text-left">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entityData.tableStructure.slice(0, 5).map((col, index) => (
                          <tr key={index}>
                            <td className="border border-gray-200 px-2 py-1">{col.column_name}</td>
                            <td className="border border-gray-200 px-2 py-1">{col.data_type}</td>
                            <td className="border border-gray-200 px-2 py-1">{col.is_nullable}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entityData.tableStructure.length > 5 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ... and {entityData.tableStructure.length - 5} more columns
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Data in Table Format */}
              {entityData.sampleData?.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600 font-medium">Sample Data:</span>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          {Object.keys(entityData.sampleData[0]).slice(0, 4).map((key) => (
                            <th key={key} className="border border-gray-200 px-2 py-1 text-left">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entityData.sampleData.slice(0, 3).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).slice(0, 4).map((value: any, colIndex) => (
                              <td key={colIndex} className="border border-gray-200 px-2 py-1">
                                {typeof value === 'string' && value.length > 20 
                                  ? `${value.substring(0, 20)}...` 
                                  : String(value)
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Issues */}
              {entityData.issues?.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-red-600 font-medium">Issues:</span>
                  <ul className="text-xs text-red-600 mt-1">
                    {entityData.issues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* UI Screen Side */}
            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-800">UI Screen</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Screen:</span>
                  <span className="font-medium">{entityData.screenName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Path:</span>
                  <span className="font-medium text-xs">{entityData.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Display Count:</span>
                  <span className="font-medium">{entityData.displayCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`font-medium ${entityData.isWorking ? 'text-green-600' : 'text-red-600'}`}>
                    {entityData.isWorking ? 'Working' : 'Error'}
                  </span>
                </div>
                {entityData.errors?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-red-600 font-medium">UI Errors:</span>
                    <ul className="text-xs text-red-600 mt-1">
                      {entityData.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(entityData.path, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => window.location.href = entityData.path}
                  >
                    Go to Screen
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Synchronization Status */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Synchronization Status:</span>
              {isSync && !hasIssues ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Perfect Match</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    {entityData.count !== entityData.displayCount ? 
                      `Count Mismatch (DB: ${entityData.count}, UI: ${entityData.displayCount})` : 
                      'Other Issues Found'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          AI Agents → Enhanced Data Integrity Analysis
        </div>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Enhanced Data Integrity Analysis</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Compare database tables with UI screens to identify synchronization issues and ensure all ERP application screens work correctly for any company code.
        </p>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Company Code for Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a company code..." />
              </SelectTrigger>
              <SelectContent>
                {companyCodes?.map((company: CompanyCodeData) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.code} - {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyId && (
              <Button 
                onClick={refreshAnalysis}
                variant="outline"
                disabled={loadingDetails}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingDetails ? 'animate-spin' : ''}`} />
                {loadingDetails ? 'Refreshing...' : 'Refresh Analysis'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Handling */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Analysis Failed</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Failed to fetch comparison data. Please check if the selected company has proper data setup.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Comparison Results */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Building className="h-5 w-5" />
                Company: {comparisonData.companyCode.code} - {comparisonData.companyCode.name}
                <Badge className="bg-blue-100 text-blue-800">
                  {comparisonData.dataSourceInfo?.status === 'Connected' ? 'AWS RDS' : 'Local Fallback'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">Currency:</span>
                  <div className="font-medium">{comparisonData.companyCode.currency}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Country:</span>
                  <div className="font-medium">{comparisonData.companyCode.country}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className="font-medium">
                    <Badge className={comparisonData.companyCode.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {comparisonData.companyCode.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Data Source Information */}
              {comparisonData.dataSourceInfo && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-2">Data Source Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Primary Source:</span>
                      <div className="font-medium">{comparisonData.dataSourceInfo.primary}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Endpoint:</span>
                      <div className="font-medium text-xs">{comparisonData.dataSourceInfo.endpoint}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Connection Status:</span>
                      <div className="font-medium">
                        <Badge className={comparisonData.dataSourceInfo.status === 'Connected' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {comparisonData.dataSourceInfo.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hierarchical Analysis */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Hierarchical Data Analysis</h2>
            
            {comparisonData.hierarchy && Object.keys(comparisonData.hierarchy).map(entityKey => 
              renderEntityCard(entityKey, comparisonData.hierarchy[entityKey])
            )}
          </div>
        </div>
      )}

      {loadingDetails && selectedCompanyId && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Analyzing data integrity for selected company...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}