import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateReturnDialog } from './CreateReturnDialog';
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
  ArrowLeft,
  ClipboardCheck
} from "lucide-react";

interface Return {
  id: number;
  return_number: string;
  customer_name: string;
  return_date: string;
  status: string;
  total_amount: number;
  return_reason: string;
}

export default function ReturnsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { data: returns = [], isLoading, refetch } = useQuery<Return[]>({
    queryKey: ['/api/sales/returns', statusFilter],
    queryFn: async () => {
      // Create URL with proper filter parameters
      let url = '/api/sales/returns';
      
      // Add status filter if not "all"
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
        console.log(`Fetching returns with status filter: ${statusFilter}`);
      } else {
        console.log(`Fetching all returns (no status filter)`);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch returns');
      }
      return response.json();
    },
    // Keep the data fresh for 5 minutes but refetch on filter change
    staleTime: 300000,
  });

  // Filter returns based on search term
  const filteredReturns = returns.filter(returnItem => {
    const search = searchTerm.toLowerCase();
    return (
      returnItem.return_number.toLowerCase().includes(search) ||
      returnItem.customer_name.toLowerCase().includes(search) ||
      returnItem.status.toLowerCase().includes(search) ||
      returnItem.return_reason?.toLowerCase().includes(search)
    );
  });

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
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Returns</h2>
          <p className="text-muted-foreground">
            Manage customer returns and refunds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <CreateReturnDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {returns.filter(r => r.status.toLowerCase() === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(returns.reduce((sum, r) => sum + Number(r.total_amount), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Returns List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[200px] md:w-[260px]"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  console.log("Return status filter changed to:", value);
                  // Trigger a refetch with the new filter
                  refetch();
                }}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
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
          ) : filteredReturns.length === 0 ? (
            <div className="h-[400px] w-full flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-2">No returns found</p>
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
                    <TableHead>Return #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((returnItem) => (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                      <TableCell>{returnItem.customer_name}</TableCell>
                      <TableCell>{formatDate(returnItem.return_date)}</TableCell>
                      <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                      <TableCell>{formatCurrency(Number(returnItem.total_amount))}</TableCell>
                      <TableCell title={returnItem.return_reason}>{truncateText(returnItem.return_reason, 30)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <ClipboardCheck className="h-4 w-4" />
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