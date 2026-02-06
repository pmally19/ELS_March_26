import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Database, Monitor, ArrowRight, AlertTriangle, CheckCircle, Users, Building, CreditCard, Package } from "lucide-react";

interface CompanyCodeData {
  id: number;
  code: string;
  name: string;
  currency: string;
  country: string;
  active: boolean;
}

interface TableData {
  tableName: string;
  count: number;
  sampleData: any[];
  issues: string[];
}

interface UIScreenData {
  screenName: string;
  path: string;
  displayCount: number;
  isWorking: boolean;
  errors: string[];
}

interface ComparisonData {
  companyCode: CompanyCodeData;
  hierarchy: {
    plants: TableData & UIScreenData;
    customers: TableData & UIScreenData;
    vendors: TableData & UIScreenData;
    glAccounts: TableData & UIScreenData;
    arItems: TableData & UIScreenData;
    apItems: TableData & UIScreenData;
    materials: TableData & UIScreenData;
  };
}

export default function DataIntegritySideBySide() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);

  // Fetch all company codes
  const { data: companyCodes, isLoading: loadingCompanies } = useQuery({
    queryKey: ['/api/master-data/company-codes'],
    enabled: true
  });

  // Fetch detailed comparison data for selected company
  const { data: detailedData, isLoading: loadingDetails, refetch: refetchData } = useQuery({
    queryKey: ['/api/agents/data-integrity-comparison', selectedCompanyId],
    enabled: !!selectedCompanyId
  });

  useEffect(() => {
    if (detailedData) {
      setComparisonData(detailedData);
    }
  }, [detailedData]);

  const renderComparisonCard = (title: string, icon: React.ReactNode, tableData: TableData, uiData: UIScreenData) => {
    const isSync = tableData.count === uiData.displayCount && uiData.isWorking;
    const hasIssues = tableData.issues.length > 0 || uiData.errors.length > 0;

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {icon}
            <span>{title}</span>
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
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Table:</span>
                  <span className="font-medium">{tableData.tableName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Record Count:</span>
                  <span className="font-medium">{tableData.count}</span>
                </div>
                {tableData.issues.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-red-600 font-medium">Issues:</span>
                    <ul className="text-xs text-red-600 mt-1">
                      {tableData.issues.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {tableData.sampleData.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600 font-medium">Sample Data:</span>
                    <div className="text-xs bg-white p-2 rounded mt-1 max-h-20 overflow-y-auto">
                      <pre>{JSON.stringify(tableData.sampleData[0], null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
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
                  <span className="font-medium">{uiData.screenName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Path:</span>
                  <span className="font-medium text-xs">{uiData.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Display Count:</span>
                  <span className="font-medium">{uiData.displayCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`font-medium ${uiData.isWorking ? 'text-green-600' : 'text-red-600'}`}>
                    {uiData.isWorking ? 'Working' : 'Error'}
                  </span>
                </div>
                {uiData.errors.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-red-600 font-medium">UI Errors:</span>
                    <ul className="text-xs text-red-600 mt-1">
                      {uiData.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(uiData.path, '_blank')}
                  >
                    Open Screen
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => window.location.href = uiData.path}
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
                    {tableData.count !== uiData.displayCount ? 
                      `Count Mismatch (DB: ${tableData.count}, UI: ${uiData.displayCount})` : 
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
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Data Integrity: Side-by-Side Analysis</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Compare database tables with UI screens to identify synchronization issues and data inconsistencies from Company Code down to all related entities.
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
                onClick={() => refetchData()}
                variant="outline"
                disabled={loadingDetails}
              >
                {loadingDetails ? 'Refreshing...' : 'Refresh Analysis'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison */}
      {comparisonData && (
        <div className="space-y-6">
          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Building className="h-5 w-5" />
                Company: {comparisonData.companyCode.code} - {comparisonData.companyCode.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            </CardContent>
          </Card>

          {/* Hierarchical Data Comparison */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Hierarchical Data Analysis</h2>
            
            {renderComparisonCard(
              "Plants", 
              <Building className="h-5 w-5 text-blue-600" />, 
              comparisonData.hierarchy.plants, 
              comparisonData.hierarchy.plants
            )}

            {renderComparisonCard(
              "Customers", 
              <Users className="h-5 w-5 text-green-600" />, 
              comparisonData.hierarchy.customers, 
              comparisonData.hierarchy.customers
            )}

            {renderComparisonCard(
              "Vendors", 
              <Users className="h-5 w-5 text-purple-600" />, 
              comparisonData.hierarchy.vendors, 
              comparisonData.hierarchy.vendors
            )}

            {renderComparisonCard(
              "GL Accounts", 
              <CreditCard className="h-5 w-5 text-orange-600" />, 
              comparisonData.hierarchy.glAccounts, 
              comparisonData.hierarchy.glAccounts
            )}

            {renderComparisonCard(
              "AR Items", 
              <CreditCard className="h-5 w-5 text-red-600" />, 
              comparisonData.hierarchy.arItems, 
              comparisonData.hierarchy.arItems
            )}

            {renderComparisonCard(
              "AP Items", 
              <CreditCard className="h-5 w-5 text-blue-600" />, 
              comparisonData.hierarchy.apItems, 
              comparisonData.hierarchy.apItems
            )}

            {renderComparisonCard(
              "Materials", 
              <Package className="h-5 w-5 text-teal-600" />, 
              comparisonData.hierarchy.materials, 
              comparisonData.hierarchy.materials
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