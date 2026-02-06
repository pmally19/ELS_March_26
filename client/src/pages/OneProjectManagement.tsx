import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, Database, Building, Users, Package, ShoppingCart, Factory, BarChart3, Settings, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';

// OneProject Record Type Definitions
interface OneProjectRecord {
  id: string;
  record_id: number;
  record_type: 'master_data' | 'transaction' | 'reference' | 'composite';
  
  // Core organizational fields
  company_code?: string;
  company_name?: string;
  plant_code?: string;
  plant_name?: string;
  
  // Master data fields
  material_number?: string;
  material_description?: string;
  customer_number?: string;
  customer_name?: string;
  vendor_number?: string;
  vendor_name?: string;
  
  // Transaction fields
  sales_order_number?: string;
  purchase_order_number?: string;
  production_order_number?: string;
  stock_movement_document_number?: string;
  
  // Financial fields
  gl_account_number?: string;
  cost_center_code?: string;
  profit_center_code?: string;
  
  // System fields
  created_by?: string;
  created_at?: string;
  last_modified_by?: string;
  last_modified_at?: string;
  version_number?: number;
  data_quality_score?: number;
  
  // Extended metadata
  extended_attributes?: Record<string, any>;
  custom_fields?: Record<string, any>;
}

interface OneProjectSummary {
  total_records: number;
  master_data_count: number;
  transaction_count: number;
  reference_count: number;
  composite_count: number;
  companies_count: number;
  plants_count: number;
  materials_count: number;
  customers_count: number;
  vendors_count: number;
  data_quality_average: number;
  completeness_average: number;
  storage_size_mb: number;
  last_sync_date: string;
}

