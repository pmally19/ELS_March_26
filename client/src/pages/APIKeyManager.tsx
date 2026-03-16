import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Bot, TestTube, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProviderStatus {
  openai: { available: boolean; configured: boolean };
  deepseek: { available: boolean; configured: boolean };
  gemini: { available: boolean; configured: boolean };
  grok: { available: boolean; configured: boolean };
}

export default function APIKeyManager() {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [showKeys, setShowKeys] = useState({
    deepseek: false,
    gemini: false,
    grok: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [agentTestResults, setAgentTestResults] = useState<any>(null);
  const [activeProvider, setActiveProvider] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    checkProviderStatus();
  }, []);

  const checkProviderStatus = async () => {
    try {
      const response = await fetch('/api/designer-agent/provider-status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setProviderStatus(data.providers);
        setActiveProvider(data.activeProvider || 'openai');
      } else {
        throw new Error(data.error || 'Failed to get provider status');
      }
    } catch (error: any) {
      console.error('Failed to check provider status:', error);
      toast({
        title: "Status Check Failed",
        description: error.message || "Could not retrieve provider status",
        variant: "destructive",
      });
    }
  };

  const testAllAgents = async () => {
    setTestingInProgress(true);
    setAgentTestResults(null);
    
    try {
      const testRequests = [
        // Test Designer Agent
        fetch('/api/designer-agent/enhanced-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentContent: "Test sales order functionality",
            documentType: "business_requirement"
          })
        }),
        
        // Test Jr Assistant
        fetch('/api/jr/enhanced-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "How many customers do we have?"
          })
        }),
        
        // Test AI Agents
        fetch('/api/enhanced-ai/agents/status'),
        
        // Test Chief Agents
        fetch('/api/enhanced-ai/agents/chief-sales/status')
      ];

      const results = await Promise.allSettled(testRequests);
      const testResults = {
        designerAgent: results[0].status === 'fulfilled' ? 'Working' : 'Failed',
        jrAssistant: results[1].status === 'fulfilled' ? 'Working' : 'Failed', 
        aiAgents: results[2].status === 'fulfilled' ? 'Working' : 'Failed',
        chiefAgents: results[3].status === 'fulfilled' ? 'Working' : 'Failed'
      };
      
      setAgentTestResults(testResults);
      
      toast({
        title: "Agent Testing Complete",
        description: "All system components tested successfully",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Agent testing failed:', error);
      toast({
        title: "Testing Failed",
        description: "Some agents may not be responding properly",
        variant: "destructive",
      });
    } finally {
      setTestingInProgress(false);
    }
  };

  const handleUpdateKey = async (provider: string, apiKey: string) => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: `Please enter your ${provider} API key`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/designer-agent/update-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "API Key Updated",
          description: `${provider} API key has been successfully updated and activated`,
        });
        
        // Clear the respective key
        if (provider === 'deepseek') setDeepseekKey('');
        if (provider === 'gemini') setGeminiKey('');
        if (provider === 'grok') setGrokKey('');
        
        // Refresh status after a short delay to ensure propagation
        setTimeout(() => {
          checkProviderStatus();
        }, 500);
      } else {
        throw new Error(data.error || 'Failed to update API key');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testFallbackSystem = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      const response = await fetch('/api/designer-agent/test-deepseek-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (data.success) {
        setTestResult(`✅ Fallback test successful using ${data.testResult.provider}`);
        toast({
          title: "Test Successful",
          description: `AI fallback system working with ${data.testResult.provider}`,
        });
      } else {
        setTestResult(`❌ Test failed: ${data.error}`);
        toast({
          title: "Test Failed",
          description: data.message || "Fallback test failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult(`❌ Test error: ${error.message}`);
      toast({
        title: "Test Error",
        description: "Failed to test fallback system",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Provider Management</h1>
        <p className="text-muted-foreground">
          Manage your AI API keys and configure automatic fallback system for uninterrupted service
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Provider Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Provider Status
            </CardTitle>
            <CardDescription>
              Current status of AI providers and fallback system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeProvider && (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <strong>Active Provider:</strong> {activeProvider.toUpperCase()}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <span className="font-medium">OpenAI GPT-4o</span>
              <Badge variant={providerStatus?.openai?.available ? "default" : providerStatus?.openai?.configured ? "secondary" : "destructive"}>
                {activeProvider === 'openai' ? "Active" : providerStatus?.openai?.available ? "Available" : providerStatus?.openai?.configured ? "Configured" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">DeepSeek Fallback</span>
              <Badge variant={activeProvider === 'deepseek' ? "default" : providerStatus?.deepseek?.configured ? "secondary" : "outline"}>
                {activeProvider === 'deepseek' ? "Active" : providerStatus?.deepseek?.configured ? "Configured" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Gemini AI</span>
              <Badge variant={activeProvider === 'gemini' ? "default" : providerStatus?.gemini?.configured ? "secondary" : "outline"}>
                {activeProvider === 'gemini' ? "Active" : providerStatus?.gemini?.configured ? "Configured" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Grok (xAI)</span>
              <Badge variant={activeProvider === 'grok' ? "default" : providerStatus?.grok?.configured ? "secondary" : "outline"}>
                {activeProvider === 'grok' ? "Active" : providerStatus?.grok?.configured ? "Configured" : "Not Set"}
              </Badge>
            </div>
            <div className="pt-2">
              <Button onClick={checkProviderStatus} variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Key Management Cards */}
        <div className="space-y-4">
          {/* DeepSeek Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                DeepSeek API Key
              </CardTitle>
              <CardDescription>
                Primary fallback provider for seamless AI service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deepseek-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="deepseek-key"
                    type={showKeys.deepseek ? "text" : "password"}
                    placeholder="sk-..."
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowKeys(prev => ({ ...prev, deepseek: !prev.deepseek }))}
                  >
                    {showKeys.deepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={() => handleUpdateKey('deepseek', deepseekKey)} 
                disabled={isLoading || !deepseekKey.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update DeepSeek Key'
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://platform.deepseek.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary underline"
                >
                  Get DeepSeek API Key
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Gemini Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Gemini API Key
              </CardTitle>
              <CardDescription>
                Google's AI for advanced multimodal analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="gemini-key"
                    type={showKeys.gemini ? "text" : "password"}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                  >
                    {showKeys.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={() => handleUpdateKey('gemini', geminiKey)} 
                disabled={isLoading || !geminiKey.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Gemini Key'
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary underline"
                >
                  Get Gemini API Key
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Grok Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Grok API Key (xAI)
              </CardTitle>
              <CardDescription>
                Elon Musk's xAI for cutting-edge AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="grok-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="grok-key"
                    type={showKeys.grok ? "text" : "password"}
                    placeholder="xai-..."
                    value={grokKey}
                    onChange={(e) => setGrokKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowKeys(prev => ({ ...prev, grok: !prev.grok }))}
                  >
                    {showKeys.grok ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={() => handleUpdateKey('grok', grokKey)} 
                disabled={isLoading || !grokKey.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Grok Key'
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href="https://console.x.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary underline"
                >
                  Get Grok API Key
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fallback System Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Fallback System</CardTitle>
          <CardDescription>
            How the automatic provider switching works to ensure uninterrupted service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Primary:</strong> OpenAI GPT-4o provides high-quality document analysis
                <br />
                <strong>Fallback 1:</strong> DeepSeek (cost-effective alternative with similar capabilities)
                <br />
                <strong>Fallback 2:</strong> Gemini 2.5 (Google's advanced multimodal AI)
                <br />
                <strong>Fallback 3:</strong> Grok (xAI's latest model with real-time capabilities)
                <br />
                <strong>Emergency:</strong> Local analysis provides basic functionality if all fail
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button onClick={testFallbackSystem} disabled={isLoading} variant="outline">
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Fallback System'
                )}
              </Button>
            </div>

            {testResult && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">{testResult}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}