import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/apiClient';
import { 
  Package, 
  Truck, 
  ClipboardCheck, 
  AlertTriangle, 
  Settings, 
  RefreshCw,
  Plus,
  Eye,
  Download,
  CheckCircle,
  Clock,
  BarChart3,
  FileCheck,
  ShieldCheck,
  Warehouse
} from 'lucide-react';

interface Vendor {
  id: number;
  code?: string;
  name: string;
}

const GoodsReceipt = () => {
  const [selectedMovementType, setSelectedMovementType] = useState('101');
  const [selectedPlant, setSelectedPlant] = useState('1000');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const queryClient = useQueryClient();

  // Fetch vendors from API
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/master-data/vendor'],
    queryFn: () => apiRequest<Vendor[]>('/api/master-data/vendor', 'GET'),
  });

  const { data: goodsReceiptData, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/goods-receipt'],
    queryFn: async () => {
      const response = await fetch('/api/transaction-tiles/goods-receipt');
      return response.json();
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/transaction-tiles/goods-receipt/refresh', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/goods-receipt'] });
    }
  });

  const configureMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/transaction-tiles/goods-receipt/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/goods-receipt'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading goods receipt processing...</p>
        </div>
      </div>
    );
  }

  const receipts = goodsReceiptData?.data || [];
  
  // Goods Receipt specific KPIs
  const totalReceipts = 847;
  const pendingQC = 23;
  const valueReceived = 2450000;
  const onTimeDelivery = 94.7;
  const qualityPass = 98.2;
  const avgProcessingTime = 2.5;

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleConfigure = () => {
    configureMutation.mutate({
      movementType: selectedMovementType,
      plant: selectedPlant,
      vendor: selectedVendor
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goods Receipt Processing</h1>
          <p className="text-muted-foreground">SAP MIGO - Inbound material receipt with quality control and vendor evaluation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Receipts
          </Button>
          <Button onClick={handleConfigure} disabled={configureMutation.isPending}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Process
          </Button>
        </div>
      </div>

      {/* Goods Receipt Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending QC</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQC}</div>
            <p className="text-xs text-muted-foreground">Quality inspection</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Received</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(valueReceived / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Material value</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTimeDelivery}%</div>
            <p className="text-xs text-muted-foreground">Vendor performance</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Pass Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityPass}%</div>
            <p className="text-xs text-muted-foreground">QC approval rate</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProcessingTime}h</div>
            <p className="text-xs text-muted-foreground">Receipt to posting</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receipt-processing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="receipt-processing">Receipt Processing</TabsTrigger>
          <TabsTrigger value="quality-control">Quality Control</TabsTrigger>
          <TabsTrigger value="vendor-evaluation">Vendor Evaluation</TabsTrigger>
          <TabsTrigger value="movement-types">Movement Types</TabsTrigger>
          <TabsTrigger value="stock-posting">Stock Posting</TabsTrigger>
          <TabsTrigger value="receipt-history">Receipt History</TabsTrigger>
        </TabsList>

        <TabsContent value="receipt-processing">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Receipt Configuration
                </CardTitle>
                <CardDescription>Configure goods receipt parameters and movement types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Movement Type</label>
                  <Select value={selectedMovementType} onValueChange={setSelectedMovementType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">101 - GR for Purchase Order</SelectItem>
                      <SelectItem value="103">103 - GR from Blocked Stock</SelectItem>
                      <SelectItem value="105">105 - GR to Blocked Stock</SelectItem>
                      <SelectItem value="123">123 - GR Sample</SelectItem>
                      <SelectItem value="511">511 - GR without PO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plant</label>
                  <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1000 - Main Plant</SelectItem>
                      <SelectItem value="1100">1100 - Distribution Center</SelectItem>
                      <SelectItem value="1200">1200 - Manufacturing Plant</SelectItem>
                      <SelectItem value="1300">1300 - Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor Filter</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.code || `V${vendor.id}`}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Receipt Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Plus className="h-3 w-3 mr-1" />
                      New Receipt
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Post All
                    </Button>
                    <Button variant="outline" size="sm">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      QC Check
                    </Button>
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Block Stock
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Processing Status</CardTitle>
                <CardDescription>Current goods receipt processing pipeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Receipts Processing</span>
                    <span>34 / 45</span>
                  </div>
                  <Progress value={76} className="w-full" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Receipts Posted</span>
                    </div>
                    <Badge variant="default">127 Today</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">In QC Process</span>
                    </div>
                    <Badge variant="secondary">23 Items</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Exceptions</span>
                    </div>
                    <Badge variant="outline">8 Issues</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">In Blocked Stock</span>
                    </div>
                    <Badge variant="destructive">5 Items</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Processing Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality-control">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Management</CardTitle>
              <CardDescription>Manage quality inspections and control procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="p-4 text-center">
                  <ShieldCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">QC Passed</p>
                  <p className="text-xl font-bold">342</p>
                </Card>
                <Card className="p-4 text-center">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Pending QC</p>
                  <p className="text-xl font-bold">23</p>
                </Card>
                <Card className="p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">QC Failed</p>
                  <p className="text-xl font-bold">7</p>
                </Card>
                <Card className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                  <p className="text-xl font-bold">98.1%</p>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Document</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>QC Status</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Test Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>MD-{(i + 50001).toString().padStart(8, '0')}</TableCell>
                      <TableCell>
                        {['Steel Sheets', 'Engine Block', 'Paint Material', 'Electronics'][i % 4]}
                      </TableCell>
                      <TableCell>B2025{(i + 100).toString().padStart(3, '0')}</TableCell>
                      <TableCell>{(500 + i * 50)} {['KG', 'PC', 'LT', 'PC'][i % 4]}</TableCell>
                      <TableCell>
                        <Badge variant={i % 4 === 0 ? 'default' : i % 4 === 1 ? 'secondary' : i % 4 === 2 ? 'destructive' : 'outline'}>
                          {['Passed', 'Pending', 'Failed', 'In Progress'][i % 4]}
                        </Badge>
                      </TableCell>
                      <TableCell>QC.{(i % 3 + 1).toString().padStart(3, '0')}</TableCell>
                      <TableCell>2025-07-{(7 - (i % 7)).toString().padStart(2, '0')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileCheck className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-evaluation">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Evaluation</CardTitle>
              <CardDescription>Evaluate vendor performance based on delivery and quality metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Total Deliveries</TableHead>
                    <TableHead>On-Time Delivery</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Avg Lead Time</TableHead>
                    <TableHead>Value Delivered</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length > 0 ? (
                    vendors.map((vendor) => {
                      // TODO: Replace with actual vendor performance API call
                      // For now, showing placeholder data
                      const performanceData = {
                        deliveries: 0,
                        onTime: 0,
                        quality: 0,
                        leadTime: 0,
                        value: 0,
                        rating: 'N/A'
                      };
                      return (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>{performanceData.deliveries}</TableCell>
                          <TableCell>{performanceData.onTime}%</TableCell>
                          <TableCell>
                            <Badge variant={performanceData.quality >= 98 ? 'default' : performanceData.quality >= 95 ? 'secondary' : 'outline'}>
                              {performanceData.quality}%
                            </Badge>
                          </TableCell>
                          <TableCell>{performanceData.leadTime} days</TableCell>
                          <TableCell>${performanceData.value.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={performanceData.rating.includes('A') ? 'default' : 'secondary'}>
                              {performanceData.rating}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <BarChart3 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No vendor performance data available. Vendor performance metrics should be fetched from API.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movement-types">
          <Card>
            <CardHeader>
              <CardTitle>Movement Type Configuration</CardTitle>
              <CardDescription>Configure and manage different types of goods receipt movements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    code: '101',
                    name: 'GR for Purchase Order',
                    description: 'Standard goods receipt against purchase order',
                    usage: 2847,
                    stockType: 'Unrestricted',
                    status: 'Active'
                  },
                  {
                    code: '103',
                    name: 'GR from Blocked Stock',
                    description: 'Transfer from blocked to unrestricted stock',
                    usage: 156,
                    stockType: 'Unrestricted',
                    status: 'Active'
                  },
                  {
                    code: '105',
                    name: 'GR to Blocked Stock',
                    description: 'Receipt directly into blocked stock for inspection',
                    usage: 89,
                    stockType: 'Blocked',
                    status: 'Active'
                  },
                  {
                    code: '123',
                    name: 'GR Sample',
                    description: 'Sample material receipt for testing',
                    usage: 34,
                    stockType: 'Sample',
                    status: 'Active'
                  },
                  {
                    code: '511',
                    name: 'GR without PO',
                    description: 'Receipt without reference to purchase order',
                    usage: 23,
                    stockType: 'Unrestricted',
                    status: 'Active'
                  },
                  {
                    code: '521',
                    name: 'GR by-product',
                    description: 'Receipt of by-products from production',
                    usage: 67,
                    stockType: 'Unrestricted',
                    status: 'Active'
                  }
                ].map((movement) => (
                  <Card key={movement.code} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{movement.code} - {movement.name}</h4>
                      <Badge variant="default">{movement.status}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">{movement.description}</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage:</span>
                        <span>{movement.usage} receipts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock Type:</span>
                        <Badge variant="outline">{movement.stockType}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-posting">
          <Card>
            <CardHeader>
              <CardTitle>Stock Posting & Valuation</CardTitle>
              <CardDescription>Monitor stock posting and inventory valuation updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="p-4 text-center">
                  <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Stock Posted</p>
                  <p className="text-xl font-bold">$2.45M</p>
                </Card>
                <Card className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Avg Unit Cost</p>
                  <p className="text-xl font-bold">$47.82</p>
                </Card>
                <Card className="p-4 text-center">
                  <Warehouse className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Storage Locations</p>
                  <p className="text-xl font-bold">24</p>
                </Card>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Recent Stock Postings</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posting Date</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Movement Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Storage Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }, (_, i) => (
                      <TableRow key={i}>
                        <TableCell>2025-07-{(7 - i).toString().padStart(2, '0')}</TableCell>
                        <TableCell>
                          {['Steel Sheets', 'Engine Block', 'Paint Material', 'Electronics', 'Raw Materials', 'Components'][i]}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {['101', '105', '123', '101', '511', '103'][i]}
                          </Badge>
                        </TableCell>
                        <TableCell>{(500 + i * 150)} {['KG', 'PC', 'LT', 'PC', 'KG', 'PC'][i]}</TableCell>
                        <TableCell>${(25.50 + i * 5.75).toFixed(2)}</TableCell>
                        <TableCell>${((500 + i * 150) * (25.50 + i * 5.75)).toLocaleString()}</TableCell>
                        <TableCell>
                          {['MAIN-01', 'PROD-02', 'QC-LAB', 'ELEC-01', 'RAW-01', 'COMP-01'][i]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt-history">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipt History</CardTitle>
              <CardDescription>Complete audit trail of all goods receipt transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search by material document..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export History
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Number</TableHead>
                    <TableHead>Posting Date</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goodsReceiptData && Array.isArray(goodsReceiptData) && goodsReceiptData.length > 0 ? (
                    goodsReceiptData.slice(0, 10).map((receipt: any, i: number) => (
                      <TableRow key={receipt.id || i}>
                        <TableCell>{receipt.materialDocument || `MD-${(i + 50001).toString().padStart(8, '0')}`}</TableCell>
                        <TableCell>{receipt.postingDate || new Date().toISOString().split('T')[0]}</TableCell>
                        <TableCell>{receipt.purchaseOrder || `PO-${(i + 4501000).toString().padStart(8, '0')}`}</TableCell>
                        <TableCell>{receipt.vendorName || 'N/A'}</TableCell>
                        <TableCell>{receipt.materialDescription || 'N/A'}</TableCell>
                        <TableCell>{receipt.quantity || 0} {receipt.unit || 'PC'}</TableCell>
                        <TableCell>${(receipt.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={receipt.grStatus === 'Posted' ? 'default' : receipt.grStatus === 'Pending' ? 'secondary' : 'outline'}>
                            {receipt.grStatus || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {isLoading ? 'Loading goods receipts...' : 'No goods receipts found. Data should be fetched from API.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GoodsReceipt;