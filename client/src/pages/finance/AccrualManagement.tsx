import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Send, RefreshCw, ArrowLeft, CheckCircle, AlertCircle, Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/layout/Header';

interface FiscalPeriod {
    id: number;
    year: number;
    period: number;
    name: string;
    startDate: string;
    endDate: string;
}

interface AccrualPosting {
    id: number;
    rule_name: string;
    accrual_type: string;
    calculation_method: string;
    accrual_amount: number;
    status: string;
    expense_account: string;
    accrual_account: string;
    journal_entry_number?: string;
    posted_at?: string;
}

interface AccrualRule {
    id: number;
    rule_name: string;
    rule_description?: string;
    accrual_type: string;
    calculation_method: string;
    gl_expense_account_id?: number;
    gl_accrual_account_id?: number;
    company_code_id?: number;
    is_active: boolean;
    expense_account_number?: string;
    expense_account_name?: string;
    accrual_account_number?: string;
    accrual_account_name?: string;
    company_code?: string;
    company_name?: string;
}

interface GLAccount {
    id: number;
    account_number: string;
    account_name: string;
}

interface CompanyCode {
    id: number;
    company_code: string;
    company_name: string;
}

interface FiscalPeriod {
    id: number;
    year: number;
    period: number;
    name: string;
    startDate: string;
    endDate: string;
}

interface AccrualPosting {
    id: number;
    rule_name: string;
    accrual_type: string;
    calculation_method: string;
    accrual_amount: number;
    status: string;
    expense_account: string;
    accrual_account: string;
    journal_entry_number?: string;
    posted_at?: string;
}

