import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, DollarSign, AlertCircle, Building2, CreditCard, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertBankAccountSchema, type InsertBankAccount } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Business-specific interfaces for Cash Management
interface BankAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  currency: string;
  currentBalance: number;
  availableBalance: number;
  accountType: string;
  isActive: boolean;
}

interface BankTransaction {
  id: number;
  bankAccountId: number;
  transactionDate: string;
  valueDate: string;
  transactionType: 'debit' | 'credit';
  amount: number;
  description: string;
  reference?: string;
  statementReference?: string;
  reconciliationStatus: 'reconciled' | 'unreconciled' | 'pending';
  reconciledDate?: string;
}

interface CashPosition {
  bankingSummary: {
    totalBalance: number;
    availableBalance: number;
    accountCount: number;
  };
}

export default function CashManagement() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [showReconcileDialog, setShowReconcileDialog] = useState<boolean>(false);
  const [reconciliationFilter, setReconciliationFilter] = useState<string>('all');
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);

  // Form for adding new bank account
  const form = useForm<InsertBankAccount>({
    resolver: zodResolver(insertBankAccountSchema),
    defaultValues: {
      accountNumber: '',
      accountName: '',
      bankName: '',
      currency: 'USD',
      currentBalance: '0',
      availableBalance: '0',
      accountType: 'checking',
      companyCodeId: 1,
      glAccountId: 1
    }
  });

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/transactions/cash-management/bank-accounts'],
    refetchInterval: 30000
  });

  // Fetch bank transactions for selected account
  const { data: bankTransactions = [], isLoading: transactionsLoading } = useQuery<BankTransaction[]>({
    queryKey: ['/api/transactions/cash-management/bank-transactions', selectedAccount, reconciliationFilter],
    enabled: !!selectedAccount,
    refetchInterval: 15000
  });

  // Fetch cash position
  const { data: cashPosition, isLoading: positionLoading } = useQuery<CashPosition>({
    queryKey: ['/api/transactions/cash-management/cash-position', { companyCodeId: 1, currency: 'USD' }],
    refetchInterval: 60000
  });

  // Create bank account mutation
  const createAccountMutation = useMutation({
    mutationFn: (data: InsertBankAccount) => 
      apiRequest('/api/transactions/cash-management/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/cash-management/bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/cash-management/cash-position'] });
      setShowAddAccountDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Bank account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bank account",
        variant: "destructive",
      });
    }
  });

  const onSubmitAccount = (data: InsertBankAccount) => {
    createAccountMutation.mutate(data);
  };

  // Reconciliation mutation
  const reconcileMutation = useMutation({
    mutationFn: async (data: { transactionIds: number[], reconciledBy: number }) => {
      return apiRequest('/api/transactions/cash-management/reconcile', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/cash-management/bank-transactions'] });
      setSelectedTransactions([]);
      setShowReconcileDialog(false);
    }
  });

  const getReconciliationStatusColor = (status: string): string => {
    switch (status) {
      case 'reconciled': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'unreconciled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReconcileTransactions = () => {
    if (selectedTransactions.length === 0) return;
    
    reconcileMutation.mutate({
      transactionIds: selectedTransactions,
      reconciledBy: 1
    });
  };

  const toggleTransactionSelection = (transactionId: number) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleBack = (): void => {
    window.history.back();
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Management</h1>
            <p className="text-gray-600">Bank reconciliation and liquidity management</p>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-3">
          {permissions.canCreate && (
            <Dialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Bank Account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Bank Account</DialogTitle>
                  <DialogDescription>
                    Create a new bank account for cash management and reconciliation.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitAccount)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="money_market">Money Market</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="currentBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Balance</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="availableBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Balance</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddAccountDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createAccountMutation.isPending}>
                        {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Cash Position Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bank Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{bankAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(cashPosition?.bankingSummary?.totalBalance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reconciled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bankTransactions.filter((t: BankTransaction) => t.reconciliationStatus === 'reconciled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unreconciled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bankTransactions.filter((t: BankTransaction) => t.reconciliationStatus === 'unreconciled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Account Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bank Account Selection</CardTitle>
          <CardDescription>Select a bank account to view transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((account: BankAccount) => (
              <Card 
                key={account.id} 
                className={`cursor-pointer transition-colors ${
                  selectedAccount === account.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedAccount(account.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{account.accountName}</h3>
                      <p className="text-sm text-gray-600">{account.accountNumber}</p>
                      <p className="text-sm text-gray-600">{account.bankName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </p>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bank Transactions */}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bank Transactions</CardTitle>
                <CardDescription>Transaction history and reconciliation</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={reconciliationFilter} onValueChange={setReconciliationFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="unreconciled">Unreconciled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedTransactions.length > 0 && permissions.hasDataModificationRights && (
                  <Button
                    onClick={() => setShowReconcileDialog(true)}
                    disabled={reconcileMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Reconcile ({selectedTransactions.length})</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions(
                              bankTransactions
                                .filter((t: BankTransaction) => t.reconciliationStatus === 'unreconciled')
                                .map((t: BankTransaction) => t.id)
                            );
                          } else {
                            setSelectedTransactions([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankTransactions.map((transaction: BankTransaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {transaction.reconciliationStatus === 'unreconciled' && (
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.transactionType === 'credit' ? 'default' : 'secondary'}>
                          {transaction.transactionType === 'credit' ? (
                            <CreditCard className="h-3 w-3 mr-1" />
                          ) : (
                            <DollarSign className="h-3 w-3 mr-1" />
                          )}
                          {transaction.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.transactionType === 'credit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </TableCell>
                      <TableCell>{transaction.reference || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getReconciliationStatusColor(transaction.reconciliationStatus)}>
                          {transaction.reconciliationStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Transactions</DialogTitle>
            <DialogDescription>
              Confirm reconciliation of {selectedTransactions.length} selected transactions
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcileDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReconcileTransactions}
              disabled={reconcileMutation.isPending}
            >
              {reconcileMutation.isPending ? 'Processing...' : 'Reconcile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}