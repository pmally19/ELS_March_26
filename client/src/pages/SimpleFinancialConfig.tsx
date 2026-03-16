import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle, 
  Circle, 
  Building2,
  Brain,
  Play,
  Save,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigStep {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  data: Record<string, any>;
}

export default function SimpleFinancialConfig() {
  const [steps, setSteps] = useState<ConfigStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    const initSteps: ConfigStep[] = [
      {
        id: 'company',
        title: 'Define Company (GLOBL)',
        description: 'Create the highest organizational unit',
        order: 1,
        completed: false,
        data: {
          companyId: 'GLOBL',
          companyName: 'Global Holdings',
          country: 'US',
          currency: 'USD'
        }
      },
      {
        id: 'company-code',
        title: 'Define Company Code (1000)', 
        description: 'Create central organizational unit',
        order: 2,
        completed: false,
        data: {
          companyCode: '1000',
          companyName: 'Global Manufacturing Inc.',
          city: 'New York',
          country: 'US',
          currency: 'USD'
        }
      },
      {
        id: 'chart-accounts',
        title: 'Define Chart of Accounts (INT)',
        description: 'Create list of all G/L accounts',
        order: 3,
        completed: false,
        data: {
          chartId: 'INT',
          description: 'International Chart of Accounts',
          accountLength: '6'
        }
      },
      {
        id: 'fiscal-year',
        title: 'Define Fiscal Year Variant (K4)',
        description: 'Define fiscal year structure',
        order: 4,
        completed: false,
        data: {
          fiscalYearVariant: 'K4',
          description: 'Calendar Year, 4 Special Periods',
          postingPeriods: '12',
          specialPeriods: '4'
        }
      },
      {
        id: 'account-groups',
        title: 'Define Account Groups',
        description: 'Group G/L accounts by characteristics',
        order: 5,
        completed: false,
        data: {
          bankRange: '100000-199999',
          assetRange: '200000-299999',
          liabilityRange: '300000-399999',
          revenueRange: '400000-499999'
        }
      }
    ];
    
    setSteps(initSteps);
  }, []);

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId);
    const step = steps.find(s => s.id === stepId);
    if (step) {
      setFormData(step.data);
    }
  };

  const handleSaveStep = () => {
    if (!currentStep) return;
    
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === currentStep 
          ? { ...step, completed: true, data: { ...formData } }
          : step
      )
    );
    
    toast({
      title: "Configuration Saved",
      description: `Step ${currentStep} completed successfully`
    });
    
    setCurrentStep('');
    setFormData({});
  };

  const handleAutoConfig = async () => {
    for (const step of steps) {
      if (step.completed) continue;
      
      try {
        // Save actual configuration data to database
        const response = await fetch('/api/finance/config/auto-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stepId: step.id,
            configData: step.data
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          setSteps(prevSteps => 
            prevSteps.map(s => 
              s.id === step.id ? { ...s, completed: true } : s
            )
          );
          
          toast({
            title: `${step.title} Completed`,
            description: `Data saved to database: ${result.message || 'Configuration successful'}`
          });
        } else {
          toast({
            variant: "destructive",
            title: `${step.title} Failed`,
            description: "Failed to save configuration to database"
          });
          break;
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: `${step.title} Error`,
          description: "Database connection error"
        });
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getAIGuidance = async (stepId: string) => {
    try {
      const step = steps.find(s => s.id === stepId);
      if (!step) return;
      
      const response = await fetch('/api/ai/agents/finance/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Provide configuration guidance for ${step.title}: ${step.description}. Include best practices and validation rules.`
        })
      });
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: "AI Guidance Available",
          description: "Financial AI Agent has provided configuration advice"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Guidance Error",
        description: "Unable to get AI guidance at this time"
      });
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const currentStepData = steps.find(s => s.id === currentStep);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/finance'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Finance
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Financial Configuration Assistant</h1>
            <p className="text-muted-foreground mt-2">
              Enterprise-standard financial structure setup with AI guidance for MallyERP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
          <Button
            onClick={handleAutoConfig}
            disabled={progressPercent === 100}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Auto Configure All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercent} className="mb-4" />
              <div className="space-y-2">
                {steps.map(step => (
                  <Button
                    key={step.id}
                    variant={currentStep === step.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleStepClick(step.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold">
                        {step.order}
                      </div>
                      {step.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm">{step.title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {currentStepData ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {currentStepData.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentStepData.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getAIGuidance(currentStep)}
                    >
                      <Brain className="h-4 w-4 mr-1" />
                      AI Guide
                    </Button>
                    <Button
                      onClick={handleSaveStep}
                      size="sm"
                      disabled={currentStepData.completed}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {currentStepData.completed ? 'Completed' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(formData).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <Input
                        id={key}
                        value={value || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          [key]: e.target.value 
                        }))}
                        disabled={currentStepData.completed}
                        placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
                
                {currentStepData.completed && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Configuration Complete</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      This step has been configured and saved successfully.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Configuration Step
                  </h3>
                  <p className="text-sm text-gray-500">
                    Choose a step from the left panel to begin configuration
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}