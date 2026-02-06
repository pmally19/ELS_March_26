import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreateCustomerDialog } from './CreateCustomerDialog';
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
  Map,
  Phone,
  Mail,
  Building,
  User
} from "lucide-react";

interface Customer {
  id: number;
  customer_number: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  industry: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  customer_since?: string;
  status: string;
  credit_limit?: number;
  outstanding_balance?: number;
}

export default function CustomersContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/sales/customers', statusFilter],
    queryFn: async () => {
      // Create URL with proper filter parameters
      let url = '/api/sales/customers';
      
      // Add status filter if not "all"
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
        console.log(`Fetching customers with status filter: ${statusFilter}`);
      } else {
        console.log(`Fetching all customers (no status filter)`);
      }
      // Always include sales-customers in this management tile for a complete view
      url += url.includes('?') ? `&includeSales=true` : `?includeSales=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
    // Keep the data fresh for 5 minutes but refetch on filter change
    staleTime: 300000,
  });

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase();
    const company = (customer.company_name || '').toLowerCase();
    const contact = (customer.contact_person || '').toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const phone = String(customer.phone || '');
    const industry = (customer.industry || '').toLowerCase();
    const status = (customer.status || '').toLowerCase();
    return (
      company.includes(search) ||
      contact.includes(search) ||
      email.includes(search) ||
      phone.includes(search) ||
      industry.includes(search) ||
      status.includes(search)
    );
  });

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
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
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'on hold':
      case 'onhold':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">On Hold</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Blocked</Badge>;
      case 'vip':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">VIP</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Sort customers by most recent
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    // First by status - with active and VIP first
    const aStatusPriority = a.status.toLowerCase() === 'active' ? 0 : 
                           a.status.toLowerCase() === 'vip' ? 1 : 2;
    const bStatusPriority = b.status.toLowerCase() === 'active' ? 0 : 
                           b.status.toLowerCase() === 'vip' ? 1 : 2;
    
    if (aStatusPriority !== bStatusPriority) {
      return aStatusPriority - bStatusPriority;
    }
    
    // Then by company name
    return a.company_name.localeCompare(b.company_name);
  });

  // Calculate stats
  const getActiveCustomers = () => customers.filter(c => c.status.toLowerCase() === 'active').length;
  const getInactiveCustomers = () => customers.filter(c => c.status.toLowerCase() === 'inactive').length;
  const getVipCustomers = () => customers.filter(c => c.status.toLowerCase() === 'vip').length;
  const getTotalOutstanding = () => customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage customer information and accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <CreateCustomerDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
        <Card className="min-w-0">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveCustomers()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getVipCustomers()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalOutstanding())}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full min-w-0">
            <CardTitle className="min-w-0 truncate">Customer List</CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-[200px] md:w-[260px]"
                />
              </div>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value);
                  console.log("Customer status filter changed to:", value);
                  // Trigger a refetch with the new filter
                  refetch();
                }}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="w-full max-w-full">
          {isLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="h-[400px] w-full flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-2">No customers found</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer #</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium min-w-0">
                        <div className="truncate max-w-[150px]">{customer.contact_person}</div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="truncate max-w-[200px]">{customer.company_name}</div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate max-w-[180px]">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate max-w-[150px]">{customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{customer.industry || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>{customer.customer_number}</TableCell>
                      <TableCell>
                        <span className={customer.outstanding_balance && customer.outstanding_balance > 0 ? 'text-amber-600' : ''}>
                          {formatCurrency(customer.outstanding_balance || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <User className="h-4 w-4" />
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