import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Lock, Unlock, AlertCircle, CheckCircle, XCircle, Play, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';


interface FiscalPeriod {
    id: number;
    year: number;
    period: number;
    name: string;
    startDate: string;  // Changed from start_date
    endDate: string;    // Changed from end_date
    status: 'Open' | 'Closed';
    postingAllowed: boolean;  // Changed from posting_allowed
    companyCodeId?: number;   // Changed from company_code_id
    active?: boolean;
}

interface PeriodClosing {
    id: number;
    company_code_id: number;
    year: number;
    period: number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
    validated_entries: number;
    unbalanced_entries: number;
    total_debits: string;
    total_credits: string;
    closing_date?: string;
    completed_at?: string;
}

export function PeriodEndClosing() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedPeriod, setSelectedPeriod] = useState<FiscalPeriod | null>(null);

    // Fetch fiscal periods
    const { data: periods = [], isLoading: periodsLoading } = useQuery<FiscalPeriod[]>({
        queryKey: ['fiscal-period'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/fiscal-period');
            if (!response.ok) throw new Error('Failed to fetch periods');
            return response.json();
        },
    });

    // Fetch period closings
    const { data: closings = [] } = useQuery<PeriodClosing[]>({
        queryKey: ['period-closings'],
        queryFn: async () => {
            const response = await fetch('/api/period-end-closing');
            if (!response.ok) throw new Error('Failed to fetch closings');
            const data = await response.json();
            return data.records || [];
        },
    });

    // Create period closing
    const createClosingMutation = useMutation({
        mutationFn: async (period: FiscalPeriod) => {
            const response = await fetch('/api/period-end-closing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscalPeriodId: period.id,
                    companyCodeId: period.companyCodeId,
                    year: period.year,
                    period: period.period,
                    closingType: period.period === 12 ? 'year_end' : 'month_end',
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create closing');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['period-closings'] });
            toast({ title: 'Period closing created', description: 'Ready to process' });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Process period closing
    const processClosingMutation = useMutation({
        mutationFn: async (closingId: number) => {
            const response = await fetch(`/api/period-end-closing/${closingId}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process closing');
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['period-closings'] });
            queryClient.invalidateQueries({ queryKey: ['fiscal-periods'] });

            if (data.validation.isBalanced) {
                toast({
                    title: 'Period closed successfully',
                    description: `${data.validation.validatedEntries} entries validated. Balanced: ${data.validation.totalDebits} = ${data.validation.totalCredits}`,
                });
            } else {
                toast({
                    title: 'Period closing failed',
                    description: `${data.validation.unbalancedEntries} unbalanced entries found`,
                    variant: 'destructive',
                });
            }
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Handle close period
    const handleClosePeriod = async (period: FiscalPeriod) => {
        if (!confirm(`Close period ${period.period}/${period.year}? This will validate all GL entries.`)) {
            return;
        }

        // Check if closing already exists
        const existing = closings.find(
            (c) => c.year === period.year && c.period === period.period && c.company_code_id === period.company_code_id
        );

        if (existing) {
            // Process existing closing
            processClosingMutation.mutate(existing.id);
        } else {
            // Create new closing then process
            const result = await createClosingMutation.mutateAsync(period);
            if (result.record) {
                processClosingMutation.mutate(result.record.id);
            }
        }
    };

    // Get closing status for a period
    const getClosingStatus = (period: FiscalPeriod) => {
        return closings.find(
            (c) => c.year === period.year && c.period === period.period && c.company_code_id === period.companyCodeId
        );
    };

    // Format date helper
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/finance">
                        <Button variant="outline" size="sm">
                            ← Back to Finance
                        </Button>
                    </Link>
                    <Link href="/finance/accruals">
                        <Button variant="outline" size="sm" className="bg-indigo-50 hover:bg-indigo-100 border-indigo-200">
                            📊 Accrual Postings
                        </Button>
                    </Link>
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Period End Closing</h1>
                    <p className="text-sm text-muted-foreground">Manage fiscal period closing and validation</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periods.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
                        <Unlock className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {periods.filter((p) => p.status === 'Open').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Closed Periods</CardTitle>
                        <Lock className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {periods.filter((p) => p.status === 'Closed').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Closings</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {closings.filter((c) => c.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Period End Closing Features */}
            <Tabs defaultValue="periods" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="periods">Period Management</TabsTrigger>
                    <TabsTrigger value="validation">Daily Validation</TabsTrigger>
                    <TabsTrigger value="accruals">Accrual Postings</TabsTrigger>
                    <TabsTrigger value="balance">Balance Carry Forward</TabsTrigger>
                    <TabsTrigger value="tax">Tax Provisions</TabsTrigger>
                    <TabsTrigger value="documents">Closing Documents</TabsTrigger>
                </TabsList>

                {/* Period Management Tab - Existing Content */}
                <TabsContent value="periods" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fiscal Periods</CardTitle>
                            <CardDescription>View and manage fiscal period closing status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr className="border-b">
                                            <th className="p-3 text-left font-medium">Year</th>
                                            <th className="p-3 text-left font-medium">Period</th>
                                            <th className="p-3 text-left font-medium">Name</th>
                                            <th className="p-3 text-left font-medium">Start Date</th>
                                            <th className="p-3 text-left font-medium">End Date</th>
                                            <th className="p-3 text-left font-medium">Status</th>
                                            <th className="p-3 text-left font-medium">Posting</th>
                                            <th className="p-3 text-left font-medium">Closing Status</th>
                                            <th className="p-3 text-left font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periods.map((period) => {
                                            const closing = closings.find(
                                                (c) => c.year === period.year && c.period === period.period
                                            );

                                            return (
                                                <tr key={period.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-3">{period.year}</td>
                                                    <td className="p-3">{period.period}</td>
                                                    <td className="p-3">{period.name}</td>
                                                    <td className="p-3">
                                                        {new Date(period.startDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3">
                                                        {new Date(period.endDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge variant={period.status === 'Closed' ? 'destructive' : 'default'}>
                                                            {period.status === 'Closed' ? (
                                                                <>
                                                                    <Lock className="mr-1 h-3 w-3" />
                                                                    Closed
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Unlock className="mr-1 h-3 w-3" />
                                                                    Open
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge variant={period.postingAllowed ? 'default' : 'secondary'}>
                                                            {period.postingAllowed ? 'Allowed' : 'Locked'}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3">
                                                        {closing ? (
                                                            <Badge
                                                                variant={
                                                                    closing.status === 'completed'
                                                                        ? 'default'
                                                                        : closing.status === 'failed'
                                                                            ? 'destructive'
                                                                            : 'secondary'
                                                                }
                                                            >
                                                                {closing.status === 'completed' ? (
                                                                    <>
                                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                                        Completed
                                                                    </>
                                                                ) : closing.status === 'failed' ? (
                                                                    <>
                                                                        <XCircle className="mr-1 h-3 w-3" />
                                                                        Failed
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="mr-1 h-3 w-3" />
                                                                        {closing.status}
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">Not started</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        {period.status === 'Open' && !closing && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleClosePeriod(period)}
                                                                disabled={processClosingMutation.isPending || createClosingMutation.isPending}
                                                            >
                                                                <Play className="mr-1 h-3 w-3" />
                                                                Close Period
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {periods.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                                    No fiscal periods found. Create periods first.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Daily Validation Tab */}
                <TabsContent value="validation" className="space-y-4">
                    <DailyValidationTab
                        periods={periods}
                        selectedPeriod={selectedPeriod}
                        setSelectedPeriod={setSelectedPeriod}
                    />
                </TabsContent>

                {/* Accrual Postings Tab */}
                <TabsContent value="accruals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Accrual Postings</CardTitle>
                            <CardDescription>Calculate and post accruals for the period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">Accrual management is available on a dedicated page.</p>
                                <Link href="/finance/accruals">
                                    <Button>
                                        Go to Accrual Management →
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Balance Carry Forward Tab */}
                <TabsContent value="balance" className="space-y-4">
                    <BalanceCarryForwardTab
                        periods={periods}
                        selectedPeriod={selectedPeriod}
                        setSelectedPeriod={setSelectedPeriod}
                    />
                </TabsContent>

                {/* Tax Provisions Tab */}
                <TabsContent value="tax" className="space-y-4">
                    <TaxProvisionsTab
                        periods={periods}
                        selectedPeriod={selectedPeriod}
                        setSelectedPeriod={setSelectedPeriod}
                    />
                </TabsContent>

                {/* Closing Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                    <ClosingDocumentsTab
                        periods={periods}
                        selectedPeriod={selectedPeriod}
                        setSelectedPeriod={setSelectedPeriod}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Balance Carry Forward Tab Component
function BalanceCarryForwardTab({ periods, selectedPeriod, setSelectedPeriod }: {
    periods: FiscalPeriod[];
    selectedPeriod: FiscalPeriod | null;
    setSelectedPeriod: (period: FiscalPeriod | null) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch balance preview for selected period
    const { data: balancePreview, isLoading } = useQuery({
        queryKey: ['balance-preview', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return null;
            const response = await fetch(`/api/period-end-closing/${selectedPeriod.id}/balance-preview`);
            if (!response.ok) throw new Error('Failed to fetch balance preview');
            const data = await response.json();
            return data.data;
        },
        enabled: !!selectedPeriod,
    });

    // Carry forward mutation
    const carryForwardMutation = useMutation({
        mutationFn: async (periodId: number) => {
            const response = await fetch(`/api/period-end-closing/${periodId}/carry-forward`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'current-user' }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to carry forward balances');
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['fiscal-period'] });
            queryClient.invalidateQueries({ queryKey: ['balance-preview'] });
            toast({
                title: 'Success',
                description: data.message,
            });
            setSelectedPeriod(null);
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleCarryForward = () => {
        if (!selectedPeriod) return;

        if (!confirm(`Are you sure you want to close period ${selectedPeriod.period}/${selectedPeriod.year}? This will:\n\n- Close all P&L accounts to Retained Earnings\n- Create opening balances for next period\n- Lock the current period\n\nThis action cannot be easily undone.`)) {
            return;
        }

        carryForwardMutation.mutate(selectedPeriod.id);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Balance Carry Forward</CardTitle>
                    <CardDescription>Close P&L accounts and carry forward balance sheet balances to next period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Period Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Period to Close</label>
                        <select
                            className="w-full border rounded-md p-2"
                            value={selectedPeriod?.id || ''}
                            onChange={(e) => {
                                const period = periods.find(p => p.id === parseInt(e.target.value));
                                setSelectedPeriod(period || null);
                            }}
                        >
                            <option value="">-- Select Period --</option>
                            {periods.filter(p => p.status === 'Open').map((period) => (
                                <option key={period.id} value={period.id}>
                                    Period {period.period}/{period.year} - {period.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Balance Preview */}
                    {selectedPeriod && balancePreview && (
                        <div className="space-y-4 mt-6">
                            {/* Net P&L Summary */}
                            <Card className="bg-indigo-50 border-indigo-200">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-lg">Net Profit/Loss</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Will be closed to Retained Earnings
                                            </p>
                                        </div>
                                        <div className={`text-2xl font-bold ${balancePreview.netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {balancePreview.netProfitLoss >= 0 ? '+' : ''}{balancePreview.netProfitLoss.toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* P&L Accounts */}
                            <div>
                                <h3 className="font-semibold mb-2">P&L Accounts to be Closed</h3>
                                <div className="border rounded-md max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left">Account</th>
                                                <th className="p-2 text-left">Name</th>
                                                <th className="p-2 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {balancePreview.plAccounts.map((account: any) => (
                                                <tr key={account.id} className="border-b">
                                                    <td className="p-2">{account.account_number}</td>
                                                    <td className="p-2">{account.account_name}</td>
                                                    <td className="p-2 text-right font-mono">
                                                        {account.balance.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {balancePreview.plAccounts.length} P&L accounts will be closed
                                </p>
                            </div>

                            {/* Balance Sheet Accounts */}
                            <div>
                                <h3 className="font-semibold mb-2">Balance Sheet Accounts to Carry Forward</h3>
                                <div className="border rounded-md max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left">Account</th>
                                                <th className="p-2 text-left">Name</th>
                                                <th className="p-2 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {balancePreview.bsAccounts.map((account: any) => (
                                                <tr key={account.id} className="border-b">
                                                    <td className="p-2">{account.account_number}</td>
                                                    <td className="p-2">{account.account_name}</td>
                                                    <td className="p-2 text-right font-mono">
                                                        {account.balance.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {balancePreview.bsAccounts.length} balance sheet accounts will carry forward
                                </p>
                            </div>

                            {/* Action Button */}
                            <Button
                                onClick={handleCarryForward}
                                disabled={carryForwardMutation.isPending}
                                className="w-full"
                                size="lg"
                            >
                                {carryForwardMutation.isPending ? 'Processing...' : 'Execute Balance Carry Forward'}
                            </Button>
                        </div>
                    )}

                    {selectedPeriod && isLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Loading balance preview...</p>
                        </div>
                    )}

                    {!selectedPeriod && (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a period to view balance details</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


// Tax Provisions Tab Component
function TaxProvisionsTab({ periods, selectedPeriod, setSelectedPeriod }: {
    periods: FiscalPeriod[];
    selectedPeriod: FiscalPeriod | null;
    setSelectedPeriod: (period: FiscalPeriod | null) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'calculate' | 'config'>('calculate');

    // Configuration State
    const [config, setConfig] = useState({
        provisionType: 'income_tax',
        taxRate: 0,
        expenseAccountId: 0,
        liabilityAccountId: 0,
        active: true
    });

    // Fetch Tax Config
    const { data: taxConfig, isLoading: activeConfigLoading } = useQuery({
        queryKey: ['tax-config'],
        queryFn: async () => {
            const response = await fetch('/api/finance/tax/config');
            if (!response.ok) throw new Error('Failed to fetch tax config');
            const data = await response.json();
            return data.data[0] || null; // Return first active config
        },
    });

    // Fetch GL Accounts (for dropdowns)
    const { data: glAccounts } = useQuery({
        queryKey: ['gl-accounts'],
        queryFn: async () => {
            const response = await fetch('/api/gl/accounts');
            if (!response.ok) throw new Error('Failed to fetch GL accounts');
            return response.json();
        },
    });

    // Update local config when data loads
    React.useEffect(() => {
        if (taxConfig) {
            setConfig({
                provisionType: taxConfig.provision_type,
                taxRate: parseFloat(taxConfig.tax_rate),
                expenseAccountId: taxConfig.expense_account_id,
                liabilityAccountId: taxConfig.liability_account_id,
                active: taxConfig.active
            });
        }
    }, [taxConfig]);

    // Save Config Mutation
    const saveConfigMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/finance/tax/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, userId: 'current-user', id: taxConfig?.id }),
            });
            if (!response.ok) throw new Error('Failed to save configuration');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-config'] });
            toast({ title: 'Success', description: 'Tax configuration saved' });
        },
        onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' })
    });

    // Calculate Provision Query
    const { data: calculation, isLoading: isCalculating, refetch: calculate } = useQuery({
        queryKey: ['tax-calculation', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return null;
            const response = await fetch('/api/finance/tax/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fiscalPeriodId: selectedPeriod.id }),
            });
            if (!response.ok) throw new Error('Failed to calculate provision');
            const data = await response.json();
            return data.data;
        },
        enabled: false, // Only run when triggered
    });

    // Post Provision Mutation
    const postProvisionMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('/api/finance/tax/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, fiscalPeriodId: selectedPeriod?.id, userId: 'current-user' }),
            });
            if (!response.ok) throw new Error('Failed to post provision');
            return response.json();
        },
        onSuccess: () => {
            toast({ title: 'Success', description: 'Tax provision posted successfully' });
            setSelectedPeriod(null); // Reset selection
        },
        onError: (error: Error) => toast({ title: 'Error', description: error.message, variant: 'destructive' })
    });

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b">
                <Button
                    variant={activeTab === 'calculate' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('calculate')}
                    size="sm"
                >
                    Calculation & Posting
                </Button>
                <Button
                    variant={activeTab === 'config' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('config')}
                    size="sm"
                >
                    Configuration
                </Button>
            </div>

            {activeTab === 'config' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tax Provision Configuration</CardTitle>
                        <CardDescription>Configure tax rates and GL accounts for automatic posting</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Provision Type</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={config.provisionType}
                                    onChange={(e) => setConfig({ ...config, provisionType: e.target.value })}
                                >
                                    <option value="income_tax">Income Tax</option>
                                    <option value="sales_tax">Sales Tax</option>
                                    <option value="vat">VAT</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-md p-2"
                                    value={config.taxRate}
                                    onChange={(e) => setConfig({ ...config, taxRate: parseFloat(e.target.value) })}
                                    step="0.01"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expense Account (Tax Expense)</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={config.expenseAccountId}
                                    onChange={(e) => setConfig({ ...config, expenseAccountId: parseInt(e.target.value) })}
                                >
                                    <option value={0}>-- Select Account --</option>
                                    {glAccounts?.map((acc: any) => (
                                        <option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Liability Account (Tax Payable)</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={config.liabilityAccountId}
                                    onChange={(e) => setConfig({ ...config, liabilityAccountId: parseInt(e.target.value) })}
                                >
                                    <option value={0}>-- Select Account --</option>
                                    {glAccounts?.map((acc: any) => (
                                        <option key={acc.id} value={acc.id}>{acc.account_number} - {acc.account_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button onClick={() => saveConfigMutation.mutate(config)} disabled={saveConfigMutation.isPending}>
                            {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'calculate' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Calculate Tax Provision</CardTitle>
                        <CardDescription>Calculate income tax based on YTD P&L</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Period Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Period</label>
                            <div className="flex gap-2">
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={selectedPeriod?.id || ''}
                                    onChange={(e) => {
                                        const period = periods.find(p => p.id === parseInt(e.target.value));
                                        setSelectedPeriod(period || null);
                                    }}
                                >
                                    <option value="">-- Select Period --</option>
                                    {periods.filter(p => p.status === 'Open').map((period) => (
                                        <option key={period.id} value={period.id}>
                                            Period {period.period}/{period.year} - {period.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    onClick={() => calculate()}
                                    disabled={!selectedPeriod || isCalculating}
                                >
                                    {isCalculating ? 'Calculating...' : 'Calculate'}
                                </Button>
                            </div>
                        </div>

                        {/* Calculation Result */}
                        {calculation && (
                            <div className="mt-6 space-y-4 border rounded-md p-4 bg-slate-50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Taxable Income (YTD)</p>
                                        <p className="text-xl font-mono">{calculation.taxableIncome.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Detailed Tax Rate</p>
                                        <p className="text-xl font-mono">{calculation.taxRate}%</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">Calculated Provision</p>
                                            <p className="text-2xl font-bold text-indigo-600">{calculation.provisionAmount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-4"
                                    size="lg"
                                    onClick={() => postProvisionMutation.mutate({ ...calculation, provisionType: 'income_tax' })}
                                    disabled={postProvisionMutation.isPending}
                                >
                                    {postProvisionMutation.isPending ? 'Posting...' : 'Post Tax Provision'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Daily Validation Tab Component
function DailyValidationTab({ periods, selectedPeriod, setSelectedPeriod }: {
    periods: FiscalPeriod[];
    selectedPeriod: FiscalPeriod | null;
    setSelectedPeriod: (period: FiscalPeriod | null) => void;
}) {
    const { toast } = useToast();
    const [showDetails, setShowDetails] = useState(false);

    // Fetch validation summary
    const { data: validationSummary, isLoading: summaryLoading, refetch: runValidation } = useQuery({
        queryKey: ['daily-validation-summary', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return null;
            const response = await fetch(`/api/finance/daily-validation/summary?fiscalPeriodId=${selectedPeriod.id}`);
            if (!response.ok) throw new Error('Failed to fetch validation summary');
            const data = await response.json();
            return data.data;
        },
        enabled: !!selectedPeriod,
    });

    // Fetch unbalanced entries
    const { data: unbalancedEntries = [] } = useQuery({
        queryKey: ['unbalanced-entries', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return [];
            const response = await fetch(`/api/finance/daily-validation/unbalanced-entries?fiscalPeriodId=${selectedPeriod.id}`);
            if (!response.ok) throw new Error('Failed to fetch unbalanced entries');
            const data = await response.json();
            return data.data;
        },
        enabled: !!selectedPeriod && showDetails,
    });

    // Fetch account balances
    const { data: accountBalances = [] } = useQuery({
        queryKey: ['account-balances', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return [];
            const response = await fetch(`/api/finance/daily-validation/account-balances?fiscalPeriodId=${selectedPeriod.id}`);
            if (!response.ok) throw new Error('Failed to fetch account balances');
            const data = await response.json();
            return data.data;
        },
        enabled: !!selectedPeriod && showDetails,
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Daily Validation & Balancing</CardTitle>
                    <CardDescription>Validate journal entries and check account balances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Period Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Period to Validate</label>
                        <select
                            className="w-full border rounded-md p-2"
                            value={selectedPeriod?.id || ''}
                            onChange={(e) => {
                                const period = periods.find(p => p.id === parseInt(e.target.value));
                                setSelectedPeriod(period || null);
                                setShowDetails(false);
                            }}
                        >
                            <option value="">-- Select Period --</option>
                            {periods.map((period) => (
                                <option key={period.id} value={period.id}>
                                    Period {period.period}/{period.year} - {period.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Validation Summary */}
                    {selectedPeriod && validationSummary && (
                        <div className="space-y-4 mt-6">
                            {/* Summary Cards */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="pt-6">
                                        <div className="text-sm font-medium text-blue-600">Total Entries</div>
                                        <div className="text-2xl font-bold">{validationSummary.summary.totalEntries}</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-green-50 border-green-200">
                                    <CardContent className="pt-6">
                                        <div className="text-sm font-medium text-green-600">Balanced</div>
                                        <div className="text-2xl font-bold text-green-600">{validationSummary.summary.balancedEntries}</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-red-50 border-red-200">
                                    <CardContent className="pt-6">
                                        <div className="text-sm font-medium text-red-600">Unbalanced</div>
                                        <div className="text-2xl font-bold text-red-600">{validationSummary.summary.unbalancedEntries}</div>
                                    </CardContent>
                                </Card>
                                <Card className={`${validationSummary.summary.isBalanced ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                    <CardContent className="pt-6">
                                        <div className="text-sm font-medium">Status</div>
                                        <div className="text-lg font-semibold">
                                            {validationSummary.summary.isBalanced ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    <CheckCircle className="mr-1 h-3 w-3" /> Passed
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <XCircle className="mr-1 h-3 w-3" /> Failed
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Totals */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Total Debits</div>
                                            <div className="text-xl font-mono">{validationSummary.summary.totalDebits}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Total Credits</div>
                                            <div className="text-xl font-mono">{validationSummary.summary.totalCredits}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Difference</div>
                                            <div className={`text-xl font-mono ${validationSummary.summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                                                {(parseFloat(validationSummary.summary.totalDebits) - parseFloat(validationSummary.summary.totalCredits)).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Show Details Button */}
                            <Button onClick={() => setShowDetails(!showDetails)} className="w-full">
                                {showDetails ? 'Hide Details' : 'Show Details'}
                            </Button>

                            {/* Unbalanced Entries Table */}
                            {showDetails && validationSummary.summary.unbalancedEntries > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-2">Unbalanced Entries</h3>
                                    <div className="border rounded-md max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-left">Document Number</th>
                                                    <th className="p-2 text-left">Date</th>
                                                    <th className="p-2 text-left">Type</th>
                                                    <th className="p-2 text-right">Debit</th>
                                                    <th className="p-2 text-right">Credit</th>
                                                    <th className="p-2 text-right">Difference</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unbalancedEntries.map((entry: any, idx: number) => (
                                                    <tr key={idx} className="border-b">
                                                        <td className="p-2">{entry.documentNumber}</td>
                                                        <td className="p-2">{entry.postingDate ? new Date(entry.postingDate).toLocaleDateString() : '-'}</td>
                                                        <td className="p-2">{entry.documentType || '-'}</td>
                                                        <td className="p-2 text-right font-mono">{entry.totalDebit}</td>
                                                        <td className="p-2 text-right font-mono">{entry.totalCredit}</td>
                                                        <td className="p-2 text-right font-mono text-red-600">{entry.balance}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Account Balances Table */}
                            {showDetails && accountBalances.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-2">Account Balances (Non-Zero)</h3>
                                    <div className="border rounded-md max-h-96 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-left">Account</th>
                                                    <th className="p-2 text-left">Name</th>
                                                    <th className="p-2 text-left">Type</th>
                                                    <th className="p-2 text-right">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {accountBalances.map((account: any, idx: number) => (
                                                    <tr key={idx} className="border-b">
                                                        <td className="p-2">{account.accountNumber}</td>
                                                        <td className="p-2">{account.accountName}</td>
                                                        <td className="p-2">
                                                            <Badge variant="outline">{account.accountType}</Badge>
                                                        </td>
                                                        <td className="p-2 text-right font-mono">{account.balance}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedPeriod && summaryLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Loading validation data...</p>
                        </div>
                    )}

                    {!selectedPeriod && (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a period to view validation results</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Closing Documents Tab Component
function ClosingDocumentsTab({ periods, selectedPeriod, setSelectedPeriod }: {
    periods: FiscalPeriod[];
    selectedPeriod: FiscalPeriod | null;
    setSelectedPeriod: (period: FiscalPeriod | null) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedDocType, setSelectedDocType] = useState<string>('');

    // Fetch existing documents
    const { data: documents = [] } = useQuery({
        queryKey: ['closing-documents', selectedPeriod?.id],
        queryFn: async () => {
            if (!selectedPeriod) return [];
            const response = await fetch(`/api/finance/closing-documents?fiscalPeriodId=${selectedPeriod.id}`);
            if (!response.ok) throw new Error('Failed to fetch documents');
            const data = await response.json();
            return data.data;
        },
        enabled: !!selectedPeriod,
    });

    // Generate document mutation
    const generateDocMutation = useMutation({
        mutationFn: async (documentType: string) => {
            const response = await fetch('/api/finance/closing-documents/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscalPeriodId: selectedPeriod?.id,
                    documentType,
                    userId: 'current-user'
                }),
            });
            if (!response.ok) throw new Error('Failed to generate document');
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['closing-documents'] });
            toast({
                title: 'Success',
                description: `${data.data.documentName} generated successfully`,
            });
        },
        onError: (error: Error) =>
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
    });

    const handleGenerate = (docType: string) => {
        if (!selectedPeriod) {
            toast({ title: 'Error', description: 'Please select a period first', variant: 'destructive' });
            return;
        }
        generateDocMutation.mutate(docType);
    };

    const getDocumentTypeLabel = (type: string) => {
        switch (type) {
            case 'checklist': return 'Closing Checklist';
            case 'summary': return 'Period Summary';
            case 'audit_trail': return 'Audit Trail';
            case 'gl_balances': return 'GL Balances Report';
            default: return type;
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Closing Documents</CardTitle>
                    <CardDescription>Generate and manage period-end closing documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Period Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Period</label>
                        <select
                            className="w-full border rounded-md p-2"
                            value={selectedPeriod?.id || ''}
                            onChange={(e) => {
                                const period = periods.find(p => p.id === parseInt(e.target.value));
                                setSelectedPeriod(period || null);
                            }}
                        >
                            <option value="">-- Select Period --</option>
                            {periods.map((period) => (
                                <option key={period.id} value={period.id}>
                                    Period {period.period}/{period.year} - {period.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Generate Documents */}
                    {selectedPeriod && (
                        <div className="space-y-4 mt-6">
                            <h3 className="font-semibold">Generate Documents</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Button
                                    onClick={() => handleGenerate('checklist')}
                                    disabled={generateDocMutation.isPending}
                                    variant="outline"
                                    className="h-20 flex flex-col items-start justify-center"
                                >
                                    <div className="font-semibold">📋 Closing Checklist</div>
                                    <div className="text-xs text-muted-foreground">Track closing activities</div>
                                </Button>
                                <Button
                                    onClick={() => handleGenerate('summary')}
                                    disabled={generateDocMutation.isPending}
                                    variant="outline"
                                    className="h-20 flex flex-col items-start justify-center"
                                >
                                    <div className="font-semibold">📊 Period Summary</div>
                                    <div className="text-xs text-muted-foreground">P&L and balance sheet</div>
                                </Button>
                                <Button
                                    onClick={() => handleGenerate('audit_trail')}
                                    disabled={generateDocMutation.isPending}
                                    variant="outline"
                                    className="h-20 flex flex-col items-start justify-center"
                                >
                                    <div className="font-semibold">🔍 Audit Trail</div>
                                    <div className="text-xs text-muted-foreground">Closing activities log</div>
                                </Button>
                                <Button
                                    onClick={() => handleGenerate('gl_balances')}
                                    disabled={generateDocMutation.isPending}
                                    variant="outline"
                                    className="h-20 flex flex-col items-start justify-center"
                                >
                                    <div className="font-semibold">💰 GL Balances</div>
                                    <div className="text-xs text-muted-foreground">Account balances report</div>
                                </Button>
                            </div>

                            {/* Generated Documents List */}
                            {documents.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-2">Generated Documents</h3>
                                    <div className="border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="p-3 text-left">Document Name</th>
                                                    <th className="p-3 text-left">Type</th>
                                                    <th className="p-3 text-left">Generated</th>
                                                    <th className="p-3 text-left">Generated By</th>
                                                    <th className="p-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.map((doc: any) => (
                                                    <tr key={doc.id} className="border-b">
                                                        <td className="p-3">{doc.document_name}</td>
                                                        <td className="p-3">
                                                            <Badge variant="outline">{getDocumentTypeLabel(doc.document_type)}</Badge>
                                                        </td>
                                                        <td className="p-3">{new Date(doc.generated_at).toLocaleString()}</td>
                                                        <td className="p-3">{doc.generated_by}</td>
                                                        <td className="p-3 text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    // Download document data as JSON
                                                                    const dataStr = JSON.stringify(doc.document_data, null, 2);
                                                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                                                    const url = URL.createObjectURL(dataBlob);
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.download = `${doc.document_name}.json`;
                                                                    link.click();
                                                                    URL.revokeObjectURL(url);
                                                                }}
                                                            >
                                                                Download
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {documents.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground">
                                    <p className="text-sm">No documents generated yet for this period</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedPeriod && (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a period to manage closing documents</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default PeriodEndClosing;
