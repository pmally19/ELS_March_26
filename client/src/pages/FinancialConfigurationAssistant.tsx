import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  DollarSign,
  Play,
  Pause,
  RotateCcw,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  order: number;
  category: 'enterprise' | 'accounts' | 'fiscal' | 'posting' | 'parameters';
  status: 'pending' | 'configuring' | 'completed' | 'error';
  dependencies: string[];
  apiEndpoint: string;
  fields: ConfigurationField[];
  sampleData: any;
  validationRules: ValidationRule[];
}

interface ConfigurationField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  validation?: string;
}

interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export default function FinancialConfigurationAssistant() {
  const [configurations, setConfigurations] = useState<ConfigurationTemplate[]>([]);
  const [currentConfig, setCurrentConfig] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize configuration templates based on enterprise framework
  useEffect(() => {
    const initializeTemplates = (): ConfigurationTemplate[] => {
      return [
        {
          id: 'define-company',
          name: 'Define Company (GLOBL)',
          description: 'Create the highest organizational unit for external reporting',
          order: 1,
          category: 'enterprise',
          status: 'pending',
          dependencies: [],
          apiEndpoint: '/api/finance/config/company',
          fields: [
            { id: 'companyId', label: 'Company ID', type: 'text', required: true, placeholder: 'GLOBL', validation: '^[A-Z0-9]{1,4}$' },
            { id: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Global Holdings' },
            { id: 'address', label: 'Address', type: 'textarea', required: true, placeholder: 'Complete company address' },
            { id: 'country', label: 'Country', type: 'select', required: true, options: [
              { value: 'US', label: 'United States' },
              { value: 'GB', label: 'United Kingdom' },
              { value: 'DE', label: 'Germany' },
              { value: 'FR', label: 'France' }
            ]},
            { id: 'language', label: 'Language', type: 'select', required: true, options: [
              { value: 'EN', label: 'English' },
              { value: 'DE', label: 'German' },
              { value: 'FR', label: 'French' }
            ]},
            { id: 'currency', label: 'Currency', type: 'select', required: true, options: [
              { value: 'USD', label: 'US Dollar' },
              { value: 'EUR', label: 'Euro' },
              { value: 'GBP', label: 'British Pound' }
            ]}
          ],
          sampleData: {
            companyId: 'GLOBL',
            companyName: 'Global Holdings',
            address: '123 Business Center, New York, NY 10001',
            country: 'US',
            language: 'EN',
            currency: 'USD'
          },
          validationRules: [
            { field: 'companyId', rule: 'unique', message: 'Company ID must be unique' },
            { field: 'companyId', rule: 'format', message: 'Company ID must be 1-4 uppercase alphanumeric characters' }
          ]
        },
        {
          id: 'define-company-code',
          name: 'Define Company Code (1000)',
          description: 'Create central organizational unit for Financial Accounting',
          order: 2,
          category: 'enterprise',
          status: 'pending',
          dependencies: ['define-company'],
          apiEndpoint: '/api/finance/config/company-code',
          fields: [
            { id: 'companyCode', label: 'Company Code', type: 'text', required: true, placeholder: '1000', validation: '^[0-9]{4}$' },
            { id: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Global Manufacturing Inc.' },
            { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'New York' },
            { id: 'country', label: 'Country', type: 'select', required: true, options: [
              { value: 'US', label: 'United States' },
              { value: 'GB', label: 'United Kingdom' },
              { value: 'DE', label: 'Germany' }
            ]},
            { id: 'currency', label: 'Currency', type: 'select', required: true, options: [
              { value: 'USD', label: 'US Dollar' },
              { value: 'EUR', label: 'Euro' },
              { value: 'GBP', label: 'British Pound' }
            ]},
            { id: 'language', label: 'Language', type: 'select', required: true, options: [
              { value: 'EN', label: 'English' },
              { value: 'DE', label: 'German' }
            ]}
          ],
          sampleData: {
            companyCode: '1000',
            companyName: 'Global Manufacturing Inc.',
            city: 'New York',
            country: 'US',
            currency: 'USD',
            language: 'EN'
          },
          validationRules: [
            { field: 'companyCode', rule: 'unique', message: 'Company Code must be unique' },
            { field: 'companyCode', rule: 'format', message: 'Company Code must be exactly 4 digits' }
          ]
        },
        {
          id: 'assign-company-code',
          name: 'Assign Company Code to Company',
          description: 'Link Company Code to higher-level Company',
          order: 3,
          category: 'enterprise',
          status: 'pending',
          dependencies: ['define-company', 'define-company-code'],
          apiEndpoint: '/api/finance/config/company-assignment',
          fields: [
            { id: 'companyCode', label: 'Company Code', type: 'text', required: true, placeholder: '1000' },
            { id: 'company', label: 'Company', type: 'text', required: true, placeholder: 'GLOBL' },
            { id: 'assignmentDate', label: 'Assignment Date', type: 'text', required: true, placeholder: '2024-01-01' }
          ],
          sampleData: {
            companyCode: '1000',
            company: 'GLOBL',
            assignmentDate: '2024-01-01'
          },
          validationRules: [
            { field: 'assignmentDate', rule: 'date', message: 'Assignment date must be valid' }
          ]
        },
        {
          id: 'define-chart-accounts',
          name: 'Define Chart of Accounts (INT)',
          description: 'Create list of all G/L accounts for company codes',
          order: 4,
          category: 'accounts',
          status: 'pending',
          dependencies: [],
          apiEndpoint: '/api/finance/config/chart-accounts',
          fields: [
            { id: 'chartId', label: 'Chart of Accounts ID', type: 'text', required: true, placeholder: 'INT', validation: '^[A-Z0-9]{1,4}$' },
            { id: 'description', label: 'Description', type: 'text', required: true, placeholder: 'International Chart of Accounts' },
            { id: 'accountLength', label: 'Account Number Length', type: 'select', required: true, options: [
              { value: '4', label: '4 digits' },
              { value: '6', label: '6 digits' },
              { value: '8', label: '8 digits' },
              { value: '10', label: '10 digits' }
            ]},
            { id: 'maintenanceLanguage', label: 'Maintenance Language', type: 'select', required: true, options: [
              { value: 'EN', label: 'English' },
              { value: 'DE', label: 'German' }
            ]}
          ],
          sampleData: {
            chartId: 'INT',
            description: 'International Chart of Accounts',
            accountLength: '6',
            maintenanceLanguage: 'EN'
          },
          validationRules: [
            { field: 'chartId', rule: 'unique', message: 'Chart ID must be unique' },
            { field: 'accountLength', rule: 'range', message: 'Account length must be between 4-10 digits' }
          ]
        },
        {
          id: 'assign-chart-company-code',
          name: 'Assign Chart of Accounts to Company Code',
          description: 'Link Company Code to operational Chart of Accounts',
          order: 5,
          category: 'accounts',
          status: 'pending',
          dependencies: ['define-company-code', 'define-chart-accounts'],
          apiEndpoint: '/api/finance/config/chart-assignment',
          fields: [
            { id: 'companyCode', label: 'Company Code', type: 'text', required: true, placeholder: '1000' },
            { id: 'chartOfAccounts', label: 'Chart of Accounts', type: 'text', required: true, placeholder: 'INT' },
            { id: 'assignmentDate', label: 'Assignment Date', type: 'text', required: true, placeholder: '2024-01-01' }
          ],
          sampleData: {
            companyCode: '1000',
            chartOfAccounts: 'INT',
            assignmentDate: '2024-01-01'
          },
          validationRules: [
            { field: 'assignmentDate', rule: 'date', message: 'Assignment date must be valid' }
          ]
        },
        {
          id: 'define-account-groups',
          name: 'Define Account Groups',
          description: 'Group G/L accounts with similar characteristics',
          order: 6,
          category: 'accounts',
          status: 'pending',
          dependencies: ['define-chart-accounts'],
          apiEndpoint: '/api/finance/config/account-groups',
          fields: [
            { id: 'chartOfAccounts', label: 'Chart of Accounts', type: 'text', required: true, placeholder: 'INT' },
            { id: 'bankRange', label: 'BANK Range', type: 'text', required: true, placeholder: '100000-199999' },
            { id: 'assetRange', label: 'ASSETS Range', type: 'text', required: true, placeholder: '200000-299999' },
            { id: 'liabilityRange', label: 'LIABILITIES Range', type: 'text', required: true, placeholder: '300000-399999' },
            { id: 'revenueRange', label: 'REVENUE Range', type: 'text', required: true, placeholder: '400000-499999' },
            { id: 'cogsRange', label: 'COGS Range', type: 'text', required: true, placeholder: '500000-599999' },
            { id: 'expenseRange', label: 'EXPENSES Range', type: 'text', required: true, placeholder: '600000-699999' }
          ],
          sampleData: {
            chartOfAccounts: 'INT',
            bankRange: '100000-199999',
            assetRange: '200000-299999',
            liabilityRange: '300000-399999',
            revenueRange: '400000-499999',
            cogsRange: '500000-599999',
            expenseRange: '600000-699999'
          },
          validationRules: [
            { field: 'bankRange', rule: 'range', message: 'Number ranges must not overlap' }
          ]
        },
        {
          id: 'define-fiscal-year-variant',
          name: 'Define Fiscal Year Variant (K4)',
          description: 'Define fiscal year structure and posting periods',
          order: 7,
          category: 'fiscal',
          status: 'pending',
          dependencies: [],
          apiEndpoint: '/api/finance/config/fiscal-year-variant',
          fields: [
            { id: 'fiscalYearVariant', label: 'Fiscal Year Variant', type: 'text', required: true, placeholder: 'K4', validation: '^[A-Z0-9]{2}$' },
            { id: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Calendar Year, 4 Special Periods' },
            { id: 'postingPeriods', label: 'Posting Periods', type: 'select', required: true, options: [
              { value: '12', label: '12 periods' },
              { value: '13', label: '13 periods' },
              { value: '16', label: '16 periods' }
            ]},
            { id: 'specialPeriods', label: 'Special Periods', type: 'select', required: true, options: [
              { value: '0', label: '0 periods' },
              { value: '2', label: '2 periods' },
              { value: '4', label: '4 periods' }
            ]},
            { id: 'yearShift', label: 'Year Shift', type: 'select', required: true, options: [
              { value: '0', label: 'No shift' },
              { value: '-1', label: 'Shifted back' },
              { value: '1', label: 'Shifted forward' }
            ]}
          ],
          sampleData: {
            fiscalYearVariant: 'K4',
            description: 'Calendar Year, 4 Special Periods',
            postingPeriods: '12',
            specialPeriods: '4',
            yearShift: '0'
          },
          validationRules: [
            { field: 'fiscalYearVariant', rule: 'unique', message: 'Fiscal Year Variant must be unique' },
            { field: 'fiscalYearVariant', rule: 'format', message: 'Variant must be exactly 2 characters' }
          ]
        },
        {
          id: 'assign-fiscal-year-variant',
          name: 'Assign Fiscal Year Variant to Company Code',
          description: 'Link Company Code to fiscal year definition',
          order: 8,
          category: 'fiscal',
          status: 'pending',
          dependencies: ['define-company-code', 'define-fiscal-year-variant'],
          apiEndpoint: '/api/finance/config/fiscal-assignment',
          fields: [
            { id: 'companyCode', label: 'Company Code', type: 'text', required: true, placeholder: '1000' },
            { id: 'fiscalYearVariant', label: 'Fiscal Year Variant', type: 'text', required: true, placeholder: 'K4' },
            { id: 'assignmentDate', label: 'Assignment Date', type: 'text', required: true, placeholder: '2024-01-01' }
          ],
          sampleData: {
            companyCode: '1000',
            fiscalYearVariant: 'K4',
            assignmentDate: '2024-01-01'
          },
          validationRules: [
            { field: 'assignmentDate', rule: 'date', message: 'Assignment date must be valid' }
          ]
        },
        {
          id: 'define-posting-period-variant',
          name: 'Define Posting Period Variant (P1)',
          description: 'Control posting period open/close status',
          order: 9,
          category: 'posting',
          status: 'pending',
          dependencies: ['define-fiscal-year-variant'],
          apiEndpoint: '/api/finance/config/posting-period-variant',
          fields: [
            { id: 'postingPeriodVariant', label: 'Posting Period Variant', type: 'text', required: true, placeholder: 'P1', validation: '^[A-Z0-9]{1,4}$' },
            { id: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Periods for Company 1000' },
            { id: 'accountType', label: 'Account Type', type: 'text', required: true, placeholder: '+' },
            { id: 'fromAccount', label: 'From Account', type: 'text', required: true, placeholder: '0000000001' },
            { id: 'toAccount', label: 'To Account', type: 'text', required: true, placeholder: '9999999999' }
          ],
          sampleData: {
            postingPeriodVariant: 'P1',
            description: 'Periods for Company 1000',
            accountType: '+',
            fromAccount: '0000000001',
            toAccount: '9999999999'
          },
          validationRules: [
            { field: 'postingPeriodVariant', rule: 'unique', message: 'Posting Period Variant must be unique' }
          ]
        },
        {
          id: 'define-field-status-variant',
          name: 'Define Field Status Variant (FSV1)',
          description: 'Control field status for document entry',
          order: 10,
          category: 'parameters',
          status: 'pending',
          dependencies: ['define-company-code'],
          apiEndpoint: '/api/finance/config/field-status-variant',
          fields: [
            { id: 'fieldStatusVariant', label: 'Field Status Variant', type: 'text', required: true, placeholder: 'FSV1', validation: '^[A-Z0-9]{1,4}$' },
            { id: 'description', label: 'Description', type: 'text', required: true, placeholder: 'Field Status Variant 1000' },
            { id: 'companyCode', label: 'Company Code', type: 'text', required: true, placeholder: '1000' }
          ],
          sampleData: {
            fieldStatusVariant: 'FSV1',
            description: 'Field Status Variant 1000',
            companyCode: '1000'
          },
          validationRules: [
            { field: 'fieldStatusVariant', rule: 'unique', message: 'Field Status Variant must be unique' }
          ]
        }
      ];
    };

    setConfigurations(initializeTemplates());
  }, []);

  // Calculate overall progress
  const calculateOverallProgress = () => {
    const completed = configurations.filter(c => c.status === 'completed').length;
    return Math.round((completed / configurations.length) * 100);
  };

  // Auto-execute configurations
  const executeAutoConfiguration = async () => {
    setIsAutoMode(true);
    const sortedConfigs = [...configurations].sort((a, b) => a.order - b.order);
    
    for (const config of sortedConfigs) {
      if (config.status === 'completed') continue;
      
      // Check dependencies
      const dependenciesCompleted = config.dependencies.every(dep => 
        configurations.find(c => c.id === dep)?.status === 'completed'
      );
      
      if (!dependenciesCompleted) continue;
      
      setCurrentConfig(config.id);
      updateConfigStatus(config.id, 'configuring');
      
      try {
        // Use sample data for auto configuration
        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.sampleData)
        });
        
        if (response.ok) {
          updateConfigStatus(config.id, 'completed');
          toast({
            title: `${config.name} Completed`,
            description: `Successfully configured ${config.name}`
          });
        } else {
          updateConfigStatus(config.id, 'error');
        }
      } catch (error) {
        updateConfigStatus(config.id, 'error');
        toast({
          variant: "destructive",
          title: `Configuration Error`,
          description: `Failed to configure ${config.name}`
        });
      }
      
      // Wait before next configuration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsAutoMode(false);
    setCurrentConfig(null);
  };

  // Update configuration status
  const updateConfigStatus = (id: string, status: ConfigurationTemplate['status']) => {
    setConfigurations(prev => 
      prev.map(config => 
        config.id === id ? { ...config, status } : config
      )
    );
  };

  // Manual configuration
  const executeManualConfiguration = async (config: ConfigurationTemplate) => {
    updateConfigStatus(config.id, 'configuring');
    
    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        updateConfigStatus(config.id, 'completed');
        toast({
          title: `${config.name} Completed`,
          description: `Successfully configured ${config.name}`
        });
        setFormData({});
      } else {
        updateConfigStatus(config.id, 'error');
      }
    } catch (error) {
      updateConfigStatus(config.id, 'error');
      toast({
        variant: "destructive",
        title: `Configuration Error`,
        description: `Failed to configure ${config.name}`
      });
    }
  };

  const renderConfigurationForm = (config: ConfigurationTemplate) => {
    const isDisabled = config.dependencies.some(dep => 
      configurations.find(c => c.id === dep)?.status !== 'completed'
    );

    return (
      <Card key={config.id} className={`${config.status === 'completed' ? 'bg-green-50 border-green-200' : ''} ${isDisabled ? 'opacity-60' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                {config.order}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {config.name}
                  <Badge variant="outline">{config.category}</Badge>
                  {config.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {config.status === 'configuring' && <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />}
                  {config.status === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <Button
              onClick={() => executeManualConfiguration(config)}
              disabled={isDisabled || config.status === 'completed' || config.status === 'configuring'}
              size="sm"
            >
              {config.status === 'completed' ? 'Completed' : 'Configure'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.fields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === 'text' && (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formData[field.id] || config.sampleData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    disabled={config.status === 'completed'}
                  />
                )}
                {field.type === 'select' && (
                  <Select 
                    value={formData[field.id] || config.sampleData[field.id]} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, [field.id]: value }))}
                    disabled={config.status === 'completed'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === 'textarea' && (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formData[field.id] || config.sampleData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    disabled={config.status === 'completed'}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Configuration Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Enterprise-standard financial structure setup with intelligent automation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
          <Button
            onClick={executeAutoConfiguration}
            disabled={isAutoMode || progress === 100}
            className="flex items-center gap-2"
          >
            {isAutoMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isAutoMode ? 'Configuring...' : 'Auto Configure All'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-4" />
              <div className="space-y-2">
                {['enterprise', 'accounts', 'fiscal', 'posting', 'parameters'].map(category => {
                  const categoryConfigs = configurations.filter(c => c.category === category);
                  const completed = categoryConfigs.filter(c => c.status === 'completed').length;
                  
                  return (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium capitalize">{category}</span>
                      <Badge variant="outline">{completed}/{categoryConfigs.length}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {configurations
              .sort((a, b) => a.order - b.order)
              .map(config => renderConfigurationForm(config))
            }
          </div>
        </div>
      </div>
    </div>
  );
}