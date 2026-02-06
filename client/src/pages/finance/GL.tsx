import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Filter,
  BookOpen,
  DollarSign,
  FileText,
  Eye,
  Calendar,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface GLAccount {
  id: number;
  account_number: string;
  account_name: string;
  account_type: string;
  account_group?: string;
  balance_sheet_account?: boolean;
  pl_account: boolean;
  is_active: boolean;
  debit_total?: number;
  credit_total?: number;
  balance?: number;
}

interface GLEntry {
  id: number;
  document_number: string;
  amount: number;
  debit_credit_indicator: 'D' | 'C';
  posting_date: string;
  posting_status?: string;
  fiscal_period?: number;
  fiscal_year?: number;
  description?: string;
  source_module?: string;
  source_document_type?: string;
  source_document_id?: number;
  reference?: string;
  account_number?: string;
  account_name?: string;
  account_type?: string;
}

interface TrialBalanceEntry {
  account_number: string;
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

interface JournalEntryLine {
  id: string;
  gl_account_id: number | '';
  gl_account_number: string;
  description: string;
  debit_credit_indicator: 'D' | 'C';
  amount: number | '';
}

export default function GeneralLedger() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccountType, setFilterAccountType] = useState<string>("all");
  const [isJournalEntryModalOpen, setIsJournalEntryModalOpen] = useState(false);
  const [journalEntryForm, setJournalEntryForm] = useState({
    posting_date: format(new Date(), 'yyyy-MM-dd'),
    document_date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    company_code: '',
    currency: 'USD',
  });
  const [journalEntryLines, setJournalEntryLines] = useState<JournalEntryLine[]>([
    { id: '1', gl_account_id: '', gl_account_number: '', description: '', debit_credit_indicator: 'D', amount: '' },
    { id: '2', gl_account_id: '', gl_account_number: '', description: '', debit_credit_indicator: 'C', amount: '' },
  ]);
  const [journalEntryError, setJournalEntryError] = useState('');
  const queryClient = useQueryClient();
  
  // Financial Reports State
  const [selectedReport, setSelectedReport] = useState<'balance-sheet' | 'income-statement' | 'account-analysis' | null>(null);
  const [reportFilters, setReportFilters] = useState({
    fiscal_year: new Date().getFullYear().toString(),
    fiscal_period: '',
    start_date: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    company_code: '',
  });
  const [selectedAccountForAnalysis, setSelectedAccountForAnalysis] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch Financial Reports (Balance Sheet, Income Statement, Cash Flow)
  const { data: financialReportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['/api/financial-reports', reportFilters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (reportFilters.fiscal_year) params.append('fiscal_year', reportFilters.fiscal_year);
        if (reportFilters.fiscal_period) params.append('fiscal_period', reportFilters.fiscal_period);
        if (reportFilters.start_date) params.append('start_date', reportFilters.start_date);
        if (reportFilters.end_date) params.append('end_date', reportFilters.end_date);
        
        const url = `/api/financial-reports${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiRequest(url);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching financial reports:', error);
        return null;
      }
    },
    enabled: selectedReport !== null,
  });

  // Fetch Profit & Loss Report
  const { data: profitLossData, isLoading: profitLossLoading } = useQuery({
    queryKey: ['/api/general-ledger/profit-loss', reportFilters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (reportFilters.start_date) params.append('startDate', reportFilters.start_date);
        if (reportFilters.end_date) params.append('endDate', reportFilters.end_date);
        if (reportFilters.company_code) params.append('companyCode', reportFilters.company_code);
        
        const url = `/api/general-ledger/profit-loss${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiRequest(url);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching profit & loss report:', error);
        return null;
      }
    },
    enabled: selectedReport === 'income-statement',
  });

  // Fetch Account Analysis
  const { data: accountAnalysisData, isLoading: accountAnalysisLoading } = useQuery({
    queryKey: ['/api/general-ledger/accounts', selectedAccountForAnalysis],
    queryFn: async () => {
      if (!selectedAccountForAnalysis) return null;
      try {
        const response = await apiRequest(`/api/general-ledger/accounts/${selectedAccountForAnalysis}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching account analysis:', error);
        return null;
      }
    },
    enabled: selectedReport === 'account-analysis' && selectedAccountForAnalysis !== null,
  });

  // Fetch company codes for journal entry form
  const { data: companyCodes } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/company-code');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((cc: any) => cc.active !== false) : [];
      } catch (error) {
        console.error('Error fetching company codes:', error);
        return [];
      }
    },
  });

  // Fetch GL accounts with real-time updates
  const { data: glAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/general-ledger/gl-accounts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/general-ledger/gl-accounts');
        const data = await response.json(); // Parse JSON response
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching GL accounts:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // State for journal entries filters
  const [journalFilters, setJournalFilters] = useState({
    fiscal_year: '',
    fiscal_period: '',
    source_document_type: '',
    source_module: '',
    start_date: '',
    end_date: ''
  });

  // Fetch GL entries with filters
  const { data: glEntriesData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['/api/general-ledger/gl-entries', journalFilters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        Object.entries(journalFilters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        
        const url = `/api/general-ledger/gl-entries${params.toString() ? '?' + params.toString() : ''}`;
        const response = await apiRequest(url);
        const data = await response.json(); // Parse the JSON response
        
        // Handle both old format (array) and new format (object with entries)
        if (Array.isArray(data)) {
          return { entries: data, total: data.length };
        } else if (data && data.entries) {
          return data;
        }
        return { entries: [], total: 0 };
      } catch (error) {
        console.error('Error fetching GL entries:', error);
        return { entries: [], total: 0 };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const glEntries = glEntriesData?.entries || [];
  const entriesTotal = glEntriesData?.total || 0;

  // Fetch trial balance with real-time updates
  const { data: trialBalance, isLoading: trialBalanceLoading } = useQuery({
    queryKey: ['/api/general-ledger/trial-balance'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/general-ledger/trial-balance');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching trial balance:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Calculate financial metrics from trial balance (real-time data, no hardcoded values)
  const financialMetrics = useMemo(() => {
    if (!Array.isArray(trialBalance) || trialBalance.length === 0) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
      };
    }

    // Calculate totals by account type using trial balance balances
    // Trial balance already has correct balance calculated (debit - credit)
    const totals = trialBalance.reduce((acc: any, entry: any) => {
      const accountType = (entry.account_type || '').toUpperCase();
      const balance = parseFloat(entry.balance || 0);

      // Assets: normal debit balance (positive)
      if (accountType === 'ASSETS' || accountType === 'ASSET') {
        acc.assets += Math.max(0, balance);
      }
      // Liabilities: normal credit balance (negative, so we take absolute value)
      else if (accountType === 'LIABILITIES' || accountType === 'LIABILITY') {
        acc.liabilities += Math.max(0, -balance);
      }
      // Equity: normal credit balance (negative, so we take absolute value)
      else if (accountType === 'EQUITY') {
        acc.equity += Math.max(0, -balance);
      }
      // Revenue: normal credit balance (negative)
      else if (accountType === 'REVENUE') {
        acc.revenue += Math.max(0, -balance);
      }
      // Expenses: normal debit balance (positive)
      else if (accountType === 'EXPENSE' || accountType === 'EXPENSES') {
        acc.expenses += Math.max(0, balance);
      }

      return acc;
    }, {
      assets: 0,
      liabilities: 0,
      equity: 0,
      revenue: 0,
      expenses: 0,
    });

    const netIncome = totals.revenue - totals.expenses;

    return {
      totalAssets: totals.assets,
      totalLiabilities: totals.liabilities,
      totalEquity: totals.equity,
      totalRevenue: totals.revenue,
      totalExpenses: totals.expenses,
      netIncome,
    };
  }, [trialBalance]);

  // Enrich accounts with balance data from trial balance
  const enrichedAccounts = useMemo(() => {
    if (!Array.isArray(glAccounts)) return [];
    if (!Array.isArray(trialBalance)) return glAccounts;
    
    // Create a map of account_number to balance from trial balance
    const balanceMap = new Map<string, any>();
    trialBalance.forEach((entry: any) => {
      if (entry.account_number) {
        balanceMap.set(entry.account_number, {
          debit_total: parseFloat(entry.debit_total || 0),
          credit_total: parseFloat(entry.credit_total || 0),
          balance: parseFloat(entry.balance || 0)
        });
      }
    });
    
    // Enrich accounts with balance data
    return glAccounts.map((account: GLAccount) => {
      const balanceData = balanceMap.get(account.account_number || '');
      return {
        ...account,
        debit_total: balanceData?.debit_total || 0,
        credit_total: balanceData?.credit_total || 0,
        balance: balanceData?.balance || 0
      };
    });
  }, [glAccounts, trialBalance]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (!Array.isArray(enrichedAccounts)) return [];
    
    let filtered = enrichedAccounts.filter((account: GLAccount) => {
      const matchesSearch = 
        account.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterAccountType === 'all' || account.account_type === filterAccountType;
      
      return matchesSearch && matchesType && account.is_active;
    });
    
    return filtered;
  }, [enrichedAccounts, searchTerm, filterAccountType]);

  // Group entries by document number for display
  const groupedEntries = useMemo(() => {
    if (!Array.isArray(glEntries) || glEntries.length === 0) return [];
    
    const grouped = glEntries.reduce((acc: any, entry: GLEntry) => {
      const docNum = entry.document_number || 'UNKNOWN';
      if (!acc[docNum]) {
        acc[docNum] = {
          document_number: docNum,
          entries: [],
          total_debit: 0,
          total_credit: 0,
          posting_date: entry.posting_date,
          fiscal_year: entry.fiscal_year,
          fiscal_period: entry.fiscal_period,
          source_module: entry.source_module,
          source_document_type: entry.source_document_type,
        };
      }
      acc[docNum].entries.push(entry);
      if (entry.debit_credit_indicator === 'D') {
        acc[docNum].total_debit += parseFloat(entry.amount?.toString() || '0');
      } else {
        acc[docNum].total_credit += parseFloat(entry.amount?.toString() || '0');
      }
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a: any, b: any) => {
      const dateA = a.posting_date ? new Date(a.posting_date).getTime() : 0;
      const dateB = b.posting_date ? new Date(b.posting_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [glEntries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Get unique account types for filter
  const accountTypes = useMemo(() => {
    if (!Array.isArray(glAccounts)) return [];
    const types = new Set(glAccounts.map((a: GLAccount) => a.account_type).filter(Boolean));
    return Array.from(types).sort();
  }, [glAccounts]);

  // Chart data for balance sheet
  const balanceSheetChartData = useMemo(() => {
    return [
      { name: 'Assets', value: financialMetrics.totalAssets },
      { name: 'Liabilities', value: financialMetrics.totalLiabilities },
      { name: 'Equity', value: financialMetrics.totalEquity },
    ];
  }, [financialMetrics]);

  // Journal Entry Handlers
  const handleOpenJournalEntryModal = () => {
    setJournalEntryForm({
      posting_date: format(new Date(), 'yyyy-MM-dd'),
      document_date: format(new Date(), 'yyyy-MM-dd'),
      reference: '',
      company_code: companyCodes && companyCodes.length > 0 ? companyCodes[0].code : '',
      currency: companyCodes && companyCodes.length > 0 ? companyCodes[0].currency || 'USD' : 'USD',
    });
    setJournalEntryLines([
      { id: '1', gl_account_id: '', gl_account_number: '', description: '', debit_credit_indicator: 'D', amount: '' },
      { id: '2', gl_account_id: '', gl_account_number: '', description: '', debit_credit_indicator: 'C', amount: '' },
    ]);
    setJournalEntryError('');
    setIsJournalEntryModalOpen(true);
  };

  const handleAddJournalEntryLine = () => {
    setJournalEntryLines([...journalEntryLines, {
      id: Date.now().toString(),
      gl_account_id: '',
      gl_account_number: '',
      description: '',
      debit_credit_indicator: 'D',
      amount: ''
    }]);
  };

  const handleRemoveJournalEntryLine = (id: string) => {
    if (journalEntryLines.length > 2) {
      setJournalEntryLines(journalEntryLines.filter(line => line.id !== id));
    }
  };

  const handleUpdateJournalEntryLine = (id: string, field: keyof JournalEntryLine, value: any) => {
    setJournalEntryLines(journalEntryLines.map(line => {
      if (line.id === id) {
        if (field === 'gl_account_id') {
          const account = glAccounts?.find((acc: GLAccount) => acc.id === value);
          return {
            ...line,
            gl_account_id: value,
            gl_account_number: account?.account_number || '',
          };
        }
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  // Calculate totals for validation
  const journalEntryTotals = useMemo(() => {
    const debits = journalEntryLines
      .filter(line => line.debit_credit_indicator === 'D')
      .reduce((sum, line) => sum + (typeof line.amount === 'number' ? line.amount : parseFloat(String(line.amount || 0))), 0);
    const credits = journalEntryLines
      .filter(line => line.debit_credit_indicator === 'C')
      .reduce((sum, line) => sum + (typeof line.amount === 'number' ? line.amount : parseFloat(String(line.amount || 0))), 0);
    return { debits, credits, difference: Math.abs(debits - credits) };
  }, [journalEntryLines]);

  // Journal Entry Mutation
  const createJournalEntryMutation = useMutation({
    mutationFn: async () => {
      // Validate
      if (!journalEntryForm.posting_date || !journalEntryForm.company_code) {
        throw new Error('Posting date and company code are required');
      }

      const validLines = journalEntryLines.filter(line => 
        line.gl_account_id && line.amount && line.description
      );

      if (validLines.length < 2) {
        throw new Error('At least 2 line items are required');
      }

      if (journalEntryTotals.difference > 0.01) {
        throw new Error(`Debits (${journalEntryTotals.debits.toFixed(2)}) must equal Credits (${journalEntryTotals.credits.toFixed(2)})`);
      }

      const entries = validLines.map(line => ({
        gl_account_id: Number(line.gl_account_id),
        amount: typeof line.amount === 'number' ? line.amount : parseFloat(String(line.amount || 0)),
        debit_credit_indicator: line.debit_credit_indicator,
        description: line.description,
      }));

      const response = await apiRequest('/api/general-ledger/postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posting_date: journalEntryForm.posting_date,
          document_date: journalEntryForm.document_date || journalEntryForm.posting_date,
          reference: journalEntryForm.reference || 'Manual Journal Entry',
          company_code: journalEntryForm.company_code,
          currency: journalEntryForm.currency,
          entries,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create journal entry');
      }
      return data;
    },
    onSuccess: () => {
      setIsJournalEntryModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/general-ledger/gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/general-ledger/trial-balance'] });
      refetchEntries();
      setJournalEntryError('');
    },
    onError: (error: any) => {
      setJournalEntryError(error.message || 'Failed to create journal entry');
    },
  });

  const handleSubmitJournalEntry = () => {
    createJournalEntryMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">General Ledger (GL)</h1>
          <p className="text-sm text-muted-foreground">Manage chart of accounts and financial records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={handleOpenJournalEntryModal}>
            <Plus className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* GL Navigation Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-12 p-0 rounded-none">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="chart-of-accounts" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                GL Accounts
              </TabsTrigger>
              <TabsTrigger 
                value="journal-entries" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Journal Entries
              </TabsTrigger>
              <TabsTrigger 
                value="trial-balance" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Trial Balance
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
              >
                Financial Reports
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Overview Tab Content */}
          <TabsContent value="overview" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary KPI Cards */}
              <GLCard 
                title="Total Assets" 
                value={formatCurrency(financialMetrics.totalAssets)}
                change={null} 
                isPositive={true}
                period=""
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              />
              <GLCard 
                title="Total Liabilities" 
                value={formatCurrency(financialMetrics.totalLiabilities)}
                change={null} 
                isPositive={false}
                period=""
                icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
              />
              <GLCard 
                title="Total Equity" 
                value={formatCurrency(financialMetrics.totalEquity)}
                change={null} 
                isPositive={true}
                period=""
                icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            
            {/* Balance Sheet Summary */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="w-full max-w-2xl">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Assets</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(financialMetrics.totalAssets)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Liabilities</div>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(financialMetrics.totalLiabilities)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-muted-foreground">Equity</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(financialMetrics.totalEquity)}
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        Assets = Liabilities + Equity: {formatCurrency(financialMetrics.totalAssets)} = {formatCurrency(financialMetrics.totalLiabilities)} + {formatCurrency(financialMetrics.totalEquity)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional GL Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income Statement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <GLAccount 
                      name="Total Revenue"
                      amount={formatCurrency(financialMetrics.totalRevenue)}
                      change={null}
                      isPositive={true}
                    />
                    <GLAccount 
                      name="Total Expenses"
                      amount={formatCurrency(financialMetrics.totalExpenses)}
                      change={null}
                      isPositive={false}
                    />
                    <GLAccount 
                      name="Net Income"
                      amount={formatCurrency(financialMetrics.netIncome)}
                      change={null}
                      isPositive={financialMetrics.netIncome >= 0}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Journal Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {entriesLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading entries...</div>
                  ) : groupedEntries.length > 0 ? (
                    <div className="space-y-4">
                      {groupedEntries.slice(0, 5).map((group: any, index: number) => (
                        <JournalEntry 
                          key={index}
                          documentNumber={group.document_number}
                          date={group.posting_date}
                          amount={Math.max(group.total_debit, group.total_credit)}
                          status="Posted"
                          entryCount={group.entries.length}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No journal entries found
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* GL accounts Tab */}
          <TabsContent value="chart-of-accounts" className="p-4">
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <select
                  value={filterAccountType}
                  onChange={(e) => setFilterAccountType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Types</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="ml-auto text-sm text-muted-foreground">
                  {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Accounts Table */}
              {accountsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
              ) : filteredAccounts.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Number</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Account Type</TableHead>
                          <TableHead>Account Group</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-center">Balance Sheet</TableHead>
                          <TableHead className="text-center">P&L</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAccounts.map((account: any) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-mono">{account.account_number}</TableCell>
                            <TableCell className="font-medium">{account.account_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{account.account_type}</Badge>
                            </TableCell>
                            <TableCell>{account.account_group || '-'}</TableCell>
                            <TableCell className="text-right">
                              {account.debit_total > 0 ? formatCurrency(account.debit_total) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {account.credit_total > 0 ? formatCurrency(account.credit_total) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(account.balance || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              {account.balance_sheet_account ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {account.pl_account ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={account.is_active ? "default" : "outline"}>
                                {account.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <TableRow>
                          <TableCell colSpan={4} className="text-right font-medium">
                            Totals:
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              filteredAccounts.reduce((sum: number, acc: any) => sum + (acc.debit_total || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              filteredAccounts.reduce((sum: number, acc: any) => sum + (acc.credit_total || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              filteredAccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0)
                            )}
                          </TableCell>
                          <TableCell colSpan={3}></TableCell>
                        </TableRow>
                      </tfoot>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts found matching your criteria
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Journal Entries Tab */}
          <TabsContent value="journal-entries" className="p-4">
            <div className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fiscal Year</label>
                      <Input
                        type="number"
                        placeholder="e.g., 2025"
                        value={journalFilters.fiscal_year}
                        onChange={(e) => setJournalFilters({ ...journalFilters, fiscal_year: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fiscal Period</label>
                      <Input
                        type="number"
                        placeholder="1-12"
                        min="1"
                        max="12"
                        value={journalFilters.fiscal_period}
                        onChange={(e) => setJournalFilters({ ...journalFilters, fiscal_period: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Source Type</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={journalFilters.source_document_type}
                        onChange={(e) => setJournalFilters({ ...journalFilters, source_document_type: e.target.value })}
                      >
                        <option value="">All Types</option>
                        <option value="PAYMENT">Payment</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="JOURNAL">Journal</option>
                        <option value="CLEARING">Clearing</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Source Module</label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={journalFilters.source_module}
                        onChange={(e) => setJournalFilters({ ...journalFilters, source_module: e.target.value })}
                      >
                        <option value="">All Modules</option>
                        <option value="SALES">Sales</option>
                        <option value="PROCUREMENT">Procurement</option>
                        <option value="FINANCE">Finance</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Start Date</label>
                      <Input
                        type="date"
                        value={journalFilters.start_date}
                        onChange={(e) => setJournalFilters({ ...journalFilters, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">End Date</label>
                      <Input
                        type="date"
                        value={journalFilters.end_date}
                        onChange={(e) => setJournalFilters({ ...journalFilters, end_date: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setJournalFilters({
                          fiscal_year: '',
                          fiscal_period: '',
                          source_document_type: '',
                          source_module: '',
                          start_date: '',
                          end_date: ''
                        })}
                      >
                        Clear Filters
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchEntries()}
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entries Display */}
              {entriesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading journal entries...</div>
              ) : groupedEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>Showing {groupedEntries.length} document{groupedEntries.length !== 1 ? 's' : ''} ({entriesTotal} total entries)</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Auto-refresh: 30s</Badge>
                    </div>
                  </div>
                  {groupedEntries.map((group: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">Document: {group.document_number}</CardTitle>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                              <span>Posted: {group.posting_date ? format(new Date(group.posting_date), 'MMM dd, yyyy') : 'N/A'}</span>
                              {group.fiscal_year && group.fiscal_period && (
                                <span>• Period: {group.fiscal_year}-{String(group.fiscal_period).padStart(2, '0')}</span>
                              )}
                              {group.source_module && (
                                <span>• Module: {group.source_module}</span>
                              )}
                              {group.source_document_type && (
                                <span>• Type: {group.source_document_type}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {group.entries.length} {group.entries.length === 1 ? 'Entry' : 'Entries'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Number</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.entries.map((entry: GLEntry, entryIndex: number) => (
                              <TableRow key={entry.id || entryIndex}>
                                <TableCell className="font-mono">{entry.account_number || '-'}</TableCell>
                                <TableCell className="font-medium">{entry.account_name || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={entry.debit_credit_indicator === 'D' ? "default" : "secondary"}>
                                    {entry.debit_credit_indicator === 'D' ? 'Debit' : 'Credit'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {entry.description || entry.reference || '-'}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(entry.amount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                          <div className="flex gap-4">
                            <div>
                              <span className="text-muted-foreground">Total Debit: </span>
                              <span className="font-medium">{formatCurrency(group.total_debit)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Credit: </span>
                              <span className="font-medium">{formatCurrency(group.total_credit)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Balance: </span>
                              <span className={`font-medium ${Math.abs(group.total_debit - group.total_credit) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(group.total_debit - group.total_credit)}
                              </span>
                            </div>
                          </div>
                          <Badge variant={Math.abs(group.total_debit - group.total_credit) < 0.01 ? "default" : "destructive"}>
                            {Math.abs(group.total_debit - group.total_credit) < 0.01 ? 'Balanced' : 'Unbalanced'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">No journal entries found.</p>
                  <p className="text-xs">Try adjusting your filters or create a new journal entry to get started.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Trial Balance Tab */}
          <TabsContent value="trial-balance" className="p-4">
            {trialBalanceLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading trial balance...</div>
            ) : Array.isArray(trialBalance) && trialBalance.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Trial Balance Report</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    As of {format(new Date(), 'MMMM dd, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.map((entry: TrialBalanceEntry, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{entry.account_number}</TableCell>
                          <TableCell className="font-medium">{entry.account_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.account_type}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const debit = parseFloat(String(entry.debit_total || 0));
                              return debit > 0 ? formatCurrency(debit) : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const credit = parseFloat(String(entry.credit_total || 0));
                              return credit > 0 ? formatCurrency(credit) : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(String(entry.balance || 0)))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end gap-4 text-sm font-medium">
                      <div>
                        Total Debit: {formatCurrency(
                          trialBalance.reduce((sum: number, e: TrialBalanceEntry) => {
                            const debit = parseFloat(String(e.debit_total || 0));
                            return sum + (isNaN(debit) ? 0 : debit);
                          }, 0)
                        )}
                      </div>
                      <div>
                        Total Credit: {formatCurrency(
                          trialBalance.reduce((sum: number, e: TrialBalanceEntry) => {
                            const credit = parseFloat(String(e.credit_total || 0));
                            return sum + (isNaN(credit) ? 0 : credit);
                          }, 0)
                        )}
                      </div>
                      <div>
                        Total Balance: {formatCurrency(
                          trialBalance.reduce((sum: number, e: TrialBalanceEntry) => {
                            const balance = parseFloat(String(e.balance || 0));
                            return sum + (isNaN(balance) ? 0 : balance);
                          }, 0)
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trial balance data available. Ensure GL entries exist in the system.
              </div>
            )}
          </TabsContent>
          
          {/* Financial Reports Tab */}
          <TabsContent value="reports" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trial Balance Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Generate a comprehensive trial balance report showing all account balances.
                    </p>
                    <Button className="w-full" onClick={() => setActiveTab('trial-balance')}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Trial Balance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Balance Sheet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Generate balance sheet report showing assets, liabilities, and equity.
                    </p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        setReportFilters({
                          ...reportFilters,
                          start_date: reportFilters.start_date || format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
                          end_date: reportFilters.end_date || format(new Date(), 'yyyy-MM-dd'),
                        });
                        setSelectedReport('balance-sheet');
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Generate Balance Sheet
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Income Statement (P&L)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Generate profit & loss statement showing revenue and expenses.
                    </p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        setReportFilters({
                          ...reportFilters,
                          start_date: reportFilters.start_date || format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
                          end_date: reportFilters.end_date || format(new Date(), 'yyyy-MM-dd'),
                        });
                        setSelectedReport('income-statement');
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Generate P&L Statement
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Detailed account movement analysis and transaction history.
                    </p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setSelectedReport('account-analysis')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Account Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* New Journal Entry Modal */}
      <Dialog open={isJournalEntryModalOpen} onOpenChange={setIsJournalEntryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              Create a new journal entry. Debits must equal Credits.
            </DialogDescription>
          </DialogHeader>

          {journalEntryError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{journalEntryError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="posting_date">Posting Date *</Label>
                <Input
                  id="posting_date"
                  type="date"
                  value={journalEntryForm.posting_date}
                  onChange={(e) => setJournalEntryForm({ ...journalEntryForm, posting_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="document_date">Document Date</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={journalEntryForm.document_date}
                  onChange={(e) => setJournalEntryForm({ ...journalEntryForm, document_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_code">Company Code *</Label>
                <select
                  id="company_code"
                  value={journalEntryForm.company_code}
                  onChange={(e) => {
                    const selected = companyCodes?.find((cc: any) => cc.code === e.target.value);
                    setJournalEntryForm({
                      ...journalEntryForm,
                      company_code: e.target.value,
                      currency: selected?.currency || 'USD',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Company Code</option>
                  {companyCodes?.map((cc: any) => (
                    <option key={cc.id} value={cc.code}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={journalEntryForm.currency}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={journalEntryForm.reference}
                onChange={(e) => setJournalEntryForm({ ...journalEntryForm, reference: e.target.value })}
                placeholder="Enter reference or description"
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddJournalEntryLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntryLines.map((line, index) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <select
                            value={line.gl_account_id || ''}
                            onChange={(e) => handleUpdateJournalEntryLine(line.id, 'gl_account_id', e.target.value ? parseInt(e.target.value) : '')}
                            className="w-full px-2 py-1 border rounded text-sm"
                            required
                          >
                            <option value="">Select Account</option>
                            {glAccounts?.map((acc: GLAccount) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_number} - {acc.account_name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select
                            value={line.debit_credit_indicator}
                            onChange={(e) => handleUpdateJournalEntryLine(line.id, 'debit_credit_indicator', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="D">Debit</option>
                            <option value="C">Credit</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => handleUpdateJournalEntryLine(line.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="text-sm"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.amount || ''}
                            onChange={(e) => handleUpdateJournalEntryLine(line.id, 'amount', e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="0.00"
                            className="text-right text-sm"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          {journalEntryLines.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveJournalEntryLine(line.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end gap-6 text-sm font-medium border-t pt-2">
                <div>Total Debits: {formatCurrency(journalEntryTotals.debits)}</div>
                <div>Total Credits: {formatCurrency(journalEntryTotals.credits)}</div>
                <div className={journalEntryTotals.difference > 0.01 ? 'text-destructive' : 'text-green-600'}>
                  Difference: {formatCurrency(journalEntryTotals.difference)}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsJournalEntryModalOpen(false)}
              disabled={createJournalEntryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitJournalEntry}
              disabled={createJournalEntryMutation.isPending || journalEntryTotals.difference > 0.01}
            >
              {createJournalEntryMutation.isPending ? 'Posting...' : 'Post Journal Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Sheet Report Modal */}
      <Dialog open={selectedReport === 'balance-sheet'} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Balance Sheet Report</DialogTitle>
            <DialogDescription>
              Period: {reportFilters.start_date} to {reportFilters.end_date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Report Filters */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={reportFilters.start_date}
                  onChange={(e) => setReportFilters({ ...reportFilters, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={reportFilters.end_date}
                  onChange={(e) => setReportFilters({ ...reportFilters, end_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Button onClick={() => refetchReports()} disabled={reportsLoading}>
                  {reportsLoading ? 'Loading...' : 'Refresh Report'}
                </Button>
              </div>
            </div>

            {reportsLoading ? (
              <div className="text-center py-8">Loading balance sheet...</div>
            ) : financialReportsData?.balance_sheet ? (
              <div className="space-y-6">
                {/* Assets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Current Assets</h4>
                        <Table>
                          <TableBody>
                            {Object.entries(financialReportsData.balance_sheet.current_assets || {}).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="font-semibold text-right mt-2 border-t pt-2">
                          Total Current Assets: {formatCurrency(financialReportsData.balance_sheet.total_current_assets || 0)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Non-Current Assets</h4>
                        <Table>
                          <TableBody>
                            {Object.entries(financialReportsData.balance_sheet.non_current_assets || {}).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="font-semibold text-right mt-2 border-t pt-2">
                          Total Non-Current Assets: {formatCurrency(financialReportsData.balance_sheet.total_non_current_assets || 0)}
                        </div>
                      </div>
                      <div className="font-bold text-lg text-right border-t-2 pt-2">
                        Total Assets: {formatCurrency(financialReportsData.balance_sheet.total_assets || 0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Liabilities & Equity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Liabilities & Equity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Current Liabilities</h4>
                        <Table>
                          <TableBody>
                            {Object.entries(financialReportsData.balance_sheet.current_liabilities || {}).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="font-semibold text-right mt-2 border-t pt-2">
                          Total Current Liabilities: {formatCurrency(financialReportsData.balance_sheet.total_current_liabilities || 0)}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Non-Current Liabilities</h4>
                        <Table>
                          <TableBody>
                            {Object.entries(financialReportsData.balance_sheet.non_current_liabilities || {}).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="font-semibold text-right mt-2 border-t pt-2">
                          Total Non-Current Liabilities: {formatCurrency(financialReportsData.balance_sheet.total_non_current_liabilities || 0)}
                        </div>
                      </div>
                      <div className="font-semibold text-right border-t pt-2">
                        Total Liabilities: {formatCurrency(financialReportsData.balance_sheet.total_liabilities || 0)}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Equity</h4>
                        <Table>
                          <TableBody>
                            {Object.entries(financialReportsData.balance_sheet.equity || {}).map(([key, value]: [string, any]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="font-semibold text-right mt-2 border-t pt-2">
                          Total Equity: {formatCurrency(financialReportsData.balance_sheet.total_equity || 0)}
                        </div>
                      </div>
                      <div className="font-bold text-lg text-right border-t-2 pt-2">
                        Total Liabilities & Equity: {formatCurrency((financialReportsData.balance_sheet.total_liabilities || 0) + (financialReportsData.balance_sheet.total_equity || 0))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No balance sheet data available</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
            <Button onClick={() => {
              // Export functionality can be added here
              window.print();
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Statement (P&L) Report Modal */}
      <Dialog open={selectedReport === 'income-statement'} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Income Statement (Profit & Loss)</DialogTitle>
            <DialogDescription>
              Period: {reportFilters.start_date} to {reportFilters.end_date}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Report Filters */}
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={reportFilters.start_date}
                  onChange={(e) => setReportFilters({ ...reportFilters, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={reportFilters.end_date}
                  onChange={(e) => setReportFilters({ ...reportFilters, end_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Button onClick={() => refetchReports()} disabled={profitLossLoading}>
                  {profitLossLoading ? 'Loading...' : 'Refresh Report'}
                </Button>
              </div>
            </div>

            {profitLossLoading ? (
              <div className="text-center py-8">Loading income statement...</div>
            ) : profitLossData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Revenue */}
                    <div>
                      <h3 className="font-bold text-lg mb-3">Revenue</h3>
                      <Table>
                        <TableBody>
                          {profitLossData.revenue?.map((item: any) => (
                            <TableRow key={item.accountNumber}>
                              <TableCell>{item.accountNumber} - {item.accountName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="font-semibold text-right mt-2 border-t pt-2">
                        Total Revenue: {formatCurrency(profitLossData.totalRevenue || 0)}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <h3 className="font-bold text-lg mb-3">Expenses</h3>
                      <Table>
                        <TableBody>
                          {profitLossData.expenses?.map((item: any) => (
                            <TableRow key={item.accountNumber}>
                              <TableCell>{item.accountNumber} - {item.accountName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="font-semibold text-right mt-2 border-t pt-2">
                        Total Expenses: {formatCurrency(profitLossData.totalExpenses || 0)}
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="font-bold text-xl text-right border-t-2 pt-4">
                      Net Income: {formatCurrency(profitLossData.netIncome || 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No income statement data available</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
            <Button onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Analysis Modal */}
      <Dialog open={selectedReport === 'account-analysis'} onOpenChange={(open) => {
        if (!open) {
          setSelectedReport(null);
          setSelectedAccountForAnalysis(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Analysis</DialogTitle>
            <DialogDescription>
              Select an account to view detailed transaction history
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Account</Label>
              <select
                value={selectedAccountForAnalysis || ''}
                onChange={(e) => setSelectedAccountForAnalysis(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select an account...</option>
                {glAccounts?.map((acc: GLAccount) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_number} - {acc.account_name}
                  </option>
                ))}
              </select>
            </div>

            {accountAnalysisLoading ? (
              <div className="text-center py-8">Loading account analysis...</div>
            ) : accountAnalysisData ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {accountAnalysisData.account?.account_number} - {accountAnalysisData.account?.account_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Type: {accountAnalysisData.account?.account_type} | Group: {accountAnalysisData.account?.account_group || 'N/A'}
                  </p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountAnalysisData.entries?.map((entry: any, index: number) => {
                        const runningBalance = accountAnalysisData.entries
                          .slice(0, index + 1)
                          .reduce((sum: number, e: any) => {
                            return sum + (e.debit_credit_indicator === 'D' ? parseFloat(e.amount || 0) : -parseFloat(e.amount || 0));
                          }, 0);
                        
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>{entry.document_number}</TableCell>
                            <TableCell>{format(new Date(entry.posting_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={entry.debit_credit_indicator === 'D' ? 'default' : 'secondary'}>
                                {entry.debit_credit_indicator}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.debit_credit_indicator === 'D' ? formatCurrency(entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.debit_credit_indicator === 'C' ? formatCurrency(entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(runningBalance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {(!accountAnalysisData.entries || accountAnalysisData.entries.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">No transactions found for this account</div>
                  )}
                </CardContent>
              </Card>
            ) : selectedAccountForAnalysis ? (
              <div className="text-center py-8 text-muted-foreground">No account data available</div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedReport(null);
              setSelectedAccountForAnalysis(null);
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Supporting components
type GLCardProps = {
  title: string;
  value: string;
  change: number | null;
  isPositive: boolean;
  period: string;
  icon: React.ReactNode;
};

function GLCard({ title, value, change, isPositive, period, icon }: GLCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== null && (
          <div className="flex items-center space-x-1 text-xs mt-1">
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            </span>
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="text-muted-foreground">{period}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type GLAccountProps = {
  name: string;
  amount: string;
  change: number | null;
  isPositive: boolean;
};

function GLAccount({ name, amount, change, isPositive }: GLAccountProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
      <div className="font-medium">{name}</div>
      <div className="flex items-center gap-2">
        <div className="font-medium">{amount}</div>
        {change !== null && (
          <div className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{change}%
          </div>
        )}
      </div>
    </div>
  );
}

type JournalEntryProps = {
  documentNumber?: string;
  description?: string;
  date: string;
  amount: number;
  status: string;
  entryCount?: number;
};

function JournalEntry({ documentNumber, description, date, amount, status, entryCount }: JournalEntryProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">
          {description || `Document ${documentNumber || 'N/A'}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {date ? format(new Date(date), 'MMM dd, yyyy') : 'N/A'}
          {entryCount && ` • ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">{new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount || 0)}</div>
        <Badge 
          variant={status === "Posted" ? "outline" : "secondary"} 
          className="text-xs rounded-sm"
        >
          {status}
        </Badge>
      </div>
    </div>
  );
}
