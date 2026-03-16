import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Download,
  MoreHorizontal,
  Send,
  Mail,
  Printer,
  Users,
  Search
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Type definitions
type DunningProcedure = {
  id: number;
  procedure_code: string;
  procedure_name: string;
  level1_days: number;
  level2_days: number;
  level3_days: number;
  final_notice_days: number;
  blocking_days: number;
  legal_action_days: number;
  minimum_amount: number;
  interest_rate: number;
  dunning_fee: number;
  is_active: boolean;
  created_at: string;
};

type DunningHistory = {
  id: number;
  customer_id: number;
  customer_code?: string;
  customer_name?: string;
  customer_email?: string;
  dunning_procedure_id: number;
  procedure_code?: string;
  procedure_name?: string;
  invoice_id?: number;
  dunning_level: number;
  dunning_date: string;
  outstanding_amount: number;
  dunning_amount: number;
  interest_amount: number;
  dunning_status: string;
  dunning_text?: string;
  letter_sent: boolean;
  email_sent: boolean;
  response_date?: string;
  payment_received: boolean;
  escalated_to_legal: boolean;
  created_by?: string;
  created_at: string;
};

type OverdueAccount = {
  customer_id: number;
  customer_code: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  total_overdue: number;
  overdue_invoice_count: number;
  oldest_due_date: string;
  newest_due_date: string;
  days_overdue: number;
  dunning_level: number;
  recommended_procedure_id?: number;
};

type DunningStatistics = {
  byLevel: Array<{
    dunning_level: number;
    count: number;
    total_outstanding: number;
    total_dunning_amount: number;
    total_interest: number;
  }>;
  byStatus: Array<{
    dunning_status: string;
    count: number;
    total_outstanding: number;
  }>;
  totalCustomers: number;
  totalOutstanding: number;
};

