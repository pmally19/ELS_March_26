import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronRight, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Building2,
  CreditCard,
  Calendar,
  Database,
  FileText,
  Settings,
  Brain,
  ArrowRight,
  BookOpen,
  DollarSign,
  Receipt,
  UserCheck,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  category: string;
  order: number;
  completed: boolean;
  aiGuidance: string;
  sampleData: any;
  validationRules: string[];
  nextSteps: string[];
  dependencies: string[];
}

interface FinancialProcess {
  chartOfAccounts: ProcessStep[];
  salesBilling: ProcessStep[];
  accountsPayable: ProcessStep[];
  accountsReceivable: ProcessStep[];
}

export default function EndToEndFinancialGuide() {
  const [currentProcess, setCurrentProcess] = useState('chartOfAccounts');
  const [currentStep, setCurrentStep] = useState(0);
  const [processes, setProcesses] = useState<FinancialProcess | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isGettingGuidance, setIsGettingGuidance] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize end-to-end financial processes
  useEffect(() => {
    const initializeProcesses = (): FinancialProcess => {
      return {
        chartOfAccounts: [
          {
            id: 'coa-setup',
            title: 'Chart of Accounts Setup',
            description: 'Define and configure your complete chart of accounts structure',
            category: 'Foundation',
            order: 1,
            completed: false,
            aiGuidance: 'Set up the foundational chart of accounts with proper account numbers, groups, and classifications',
            sampleData: {
              accounts: [
                { number: '1000', name: 'Cash and Cash Equivalents', type: 'Assets' },
                { number: '1100', name: 'Accounts Receivable', type: 'Assets' },
                { number: '2000', name: 'Accounts Payable', type: 'Liabilities' },
                { number: '4000', name: 'Sales Revenue', type: 'Revenue' },
                { number: '5000', name: 'Cost of Goods Sold', type: 'Expenses' }
              ]
            },
            validationRules: [
              'Account numbers must be unique',
              'Each account must have a proper classification',
              'Revenue and expense accounts need proper P&L mapping'
            ],
            nextSteps: ['Configure account posting rules', 'Set up automatic posting keys'],
            dependencies: []
          },
          {
            id: 'posting-rules',
            title: 'Configure Posting Rules',
            description: 'Set up automatic posting rules and account determination',
            category: 'Foundation',
            order: 2,
            completed: false,
            aiGuidance: 'Configure how transactions automatically post to the correct GL accounts',
            sampleData: {
              rules: [
                { transaction: 'Sales Invoice', debit: '1100', credit: '4000' },
                { transaction: 'Customer Payment', debit: '1000', credit: '1100' },
                { transaction: 'Vendor Invoice', debit: '5000', credit: '2000' },
                { transaction: 'Vendor Payment', debit: '2000', credit: '1000' }
              ]
            },
            validationRules: [
              'Debit and credit accounts must balance',
              'Accounts must exist in chart of accounts',
              'Posting rules must cover all transaction types'
            ],
            nextSteps: ['Test posting rules', 'Configure sales billing process'],
            dependencies: ['coa-setup']
          }
        ],
        salesBilling: [
          {
            id: 'customer-setup',
            title: 'Customer Master Data Setup',
            description: 'Configure customer master records with billing information',
            category: 'Sales Process',
            order: 3,
            completed: false,
            aiGuidance: 'Set up customer master data with proper credit management and billing terms',
            sampleData: {
              customer: {
                id: 'CUST001',
                name: 'ABC Corporation',
                billingAddress: '123 Business Ave, City, State',
                paymentTerms: 'Net 30',
                creditLimit: 50000,
                taxCode: 'TAXABLE'
              }
            },
            validationRules: [
              'Customer ID must be unique',
              'Billing address is required',
              'Payment terms must be defined',
              'Credit limit must be set'
            ],
            nextSteps: ['Create sales orders', 'Generate invoices'],
            dependencies: ['posting-rules']
          },
          {
            id: 'sales-invoice-creation',
            title: 'Sales Invoice Creation Process',
            description: 'Create and post sales invoices with proper GL account posting',
            category: 'Sales Process',
            order: 4,
            completed: false,
            aiGuidance: 'Generate sales invoices that automatically post to revenue and receivables accounts',
            sampleData: {
              invoice: {
                invoiceNumber: 'INV-2024-001',
                customer: 'CUST001',
                date: '2024-01-15',
                lineItems: [
                  { description: 'Product A', quantity: 10, unitPrice: 100, total: 1000 },
                  { description: 'Product B', quantity: 5, unitPrice: 200, total: 1000 }
                ],
                subtotal: 2000,
                tax: 160,
                total: 2160,
                glPostings: [
                  { account: '1100', debit: 2160, description: 'Accounts Receivable' },
                  { account: '4000', credit: 2000, description: 'Sales Revenue' },
                  { account: '2300', credit: 160, description: 'Sales Tax Payable' }
                ]
              }
            },
            validationRules: [
              'Invoice must have valid customer',
              'Line items must have quantities and prices',
              'GL postings must balance',
              'Tax calculations must be accurate'
            ],
            nextSteps: ['Process customer payments', 'Monitor receivables aging'],
            dependencies: ['customer-setup']
          }
        ],
        accountsReceivable: [
          {
            id: 'ar-monitoring',
            title: 'Accounts Receivable Monitoring',
            description: 'Track and manage customer receivables and aging',
            category: 'AR Management',
            order: 5,
            completed: false,
            aiGuidance: 'Monitor customer balances and aging to optimize cash flow',
            sampleData: {
              arAging: [
                { customer: 'CUST001', current: 2160, days30: 1500, days60: 0, days90: 0, total: 3660 },
                { customer: 'CUST002', current: 5000, days30: 2000, days60: 1000, days90: 500, total: 8500 }
              ],
              summary: {
                totalReceivables: 12160,
                currentPercentage: 59.2,
                overdueAmount: 4000,
                averageDaysOutstanding: 28
              }
            },
            validationRules: [
              'Aging buckets must be accurate',
              'Customer balances must match GL',
              'Overdue accounts need follow-up',
              'Bad debt provisions may be required'
            ],
            nextSteps: ['Process customer payments', 'Send dunning notices'],
            dependencies: ['sales-invoice-creation']
          },
          {
            id: 'customer-payment-processing',
            title: 'Customer Payment Processing',
            description: 'Process and apply customer payments to open invoices',
            category: 'AR Management',
            order: 6,
            completed: false,
            aiGuidance: 'Efficiently process customer payments and apply them to outstanding invoices',
            sampleData: {
              payment: {
                paymentId: 'PMT-2024-001',
                customer: 'CUST001',
                amount: 2160,
                paymentDate: '2024-02-10',
                paymentMethod: 'Bank Transfer',
                reference: 'Wire Transfer Ref: WT12345',
                appliedTo: [
                  { invoice: 'INV-2024-001', appliedAmount: 2160 }
                ],
                glPostings: [
                  { account: '1000', debit: 2160, description: 'Cash - Bank Account' },
                  { account: '1100', credit: 2160, description: 'Accounts Receivable' }
                ]
              }
            },
            validationRules: [
              'Payment amount must match application',
              'GL postings must balance',
              'Customer account must be valid',
              'Payment method must be specified'
            ],
            nextSteps: ['Update customer aging', 'Generate payment confirmation'],
            dependencies: ['ar-monitoring']
          }
        ],
        accountsPayable: [
          {
            id: 'vendor-setup',
            title: 'Vendor Master Data Setup',
            description: 'Configure vendor master records with payment information',
            category: 'AP Management',
            order: 7,
            completed: false,
            aiGuidance: 'Set up vendor master data with proper payment terms and account assignments',
            sampleData: {
              vendor: {
                id: 'VEND001',
                name: 'XYZ Supplies Inc',
                address: '456 Supplier Blvd, City, State',
                paymentTerms: 'Net 30',
                paymentMethod: 'Check',
                taxId: '12-3456789',
                bankAccount: '987654321'
              }
            },
            validationRules: [
              'Vendor ID must be unique',
              'Address information is required',
              'Payment terms must be defined',
              'Tax ID is required for 1099 reporting'
            ],
            nextSteps: ['Process vendor invoices', 'Schedule payments'],
            dependencies: ['posting-rules']
          },
          {
            id: 'vendor-invoice-processing',
            title: 'Vendor Invoice Processing',
            description: 'Process vendor invoices and create payable entries',
            category: 'AP Management',
            order: 8,
            completed: false,
            aiGuidance: 'Efficiently process vendor invoices with proper expense and payable account posting',
            sampleData: {
              vendorInvoice: {
                invoiceNumber: 'VINV-2024-001',
                vendor: 'VEND001',
                invoiceDate: '2024-01-20',
                dueDate: '2024-02-19',
                description: 'Office Supplies',
                amount: 500,
                taxAmount: 40,
                total: 540,
                glPostings: [
                  { account: '6100', debit: 500, description: 'Office Supplies Expense' },
                  { account: '2300', debit: 40, description: 'Input Tax' },
                  { account: '2000', credit: 540, description: 'Accounts Payable' }
                ]
              }
            },
            validationRules: [
              'Vendor must exist in master data',
              'Invoice date cannot be future dated',
              'GL postings must balance',
              'Expense accounts must be valid'
            ],
            nextSteps: ['Approve for payment', 'Schedule payment run'],
            dependencies: ['vendor-setup']
          },
          {
            id: 'payment-processing',
            title: 'Vendor Payment Processing',
            description: 'Process payments to vendors and update payable balances',
            category: 'AP Management',
            order: 9,
            completed: false,
            aiGuidance: 'Execute vendor payments and maintain proper cash flow management',
            sampleData: {
              payment: {
                paymentId: 'VPMT-2024-001',
                vendor: 'VEND001',
                paymentDate: '2024-02-15',
                amount: 540,
                paymentMethod: 'Check',
                checkNumber: 'CHK-001234',
                appliedTo: [
                  { invoice: 'VINV-2024-001', appliedAmount: 540 }
                ],
                glPostings: [
                  { account: '2000', debit: 540, description: 'Accounts Payable' },
                  { account: '1000', credit: 540, description: 'Cash - Bank Account' }
                ]
              }
            },
            validationRules: [
              'Payment amount must not exceed payable balance',
              'GL postings must balance',
              'Payment method must be valid',
              'Bank account must have sufficient funds'
            ],
            nextSteps: ['Update vendor aging', 'Reconcile bank account'],
            dependencies: ['vendor-invoice-processing']
          }
        ]
      };
    };

    setProcesses(initializeProcesses());
  }, []);

  // Get AI guidance for current step
  const getAIGuidance = async (step: ProcessStep) => {
    setIsGettingGuidance(true);
    try {
      const response = await fetch('/api/ai/agents/finance/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Provide detailed end-to-end guidance for "${step.title}". This is step ${step.order} in the financial process flow. Include specific actions, GL account postings, and integration with subsequent steps. Context: ${step.description}. Sample data: ${JSON.stringify(step.sampleData)}`
        })
      });

      const result = await response.json();
      if (result.success) {
        setAiResponse(result.response);
        toast({
          title: "Financial AI Guidance",
          description: `Guidance provided for ${step.title}`
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Guidance Error",
        description: "Failed to get AI guidance"
      });
    } finally {
      setIsGettingGuidance(false);
    }
  };

  // Mark step as completed
  const completeStep = (processKey: keyof FinancialProcess, stepId: string) => {
    if (!processes) return;

    setProcesses(prev => {
      if (!prev) return prev;
      
      const process = { ...prev[processKey] };
      const stepIndex = process.findIndex(step => step.id === stepId);
      
      if (stepIndex !== -1) {
        process[stepIndex] = {
          ...process[stepIndex],
          completed: true
        };
      }

      return {
        ...prev,
        [processKey]: process
      };
    });

    toast({
      title: "Step Completed",
      description: "Moving to next step in the process"
    });
  };

  // Get all steps in order
  const getAllSteps = () => {
    if (!processes) return [];
    return [
      ...processes.chartOfAccounts,
      ...processes.salesBilling,
      ...processes.accountsReceivable,
      ...processes.accountsPayable
    ].sort((a, b) => a.order - b.order);
  };

  // Calculate overall progress
  const calculateProgress = () => {
    const allSteps = getAllSteps();
    const completedSteps = allSteps.filter(step => step.completed).length;
    return Math.round((completedSteps / allSteps.length) * 100);
  };

  const renderProcessStep = (step: ProcessStep, processKey: keyof FinancialProcess) => {
    const isDisabled = step.dependencies.some(dep => {
      const allSteps = getAllSteps();
      const depStep = allSteps.find(s => s.id === dep);
      return depStep && !depStep.completed;
    });

    return (
      <Card key={step.id} className={`${step.completed ? 'bg-green-50 border-green-200' : ''} ${isDisabled ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                {step.order}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {step.title}
                  <Badge variant="outline">{step.category}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => getAIGuidance(step)}
                disabled={isGettingGuidance}
              >
                <Brain className="h-4 w-4 mr-1" />
                {isGettingGuidance ? 'Getting...' : 'AI Guide'}
              </Button>
              <Button
                variant={step.completed ? "secondary" : "default"}
                size="sm"
                onClick={() => completeStep(processKey, step.id)}
                disabled={isDisabled || step.completed}
              >
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Circle className="h-4 w-4 mr-1" />
                )}
                {step.completed ? 'Completed' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Sample Data</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                <pre>{JSON.stringify(step.sampleData, null, 2)}</pre>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Validation Rules</Label>
              <ul className="mt-2 space-y-1">
                {step.validationRules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {step.nextSteps.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Next Steps</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {step.nextSteps.map((nextStep, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {nextStep}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!processes) {
    return <div className="p-6">Loading end-to-end financial process guide...</div>;
  }

  const allSteps = getAllSteps();
  const currentStepData = allSteps[currentStep];
  const progress = calculateProgress();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">End-to-End Financial Process Guide</h1>
          <p className="text-muted-foreground mt-2">
            AI-guided setup from Chart of Accounts to Sales Billing, Payables, and Receivables
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{progress}%</div>
          <div className="text-sm text-muted-foreground">Complete</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Process Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <div className="space-y-3">
                {[
                  { key: 'chartOfAccounts', label: 'Chart of Accounts', icon: BookOpen, color: 'blue' },
                  { key: 'salesBilling', label: 'Sales & Billing', icon: Receipt, color: 'green' },
                  { key: 'accountsReceivable', label: 'Accounts Receivable', icon: TrendingUp, color: 'purple' },
                  { key: 'accountsPayable', label: 'Accounts Payable', icon: CreditCard, color: 'orange' }
                ].map(({ key, label, icon: Icon, color }) => {
                  const processSteps = processes[key as keyof FinancialProcess];
                  const completed = processSteps.filter(s => s.completed).length;
                  const total = processSteps.length;
                  const isActive = currentProcess === key;
                  
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setCurrentProcess(key)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">{label}</span>
                      <Badge variant="outline" className="ml-2">
                        {completed}/{total}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {aiResponse && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  AI Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap">{aiResponse}</div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {processes[currentProcess as keyof FinancialProcess].map(step => 
              renderProcessStep(step, currentProcess as keyof FinancialProcess)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}