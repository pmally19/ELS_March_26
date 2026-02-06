import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  CreditCard, 
  DollarSign, 
  FileSpreadsheet,
  Banknote,
  ArrowLeftRight,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface BankAccount {
  id: number;
  account_number: string;
  account_name: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
  available_balance: number;
  currency: string;
  company_name: string;
  gl_account_name: string;
  is_active: boolean;
}

interface LockboxProcessing {
  id: number;
  lockbox_number: string;
  processing_date: string;
  deposit_amount: number;
  check_count: number;
  ach_count: number;
  wire_count: number;
  deposit_slip_number: string;
  bank_file_name: string;
  processing_status: string;
  account_name: string;
  bank_name: string;
}

interface LockboxTransaction {
  id: number;
  check_number: string;
  customer_account: string;
  payment_amount: number;
  payment_date: string;
  deposit_date: string;
  remittance_data: string;
  invoice_references: string[];
  cash_application_status: string;
  exception_reason?: string;
  manual_review_required: boolean;
  lockbox_number: string;
  account_name: string;
  bank_name: string;
}

interface EDITransaction {
  id: number;
  edi_transaction_set: string;
  sender_id: string;
  receiver_id: string;
  control_number: string;
  transaction_date: string;
  document_type: string;
  reference_number: string;
  total_amount: number;
  currency_code: string;
  processing_status: string;
  error_messages?: any;
  parsed_data: any;
}

export default function BankAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: bankAccounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['/api/finance/bank-accounts'],
    queryFn: () => fetch('/api/finance/bank-accounts').then(res => res.json())
  });
  
  const { data: lockboxData, isLoading: loadingLockbox } = useQuery({
    queryKey: ['/api/finance/bank-accounts/lockbox'],
    queryFn: () => fetch('/api/finance/bank-accounts/lockbox').then(res => res.json())
  });
  
  const { data: lockboxTransactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['/api/finance/bank-accounts/lockbox/transactions'],
    queryFn: () => fetch('/api/finance/bank-accounts/lockbox/transactions').then(res => res.json())
  });
  
  const { data: ediTransactions, isLoading: loadingEDI } = useQuery({
    queryKey: ['/api/finance/bank-accounts/edi'],
    queryFn: () => fetch('/api/finance/bank-accounts/edi').then(res => res.json())
  });

  const applyCashMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/finance/bank-accounts/lockbox/apply-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Success", description: "Cash application processed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/finance/bank-accounts/lockbox/transactions'] });
    }
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'active': 'default',
      'processed': 'default',
      'applied': 'default',
      'pending': 'secondary',
      'partial': 'outline',
      'error': 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTotalBalance = () => {
    if (!bankAccounts) return 0;
    return bankAccounts.reduce((sum: number, account: BankAccount) => sum + account.current_balance, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Account Management</h1>
          <p className="text-muted-foreground">Comprehensive banking, lockbox, and EDI processing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalBalance())}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankAccounts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Bank relationships</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Lockbox</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(lockboxData?.filter((d: LockboxProcessing) => 
                d.processing_date === new Date().toISOString().split('T')[0]
              ).reduce((sum: number, d: LockboxProcessing) => sum + d.deposit_amount, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Customer payments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EDI Processing</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ediTransactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active transactions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="lockbox">Lockbox Processing</TabsTrigger>
          <TabsTrigger value="transactions">Cash Application</TabsTrigger>
          <TabsTrigger value="edi">EDI Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Portfolio</CardTitle>
              <CardDescription>Active banking relationships and account configurations</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <div>Loading bank accounts...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Available Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts?.map((account: BankAccount) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.account_name}</TableCell>
                        <TableCell>{account.bank_name}</TableCell>
                        <TableCell className="font-mono">***{account.account_number.slice(-4)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.account_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(account.current_balance)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.available_balance)}</TableCell>
                        <TableCell>{getStatusBadge(account.is_active ? 'active' : 'inactive')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lockbox Processing</CardTitle>
              <CardDescription>Daily customer payment processing through bank lockbox services</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLockbox ? (
                <div>Loading lockbox data...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Processing Date</TableHead>
                      <TableHead>Lockbox Number</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Deposit Amount</TableHead>
                      <TableHead>Check Count</TableHead>
                      <TableHead>ACH Count</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockboxData?.map((processing: LockboxProcessing) => (
                      <TableRow key={processing.id}>
                        <TableCell>{new Date(processing.processing_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono">{processing.lockbox_number}</TableCell>
                        <TableCell>{processing.bank_name}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(processing.deposit_amount)}</TableCell>
                        <TableCell>{processing.check_count}</TableCell>
                        <TableCell>{processing.ach_count}</TableCell>
                        <TableCell className="font-mono text-sm">{processing.bank_file_name}</TableCell>
                        <TableCell>{getStatusBadge(processing.processing_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Application</CardTitle>
              <CardDescription>Individual payment transactions requiring cash application to AR</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div>Loading transactions...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check Number</TableHead>
                      <TableHead>Customer Account</TableHead>
                      <TableHead>Payment Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Invoice References</TableHead>
                      <TableHead>Application Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lockboxTransactions?.map((transaction: LockboxTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">{transaction.check_number}</TableCell>
                        <TableCell>{transaction.customer_account}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(transaction.payment_amount)}</TableCell>
                        <TableCell>{new Date(transaction.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {transaction.invoice_references?.length > 0 ? (
                            <div className="space-y-1">
                              {transaction.invoice_references.map((ref, idx) => (
                                <Badge key={idx} variant="outline" className="mr-1">{ref}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No references</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.cash_application_status)}</TableCell>
                        <TableCell>
                          {transaction.cash_application_status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => applyCashMutation.mutate({
                                transactionId: transaction.id,
                                invoiceNumbers: transaction.invoice_references || [],
                                applicationAmount: transaction.payment_amount
                              })}
                              disabled={applyCashMutation.isPending}
                            >
                              Apply Cash
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>EDI Transaction Processing</CardTitle>
              <CardDescription>Electronic Data Interchange for automated document processing</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEDI ? (
                <div>Loading EDI transactions...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction Set</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Sender/Receiver</TableHead>
                      <TableHead>Control Number</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transaction Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ediTransactions?.map((edi: EDITransaction) => (
                      <TableRow key={edi.id}>
                        <TableCell className="font-mono">{edi.edi_transaction_set}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {edi.document_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>From: {edi.sender_id}</div>
                            <div>To: {edi.receiver_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{edi.control_number}</TableCell>
                        <TableCell className="font-mono">{edi.reference_number}</TableCell>
                        <TableCell className="text-right">{formatCurrency(edi.total_amount)}</TableCell>
                        <TableCell>{new Date(edi.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(edi.processing_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}