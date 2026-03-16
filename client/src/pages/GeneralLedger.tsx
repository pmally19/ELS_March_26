import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Database, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  PlusCircle,
  BarChart3,
  Settings,
  CheckCircle,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';

interface GLAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_type: string;
  balance_sheet_account: boolean;
  pl_account: boolean;
  is_active: boolean;
}

interface PostingEntry {
  gl_account_id: number;
  gl_account_number: string;
  amount: number;
  debit_credit_indicator: 'D' | 'C';
  description: string;
}

export default function GeneralLedger() {
  const [selectedAccount, setSelectedAccount] = useState<GLAccount | null>(null);
  const [showPostingDialog, setShowPostingDialog] = useState(false);
  const [postingEntries, setPostingEntries] = useState<PostingEntry[]>([]);
  const [postingReference, setPostingReference] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  // Fetch GL accounts from existing database
  const { data: glAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/general-ledger/gl-accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/general-ledger/gl-accounts');
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching GL accounts:', error);
        return [];
      }
    }
  });

  // Fetch GL entries
  const { data: glEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ['/api/general-ledger/gl-entries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/general-ledger/gl-entries');
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching GL entries:', error);
        return [];
      }
    }
  });

  // Calculate dashboard metrics from real data
  const dashboardMetrics = React.useMemo(() => {
    if (!Array.isArray(glAccounts) || !Array.isArray(glEntries)) return null;
    
    const assets = glAccounts.filter((acc: GLAccount) => acc.account_type === 'ASSET');
    const liabilities = glAccounts.filter((acc: GLAccount) => acc.account_type === 'LIABILITY');
    const equity = glAccounts.filter((acc: GLAccount) => acc.account_type === 'EQUITY');
    const revenue = glAccounts.filter((acc: GLAccount) => acc.account_type === 'REVENUE');
    
    return {
      totalAccounts: glAccounts.length,
      activeAccounts: glAccounts.filter((acc: GLAccount) => acc.is_active).length,
      balanceSheetAccounts: glAccounts.filter((acc: GLAccount) => acc.balance_sheet_account).length,
      plAccounts: glAccounts.filter((acc: GLAccount) => acc.pl_account).length,
      totalEntries: glEntries.length,
      assetsCount: assets.length,
      liabilitiesCount: liabilities.length,
      equityCount: equity.length,
      revenueCount: revenue.length
    };
  }, [glAccounts, glEntries]);

  // Mutation for creating GL posting
  const createPostingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/general-ledger/postings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/general-ledger/gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/general-ledger/gl-accounts'] });
      setShowPostingDialog(false);
      setPostingEntries([]);
      setPostingReference('');
    },
  });

  const addPostingEntry = () => {
    setPostingEntries([...postingEntries, {
      gl_account_id: 0,
      gl_account_number: '',
      amount: 0,
      debit_credit_indicator: 'D',
      description: ''
    }]);
  };

  const removePostingEntry = (index: number) => {
    setPostingEntries(postingEntries.filter((_, i) => i !== index));
  };

  const updatePostingEntry = (index: number, field: keyof PostingEntry, value: any) => {
    const updated = [...postingEntries];
    updated[index] = { ...updated[index], [field]: value };
    
    // If account is selected, update account_id
    if (field === 'gl_account_number') {
      const account = glAccounts?.find((acc: GLAccount) => acc.account_number === value);
      if (account) {
        updated[index].gl_account_id = account.id;
      }
    }
    
    setPostingEntries(updated);
  };

  // Fetch default company code and currency (no hardcoded values)
  const { data: companySettings } = useQuery({
    queryKey: ['/api/master-data/company-code/default'],
    queryFn: async () => {
      try {
        // Try to get default company code from first active company
        const response = await apiRequest('/api/master-data/company-code');
        if (Array.isArray(response) && response.length > 0) {
          // Get first active company or first company
          const defaultCompany = response.find((c: any) => c.is_active || c.active) || response[0];
          return {
            company_code: defaultCompany.code,
            currency: defaultCompany.currency
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching company settings:', error);
        return null;
      }
    }
  });

  // Fetch default document type (no hardcoded values)
  const { data: defaultDocType } = useQuery({
    queryKey: ['/api/system-configuration/default-document-type'],
    queryFn: async () => {
      try {
        // Try system configuration first
        const response = await apiRequest('/api/system-configuration?key=default_accounting_document_type');
        if (response && response.config_value) {
          return response.config_value;
        }
        // Try to get from document types API if available
        try {
          const docTypesResponse = await apiRequest('/api/master-data/document-types?category=GENERAL_LEDGER');
          if (Array.isArray(docTypesResponse) && docTypesResponse.length > 0) {
            return docTypesResponse[0].code;
          }
        } catch (e) {
          // Ignore if endpoint doesn't exist
        }
        // Last resort: return null and let backend handle fallback
        return null;
      } catch (error) {
        console.error('Error fetching default document type:', error);
        return null; // Let backend determine default
      }
    }
  });

  const handleCreatePosting = () => {
    const totalDebits = postingEntries
      .filter(e => e.debit_credit_indicator === 'D')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalCredits = postingEntries
      .filter(e => e.debit_credit_indicator === 'C')
      .reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      alert(`Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})`);
      return;
    }

    if (postingEntries.length < 2) {
      alert('At least 2 entries are required');
      return;
    }

    // Use dynamically fetched values, fallback only if not available
    createPostingMutation.mutate({
      entries: postingEntries,
      reference: postingReference,
      posting_date: postingDate,
      document_date: postingDate,
      document_type: defaultDocType,
      company_code: companySettings?.company_code,
      currency: companySettings?.currency
    });
  };

  const totalDebits = postingEntries
    .filter(e => e.debit_credit_indicator === 'D')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalCredits = postingEntries
    .filter(e => e.debit_credit_indicator === 'C')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reporting</h1>
          <p className="text-gray-600">Manage chart of accounts, postings, and financial reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </Button>
          <Button onClick={() => setShowPostingDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Posting
          </Button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.totalAccounts || 0}</div>
            <div className="text-xs text-gray-500">
              {dashboardMetrics?.activeAccounts || 0} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              Balance Sheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.balanceSheetAccounts || 0}</div>
            <div className="text-xs text-gray-500">accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              P&L Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.plAccounts || 0}</div>
            <div className="text-xs text-gray-500">accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              GL Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics?.totalEntries || 0}</div>
            <div className="text-xs text-gray-500">total postings</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Active</span>
            </div>
            <div className="text-xs text-gray-500">ERP Connected</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="postings">Postings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="integration">ERP Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Chart of Accounts
                <Badge variant="outline">{Array.isArray(glAccounts) ? glAccounts.length : 0} accounts</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Loading accounts...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(glAccounts) && glAccounts.slice(0, 10).map((account: GLAccount) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAccount(account)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {account.account_number}
                        </div>
                        <div>
                          <div className="font-medium">{account.account_name}</div>
                          <div className="text-sm text-gray-500">{account.account_type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.balance_sheet_account && (
                          <Badge variant="secondary">BS</Badge>
                        )}
                        {account.pl_account && (
                          <Badge variant="secondary">P&L</Badge>
                        )}
                        <Badge variant={account.is_active ? "default" : "outline"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {Array.isArray(glAccounts) && glAccounts.length > 10 && (
                    <div className="text-center py-4">
                      <Button variant="outline">View All Accounts</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent GL Postings</CardTitle>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Loading entries...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(glEntries) && glEntries.slice(0, 5).map((entry: any, index: number) => (
                    <div key={entry.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm">{entry.document_number}</div>
                        <div>
                          <div className="font-medium">GL Entry #{entry.id}</div>
                          <div className="text-sm text-gray-500">{entry.posting_date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${entry.amount?.toLocaleString() || '0.00'}</div>
                        <Badge variant={entry.debit_credit_indicator === 'D' ? "default" : "secondary"}>
                          {entry.debit_credit_indicator === 'D' ? 'Debit' : 'Credit'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="text-center py-4">
                    <Button variant="outline">View All Postings</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Trial Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Generate trial balance for current period
                  </div>
                  <Button className="w-full">Generate Trial Balance</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Generate balance sheet report
                  </div>
                  <Button className="w-full">Generate Balance Sheet</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>P&L Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Generate profit & loss statement
                  </div>
                  <Button className="w-full">Generate P&L</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Detailed account movement analysis
                  </div>
                  <Button className="w-full">Generate Analysis</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERP Integration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Master Data Integration</div>
                      <div className="text-sm text-gray-600">Connected to existing ERP tables</div>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Financial Transactions</div>
                      <div className="text-sm text-gray-600">GL entries synchronized</div>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Real-time Posting</div>
                      <div className="text-sm text-gray-600">Enhanced posting interface ready</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">Ready</Badge>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Integration Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Database Tables:</span>
                      <div className="font-medium">gl_accounts, gl_entries, general_ledger_accounts</div>
                    </div>
                    <div>
                      <span className="text-gray-600">API Endpoints:</span>
                      <div className="font-medium">/api/master-data/gl-accounts, /api/finance/gl-entries</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Data Flow:</span>
                      <div className="font-medium">Sales → AR → GL, Purchase → AP → GL</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Reporting:</span>
                      <div className="font-medium">Real-time balance calculation</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Posting Dialog */}
      <Dialog open={showPostingDialog} onOpenChange={setShowPostingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New GL Posting</DialogTitle>
            <DialogDescription>
              Create a new general ledger posting. Document number will be auto-generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="posting-date">Posting Date</Label>
                <Input
                  id="posting-date"
                  type="date"
                  value={postingDate}
                  onChange={(e) => setPostingDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={postingReference}
                  onChange={(e) => setPostingReference(e.target.value)}
                  placeholder="Enter reference text"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Posting Entries</Label>
                <Button onClick={addPostingEntry} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-3">
                {postingEntries.map((entry, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <Label>GL Account</Label>
                        <Select
                          value={entry.gl_account_number}
                          onValueChange={(value) => updatePostingEntry(index, 'gl_account_number', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {glAccounts?.map((account: GLAccount) => (
                              <SelectItem key={account.id} value={account.account_number}>
                                {account.account_number} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Type</Label>
                        <Select
                          value={entry.debit_credit_indicator}
                          onValueChange={(value: 'D' | 'C') => updatePostingEntry(index, 'debit_credit_indicator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="D">Debit</SelectItem>
                            <SelectItem value="C">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amount || ''}
                          onChange={(e) => updatePostingEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={entry.description}
                          onChange={(e) => updatePostingEntry(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div className="col-span-1">
                        {postingEntries.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePostingEntry(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {postingEntries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No entries added. Click "Add Entry" to start.
                  </div>
                )}
              </div>
            </div>

            {/* Totals Summary */}
            {postingEntries.length > 0 && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <Label className="text-sm text-gray-600">Total Debits</Label>
                    <div className="text-xl font-bold text-blue-700">${totalDebits.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <Label className="text-sm text-gray-600">Total Credits</Label>
                    <div className="text-xl font-bold text-green-700">${totalCredits.toFixed(2)}</div>
                  </div>
                </div>
                {Math.abs(totalDebits - totalCredits) > 0.01 && (
                  <div className="mt-2 text-sm text-red-600">
                    ⚠️ Debits and Credits must be equal
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePosting}
              disabled={createPostingMutation.isPending || postingEntries.length < 2 || Math.abs(totalDebits - totalCredits) > 0.01}
            >
              {createPostingMutation.isPending ? 'Creating...' : 'Create Posting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}