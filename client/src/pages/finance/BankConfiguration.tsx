import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Network, FileUp, TestTube } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BankConfig {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
  bankCode: string;
  swiftCode?: string;
  apiEndpoint?: string;
  credentials: {
    clientId: string;
    clientSecret: string;
    apiKey?: string;
  };
}

interface EDIConfig {
  partnerName: string;
  partnerISA: string;
  ourISA: string;
  documentTypes: string[];
  communicationMethod: 'AS2' | 'SFTP' | 'VAN';
  connectionDetails: {
    endpoint: string;
    username: string;
    password: string;
    certificatePath?: string;
  };
}

export default function BankConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking',
    bankCode: '',
    swiftCode: '',
    apiEndpoint: '',
    credentials: {
      clientId: '',
      clientSecret: '',
      apiKey: ''
    }
  });

  const [ediConfig, setEDIConfig] = useState<EDIConfig>({
    partnerName: '',
    partnerISA: '',
    ourISA: '',
    documentTypes: [],
    communicationMethod: 'AS2',
    connectionDetails: {
      endpoint: '',
      username: '',
      password: '',
      certificatePath: ''
    }
  });

  const configureBankMutation = useMutation({
    mutationFn: async (config: BankConfig) => {
      const response = await apiRequest('/api/finance/bank-integration/configure-bank', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Bank account configured successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/bank-accounts'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to configure bank account",
        variant: "destructive" 
      });
    }
  });

  const configureEDIMutation = useMutation({
    mutationFn: async (config: EDIConfig) => {
      const response = await apiRequest('/api/finance/bank-integration/configure-edi', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "EDI trading partner configured successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to configure EDI partner",
        variant: "destructive" 
      });
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: (bankAccountId: number) =>
      fetch(`/api/finance/bank-integration/test-connection/${bankAccountId}`, {
        method: 'POST'
      }).then(res => res.json()),
    onSuccess: (data) => {
      toast({ 
        title: data.success ? "Success" : "Error", 
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    }
  });

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureBankMutation.mutate(bankConfig);
  };

  const handleEDISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configureEDIMutation.mutate(ediConfig);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bankAccountId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('statement', file);
    formData.append('statementDate', new Date().toISOString().split('T')[0]);

    try {
      const response = await fetch(`/api/finance/bank-integration/upload-statement/${bankAccountId}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({ 
          title: "Success", 
          description: `Processed ${result.transactionsProcessed} transactions` 
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process bank statement",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank & EDI Configuration</h1>
          <p className="text-muted-foreground">Configure real bank accounts and EDI trading partners</p>
        </div>
      </div>

      <Tabs defaultValue="bank" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
          <TabsTrigger value="edi">EDI Partners</TabsTrigger>
          <TabsTrigger value="testing">Connection Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Real Bank Account Configuration
              </CardTitle>
              <CardDescription>
                Configure connections to your actual banking institutions for real-time data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankConfig.bankName}
                      onChange={(e) => setBankConfig({ ...bankConfig, bankName: e.target.value })}
                      placeholder="e.g., Wells Fargo Bank"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      value={bankConfig.routingNumber}
                      onChange={(e) => setBankConfig({ ...bankConfig, routingNumber: e.target.value })}
                      placeholder="e.g., 121000248"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      value={bankConfig.accountNumber}
                      onChange={(e) => setBankConfig({ ...bankConfig, accountNumber: e.target.value })}
                      placeholder="Your actual account number"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={bankConfig.accountType}
                      onValueChange={(value) => setBankConfig({ ...bankConfig, accountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="lockbox">Lockbox</SelectItem>
                        <SelectItem value="concentration">Concentration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                    <Input
                      id="swiftCode"
                      value={bankConfig.swiftCode}
                      onChange={(e) => setBankConfig({ ...bankConfig, swiftCode: e.target.value })}
                      placeholder="e.g., WFBIUS6S"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apiEndpoint">Bank API Endpoint</Label>
                    <Input
                      id="apiEndpoint"
                      value={bankConfig.apiEndpoint}
                      onChange={(e) => setBankConfig({ ...bankConfig, apiEndpoint: e.target.value })}
                      placeholder="https://api.yourbank.com/v1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">API Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        type="password"
                        value={bankConfig.credentials.clientId}
                        onChange={(e) => setBankConfig({
                          ...bankConfig,
                          credentials: { ...bankConfig.credentials, clientId: e.target.value }
                        })}
                        placeholder="Your bank API client ID"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        value={bankConfig.credentials.clientSecret}
                        onChange={(e) => setBankConfig({
                          ...bankConfig,
                          credentials: { ...bankConfig.credentials, clientSecret: e.target.value }
                        })}
                        placeholder="Your bank API client secret"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key (Optional)</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={bankConfig.credentials.apiKey}
                        onChange={(e) => setBankConfig({
                          ...bankConfig,
                          credentials: { ...bankConfig.credentials, apiKey: e.target.value }
                        })}
                        placeholder="Additional API key if required"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={configureBankMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {configureBankMutation.isPending ? 'Configuring...' : 'Configure Bank Account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                EDI Trading Partner Configuration
              </CardTitle>
              <CardDescription>
                Set up EDI connections with your customers and vendors for automated document exchange
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEDISubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partnerName">Trading Partner Name</Label>
                    <Input
                      id="partnerName"
                      value={ediConfig.partnerName}
                      onChange={(e) => setEDIConfig({ ...ediConfig, partnerName: e.target.value })}
                      placeholder="e.g., ABC Corporation"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="partnerISA">Partner ISA ID</Label>
                    <Input
                      id="partnerISA"
                      value={ediConfig.partnerISA}
                      onChange={(e) => setEDIConfig({ ...ediConfig, partnerISA: e.target.value })}
                      placeholder="e.g., ABCCORP"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ourISA">Our ISA ID</Label>
                    <Input
                      id="ourISA"
                      value={ediConfig.ourISA}
                      onChange={(e) => setEDIConfig({ ...ediConfig, ourISA: e.target.value })}
                      placeholder="e.g., YOURCOMPANY"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commMethod">Communication Method</Label>
                    <Select
                      value={ediConfig.communicationMethod}
                      onValueChange={(value: 'AS2' | 'SFTP' | 'VAN') => 
                        setEDIConfig({ ...ediConfig, communicationMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AS2">AS2 (Secure HTTP)</SelectItem>
                        <SelectItem value="SFTP">SFTP (Secure FTP)</SelectItem>
                        <SelectItem value="VAN">VAN (Value Added Network)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connection Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Endpoint URL</Label>
                      <Input
                        id="endpoint"
                        value={ediConfig.connectionDetails.endpoint}
                        onChange={(e) => setEDIConfig({
                          ...ediConfig,
                          connectionDetails: { ...ediConfig.connectionDetails, endpoint: e.target.value }
                        })}
                        placeholder="https://edi.partner.com/inbox"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={ediConfig.connectionDetails.username}
                        onChange={(e) => setEDIConfig({
                          ...ediConfig,
                          connectionDetails: { ...ediConfig.connectionDetails, username: e.target.value }
                        })}
                        placeholder="Your EDI username"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={ediConfig.connectionDetails.password}
                        onChange={(e) => setEDIConfig({
                          ...ediConfig,
                          connectionDetails: { ...ediConfig.connectionDetails, password: e.target.value }
                        })}
                        placeholder="Your EDI password"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="certificate">Certificate Path (AS2 only)</Label>
                      <Input
                        id="certificate"
                        value={ediConfig.connectionDetails.certificatePath}
                        onChange={(e) => setEDIConfig({
                          ...ediConfig,
                          connectionDetails: { ...ediConfig.connectionDetails, certificatePath: e.target.value }
                        })}
                        placeholder="/path/to/certificate.p12"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={configureEDIMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {configureEDIMutation.isPending ? 'Configuring...' : 'Configure EDI Partner'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Connection Testing
              </CardTitle>
              <CardDescription>
                Test your bank and EDI connections to ensure they're working properly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bank Statement Upload</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a bank statement file (BAI2, OFX, or CSV format) to test processing
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".bai,.ofx,.csv,.txt"
                    onChange={(e) => handleFileUpload(e, 1)} // Use first bank account for testing
                    className="flex-1"
                  />
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Bank API Connection Test</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Test the connection to your bank's API to verify credentials and connectivity
                </p>
                <Button
                  onClick={() => testConnectionMutation.mutate(1)}
                  disabled={testConnectionMutation.isPending}
                  variant="outline"
                >
                  {testConnectionMutation.isPending ? 'Testing...' : 'Test Bank Connection'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}