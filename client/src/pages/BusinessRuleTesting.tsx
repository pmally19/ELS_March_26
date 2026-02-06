/**
 * Business Rule Testing Interface
 * Demonstrates real-world business exception handling scenarios
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface BusinessException {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  actions?: string[];
  details?: any;
}

interface ValidationResult {
  success: boolean;
  exceptions: BusinessException[];
  hasErrors: boolean;
  hasWarnings: boolean;
  canProcess?: boolean;
  canClose?: boolean;
}

export default function BusinessRuleTesting() {
  const [testResults, setTestResults] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testScenarios = [
    {
      id: 'multi-currency',
      title: 'US Company → Canadian Supplier Payment',
      description: 'Large CAD payment requiring currency validation',
      endpoint: '/api/business-rules/validate/multi-currency-payment',
      data: {
        companyCode: 'US001',
        vendorCode: 'CA_SUPPLIER_001',
        amount: 15000,
        currency: 'CAD',
        paymentMethod: 'WIRE_TRANSFER'
      }
    },
    {
      id: 'account-closure',
      title: 'Payroll Account Closure Attempt',
      description: 'Trying to close account with unprocessed salaries',
      endpoint: '/api/business-rules/validate/account-closure',
      data: {
        accountNumber: '2100-PAYROLL',
        companyCode: 'US001',
        closureDate: '2025-07-15',
        reason: 'Account restructuring'
      }
    },
    {
      id: 'cross-border-tax',
      title: 'Mexico Purchase Tax Compliance',
      description: 'Large manufacturing purchase from Mexico',
      endpoint: '/api/business-rules/validate/cross-border-tax',
      data: {
        companyCode: 'US001',
        vendorCountry: 'MX',
        amount: 25000,
        currency: 'MXN',
        productCategory: 'MANUFACTURED_GOODS'
      }
    },
    {
      id: 'payroll-processing',
      title: 'Payroll Processing with Insufficient Funds',
      description: 'Attempting payroll without adequate account balance',
      endpoint: '/api/business-rules/validate/payroll-processing',
      data: {
        companyCode: 'US001',
        payPeriod: '2025-07',
        employeeCount: 25,
        totalAmount: 125000,
        payrollAccountNumber: '2100-PAYROLL'
      }
    }
  ];

  const runTest = async (scenario: typeof testScenarios[0]) => {
    setLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch(scenario.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.data)
      });
      
      const result = await response.json();
      setTestResults(result);
    } catch (error) {
      setTestResults({
        success: false,
        exceptions: [{
          code: 'TEST_ERROR',
          message: `Failed to test scenario: ${error.message}`,
          severity: 'ERROR'
        }],
        hasErrors: true,
        hasWarnings: false
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR': return <X className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'ERROR': return 'destructive';
      case 'WARNING': return 'secondary';
      case 'INFO': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Business Rule Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test real-world business scenarios and exception handling for multi-national operations
        </p>
      </div>

      <Tabs defaultValue="scenarios" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">Validation Results</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testScenarios.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{scenario.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Test Data:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(scenario.data, null, 2)}
                      </pre>
                    </div>
                    <Button 
                      onClick={() => runTest(scenario)}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Testing...' : 'Run Test'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {!testResults ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select a test scenario to see validation results here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Validation Results
                    {testResults.success ? (
                      <Badge variant="outline" className="text-green-600">
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{testResults.exceptions.length}</div>
                      <div className="text-sm text-muted-foreground">Total Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {testResults.exceptions.filter(e => e.severity === 'ERROR').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {testResults.exceptions.filter(e => e.severity === 'WARNING').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {testResults.exceptions.filter(e => e.severity === 'INFO').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Info</div>
                    </div>
                  </div>

                  {testResults.exceptions.length === 0 ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        No business rule violations found. Transaction can proceed.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      {testResults.exceptions.map((exception, index) => (
                        <Alert key={index} className="border-l-4 border-l-current">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(exception.severity)}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={getSeverityColor(exception.severity) as any}>
                                  {exception.code}
                                </Badge>
                                <Badge variant="outline">{exception.severity}</Badge>
                              </div>
                              <p className="font-medium">{exception.message}</p>
                              {exception.actions && exception.actions.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Recommended Actions:
                                  </p>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                    {exception.actions.map((action, actionIndex) => (
                                      <li key={actionIndex}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}