export default function DunningManagement() {
  const permissions = useAgentPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showProcedureDialog, setShowProcedureDialog] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<DunningProcedure | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<DunningHistory | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overdue");

  // Procedure form state
  const [procedureForm, setProcedureForm] = useState({
    procedure_code: "",
    procedure_name: "",
    level1_days: 7,
    level2_days: 14,
    level3_days: 21,
    final_notice_days: 30,
    blocking_days: 45,
    legal_action_days: 60,
    minimum_amount: 0,
    interest_rate: 0,
    dunning_fee: 0
  });

  // Fetch dunning procedures
  const { data: procedures = [], isLoading: proceduresLoading, refetch: refetchProcedures } = useQuery({
    queryKey: ['/api/dunning/procedures'],
    queryFn: async () => {
      const response = await fetch("/api/dunning/procedures", {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch procedures');
      return response.json();
    },
  });

  // Fetch overdue accounts
  const { data: overdueAccounts = [], isLoading: overdueLoading, refetch: refetchOverdue } = useQuery({
    queryKey: ['/api/dunning/overdue-accounts', selectedProcedure?.id],
    queryFn: async () => {
      const url = selectedProcedure?.id
        ? `/api/dunning/overdue-accounts?procedure_id=${selectedProcedure.id}`
        : '/api/dunning/overdue-accounts';
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch overdue accounts');
      return response.json();
    },
    enabled: activeTab === 'overdue',
  });

  // Fetch dunning history
  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/dunning/history', statusFilter, levelFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (levelFilter !== 'all') params.append('level', levelFilter);
      const response = await fetch(`/api/dunning/history?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: activeTab === 'history',
  });

  // Fetch statistics
  const { data: statistics, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/dunning/statistics'],
    queryFn: async () => {
      const response = await fetch("/api/dunning/statistics", {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
  });

  // Generate dunning notices mutation
  const generateNoticesMutation = useMutation({
    mutationFn: async (data: {
      procedure_id: number;
      customer_ids?: number[];
      test_run?: boolean;
      send_emails?: boolean;
      send_letters?: boolean;
    }) => {
      const response = await apiRequest('/api/dunning/generate', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate notices');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const emailInfo = data.test_run ? '' : ' (emails logged - see console for SendGrid setup)';
      toast({
        title: "Success",
        description: `${data.test_run ? 'Test run completed' : 'Generated'} ${data.generated_count} dunning notice(s)${emailInfo}`,
      });
      setShowGenerateDialog(false);
      refetchOverdue();
      refetchHistory();
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate dunning notices",
        variant: "destructive",
      });
    },
  });

  // Update history mutation
  const updateHistoryMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const response = await apiRequest(`/api/dunning/history/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dunning record updated successfully",
      });
      setShowHistoryDialog(false);
      setSelectedHistory(null);
      refetchHistory();
      refetchStats();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update record",
        variant: "destructive",
      });
    },
  });

  // Create procedure mutation
  const createProcedureMutation = useMutation({
    mutationFn: async (data: Partial<DunningProcedure>) => {
      const response = await apiRequest('/api/dunning/procedures', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create procedure');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dunning procedure created successfully",
      });
      setShowProcedureDialog(false);
      setSelectedProcedure(null);
      refetchProcedures();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create procedure",
        variant: "destructive",
      });
    },
  });

  // Filtered history
  const filteredHistory = history.filter((item: DunningHistory) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.customer_code?.toLowerCase().includes(query) ||
        item.customer_name?.toLowerCase().includes(query) ||
        item.procedure_code?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get dunning level label
  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return 'First Notice';
      case 2: return 'Second Notice';
      case 3: return 'Third Notice';
      case 4: return 'Final Notice';
      default: return `Level ${level}`;
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'acknowledged':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Acknowledged</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'escalated':
        return <Badge variant="destructive">Escalated</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchProcedures();
    refetchOverdue();
    refetchHistory();
    refetchStats();
    toast({
      title: "Refreshing",
      description: "Loading latest dunning data...",
    });
  };

  // Handle generate notices
  const handleGenerateNotices = (testRun: boolean = false) => {
    if (!selectedProcedure) {
      toast({
        title: "Error",
        description: "Please select a dunning procedure",
        variant: "destructive",
      });
      return;
    }

    generateNoticesMutation.mutate({
      procedure_id: selectedProcedure.id,
      test_run: testRun,
      send_emails: !testRun, // Send emails only if not a test run
      send_letters: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/transactions" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payment Reminder Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage payment reminders, overdue accounts, and collection processes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {permissions.hasDataModificationRights ? (
            <>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => {
                setSelectedProcedure(null);
                setProcedureForm({
                  procedure_code: "",
                  procedure_name: "",
                  level1_days: 7,
                  level2_days: 14,
                  level3_days: 21,
                  final_notice_days: 30,
                  blocking_days: 45,
                  legal_action_days: 60,
                  minimum_amount: 0,
                  interest_rate: 0,
                  dunning_fee: 0
                });
                setShowProcedureDialog(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                New Procedure
              </Button>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Send className="mr-2 h-4 w-4" />
                Generate Notices
              </Button>
            </>
          ) : (
            <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
              {permissions.getRestrictedMessage()}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold">{statistics.totalCustomers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold">{formatCurrency(statistics.totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Notices</p>
                  <p className="text-2xl font-bold">
                    {statistics.byStatus?.find((s: any) => s.dunning_status === 'sent')?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">
                    {statistics.byStatus?.find((s: any) => s.dunning_status === 'paid')?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overdue">Overdue Accounts</TabsTrigger>
          <TabsTrigger value="history">Reminder History</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
        </TabsList>

        {/* Overdue Accounts Tab */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Accounts</CardTitle>
              <CardDescription>
                Customers with outstanding invoices eligible for payment reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedProcedure?.id?.toString() || "all"} onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedProcedure(null);
                  } else {
                    const proc = procedures.find((p: DunningProcedure) => p.id.toString() === value);
                    setSelectedProcedure(proc || null);
                  }
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Procedures</SelectItem>
                    {procedures.map((proc: DunningProcedure) => (
                      <SelectItem key={proc.id} value={proc.id.toString()}>
                        {proc.procedure_code} - {proc.procedure_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Customer Code</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead className="hidden md:table-cell">Total Overdue</TableHead>
                        <TableHead className="hidden md:table-cell">Days Overdue</TableHead>
                        <TableHead className="hidden lg:table-cell">Invoice Count</TableHead>
                        <TableHead className="text-center">Reminder Level</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : overdueAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            No overdue accounts found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        overdueAccounts
                          .filter((account: OverdueAccount) => {
                            if (searchQuery) {
                              const query = searchQuery.toLowerCase();
                              return (
                                account.customer_code?.toLowerCase().includes(query) ||
                                account.customer_name?.toLowerCase().includes(query)
                              );
                            }
                            return true;
                          })
                          .map((account: OverdueAccount) => (
                            <TableRow key={account.customer_id}>
                              <TableCell className="font-medium">{account.customer_code}</TableCell>
                              <TableCell>{account.customer_name}</TableCell>
                              <TableCell className="hidden md:table-cell">{formatCurrency(account.total_overdue)}</TableCell>
                              <TableCell className="hidden md:table-cell">{account.days_overdue} days</TableCell>
                              <TableCell className="hidden lg:table-cell">{account.overdue_invoice_count}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={account.dunning_level >= 3 ? "destructive" : account.dunning_level === 2 ? "default" : "secondary"}>
                                  {getLevelLabel(account.dunning_level)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {permissions.hasDataModificationRights ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" title="More actions">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        if (selectedProcedure) {
                                          generateNoticesMutation.mutate({
                                            procedure_id: selectedProcedure.id,
                                            customer_ids: [account.customer_id],
                                            test_run: false,
                                            send_emails: true,
                                            send_letters: false,
                                          });
                                        } else {
                                          toast({
                                            title: "Error",
                                            description: "Please select a procedure first",
                                            variant: "destructive",
                                          });
                                        }
                                      }}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Generate Notice
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <span className="text-xs text-gray-500 px-2 py-1">
                                    {permissions.label}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reminder History</CardTitle>
              <CardDescription>
                All payment reminder notices sent to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search history..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="1">First Notice</SelectItem>
                    <SelectItem value="2">Second Notice</SelectItem>
                    <SelectItem value="3">Third Notice</SelectItem>
                    <SelectItem value="4">Final Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden sm:table-cell">Procedure</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="hidden md:table-cell">Level</TableHead>
                        <TableHead className="hidden lg:table-cell">Outstanding</TableHead>
                        <TableHead className="hidden lg:table-cell">Reminder Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center h-24">
                            No reminder history found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHistory.map((item: DunningHistory) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.customer_code || item.customer_id}</div>
                                {item.customer_name && (
                                  <div className="text-xs text-muted-foreground">{item.customer_name}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{item.procedure_code || "-"}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(item.dunning_date)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant={item.dunning_level >= 3 ? "destructive" : item.dunning_level === 2 ? "default" : "secondary"}>
                                {getLevelLabel(item.dunning_level)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{formatCurrency(item.outstanding_amount)}</TableCell>
                            <TableCell className="hidden lg:table-cell">{formatCurrency(item.dunning_amount)}</TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(item.dunning_status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {permissions.hasDataModificationRights ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" title="More actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedHistory(item);
                                      setShowHistoryDialog(true);
                                    }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {!item.letter_sent && (
                                      <DropdownMenuItem onClick={() => {
                                        updateHistoryMutation.mutate({
                                          id: item.id,
                                          updates: { letter_sent: true }
                                        });
                                      }}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Mark Letter Sent
                                      </DropdownMenuItem>
                                    )}
                                    {!item.email_sent && (
                                      <DropdownMenuItem onClick={() => {
                                        updateHistoryMutation.mutate({
                                          id: item.id,
                                          updates: { email_sent: true }
                                        });
                                      }}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Mark Email Sent
                                      </DropdownMenuItem>
                                    )}
                                    {!item.payment_received && (
                                      <DropdownMenuItem onClick={() => {
                                        updateHistoryMutation.mutate({
                                          id: item.id,
                                          updates: { payment_received: true, dunning_status: 'paid' }
                                        });
                                      }}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  {permissions.label}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Procedures</CardTitle>
              <CardDescription>
                Configure payment reminder procedures and escalation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Level 1 (Days)</TableHead>
                        <TableHead className="hidden md:table-cell">Level 2 (Days)</TableHead>
                        <TableHead className="hidden lg:table-cell">Level 3 (Days)</TableHead>
                        <TableHead className="hidden lg:table-cell">Final Notice (Days)</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proceduresLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : procedures.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                            No procedures found. Create your first procedure.
                          </TableCell>
                        </TableRow>
                      ) : (
                        procedures.map((procedure: DunningProcedure) => (
                          <TableRow key={procedure.id}>
                            <TableCell className="font-medium">{procedure.procedure_code}</TableCell>
                            <TableCell>{procedure.procedure_name}</TableCell>
                            <TableCell className="hidden md:table-cell">{procedure.level1_days}</TableCell>
                            <TableCell className="hidden md:table-cell">{procedure.level2_days}</TableCell>
                            <TableCell className="hidden lg:table-cell">{procedure.level3_days}</TableCell>
                            <TableCell className="hidden lg:table-cell">{procedure.final_notice_days}</TableCell>
                            <TableCell className="text-right">
                              {permissions.hasDataModificationRights ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" title="More actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedProcedure(procedure);
                                      setProcedureForm({
                                        procedure_code: procedure.procedure_code,
                                        procedure_name: procedure.procedure_name,
                                        level1_days: procedure.level1_days,
                                        level2_days: procedure.level2_days,
                                        level3_days: procedure.level3_days,
                                        final_notice_days: procedure.final_notice_days,
                                        blocking_days: procedure.blocking_days,
                                        legal_action_days: procedure.legal_action_days,
                                        minimum_amount: procedure.minimum_amount,
                                        interest_rate: procedure.interest_rate,
                                        dunning_fee: procedure.dunning_fee
                                      });
                                      setShowProcedureDialog(true);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  {permissions.label}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Notices Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payment Reminders</DialogTitle>
            <DialogDescription>
              Generate payment reminder notices for overdue accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Procedure</label>
              <Select
                value={selectedProcedure?.id?.toString() || ""}
                onValueChange={(value) => {
                  const proc = procedures.find((p: DunningProcedure) => p.id.toString() === value);
                  setSelectedProcedure(proc || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select procedure" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc: DunningProcedure) => (
                    <SelectItem key={proc.id} value={proc.id.toString()}>
                      {proc.procedure_code} - {proc.procedure_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerateNotices(true)}
              disabled={!selectedProcedure || generateNoticesMutation.isPending}
            >
              Test Run
            </Button>
            <Button
              onClick={() => handleGenerateNotices(false)}
              disabled={!selectedProcedure || generateNoticesMutation.isPending}
            >
              {generateNoticesMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procedure Dialog */}
      <Dialog open={showProcedureDialog} onOpenChange={(open) => {
        setShowProcedureDialog(open);
        if (!open) {
          setSelectedProcedure(null);
          setProcedureForm({
            procedure_code: "",
            procedure_name: "",
            level1_days: 7,
            level2_days: 14,
            level3_days: 21,
            final_notice_days: 30,
            blocking_days: 45,
            legal_action_days: 60,
            minimum_amount: 0,
            interest_rate: 0,
            dunning_fee: 0
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedProcedure ? "Edit Procedure" : "Create Procedure"}
            </DialogTitle>
            <DialogDescription>
              Configure payment reminder procedure settings
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Procedure Code*</label>
                <Input
                  placeholder="E.g., PROC001"
                  value={selectedProcedure ? selectedProcedure.procedure_code : procedureForm.procedure_code}
                  onChange={(e) => setProcedureForm({ ...procedureForm, procedure_code: e.target.value })}
                  disabled={!!selectedProcedure}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Procedure Name*</label>
                <Input
                  placeholder="E.g., Standard Reminder Procedure"
                  value={selectedProcedure ? selectedProcedure.procedure_name : procedureForm.procedure_name}
                  onChange={(e) => setProcedureForm({ ...procedureForm, procedure_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Level 1 Days*</label>
                <Input
                  type="number"
                  placeholder="7"
                  value={selectedProcedure ? selectedProcedure.level1_days : procedureForm.level1_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, level1_days: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Level 2 Days*</label>
                <Input
                  type="number"
                  placeholder="14"
                  value={selectedProcedure ? selectedProcedure.level2_days : procedureForm.level2_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, level2_days: parseInt(e.target.value) || 14 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Level 3 Days*</label>
                <Input
                  type="number"
                  placeholder="21"
                  value={selectedProcedure ? selectedProcedure.level3_days : procedureForm.level3_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, level3_days: parseInt(e.target.value) || 21 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Final Notice Days*</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={selectedProcedure ? selectedProcedure.final_notice_days : procedureForm.final_notice_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, final_notice_days: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Blocking Days</label>
                <Input
                  type="number"
                  placeholder="45"
                  value={selectedProcedure ? selectedProcedure.blocking_days : procedureForm.blocking_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, blocking_days: parseInt(e.target.value) || 45 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Legal Action Days</label>
                <Input
                  type="number"
                  placeholder="60"
                  value={selectedProcedure ? selectedProcedure.legal_action_days : procedureForm.legal_action_days}
                  onChange={(e) => setProcedureForm({ ...procedureForm, legal_action_days: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Minimum Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={selectedProcedure ? selectedProcedure.minimum_amount : procedureForm.minimum_amount}
                  onChange={(e) => setProcedureForm({ ...procedureForm, minimum_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Interest Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={selectedProcedure ? selectedProcedure.interest_rate : procedureForm.interest_rate}
                  onChange={(e) => setProcedureForm({ ...procedureForm, interest_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reminder Fee</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={selectedProcedure ? selectedProcedure.dunning_fee : procedureForm.dunning_fee}
                  onChange={(e) => setProcedureForm({ ...procedureForm, dunning_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowProcedureDialog(false);
              setSelectedProcedure(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const formData = selectedProcedure ? {
                  procedure_code: selectedProcedure.procedure_code,
                  procedure_name: selectedProcedure.procedure_name,
                  level1_days: selectedProcedure.level1_days,
                  level2_days: selectedProcedure.level2_days,
                  level3_days: selectedProcedure.level3_days,
                  final_notice_days: selectedProcedure.final_notice_days,
                  blocking_days: selectedProcedure.blocking_days,
                  legal_action_days: selectedProcedure.legal_action_days,
                  minimum_amount: selectedProcedure.minimum_amount,
                  interest_rate: selectedProcedure.interest_rate,
                  dunning_fee: selectedProcedure.dunning_fee
                } : procedureForm;

                if (!formData.procedure_code || !formData.procedure_name) {
                  toast({
                    title: "Error",
                    description: "Procedure code and name are required",
                    variant: "destructive",
                  });
                  return;
                }

                createProcedureMutation.mutate(formData);
              }}
              disabled={createProcedureMutation.isPending}
            >
              {createProcedureMutation.isPending ? "Saving..." : selectedProcedure ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Details Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reminder Details</DialogTitle>
            <DialogDescription>
              View and update payment reminder record
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <p className="text-sm">{selectedHistory.customer_name || selectedHistory.customer_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reminder Level</label>
                  <p className="text-sm">{getLevelLabel(selectedHistory.dunning_level)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <p className="text-sm">{formatDate(selectedHistory.dunning_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedHistory.dunning_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Outstanding Amount</label>
                  <p className="text-sm font-semibold">{formatCurrency(selectedHistory.outstanding_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Reminder Amount</label>
                  <p className="text-sm font-semibold">{formatCurrency(selectedHistory.dunning_amount)}</p>
                </div>
              </div>
              {selectedHistory.dunning_text && (
                <div>
                  <label className="text-sm font-medium">Reminder Text</label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedHistory.dunning_text}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    updateHistoryMutation.mutate({
                      id: selectedHistory.id,
                      updates: { letter_sent: !selectedHistory.letter_sent }
                    });
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {selectedHistory.letter_sent ? "Letter Sent" : "Mark Letter Sent"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    updateHistoryMutation.mutate({
                      id: selectedHistory.id,
                      updates: { email_sent: !selectedHistory.email_sent }
                    });
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {selectedHistory.email_sent ? "Email Sent" : "Mark Email Sent"}
                </Button>
                {!selectedHistory.payment_received && (
                  <Button
                    onClick={() => {
                      updateHistoryMutation.mutate({
                        id: selectedHistory.id,
                        updates: { payment_received: true, dunning_status: 'paid' }
                      });
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowHistoryDialog(false);
              setSelectedHistory(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
