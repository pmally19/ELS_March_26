import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateQuoteDialog } from './CreateQuoteDialog';
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
  Filter,
  RefreshCw,
  FileDown,
  FileUp
} from "lucide-react";

interface Quote {
  id: number;
  quote_number: string;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
  grand_total: number;
}

export default function QuotesContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('quote_date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const { data: quotes = [], isLoading, refetch } = useQuery<Quote[]>({
    queryKey: ['/api/sales/quotes', statusFilter],
    queryFn: async () => {
      // Create URL with proper filter parameters
      let url = '/api/sales/quotes';
      
      // Add status filter if not "all"
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
        console.log(`Fetching quotes with status filter: ${statusFilter}`);
      } else {
        console.log(`Fetching all quotes (no status filter)`);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch quotes');
      }
      const result = await response.json();
      // Handle both array response and object with data property
      return Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
    },
    // Keep the data fresh for 5 minutes but refetch on filter change
    staleTime: 300000,
  });

  // Ensure quotes is always an array
  const quotesArray = Array.isArray(quotes) ? quotes : [];
  
  // Filter and sort quotes
  const filteredQuotes = quotesArray
    .filter(quote => {
      const search = searchTerm.toLowerCase();
      return (
        quote.quote_number?.toLowerCase().includes(search) ||
        quote.customer_name?.toLowerCase().includes(search) ||
        quote.status?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof Quote];
      let bValue = b[sortBy as keyof Quote];
      
      if (sortBy === 'quote_date' || sortBy === 'valid_until') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
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
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (validUntil: string) => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return <span className="text-red-500">Expired</span>;
    } else if (diffDays <= 7) {
      return <span className="text-yellow-600">{diffDays} days left</span>;
    } else {
      return <span className="text-muted-foreground">{diffDays} days left</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quotes & Estimates</h2>
          <p className="text-muted-foreground">
            Create and manage customer quotes and estimates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetch();
              setSearchTerm('');
              setStatusFilter('all');
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <CreateQuoteDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotesArray.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Draft Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotesArray.filter(quote => quote.status?.toLowerCase() === 'draft').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Approved Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotesArray.filter(quote => quote.status?.toLowerCase() === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(quotesArray.reduce((sum, quote) => sum + Number(quote.grand_total || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Quote List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[200px] md:w-[260px]"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote_date">Quote Date</SelectItem>
                  <SelectItem value="customer_name">Customer</SelectItem>
                  <SelectItem value="total_amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="quote_number">Quote #</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-9 px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="h-[400px] w-full flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-2">No quotes found</p>
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
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
                      <TableCell>{quote.customer_name}</TableCell>
                      <TableCell>{formatDate(quote.quote_date)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>{formatCurrency(Number(quote.grand_total))}</TableCell>
                      <TableCell>
                        {formatDate(quote.valid_until)}
                        <div className="text-xs">{getDaysUntilExpiry(quote.valid_until)}</div>
                      </TableCell>
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