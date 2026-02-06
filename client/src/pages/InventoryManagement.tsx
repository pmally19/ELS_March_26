import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ArrowRightLeft, 
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'wouter';

interface StockMovement {
  id: number;
  document_number: string;
  posting_date: string;
  material_code: string;
  plant_code: string;
  storage_location: string;
  movement_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_value: number;
  reference_document: string;
  notes: string;
  material_name?: string;
  plant_name?: string;
  movement_description?: string;
}

interface StockBalance {
  id: number;
  material_code: string;
  plant_code: string;
  storage_location: string;
  quantity: number;
  unit: string;
  reserved_quantity: number;
  available_quantity: number;
  moving_average_price: number;
  total_value: number;
  currency_code: string;
  last_movement_date: string;
}

interface PhysicalInventory {
  id: number;
  inventory_document: string;
  material_code: string;
  plant_code: string;
  storage_location: string;
  book_quantity: number;
  counted_quantity: number;
  difference_quantity: number;
  unit: string;
  count_date: string;
  status: string;
  variance_reason: string;
}

interface MovementFormData {
  material_code: string;
  plant_code: string;
  storage_location: string;
  movement_type: string;
  quantity: number;
  unit: string;
  posting_date: string;
  reference_document: string;
  notes: string;
}

interface TransferFormData {
  material_code: string;
  from_plant: string;
  from_storage_location: string;
  to_plant: string;
  to_storage_location: string;
  quantity: number;
  posting_date: string;
  notes: string;
}

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementFormData>({
    material_code: '',
    plant_code: 'P001',
    storage_location: 'WH-FG-01',
    movement_type: '101',
    quantity: 0,
    unit: 'PCS',
    posting_date: new Date().toISOString().split('T')[0],
    reference_document: '',
    notes: ''
  });
  const [transferForm, setTransferForm] = useState<TransferFormData>({
    material_code: '',
    from_plant: 'P001',
    from_storage_location: 'WH-FG-01',
    to_plant: 'P002',
    to_storage_location: 'WH-FG-02',
    quantity: 0,
    posting_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stock movements
  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['/api/stock-movements'],
    staleTime: 30000
  });

  // Fetch stock balances
  const { data: stockBalances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ['/api/inventory/balances'],
    staleTime: 30000
  });

  // Fetch materials for dropdowns
  const { data: materials = [] } = useQuery({
    queryKey: ['/api/master-data/material'],
    staleTime: 300000
  });

  // Create stock movement mutation
  const createMovementMutation = useMutation({
    mutationFn: (data: MovementFormData) => apiRequest('/api/stock-movements', {
      method: 'POST',
      body: data
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stock movement created successfully"
      });
      setIsMovementDialogOpen(false);
      setMovementForm({
        material_code: '',
        plant_code: 'P001',
        storage_location: 'WH-FG-01',
        movement_type: '101',
        quantity: 0,
        unit: 'PCS',
        posting_date: new Date().toISOString().split('T')[0],
        reference_document: '',
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/balances'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create stock movement",
        variant: "destructive"
      });
    }
  });

  // Create stock transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: (data: TransferFormData) => apiRequest('/api/stock-movements/transfer', {
      method: 'POST',
      body: data
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stock transfer completed successfully"
      });
      setIsTransferDialogOpen(false);
      setTransferForm({
        material_code: '',
        from_plant: 'P001',
        from_storage_location: 'WH-FG-01',
        to_plant: 'P002',
        to_storage_location: 'WH-FG-02',
        quantity: 0,
        posting_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/balances'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process stock transfer",
        variant: "destructive"
      });
    }
  });

  // Calculate inventory metrics
  const inventoryMetrics = React.useMemo(() => {
    const totalValue = stockBalances.reduce((sum: number, balance: StockBalance) => 
      sum + (balance.total_value || 0), 0
    );
    const totalItems = stockBalances.length;
    const lowStockItems = stockBalances.filter((balance: StockBalance) => 
      balance.available_quantity < 10
    ).length;
    const recentMovements = stockMovements.filter((movement: StockMovement) => {
      const movementDate = new Date(movement.posting_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return movementDate >= weekAgo;
    }).length;

    return {
      totalValue,
      totalItems,
      lowStockItems,
      recentMovements
    };
  }, [stockBalances, stockMovements]);

  const getMovementTypeColor = (movementType: string) => {
    const receipts = ['101', '561', '701'];
    const issues = ['601', '261', '551', '702'];
    
    if (receipts.includes(movementType)) return 'bg-green-100 text-green-800';
    if (issues.includes(movementType)) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'COUNTED': return 'bg-blue-100 text-blue-800';
      case 'POSTED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Complete inventory control with real-time stock tracking
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Stock Movement</DialogTitle>
                <DialogDescription>
                  Record goods receipt, issue, or adjustment
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select 
                    value={movementForm.material_code} 
                    onValueChange={(value) => setMovementForm(prev => ({ ...prev, material_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material: any) => (
                        <SelectItem key={material.code} value={material.code}>
                          {material.code} - {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="movement_type">Movement Type</Label>
                  <Select 
                    value={movementForm.movement_type} 
                    onValueChange={(value) => setMovementForm(prev => ({ ...prev, movement_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">101 - Goods Receipt</SelectItem>
                      <SelectItem value="601">601 - Goods Issue for Sales</SelectItem>
                      <SelectItem value="261">261 - Production Consumption</SelectItem>
                      <SelectItem value="701">701 - Physical Inventory (+)</SelectItem>
                      <SelectItem value="702">702 - Physical Inventory (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    type="number"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    value={movementForm.unit}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="plant">Plant</Label>
                  <Select 
                    value={movementForm.plant_code} 
                    onValueChange={(value) => setMovementForm(prev => ({ ...prev, plant_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P001">P001 - Main Plant</SelectItem>
                      <SelectItem value="P002">P002 - Secondary Plant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="storage">Storage Location</Label>
                  <Select 
                    value={movementForm.storage_location} 
                    onValueChange={(value) => setMovementForm(prev => ({ ...prev, storage_location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WH-FG-01">WH-FG-01 - Finished Goods</SelectItem>
                      <SelectItem value="WH-RM-01">WH-RM-01 - Raw Materials</SelectItem>
                      <SelectItem value="WH-FG-02">WH-FG-02 - Finished Goods P2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="posting_date">Posting Date</Label>
                  <Input
                    type="date"
                    value={movementForm.posting_date}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, posting_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="reference">Reference Document</Label>
                  <Input
                    value={movementForm.reference_document}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, reference_document: e.target.value }))}
                    placeholder="PO-2025-001"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createMovementMutation.mutate(movementForm)}
                  disabled={createMovementMutation.isPending}
                >
                  {createMovementMutation.isPending ? 'Creating...' : 'Create Movement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Stock Transfer</DialogTitle>
                <DialogDescription>
                  Transfer inventory between plants and locations
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transfer_material">Material</Label>
                  <Select 
                    value={transferForm.material_code} 
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, material_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material: any) => (
                        <SelectItem key={material.code} value={material.code}>
                          {material.code} - {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transfer_quantity">Quantity</Label>
                  <Input
                    type="number"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="from_plant">From Plant</Label>
                  <Select 
                    value={transferForm.from_plant} 
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, from_plant: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P001">P001 - Main Plant</SelectItem>
                      <SelectItem value="P002">P002 - Secondary Plant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to_plant">To Plant</Label>
                  <Select 
                    value={transferForm.to_plant} 
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, to_plant: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P001">P001 - Main Plant</SelectItem>
                      <SelectItem value="P002">P002 - Secondary Plant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="from_storage">From Storage</Label>
                  <Select 
                    value={transferForm.from_storage_location} 
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, from_storage_location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WH-FG-01">WH-FG-01 - Finished Goods</SelectItem>
                      <SelectItem value="WH-RM-01">WH-RM-01 - Raw Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to_storage">To Storage</Label>
                  <Select 
                    value={transferForm.to_storage_location} 
                    onValueChange={(value) => setTransferForm(prev => ({ ...prev, to_storage_location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WH-FG-02">WH-FG-02 - Finished Goods P2</SelectItem>
                      <SelectItem value="WH-RM-02">WH-RM-02 - Raw Materials P2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transfer_date">Transfer Date</Label>
                  <Input
                    type="date"
                    value={transferForm.posting_date}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, posting_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer_notes">Notes</Label>
                  <Input
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Transfer reason"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createTransferMutation.mutate(transferForm)}
                  disabled={createTransferMutation.isPending}
                >
                  {createTransferMutation.isPending ? 'Processing...' : 'Execute Transfer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${inventoryMetrics.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current valuation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryMetrics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Active materials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryMetrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Movements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryMetrics.recentMovements}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="balances">Stock Balances</TabsTrigger>
          <TabsTrigger value="valuation">Price Valuation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Movements</CardTitle>
                <CardDescription>Latest inventory transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockMovements.slice(0, 5).map((movement: StockMovement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getMovementTypeColor(movement.movement_type).includes('green') ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium">{movement.material_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {movement.movement_type} - {movement.quantity} {movement.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${movement.total_value?.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{movement.posting_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockBalances
                    .filter((balance: StockBalance) => balance.available_quantity < 10)
                    .slice(0, 5)
                    .map((balance: StockBalance) => (
                    <div key={balance.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="font-medium">{balance.material_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {balance.plant_code} - {balance.storage_location}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-yellow-600">
                          {balance.available_quantity} {balance.unit}
                        </p>
                        <p className="text-sm text-muted-foreground">Available</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movements</CardTitle>
              <CardDescription>All inventory transactions and document history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((movement: StockMovement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="font-medium">{movement.document_number}</TableCell>
                      <TableCell>{movement.posting_date}</TableCell>
                      <TableCell>{movement.material_code}</TableCell>
                      <TableCell>
                        <Badge className={getMovementTypeColor(movement.movement_type)}>
                          {movement.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.quantity} {movement.unit}</TableCell>
                      <TableCell>${movement.total_value?.toLocaleString()}</TableCell>
                      <TableCell>{movement.reference_document}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Balances</CardTitle>
              <CardDescription>Current inventory levels by location</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Storage Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockBalances.map((balance: StockBalance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">{balance.material_code}</TableCell>
                      <TableCell>{balance.plant_code}</TableCell>
                      <TableCell>{balance.storage_location}</TableCell>
                      <TableCell>{balance.quantity} {balance.unit}</TableCell>
                      <TableCell>
                        <span className={balance.available_quantity < 10 ? 'text-yellow-600 font-medium' : ''}>
                          {balance.available_quantity} {balance.unit}
                        </span>
                      </TableCell>
                      <TableCell>${balance.moving_average_price?.toFixed(2)}</TableCell>
                      <TableCell>${balance.total_value?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Valuation</CardTitle>
              <CardDescription>Price methods and valuation analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Advanced valuation methods (FIFO, LIFO, Moving Average) are being implemented. 
                  Current system uses moving average pricing for inventory valuation.
                </AlertDescription>
              </Alert>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Moving Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Active</div>
                    <p className="text-xs text-muted-foreground">Currently in use</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">FIFO Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">Planned</div>
                    <p className="text-xs text-muted-foreground">Implementation pending</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">LIFO Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">Planned</div>
                    <p className="text-xs text-muted-foreground">Implementation pending</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}