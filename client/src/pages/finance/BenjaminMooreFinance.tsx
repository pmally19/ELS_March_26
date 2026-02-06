import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, DollarSign, Users, FileText, Calendar, Filter } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ARItem {
  invoice_number: string;
  customer_code: string;
  original_amount: number;
  outstanding_amount: number;
  due_date: string;
  status: string;
  aging_days: number;
}

interface APItem {
  invoice_number: string;
  vendor_code: string;
  original_amount: number;
  outstanding_amount: number;
  due_date: string;
  status: string;
  aging_days: number;
}

interface GLAccount {
  account_number: string;
  account_name: string;
  account_type: string;
  balance?: number;
}

export default function BenjaminMooreFinance() {
  const [arItems, setArItems] = useState<ARItem[]>([]);
  const [apItems, setApItems] = useState<APItem[]>([]);
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch AR data
      const arResponse = await apiRequest('/api/finance/benjamin-moore/ar');
      const arData = await arResponse.json();
      setArItems(arData || []);

      // Fetch AP data
      const apResponse = await apiRequest('/api/finance/benjamin-moore/ap');
      const apData = await apResponse.json();
      setApItems(apData || []);

      // Fetch GL Accounts
      const glResponse = await apiRequest('/api/finance/benjamin-moore/gl-accounts');
      const glData = await glResponse.json();
      setGlAccounts(glData || []);

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearItem = async (type: 'AR' | 'AP', invoiceNumber: string) => {
    try {
      const response = await apiRequest(`/api/finance/benjamin-moore/clear-item`, {
        method: 'POST',
        body: JSON.stringify({ type, invoiceNumber })
      });

      if (response.ok) {
        fetchFinancialData(); // Refresh data
      }
    } catch (error) {
      console.error('Error clearing item:', error);
    }
  };

  const getAgingColor = (days: number) => {
    if (days === 0) return 'bg-green-100 text-green-800';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800';
    if (days <= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const calculateTotals = (items: (ARItem | APItem)[]) => {
    const total = items.reduce((sum, item) => sum + item.original_amount, 0);
    const outstanding = items.reduce((sum, item) => sum + item.outstanding_amount, 0);
    const openItems = items.filter(item => item.status === 'OPEN').length;
    return { total, outstanding, openItems };
  };

  const filteredARItems = arItems.filter(item => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesSearch = item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.customer_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredAPItems = apItems.filter(item => {
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchesSearch = item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.vendor_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const arTotals = calculateTotals(arItems);
  const apTotals = calculateTotals(apItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading Benjamin Moore financial data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benjamin Moore Paint Company</h1>
          <p className="text-gray-600">Financial Management & Open Items</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50">Company: BMPC</Badge>
          <Badge variant="outline" className="bg-green-50">Active</Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AR Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${arTotals.outstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{arTotals.openItems} open items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AP Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${apTotals.outstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{apTotals.openItems} open items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GL Accounts</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{glAccounts.length}</div>
            <p className="text-xs text-muted-foreground">Chart of Accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(arTotals.outstanding - apTotals.outstanding).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">AR minus AP</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="ar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
          <TabsTrigger value="gl">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Items</SelectItem>
                <SelectItem value="OPEN">Open Only</SelectItem>
                <SelectItem value="CLEARED">Cleared Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search by invoice or customer/vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="ar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable - Open Items</CardTitle>
              <CardDescription>
                Outstanding customer invoices and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Invoice #</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-right p-2">Original Amount</th>
                      <th className="text-right p-2">Outstanding</th>
                      <th className="text-left p-2">Due Date</th>
                      <th className="text-left p-2">Aging</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredARItems.map((item) => (
                      <tr key={item.invoice_number} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.invoice_number}</td>
                        <td className="p-2">{item.customer_code}</td>
                        <td className="p-2 text-right">${item.original_amount.toLocaleString()}</td>
                        <td className="p-2 text-right font-medium">
                          ${item.outstanding_amount.toLocaleString()}
                        </td>
                        <td className="p-2">{new Date(item.due_date).toLocaleDateString()}</td>
                        <td className="p-2">
                          <Badge className={getAgingColor(item.aging_days)}>
                            {item.aging_days === 0 ? 'Current' : `${item.aging_days} days`}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant={item.status === 'OPEN' ? 'destructive' : 'default'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {item.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClearItem('AR', item.invoice_number)}
                            >
                              Clear Item
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Payable - Open Items</CardTitle>
              <CardDescription>
                Outstanding vendor invoices and payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Invoice #</th>
                      <th className="text-left p-2">Vendor</th>
                      <th className="text-right p-2">Original Amount</th>
                      <th className="text-right p-2">Outstanding</th>
                      <th className="text-left p-2">Due Date</th>
                      <th className="text-left p-2">Aging</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAPItems.map((item) => (
                      <tr key={item.invoice_number} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.invoice_number}</td>
                        <td className="p-2">{item.vendor_code}</td>
                        <td className="p-2 text-right">${item.original_amount.toLocaleString()}</td>
                        <td className="p-2 text-right font-medium">
                          ${item.outstanding_amount.toLocaleString()}
                        </td>
                        <td className="p-2">{new Date(item.due_date).toLocaleDateString()}</td>
                        <td className="p-2">
                          <Badge className={getAgingColor(item.aging_days)}>
                            {item.aging_days === 0 ? 'Current' : `${item.aging_days} days`}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant={item.status === 'OPEN' ? 'destructive' : 'default'}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {item.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClearItem('AP', item.invoice_number)}
                            >
                              Clear Item
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benjamin Moore Chart of Accounts</CardTitle>
              <CardDescription>
                General Ledger account structure for paint company operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Account #</th>
                      <th className="text-left p-2">Account Name</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glAccounts.map((account) => (
                      <tr key={account.account_number} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{account.account_number}</td>
                        <td className="p-2">{account.account_name}</td>
                        <td className="p-2">
                          <Badge variant="outline">{account.account_type}</Badge>
                        </td>
                        <td className="p-2 text-right">
                          ${(account.balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>AR Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Current', '1-30 Days', '31-60 Days', '60+ Days'].map((period, index) => {
                    const items = arItems.filter(item => {
                      if (index === 0) return item.aging_days === 0;
                      if (index === 1) return item.aging_days >= 1 && item.aging_days <= 30;
                      if (index === 2) return item.aging_days >= 31 && item.aging_days <= 60;
                      return item.aging_days > 60;
                    });
                    const total = items.reduce((sum, item) => sum + item.outstanding_amount, 0);
                    
                    return (
                      <div key={period} className="flex justify-between items-center">
                        <span>{period}</span>
                        <div className="text-right">
                          <div className="font-medium">${total.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{items.length} items</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AP Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Current', '1-30 Days', '31-60 Days', '60+ Days'].map((period, index) => {
                    const items = apItems.filter(item => {
                      if (index === 0) return item.aging_days === 0;
                      if (index === 1) return item.aging_days >= 1 && item.aging_days <= 30;
                      if (index === 2) return item.aging_days >= 31 && item.aging_days <= 60;
                      return item.aging_days > 60;
                    });
                    const total = items.reduce((sum, item) => sum + item.outstanding_amount, 0);
                    
                    return (
                      <div key={period} className="flex justify-between items-center">
                        <span>{period}</span>
                        <div className="text-right">
                          <div className="font-medium">${total.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{items.length} items</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}