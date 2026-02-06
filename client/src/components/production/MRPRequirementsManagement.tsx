import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, ArrowRight, Package, Factory, ShoppingCart, FileCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface RequirementType {
  requirement_type: string;
  description: string;
  requirement_class: string;
  procurement_type: string;
  stock_check_required: boolean;
  auto_create_orders: boolean;
}

interface StockLevel {
  material_code: string;
  description: string;
  current_stock: number;
  safety_stock: number;
  minimum_level: number;
  stock_status: 'CRITICAL' | 'LOW' | 'NORMAL';
  plant_id: number;
}

interface MRPDashboard {
  openRequirements: number;
  stockShortfalls: number;
  plannedOrdersNeeded: number;
  purchaseRequisitionsNeeded: number;
  lastMRPRun: string | null;
  requirementTypes: RequirementType[];
  criticalMaterials: StockLevel[];
}

interface MRPProcessResult {
  requirementsProcessed: number;
  plannedOrdersCreated: number;
  purchaseRequisitionsCreated: number;
  stockShortfalls: any[];
}

export default function MRPRequirementsManagement() {
  const [selectedPlant, setSelectedPlant] = useState<string>('all');
  const [processingMRP, setProcessingMRP] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch MRP Dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<{ data: MRPDashboard }>({
    queryKey: ['/api/mrp-requirements/dashboard', selectedPlant],
    enabled: true
  });

  // Fetch Requirement Types (LSB, VSB, PLO, PRD as shown in diagram)
  const { data: requirementTypes } = useQuery<{ data: RequirementType[] }>({
    queryKey: ['/api/mrp-requirements/requirement-types']
  });

  // Fetch Stock Levels
  const { data: stockLevels } = useQuery<{ data: StockLevel[] }>({
    queryKey: ['/api/mrp-requirements/stock-levels', selectedPlant]
  });

  // Process MRP Requirements mutation
  const processMRPMutation = useMutation({
    mutationFn: async (plantId?: string) => {
      const response = await fetch('/api/mrp-requirements/process-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: plantId ? parseInt(plantId) : undefined })
      });
      if (!response.ok) throw new Error('Failed to process MRP requirements');
      return response.json();
    },
    onSuccess: (data: { data: MRPProcessResult }) => {
      toast({
        title: "MRP Processing Complete",
        description: `Processed ${data.data.requirementsProcessed} requirements, created ${data.data.plannedOrdersCreated} planned orders and ${data.data.purchaseRequisitionsCreated} purchase requisitions.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mrp-requirements/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "MRP Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleProcessMRP = async () => {
    setProcessingMRP(true);
    try {
      await processMRPMutation.mutateAsync(selectedPlant);
    } finally {
      setProcessingMRP(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'LOW': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'NORMAL': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'destructive';
      case 'LOW': return 'default';
      case 'NORMAL': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* MRP Requirements Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Material Requirements Planning (MRP II)</h2>
          <p className="text-gray-600">Complete MRP processing with stock availability and procurement automation</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Plants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plants</SelectItem>
              <SelectItem value="1">Plant 1001</SelectItem>
              <SelectItem value="2">Plant 1002</SelectItem>
              <SelectItem value="3">Plant 1003</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleProcessMRP}
            disabled={processingMRP}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processingMRP ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing MRP...
              </>
            ) : (
              <>
                <Factory className="h-4 w-4 mr-2" />
                Run MRP
              </>
            )}
          </Button>
        </div>
      </div>

      {/* MRP Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Requirements</CardDescription>
            <CardTitle className="text-2xl">{dashboard?.data?.openRequirements || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sales order requirements to process
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Shortfalls</CardDescription>
            <CardTitle className="text-2xl">{dashboard?.data?.stockShortfalls || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Materials below safety stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planned Orders</CardDescription>
            <CardTitle className="text-2xl">{dashboard?.data?.plannedOrdersNeeded || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Production orders to create
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchase Requisitions</CardDescription>
            <CardTitle className="text-2xl">{dashboard?.data?.purchaseRequisitionsNeeded || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              External procurement needed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MRP Process Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            MRP Process Flow (From Your Diagram)
          </CardTitle>
          <CardDescription>
            Automated Material Requirements Planning following the complete business flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg border">
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-semibold text-sm">Sales Order</h4>
              <p className="text-xs text-gray-600 text-center">Material XYZ Qty 100 to be delivered on 1.3.2019</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border">
              <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-semibold text-sm">Stock Check</h4>
              <p className="text-xs text-gray-600 text-center">MRP checks FG stock availability</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg border">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mb-2" />
              <h4 className="font-semibold text-sm">RM Check</h4>
              <p className="text-xs text-gray-600 text-center">Check raw material stock if needed</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border">
              <Factory className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-semibold text-sm">Planned Order</h4>
              <p className="text-xs text-gray-600 text-center">Create production order if in-house</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg border">
              <ShoppingCart className="h-8 w-8 text-red-600 mb-2" />
              <h4 className="font-semibold text-sm">Purchase Req</h4>
              <p className="text-xs text-gray-600 text-center">PR to Procurement team for external items</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="requirement-types" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requirement-types">Requirement Types</TabsTrigger>
          <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
          <TabsTrigger value="process-log">Process Log</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="requirement-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requirement Types (From Your Diagram)</CardTitle>
              <CardDescription>
                LSB, VSB, PLO, PRD - Different requirement classes for MRP processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Procurement</TableHead>
                    <TableHead>Stock Check</TableHead>
                    <TableHead>Auto Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirementTypes?.data?.map((type) => (
                    <TableRow key={type.requirement_type}>
                      <TableCell>
                        <Badge variant="outline">{type.requirement_type}</Badge>
                      </TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell>{type.requirement_class}</TableCell>
                      <TableCell>
                        <Badge variant={type.procurement_type === 'PRODUCTION' ? 'default' : 'secondary'}>
                          {type.procurement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.stock_check_required ? 'default' : 'outline'}>
                          {type.stock_check_required ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.auto_create_orders ? 'default' : 'outline'}>
                          {type.auto_create_orders ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Stock Levels</CardTitle>
              <CardDescription>
                Real-time inventory availability for MRP calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Safety Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLevels?.data?.map((stock) => (
                    <TableRow key={`${stock.material_code}-${stock.plant_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(stock.stock_status)}
                          <span className="font-mono">{stock.material_code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{stock.description}</TableCell>
                      <TableCell>{stock.current_stock}</TableCell>
                      <TableCell>{stock.safety_stock}</TableCell>
                      <TableCell>{stock.minimum_level}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(stock.stock_status)}>
                          {stock.stock_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MRP Processing History</CardTitle>
              <CardDescription>
                Log of MRP runs and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No MRP processing history available</p>
                <p className="text-sm">Run MRP to see processing results here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MRP Configuration</CardTitle>
              <CardDescription>
                Configure MRP parameters and processing rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planning-horizon">Planning Horizon (Days)</Label>
                  <Input id="planning-horizon" type="number" placeholder="90" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="safety-lead-time">Safety Lead Time (Days)</Label>
                  <Input id="safety-lead-time" type="number" placeholder="7" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lot-size-key">Lot Size Key</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lot sizing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EX">Exact lot size</SelectItem>
                      <SelectItem value="LT">Lot-for-lot</SelectItem>
                      <SelectItem value="FX">Fixed lot size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rounding-value">Rounding Value</Label>
                  <Input id="rounding-value" type="number" placeholder="1" />
                </div>
              </div>

              <Button className="w-full">
                <FileCheck className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}