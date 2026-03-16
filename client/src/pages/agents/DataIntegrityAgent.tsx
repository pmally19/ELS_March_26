import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Database, Monitor, Building } from 'lucide-react';

interface IntegrityIssue {
  category: 'MASTER_DATA' | 'TRANSACTIONS' | 'BUSINESS_DOMAIN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'MISSING_DATA' | 'UI_SYNC' | 'FOREIGN_KEY' | 'CONSTRAINT' | 'ORPHANED_DATA';
  table: string;
  issue: string;
  recommendation: string;
  affectedRecords?: number;
}

interface IntegrityReport {
  summary: {
    masterData: number;
    transactions: number;
    businessDomain: number;
    totalIssues: number;
  };
  issues: IntegrityIssue[];
  recommendations: string[];
}

export default function DataIntegrityAgent() {
  const [isRunning, setIsRunning] = useState(false);

  const { data: report, isLoading, error, refetch } = useQuery<IntegrityReport>({
    queryKey: ['/api/agents/data-integrity-check'],
    enabled: false // Only run when manually triggered
  });

  const handleRunCheck = async () => {
    setIsRunning(true);
    await refetch();
    setIsRunning(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MASTER_DATA': return <Database className="h-4 w-4" />;
      case 'TRANSACTIONS': return <Building className="h-4 w-4" />;
      case 'BUSINESS_DOMAIN': return <Monitor className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getHealthScore = () => {
    if (!report) return 0;
    const totalPossibleIssues = 50; // Estimated baseline
    const currentIssues = report.summary.totalIssues;
    return Math.max(0, Math.min(100, ((totalPossibleIssues - currentIssues) / totalPossibleIssues) * 100));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Integrity Agent</h1>
          <p className="text-muted-foreground">
            Comprehensive database and UI synchronization analysis
          </p>
        </div>
        <Button 
          onClick={handleRunCheck} 
          disabled={isLoading || isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(isLoading || isRunning) ? 'animate-spin' : ''}`} />
          {isLoading || isRunning ? 'Analyzing...' : 'Run Integrity Check'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to run integrity check: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(getHealthScore())}%</div>
                <Progress value={getHealthScore()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Master Data</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.masterData}</div>
                <p className="text-xs text-muted-foreground">Issues found</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.transactions}</div>
                <p className="text-xs text-muted-foreground">Issues found</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Business Domain</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.businessDomain}</div>
                <p className="text-xs text-muted-foreground">Issues found</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="issues" className="space-y-4">
            <TabsList>
              <TabsTrigger value="issues">Issues Found</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="master-data">Master Data Details</TabsTrigger>
            </TabsList>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Data Integrity Issues</CardTitle>
                  <CardDescription>
                    {report.issues.length} issues found across all categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.issues.map((issue, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(issue.severity)}
                          {getCategoryIcon(issue.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline">{issue.category}</Badge>
                            <Badge variant="secondary">{issue.table}</Badge>
                          </div>
                          <p className="font-medium">{issue.issue}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {issue.recommendation}
                          </p>
                          {issue.affectedRecords && (
                            <p className="text-xs text-red-600 mt-1">
                              Affects {issue.affectedRecords} records
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Recommendations</CardTitle>
                  <CardDescription>
                    Priority actions to improve data integrity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <p>{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="master-data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Master Data Analysis</CardTitle>
                  <CardDescription>
                    Detailed breakdown of Benjamin Moore paint company data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.issues
                      .filter(issue => issue.category === 'MASTER_DATA')
                      .map((issue, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{issue.table}</h4>
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{issue.issue}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solution: {issue.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!report && !isLoading && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Analyze</CardTitle>
            <CardDescription>
              Click "Run Integrity Check" to analyze database tables, UI synchronization, and business domain consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                The agent will check Master Data, Transactions, and Business Domain functionalities
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}