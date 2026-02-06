import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
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
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  required: boolean;
  sampleData: {
    [key: string]: string;
  };
  validationPoints: string[];
  dependencies: string[];
}

interface FinancialFramework {
  enterpriseStructure: ConfigurationStep[];
  chartOfAccounts: ConfigurationStep[];
  fiscalConfiguration: ConfigurationStep[];
  glAccounts: ConfigurationStep[];
  globalParameters: ConfigurationStep[];
}

export default function FinancialConfiguration() {
  const [activeCategory, setActiveCategory] = useState('enterpriseStructure');
  const [framework, setFramework] = useState<FinancialFramework | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize financial framework configuration
  useEffect(() => {
    const initializeFramework = (): FinancialFramework => {
      return {
        enterpriseStructure: [
          {
            id: 'define-company',
            title: 'Define Company',
            description: 'Create the highest organizational unit for external reporting',
            category: 'Enterprise Structure',
            completed: false,
            required: true,
            sampleData: {
              'Company ID': 'GLOBL',
              'Company Name': 'Global Holdings',
              'Country': 'US',
              'Currency': 'USD',
              'Language': 'EN'
            },
            validationPoints: [
              'Company ID must be unique (4 characters)',
              'Company name is mandatory',
              'Country code must be valid ISO code',
              'Currency must be active in system'
            ],
            dependencies: []
          },
          {
            id: 'define-company-code',
            title: 'Define Company Code',
            description: 'Create central organizational unit for Financial Accounting',
            category: 'Enterprise Structure',
            completed: false,
            required: true,
            sampleData: {
              'Company Code': '1000',
              'Company Name': 'Global Manufacturing Inc.',
              'City': 'New York',
              'Country': 'US',
              'Currency': 'USD',
              'Language': 'EN'
            },
            validationPoints: [
              'Company Code must be 4 characters',
              'Must be assigned to a Company',
              'Currency must match operational requirements',
              'City and country are mandatory for legal reporting'
            ],
            dependencies: ['define-company']
          },
          {
            id: 'assign-company-code',
            title: 'Assign Company Code to Company',
            description: 'Link Company Code to higher-level Company',
            category: 'Enterprise Structure',
            completed: false,
            required: true,
            sampleData: {
              'Company Code': '1000',
              'Company': 'GLOBL',
              'Assignment Date': '2024-01-01'
            },
            validationPoints: [
              'Company Code must exist',
              'Company must exist',
              'Assignment must be unique',
              'Effective date cannot be in the past for active assignments'
            ],
            dependencies: ['define-company', 'define-company-code']
          }
        ],
        chartOfAccounts: [
          {
            id: 'define-chart-accounts',
            title: 'Define Chart of Accounts',
            description: 'Create list of all G/L accounts for company codes',
            category: 'Chart of Accounts',
            completed: false,
            required: true,
            sampleData: {
              'Chart of Accounts': 'INT',
              'Description': 'International Chart of Accounts',
              'Account Number Length': '6',
              'Maintenance Language': 'EN'
            },
            validationPoints: [
              'Chart ID must be unique (4 characters)',
              'Account number length between 4-10 digits',
              'Maintenance language must be active',
              'Description is mandatory'
            ],
            dependencies: []
          },
          {
            id: 'assign-chart-company-code',
            title: 'Assign Chart of Accounts to Company Code',
            description: 'Link Company Code to operational Chart of Accounts',
            category: 'Chart of Accounts',
            completed: false,
            required: true,
            sampleData: {
              'Company Code': '1000',
              'Chart of Accounts': 'INT',
              'Assignment Date': '2024-01-01'
            },
            validationPoints: [
              'Company Code must exist',
              'Chart of Accounts must exist',
              'Only one chart per company code',
              'Cannot change after transactions posted'
            ],
            dependencies: ['define-company-code', 'define-chart-accounts']
          },
          {
            id: 'define-account-groups',
            title: 'Define Account Groups',
            description: 'Group G/L accounts with similar characteristics',
            category: 'Chart of Accounts',
            completed: false,
            required: true,
            sampleData: {
              'BANK': '100000-199999 (Bank Accounts)',
              'ASST': '200000-299999 (Assets)',
              'LIAB': '300000-399999 (Liabilities)',
              'REVN': '400000-499999 (Revenue)',
              'COGS': '500000-599999 (Cost of Goods Sold)',
              'EXPN': '600000-699999 (Expenses)'
            },
            validationPoints: [
              'Number ranges must not overlap',
              'Account group ID must be unique',
              'Number ranges must fit account length',
              'Field status groups must be assigned'
            ],
            dependencies: ['define-chart-accounts']
          }
        ],
        fiscalConfiguration: [
          {
            id: 'define-fiscal-year-variant',
            title: 'Define Fiscal Year Variant',
            description: 'Define fiscal year structure and posting periods',
            category: 'Fiscal Configuration',
            completed: false,
            required: true,
            sampleData: {
              'Fiscal Year Variant': 'K4',
              'Description': 'Calendar Year, 4 Special Periods',
              'Posting Periods': '12',
              'Special Periods': '4',
              'Year Shift': '0'
            },
            validationPoints: [
              'Variant must be 2 characters',
              'Posting periods between 1-16',
              'Special periods between 0-4',
              'Year shift must be logical'
            ],
            dependencies: []
          },
          {
            id: 'assign-fiscal-year-variant',
            title: 'Assign Fiscal Year Variant to Company Code',
            description: 'Link Company Code to fiscal year definition',
            category: 'Fiscal Configuration',
            completed: false,
            required: true,
            sampleData: {
              'Company Code': '1000',
              'Fiscal Year Variant': 'K4',
              'Assignment Date': '2024-01-01'
            },
            validationPoints: [
              'Company Code must exist',
              'Fiscal Year Variant must exist',
              'Cannot change after year-end closing',
              'Assignment must be continuous'
            ],
            dependencies: ['define-company-code', 'define-fiscal-year-variant']
          },
          {
            id: 'define-posting-period-variant',
            title: 'Define Posting Period Variant',
            description: 'Control posting period open/close status',
            category: 'Fiscal Configuration',
            completed: false,
            required: true,
            sampleData: {
              'Posting Period Variant': 'P1',
              'Description': 'Periods for Company 1000',
              'Account Type': '+',
              'From Account': '0000000001',
              'To Account': '9999999999'
            },
            validationPoints: [
              'Variant must be 4 characters',
              'Account ranges must be complete',
              'Period control must be logical',
              'Authorizations must be assigned'
            ],
            dependencies: ['define-fiscal-year-variant']
          }
        ],
        glAccounts: [
          {
            id: 'create-gl-account-master',
            title: 'Create G/L Account Master Data',
            description: 'Create individual G/L account master records',
            category: 'G/L Accounts',
            completed: false,
            required: true,
            sampleData: {
              'Account Number': '400000',
              'Account Group': 'REVN',
              'Account Type': 'P&L',
              'Short Text': 'Sales Revenue',
              'Long Text': 'Sales Revenue - Domestic'
            },
            validationPoints: [
              'Account number within group range',
              'Account group must exist',
              'Short text is mandatory',
              'Account type must match group'
            ],
            dependencies: ['define-account-groups', 'assign-chart-company-code']
          },
          {
            id: 'extend-gl-accounts-company',
            title: 'Extend G/L Accounts to Company Code',
            description: 'Configure company-specific account settings',
            category: 'G/L Accounts',
            completed: false,
            required: true,
            sampleData: {
              'Company Code': '1000',
              'Account Currency': 'USD',
              'Tax Relevant': 'X',
              'Line Item Display': 'X',
              'Field Status Group': 'G029'
            },
            validationPoints: [
              'Company Code must exist',
              'Currency must be valid',
              'Field status group must exist',
              'Tax settings must be consistent'
            ],
            dependencies: ['create-gl-account-master', 'define-company-code']
          }
        ],
        globalParameters: [
          {
            id: 'define-document-types',
            title: 'Define Document Types and Number Ranges',
            description: 'Configure financial document categories',
            category: 'Global Parameters',
            completed: false,
            required: true,
            sampleData: {
              'SA': 'G/L Account Document',
              'RV': 'Revenue Invoice',
              'KR': 'Vendor Invoice',
              'DZ': 'Customer Payment',
              'KZ': 'Vendor Payment'
            },
            validationPoints: [
              'Document types must be unique',
              'Number ranges must not overlap',
              'Posting keys must be assigned',
              'Account types must be valid'
            ],
            dependencies: []
          },
          {
            id: 'define-posting-keys',
            title: 'Define Posting Keys',
            description: 'Configure line item entry controls',
            category: 'Global Parameters',
            completed: false,
            required: true,
            sampleData: {
              '40': 'Debit G/L Account',
              '50': 'Credit G/L Account',
              '01': 'Customer Debit',
              '11': 'Customer Credit',
              '21': 'Vendor Debit',
              '31': 'Vendor Credit'
            },
            validationPoints: [
              'Posting keys must be 2 digits',
              'Debit/Credit indicator must be set',
              'Account type assignment required',
              'Special G/L indicators valid'
            ],
            dependencies: []
          },
          {
            id: 'define-field-status-variant',
            title: 'Define Field Status Variant',
            description: 'Control field status for document entry',
            category: 'Global Parameters',
            completed: false,
            required: true,
            sampleData: {
              'Field Status Variant': 'FSV1',
              'Description': 'Field Status Variant 1000',
              'Company Code': '1000'
            },
            validationPoints: [
              'Variant must be unique',
              'Field groups must be complete',
              'Mandatory fields properly defined',
              'Suppressed fields consistent'
            ],
            dependencies: ['define-company-code']
          }
        ]
      };
    };

    setFramework(initializeFramework());
  }, []);

  // Calculate overall progress
  useEffect(() => {
    if (framework) {
      const allSteps = [
        ...framework.enterpriseStructure,
        ...framework.chartOfAccounts,
        ...framework.fiscalConfiguration,
        ...framework.glAccounts,
        ...framework.globalParameters
      ];
      const completedSteps = allSteps.filter(step => step.completed).length;
      const progress = (completedSteps / allSteps.length) * 100;
      setCurrentProgress(Math.round(progress));
    }
  }, [framework]);

  // Toggle step completion
  const toggleStepCompletion = (categoryKey: keyof FinancialFramework, stepId: string) => {
    if (!framework) return;

    setFramework(prev => {
      if (!prev) return prev;
      
      const category = { ...prev[categoryKey] };
      const stepIndex = category.findIndex(step => step.id === stepId);
      
      if (stepIndex !== -1) {
        category[stepIndex] = {
          ...category[stepIndex],
          completed: !category[stepIndex].completed
        };
      }

      return {
        ...prev,
        [categoryKey]: category
      };
    });
  };

  // Get Financial AI Agent advice
  const getAIAdvice = async (step: ConfigurationStep) => {
    try {
      const response = await fetch('/api/ai/agents/finance/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Provide detailed configuration guidance for "${step.title}". Include sample data validation, common pitfalls, and best practices for: ${step.description}. Sample data: ${JSON.stringify(step.sampleData)}`
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Financial AI Agent Guidance",
          description: "Configuration advice generated successfully"
        });
        return result.response;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Guidance Error",
        description: "Failed to get Financial AI Agent advice"
      });
    }
  };

  const renderConfigurationStep = (step: ConfigurationStep, categoryKey: keyof FinancialFramework) => {
    const isDisabled = step.dependencies.some(dep => {
      const allSteps = [
        ...framework!.enterpriseStructure,
        ...framework!.chartOfAccounts,
        ...framework!.fiscalConfiguration,
        ...framework!.glAccounts,
        ...framework!.globalParameters
      ];
      const depStep = allSteps.find(s => s.id === dep);
      return depStep && !depStep.completed;
    });

    return (
      <Card key={step.id} className={`${step.completed ? 'bg-green-50 border-green-200' : ''} ${isDisabled ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleStepCompletion(categoryKey, step.id)}
                disabled={isDisabled}
                className="p-0 h-6 w-6"
              >
                {step.completed ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-400" />
                )}
              </Button>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {step.title}
                  {step.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => getAIAdvice(step)}
              className="ml-2"
            >
              <Brain className="h-4 w-4 mr-1" />
              AI Guide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="sample-data">
              <AccordionTrigger className="text-sm">Sample Configuration Data</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(step.sampleData).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium text-sm">{key}:</span>
                      <span className="text-sm text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="validation">
              <AccordionTrigger className="text-sm">Validation Points</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {step.validationPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            {step.dependencies.length > 0 && (
              <AccordionItem value="dependencies">
                <AccordionTrigger className="text-sm">Prerequisites</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {step.dependencies.map((depId) => {
                      const allSteps = [
                        ...framework!.enterpriseStructure,
                        ...framework!.chartOfAccounts,
                        ...framework!.fiscalConfiguration,
                        ...framework!.glAccounts,
                        ...framework!.globalParameters
                      ];
                      const depStep = allSteps.find(s => s.id === depId);
                      return depStep ? (
                        <div key={depId} className="flex items-center gap-2 text-sm">
                          {depStep.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          {depStep.title}
                        </div>
                      ) : null;
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>
    );
  };

  if (!framework) {
    return <div className="p-6">Loading financial configuration framework...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Framework Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Complete enterprise-standard financial setup with AI-guided configuration
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{currentProgress}%</div>
          <div className="text-sm text-muted-foreground">Complete</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={currentProgress} className="mb-4" />
              <div className="space-y-3">
                {[
                  { key: 'enterpriseStructure', label: 'Enterprise Structure', icon: Building2 },
                  { key: 'chartOfAccounts', label: 'Chart of Accounts', icon: BookOpen },
                  { key: 'fiscalConfiguration', label: 'Fiscal Configuration', icon: Calendar },
                  { key: 'glAccounts', label: 'G/L Accounts', icon: DollarSign },
                  { key: 'globalParameters', label: 'Global Parameters', icon: Settings }
                ].map(({ key, label, icon: Icon }) => {
                  const categorySteps = framework[key as keyof FinancialFramework];
                  const completed = categorySteps.filter(s => s.completed).length;
                  const total = categorySteps.length;
                  const isActive = activeCategory === key;
                  
                  return (
                    <Button
                      key={key}
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setActiveCategory(key)}
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
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {framework[activeCategory as keyof FinancialFramework].map(step => 
              renderConfigurationStep(step, activeCategory as keyof FinancialFramework)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}