export default function AccrualManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Get current year and period
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedPeriod, setSelectedPeriod] = useState(currentDate.getMonth() + 1);
    const [selectedAccruals, setSelectedAccruals] = useState<number[]>([]);

    // Fetch fiscal periods to populate dropdowns
    const { data: fiscalPeriods = [] } = useQuery<FiscalPeriod[]>({
        queryKey: ['fiscal-periods'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/fiscal-period');
            if (!response.ok) throw new Error('Failed to fetch fiscal periods');
            return response.json();
        }
    });

    // Extract unique years
    const years = Array.from(new Set(fiscalPeriods.map(p => p.year))).sort((a, b) => b - a);

    // Fetch accruals for selected period
    const { data: accruals = [], isLoading: accrualsLoading, refetch } = useQuery<AccrualPosting[]>({
        queryKey: ['accruals', selectedYear, selectedPeriod],
        queryFn: async () => {
            const response = await fetch(
                `/api/finance/accruals?fiscal_year=${selectedYear}&fiscal_period=${selectedPeriod}`
            );
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error('Failed to fetch accruals');
            }
            const result = await response.json();
            return result.data || [];
        },
        enabled: !!selectedYear && !!selectedPeriod
    });

    // Calculate accruals mutation
    const calculateMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch('/api/finance/accruals/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscal_year: selectedYear,
                    fiscal_period: selectedPeriod
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to calculate accruals');
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: 'Accruals Calculated',
                description: data.message || `Calculated ${data.data?.calculated || 0} accrual entries`
            });
            refetch();
        },
        onError: (error: Error) => {
            toast({
                title: 'Calculation Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Post accruals mutation
    const postMutation = useMutation({
        mutationFn: async (accrualIds: number[]) => {
            const response = await fetch('/api/finance/accruals/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accrual_ids: accrualIds,
                    posted_by: 'current_user' // TODO: Get from auth context
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to post accruals');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Accruals Posted',
                description: 'Successfully posted accruals to General Ledger'
            });
            setSelectedAccruals([]);
            refetch();
        },
        onError: (error: Error) => {
            toast({
                title: 'Posting Failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const handleSelectAccrual = (id: number) => {
        setSelectedAccruals(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handlePostSelected = () => {
        if (selectedAccruals.length === 0) {
            toast({
                title: 'No Selection',
                description: 'Please select at least one accrual to post',
                variant: 'destructive'
            });
            return;
        }
        postMutation.mutate(selectedAccruals);
    };

    const calculatedAccruals = accruals.filter(a => a.status === 'calculated');
    const postedAccruals = accruals.filter(a => a.status === 'posted');

    return (
        <>
            <Header title="Accrual Management" />

            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Accrual Management</h1>
                        <p className="text-muted-foreground">Calculate, post, and manage accrual rules</p>
                    </div>
                    <Link href="/finance/period-closing">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Period Closing
                        </Button>
                    </Link>
                </div>

                <Tabs defaultValue="calculate" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="calculate">
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate & Post
                        </TabsTrigger>
                        <TabsTrigger value="rules">
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Rules
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="calculate" className="space-y-6">
                        {/* Period Selection Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Period</CardTitle>
                                <CardDescription>Choose the fiscal period to calculate accruals for</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium mb-2 block">Fiscal Year</label>
                                        <Select
                                            value={selectedYear.toString()}
                                            onValueChange={(v) => setSelectedYear(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {years.length > 0 ? (
                                                    years.map(year => (
                                                        <SelectItem key={year} value={year.toString()}>
                                                            {year}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value={currentDate.getFullYear().toString()}>
                                                        {currentDate.getFullYear()}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex-1">
                                        <label className="text-sm font-medium mb-2 block">Period</label>
                                        <Select
                                            value={selectedPeriod.toString()}
                                            onValueChange={(v) => setSelectedPeriod(parseInt(v))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map((period) => (
                                                    <SelectItem key={period} value={period.toString()}>
                                                        Period {period}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button
                                        onClick={() => calculateMutation.mutate()}
                                        disabled={calculateMutation.isPending || !selectedYear || !selectedPeriod}
                                        className="flex-none"
                                    >
                                        <Calculator className="mr-2 h-4 w-4" />
                                        {calculateMutation.isPending ? 'Calculating...' : 'Calculate Accruals'}
                                    </Button>

                                    <Button
                                        onClick={() => refetch()}
                                        variant="outline"
                                        disabled={accrualsLoading}
                                        className="flex-none"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Refresh
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Calculated Accruals Card */}
                        {calculatedAccruals.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Calculated Accruals</CardTitle>
                                            <CardDescription>
                                                {calculatedAccruals.length} accrual{calculatedAccruals.length !== 1 ? 's' : ''} ready to post
                                            </CardDescription>
                                        </div>
                                        <Button
                                            onClick={handlePostSelected}
                                            disabled={selectedAccruals.length === 0 || postMutation.isPending}
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            Post Selected ({selectedAccruals.length})
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">Select</TableHead>
                                                <TableHead>Rule Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Expense Account</TableHead>
                                                <TableHead>Accrual Account</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {calculatedAccruals.map((accrual) => (
                                                <TableRow key={accrual.id}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAccruals.includes(accrual.id)}
                                                            onChange={() => handleSelectAccrual(accrual.id)}
                                                            className="h-4 w-4"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{accrual.rule_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{accrual.accrual_type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {accrual.calculation_method}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{accrual.expense_account}</TableCell>
                                                    <TableCell className="font-mono text-sm">{accrual.accrual_account}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {accrual.accrual_amount?.toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            <AlertCircle className="mr-1 h-3 w-3" />
                                                            {accrual.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Posted Accruals Card */}
                        {postedAccruals.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Posted Accruals</CardTitle>
                                    <CardDescription>
                                        {postedAccruals.length} accrual{postedAccruals.length !== 1 ? 's' : ''} posted to GL
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Rule Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Expense Account</TableHead>
                                                <TableHead>Accrual Account</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Journal Entry</TableHead>
                                                <TableHead>Posted At</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {postedAccruals.map((accrual) => (
                                                <TableRow key={accrual.id}>
                                                    <TableCell className="font-medium">{accrual.rule_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{accrual.accrual_type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{accrual.expense_account}</TableCell>
                                                    <TableCell className="font-mono text-sm">{accrual.accrual_account}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {accrual.accrual_amount?.toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {accrual.journal_entry_number || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {accrual.posted_at
                                                            ? new Date(accrual.posted_at).toLocaleString()
                                                            : '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="default" className="bg-green-600">
                                                            <CheckCircle className="mr-1 h-3 w-3" />
                                                            {accrual.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Empty State */}
                        {!accrualsLoading && accruals.length === 0 && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Accruals Found</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Click "Calculate Accruals" to generate accruals for Period {selectedPeriod}/{selectedYear}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Manage Rules Tab */}
                    <TabsContent value="rules" className="space-y-6">
                        <ManageRulesTab />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

// Manage Rules Tab Component
function ManageRulesTab() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AccrualRule | null>(null);
    const [formData, setFormData] = useState({
        rule_name: '',
        rule_description: '',
        accrual_type: 'expense',
        calculation_method: 'manual',
        gl_expense_account_id: '',
        gl_accrual_account_id: '',
        company_code_id: '',
        is_active: true
    });

    // Fetch accrual rules
    const { data: rules = [], isLoading: rulesLoading } = useQuery<AccrualRule[]>({
        queryKey: ['accrual-rules'],
        queryFn: async () => {
            const response = await fetch('/api/finance/accruals/rules');
            if (!response.ok) throw new Error('Failed to fetch rules');
            const result = await response.json();
            return result.data || [];
        }
    });

    // Fetch GL Accounts
    const { data: glAccounts = [] } = useQuery<GLAccount[]>({
        queryKey: ['gl-accounts'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/gl-accounts');
            if (!response.ok) throw new Error('Failed to fetch GL accounts');
            return response.json();
        }
    });

    // Fetch Company Codes
    const { data: companyCodes = [] } = useQuery<CompanyCode[]>({
        queryKey: ['company-codes'],
        queryFn: async () => {
            const response = await fetch('/api/master-data/company-codes');
            if (!response.ok) throw new Error('Failed to fetch company codes');
            return response.json();
        }
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            const url = editingRule
                ? `/api/finance/accruals/rules/${editingRule.id}`
                : '/api/finance/accruals/rules';
            const method = editingRule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save rule');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: editingRule ? 'Rule Updated' : 'Rule Created',
                description: `Successfully ${editingRule ? 'updated' : 'created'} accrual rule`
            });
            queryClient.invalidateQueries({ queryKey: ['accrual-rules'] });
            handleCloseDialog();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/finance/accruals/rules/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete rule');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Rule Deactivated',
                description: 'Successfully deactivated accrual rule'
            });
            queryClient.invalidateQueries({ queryKey: ['accrual-rules'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const handleOpenDialog = (rule?: AccrualRule) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                rule_name: rule.rule_name,
                rule_description: rule.rule_description || '',
                accrual_type: rule.accrual_type,
                calculation_method: rule.calculation_method,
                gl_expense_account_id: rule.gl_expense_account_id?.toString() || '',
                gl_accrual_account_id: rule.gl_accrual_account_id?.toString() || '',
                company_code_id: rule.company_code_id?.toString() || 'ALL',
                is_active: rule.is_active
            });
        } else {
            setEditingRule(null);
            setFormData({
                rule_name: '',
                rule_description: '',
                accrual_type: 'expense',
                calculation_method: 'manual',
                gl_expense_account_id: '',
                gl_accrual_account_id: '',
                company_code_id: 'ALL',
                is_active: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingRule(null);
    };

    const handleSubmit = () => {
        const payload = {
            ...formData,
            gl_expense_account_id: formData.gl_expense_account_id ? parseInt(formData.gl_expense_account_id) : undefined,
            gl_accrual_account_id: formData.gl_accrual_account_id ? parseInt(formData.gl_accrual_account_id) : undefined,
            company_code_id: (formData.company_code_id && formData.company_code_id !== 'ALL') ? parseInt(formData.company_code_id) : undefined
        };

        saveMutation.mutate(payload);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to deactivate this rule?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Accrual Rules</CardTitle>
                            <CardDescription>Define and manage accrual calculation rules</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Rule
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {rulesLoading ? (
                        <div className="text-center py-8">Loading rules...</div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No accrual rules found. Create your first rule to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rule Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Calculation Method</TableHead>
                                    <TableHead>Expense Account</TableHead>
                                    <TableHead>Accrual Account</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">{rule.rule_name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{rule.accrual_type}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {rule.calculation_method}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {rule.expense_account_number || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {rule.accrual_account_number || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {rule.company_code || 'All'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                                {rule.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(rule)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(rule.id)}
                                                    disabled={!rule.is_active}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Edit' : 'Create'} Accrual Rule</DialogTitle>
                        <DialogDescription>
                            {editingRule ? 'Update' : 'Define'} the accrual rule configuration
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rule_name">Rule Name *</Label>
                            <Input
                                id="rule_name"
                                value={formData.rule_name}
                                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                                placeholder="e.g., Monthly Interest Accrual"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="rule_description">Description</Label>
                            <Textarea
                                id="rule_description"
                                value={formData.rule_description}
                                onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
                                placeholder="Optional description of the rule"
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="accrual_type">Accrual Type *</Label>
                                <Select
                                    value={formData.accrual_type}
                                    onValueChange={(value) => setFormData({ ...formData, accrual_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="expense">Expense</SelectItem>
                                        <SelectItem value="revenue">Revenue</SelectItem>
                                        <SelectItem value="payroll">Payroll</SelectItem>
                                        <SelectItem value="interest">Interest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="calculation_method">Calculation Method *</Label>
                                <Select
                                    value={formData.calculation_method}
                                    onValueChange={(value) => setFormData({ ...formData, calculation_method: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="unbilled_deliveries">Unbilled Deliveries</SelectItem>
                                        <SelectItem value="unpaid_invoices">Unpaid Invoices</SelectItem>
                                        <SelectItem value="received_not_invoiced">Received Not Invoiced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="gl_expense_account_id">Expense GL Account</Label>
                                <Select
                                    value={formData.gl_expense_account_id}
                                    onValueChange={(value) => setFormData({ ...formData, gl_expense_account_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {glAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id.toString()}>
                                                {account.account_number} - {account.account_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="gl_accrual_account_id">Accrual GL Account</Label>
                                <Select
                                    value={formData.gl_accrual_account_id}
                                    onValueChange={(value) => setFormData({ ...formData, gl_accrual_account_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {glAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id.toString()}>
                                                {account.account_number} - {account.account_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="company_code_id">Company Code</Label>
                            <Select
                                value={formData.company_code_id}
                                onValueChange={(value) => setFormData({ ...formData, company_code_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All companies" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Companies</SelectItem>
                                    {companyCodes.map((company) => (
                                        <SelectItem key={company.id} value={company.id.toString()}>
                                            {company.company_code} - {company.company_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? 'Saving...' : 'Save Rule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
