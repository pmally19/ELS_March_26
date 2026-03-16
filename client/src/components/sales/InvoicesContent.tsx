import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Eye, 
  Plus, 
  Search, 
  RefreshCw,
  FileDown,
  Calendar,
  AlertCircle
} from "lucide-react";

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  status: string;
  grand_total: number;
  paid_amount: number;
  outstanding_amount?: number;
}

export default function InvoicesContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Fetch invoices with payment status from accounts-receivable API (includes AR open items data)
  const { data: accountsReceivableData, isLoading, refetch } = useQuery({
    queryKey: ['/api/finance/accounts-receivable', statusFilter],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance/accounts-receivable');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Error fetching accounts receivable:', error);
        // Fallback to billing documents if accounts-receivable fails
        try {
          const response = await apiRequest('/api/order-to-cash/billing-documents');
          const data = await response.json();
          return data.success ? data.data : [];
        } catch (fallbackError) {
          console.error('Error fetching billing documents:', fallbackError);
          return [];
        }
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 0, // Always consider data stale to get fresh data
  });

  // Transform AR data to invoice format with real-time calculations
  const invoices = useMemo<Invoice[]>(() => {
    if (!accountsReceivableData || !Array.isArray(accountsReceivableData)) return [];
    
    return accountsReceivableData.map((ar: any) => {
      const totalAmount = parseFloat(ar.amount || ar.total_amount || 0);
      const paidAmount = parseFloat(ar.paid_amount || 0);
      const outstandingAmount = parseFloat(ar.outstanding_amount || totalAmount);
      
      // Determine status based on payment and due date
      let status = ar.status || 'unpaid';
      const today = new Date();
      const dueDate = ar.due_date ? new Date(ar.due_date) : null;
      const isOverdue = dueDate && dueDate < today;
      
      // Override status based on calculations if not accurate
      if (paidAmount >= totalAmount || outstandingAmount <= 0) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = isOverdue ? 'overdue' : 'partially_paid';
      } else if (isOverdue) {
        status = 'overdue';
      } else {
        status = 'unpaid';
      }

      return {
        id: ar.id,
        invoice_number: ar.invoice_number || ar.billing_number || `INV-${ar.id}`,
        customer_name: ar.customer_name || `Customer ${ar.customer_id}`,
        invoice_date: ar.invoice_date || ar.billing_date || ar.created_at,
        due_date: ar.due_date || ar.invoice_date || ar.created_at,
        status: status,
        grand_total: totalAmount,
        paid_amount: paidAmount,
        outstanding_amount: outstandingAmount,
      };
    });
  }, [accountsReceivableData]);

  // Filter invoices based on search term and status filter
  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        invoice.invoice_number.toLowerCase().includes(search) ||
        invoice.customer_name.toLowerCase().includes(search) ||
        invoice.status.toLowerCase().includes(search)
      );

      // Apply status filter
      if (statusFilter === 'all') {
        return matchesSearch;
      }

      const statusMatch = 
        (statusFilter === 'Paid' && invoice.status === 'paid') ||
        (statusFilter === 'Partially Paid' && invoice.status === 'partially_paid') ||
        (statusFilter === 'Unpaid' && invoice.status === 'unpaid') ||
        (statusFilter === 'Overdue' && invoice.status === 'overdue');

      return matchesSearch && statusMatch;
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Paid</Badge>;
      case 'partially paid':
      case 'partially':
      case 'partially_paid':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'unpaid':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate payment status
  const getPaymentStatus = (invoice: Invoice) => {
    const total = Number(invoice.grand_total);
    const paid = Number(invoice.paid_amount);
    
    if (paid === 0) return 'Unpaid';
    if (paid < total) return 'Partially Paid';
    if (paid >= total) return 'Paid';
    
    return 'Unknown';
  };

  // Check if invoice is overdue
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    return dueDateObj < today;
  };

  // Calculate due date status for display
  const getDueDateStatus = (dueDate: string) => {
    if (!dueDate) return null;
    
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-500 flex items-center text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Overdue by {Math.abs(diffDays)} days</span>;
    } else if (diffDays <= 3) {
      return <span className="text-amber-500 text-xs">Due in {diffDays} days</span>;
    } else {
      return <span className="text-muted-foreground text-xs">Due in {diffDays} days</span>;
    }
  };

  // Calculate stats from real data
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.grand_total || 0), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
    const totalOutstanding = invoices.reduce((sum, invoice) => {
      const outstanding = invoice.outstanding_amount !== undefined 
        ? Number(invoice.outstanding_amount) 
        : Number(invoice.grand_total || 0) - Number(invoice.paid_amount || 0);
      return sum + Math.max(0, outstanding);
    }, 0);
    const overdueCount = invoices.filter(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!dueDate) return false;
      const dueDateOnly = new Date(dueDate);
      dueDateOnly.setHours(0, 0, 0, 0);
      const isOverdueInvoice = dueDateOnly < today;
      return isOverdueInvoice && invoice.status !== 'paid';
    }).length;

    return {
      totalInvoices,
      totalAmount,
      totalPaid,
      totalOutstanding,
      overdueCount,
    };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">
            Manage customer invoices and payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <CreateInvoiceDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Invoice List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[200px] md:w-[260px]"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  console.log("Invoice status filter changed to:", value);
                  // Trigger a refetch with the new filter
                  refetch();
                }}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="h-[400px] w-full flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-2">No invoices found</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {formatDate(invoice.due_date)}
                          {getDueDateStatus(invoice.due_date)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(getPaymentStatus(invoice))}</TableCell>
                      <TableCell>{formatCurrency(Number(invoice.grand_total || 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(invoice.paid_amount || 0))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}