export default function OneProjectManagement() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();
  
  const [selectedRecord, setSelectedRecord] = useState<OneProjectRecord | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [recordType, setRecordType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  // Query OneProject data from API
  const { data: oneProjectData, isLoading, refetch } = useQuery({
    queryKey: ['/api/one-project', recordType, searchTerm, selectedCompany],
  });

  // Query OneProject summary statistics
  const { data: summaryData } = useQuery({
    queryKey: ['/api/one-project/summary'],
  });

  // Mutation for creating new OneProject records
  const createRecordMutation = useMutation({
    mutationFn: async (recordData: Partial<OneProjectRecord>) => {
      const response = await fetch('/api/one-project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/one-project'] });
      setShowDialog(false);
    }
  });

  // Mutation for syncing all data into OneProject
  const syncDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/one-project/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/one-project'] });
    }
  });

  // Records are now loaded from database only - no hardcoded sample data

  const handleRefresh = (): void => {
    refetch();
  };

  const handleAdd = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to create OneProject records');
      return;
    }
    setSelectedRecord(null);
    setShowDialog(true);
  };

  const handleEdit = (record: OneProjectRecord): void => {
    if (!permissions.canModify) {
      alert('You do not have permission to modify OneProject records');
      return;
    }
    setSelectedRecord(record);
    setShowDialog(true);
  };

  const handleSyncAll = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to sync data');
      return;
    }
    syncDataMutation.mutate();
  };

  const handleSave = (): void => {
    // Record data should come from form inputs, not hardcoded values
    if (!selectedRecord) {
      alert('Please select a record to save');
      return;
    }
    createRecordMutation.mutate(selectedRecord);
  };

  const getRecordTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'master_data': 'bg-blue-100 text-blue-800',
      'transaction': 'bg-green-100 text-green-800',
      'reference': 'bg-yellow-100 text-yellow-800',
      'composite': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={typeColors[type] || 'bg-gray-100 text-gray-800'}>
        {type?.toUpperCase()}
      </Badge>
    );
  };

  const getQualityBadge = (score: number | undefined | null) => {
    const numScore = typeof score === 'number' ? score : 0;
    const qualityColor = numScore >= 95 ? 'bg-green-100 text-green-800' :
                        numScore >= 85 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800';
    
    return (
      <Badge className={qualityColor}>
        {numScore.toFixed(1)}%
      </Badge>
    );
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDecimal = (value: number | string | undefined | null): string => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return typeof num === 'number' && !isNaN(num) ? num.toFixed(1) : '0.0';
  };

  const displayRecords = oneProjectData?.records || [];
  const displaySummary = summaryData || {
    total_records: 0,
    master_data_count: 0,
    transaction_count: 0,
    reference_count: 0,
    composite_count: 0,
    companies_count: 0,
    plants_count: 0,
    materials_count: 0,
    customers_count: 0,
    vendors_count: 0,
    data_quality_average: 0,
    completeness_average: 0,
    storage_size_mb: 0,
    last_sync_date: null
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">OneProject Management</h1>
            <p className="text-muted-foreground">Unified Business Data Platform | 1000+ Column Enterprise Table</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            Columnar Ready
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {formatNumber(displaySummary.total_records)} Records
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                OneProject Data Platform
              </CardTitle>
              <CardDescription>
                Unified business data from Company Code to lowest granular transaction level
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="master_data">Master Data</SelectItem>
                  <SelectItem value="transaction">Transactions</SelectItem>
                  <SelectItem value="reference">References</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="1000">Benjamin Moore US</SelectItem>
                  <SelectItem value="2000">Benjamin Moore CA</SelectItem>
                  <SelectItem value="3000">Benjamin Moore UK</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncAll}
                disabled={!permissions.canCreate || syncDataMutation.isPending}
              >
                <Database className="h-4 w-4 mr-2" />
                {syncDataMutation.isPending ? 'Syncing...' : 'Sync All Data'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleAdd}
                disabled={!permissions.canCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Record
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="structure">Structure</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Records</p>
                        <p className="text-2xl font-bold">{formatNumber(displaySummary.total_records)}</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Master Data</p>
                        <p className="text-2xl font-bold">{formatNumber(displaySummary.master_data_count)}</p>
                      </div>
                      <Building className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Transactions</p>
                        <p className="text-2xl font-bold">{formatNumber(displaySummary.transaction_count)}</p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Companies</p>
                        <p className="text-2xl font-bold">{displaySummary.companies_count}</p>
                      </div>
                      <Factory className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Data Quality</p>
                        <p className="text-2xl font-bold">{formatDecimal(displaySummary.data_quality_average)}%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Storage Size</p>
                        <p className="text-2xl font-bold">{formatDecimal(displaySummary.storage_size_mb)} MB</p>
                      </div>
                      <Settings className="h-8 w-8 text-gray-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Record Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Master Data</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.master_data_count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(displaySummary.master_data_count / displaySummary.total_records) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Transactions</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.transaction_count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(displaySummary.transaction_count / displaySummary.total_records) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">References</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.reference_count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-500 h-2 rounded-full" 
                          style={{ width: `${(displaySummary.reference_count / displaySummary.total_records) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Composite</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.composite_count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(displaySummary.composite_count / displaySummary.total_records) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Quality Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Overall Quality</span>
                          <span className="text-sm font-medium">{formatDecimal(displaySummary.data_quality_average)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${displaySummary.data_quality_average}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Completeness</span>
                          <span className="text-sm font-medium">{formatDecimal(displaySummary.completeness_average)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${displaySummary.completeness_average}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Last Sync: {new Date(displaySummary.last_sync_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Records Tab */}
            <TabsContent value="records" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Plant</TableHead>
                      <TableHead>Primary Entity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.record_id}</TableCell>
                        <TableCell>{getRecordTypeBadge(record.record_type)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.company_code}</div>
                            <div className="text-sm text-muted-foreground">{record.company_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.plant_code}</div>
                            <div className="text-sm text-muted-foreground">{record.plant_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.material_number || record.customer_number || record.vendor_number || record.sales_order_number || record.production_order_number || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.record_type === 'master_data' ? 'Master Data' : 
                               record.record_type === 'transaction' ? 'Transaction' : 
                               record.record_type === 'composite' ? 'Composite' : 'Reference'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {record.material_description || record.customer_name || record.vendor_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.data_quality_score ? getQualityBadge(record.data_quality_score) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.last_modified_at ? new Date(record.last_modified_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(record)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Entity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Materials</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.materials_count)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customers</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.customers_count)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Vendors</span>
                        <span className="text-sm font-medium">{formatNumber(displaySummary.vendors_count)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Plants</span>
                        <span className="text-sm font-medium">{displaySummary.plants_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Columnar Readiness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">1020+</div>
                        <div className="text-sm text-muted-foreground">Total Columns</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">100%</div>
                        <div className="text-sm text-muted-foreground">Migration Ready</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">Zero</div>
                        <div className="text-sm text-muted-foreground">JOIN Operations</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Query Performance</span>
                        <span className="text-sm font-medium text-green-600">Excellent</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Storage Efficiency</span>
                        <span className="text-sm font-medium text-blue-600">Optimized</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Data Compression</span>
                        <span className="text-sm font-medium text-purple-600">High</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Analytical Speed</span>
                        <span className="text-sm font-medium text-orange-600">Fast</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Structure Tab */}
            <TabsContent value="structure" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Column Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Organizational Hierarchy</span>
                          <Badge variant="outline">50 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Chart of Accounts & Financial</span>
                          <Badge variant="outline">100 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Material Master Data</span>
                          <Badge variant="outline">150 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Customer Master Data</span>
                          <Badge variant="outline">100 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Vendor Master Data</span>
                          <Badge variant="outline">100 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Sales Transaction Data</span>
                          <Badge variant="outline">150 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Purchase Transaction Data</span>
                          <Badge variant="outline">150 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Production Transaction Data</span>
                          <Badge variant="outline">150 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Inventory Transaction Data</span>
                          <Badge variant="outline">50 columns</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Metadata & Audit Fields</span>
                          <Badge variant="outline">30+ columns</Badge>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Future Migration Benefits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">Columnar Database Ready</div>
                          <div className="text-sm text-muted-foreground">
                            Single table eliminates complex JOINs for analytical queries
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">File Structure Migration</div>
                          <div className="text-sm text-muted-foreground">
                            Parquet/ORC formats for big data processing
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">Analytics Performance</div>
                          <div className="text-sm text-muted-foreground">
                            Optimized for business intelligence and reporting
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium">Data Warehouse Ready</div>
                          <div className="text-sm text-muted-foreground">
                            Star schema elimination with denormalized structure
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? 'Edit OneProject Record' : 'Create New OneProject Record'}
            </DialogTitle>
            <DialogDescription>
              Configure unified business record with 1000+ column structure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recordType">Record Type</Label>
                <Select defaultValue="master_data">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="master_data">Master Data</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="composite">Composite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="companyCode">Company Code</Label>
                <Select defaultValue="1000">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1000 - Benjamin Moore US</SelectItem>
                    <SelectItem value="2000">2000 - Benjamin Moore CA</SelectItem>
                    <SelectItem value="3000">3000 - Benjamin Moore UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plantCode">Plant Code</Label>
                <Input
                  id="plantCode"
                  placeholder="1000"
                  defaultValue="1000"
                />
              </div>
              <div>
                <Label htmlFor="materialNumber">Material Number</Label>
                <Input
                  id="materialNumber"
                  placeholder="MAT-NEW"
                  defaultValue="MAT-NEW"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="New product description"
                defaultValue="New Product"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="glAccount">GL Account</Label>
                <Input
                  id="glAccount"
                  placeholder="140000"
                  defaultValue="140000"
                />
              </div>
              <div>
                <Label htmlFor="costCenter">Cost Center</Label>
                <Input
                  id="costCenter"
                  placeholder="PROD001"
                  defaultValue="PROD001"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createRecordMutation.isPending}
            >
              {createRecordMutation.isPending ? 'Creating...' : 'Create Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}