import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/apiClient';
import { ArrowLeft, Calculator, TrendingUp, TrendingDown, Clock, DollarSign, Activity, Layers, BarChart3 } from 'lucide-react';

export default function InventoryFinanceCostManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showDirectDialog, setShowDirectDialog] = useState(false);
  const [showStepDownDialog, setShowStepDownDialog] = useState(false);
  const [showAgingDialog, setShowAgingDialog] = useState(false);

  // Activity-based allocation form
  const [activityForm, setActivityForm] = useState({
    costCenterId: '',
    activityDriver: '',
    activityQuantity: '',
    materialCode: '',
    productionOrderId: ''
  });

  // Direct allocation form
  const [directForm, setDirectForm] = useState({
    costObjectId: '',
    costObjectType: '',
    directCostAmount: '',
    allocationBasis: 'QUANTITY'
  });

  // Step-down allocation form
  const [stepDownForm, setStepDownForm] = useState({
    serviceCostCenterIds: [] as string[],
    productionCostCenterIds: [] as string[]
  });
  const [selectedServiceCostCenter, setSelectedServiceCostCenter] = useState('');
  const [selectedProductionCostCenter, setSelectedProductionCostCenter] = useState('');

  // Aging analysis form
  const [agingForm, setAgingForm] = useState({
    materialCode: '',
    plantCode: '',
    storageLocation: '',
    agingPeriodDays: '90'
  });

  // Fetch cost centers
  const { data: costCenters } = useQuery({
    queryKey: ['/api/master-data/cost-centers'],
    queryFn: () => apiRequest('/api/master-data/cost-centers', 'GET'),
  });

  // Activity-based allocation mutation
  const activityAllocationMutation = useMutation({
    mutationFn: (data: any) => apiRequest<{ success: boolean; data: { allocatedCost: number } }>('/api/inventory-finance/activity-based-allocation', 'POST', data),
    onSuccess: (response) => {
      const result = response?.data || response as any;
      toast({
        title: 'Success',
        description: `Allocated cost: $${result?.allocatedCost?.toFixed(2) || '0.00'}`,
      });
      setShowActivityDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to calculate activity-based allocation',
        variant: 'destructive',
      });
    },
  });

  // Direct allocation mutation
  const directAllocationMutation = useMutation({
    mutationFn: (data: any) => apiRequest<{ success: boolean; data: { allocatedCost: number } }>('/api/inventory-finance/direct-allocation', 'POST', data),
    onSuccess: (response) => {
      const result = response?.data || response as any;
      toast({
        title: 'Success',
        description: `Allocated cost: $${result?.allocatedCost?.toFixed(2) || '0.00'}`,
      });
      setShowDirectDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to calculate direct allocation',
        variant: 'destructive',
      });
    },
  });

  // Step-down allocation mutation
  const stepDownAllocationMutation = useMutation({
    mutationFn: (data: any) => apiRequest<{ success: boolean; data: { totalAllocated: number } }>('/api/inventory-finance/step-down-allocation', 'POST', data),
    onSuccess: (response) => {
      const result = response?.data || response as any;
      toast({
        title: 'Success',
        description: `Total allocated: $${result?.totalAllocated?.toFixed(2) || '0.00'}`,
      });
      setShowStepDownDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to calculate step-down allocation',
        variant: 'destructive',
      });
    },
  });

  // Aging analysis mutation
  const agingAnalysisMutation = useMutation({
    mutationFn: (data: any) => apiRequest<{ success: boolean; data: { totalAgingCost: number } }>('/api/inventory-finance/inventory-aging-analysis', 'POST', data),
    onSuccess: (response) => {
      const result = response?.data || response as any;
      toast({
        title: 'Analysis Complete',
        description: `Total aging cost: $${result?.totalAgingCost?.toFixed(2) || '0.00'}`,
      });
      setShowAgingDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to calculate inventory aging analysis',
        variant: 'destructive',
      });
    },
  });

  const handleActivitySubmit = () => {
    activityAllocationMutation.mutate({
      costCenterId: parseInt(activityForm.costCenterId),
      activityDriver: activityForm.activityDriver,
      activityQuantity: parseFloat(activityForm.activityQuantity),
      materialCode: activityForm.materialCode || undefined,
      productionOrderId: activityForm.productionOrderId ? parseInt(activityForm.productionOrderId) : undefined,
    });
  };

  const handleDirectSubmit = () => {
    directAllocationMutation.mutate({
      costObjectId: parseInt(directForm.costObjectId),
      costObjectType: directForm.costObjectType,
      directCostAmount: parseFloat(directForm.directCostAmount),
      allocationBasis: directForm.allocationBasis,
    });
  };

  const handleStepDownSubmit = () => {
    if (stepDownForm.serviceCostCenterIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one service cost center',
        variant: 'destructive',
      });
      return;
    }
    stepDownAllocationMutation.mutate({
      serviceCostCenterIds: stepDownForm.serviceCostCenterIds.map(id => parseInt(id)),
      productionCostCenterIds: stepDownForm.productionCostCenterIds.map(id => parseInt(id)),
    });
  };

  const handleAgingSubmit = () => {
    agingAnalysisMutation.mutate({
      materialCode: agingForm.materialCode,
      plantCode: agingForm.plantCode,
      storageLocation: agingForm.storageLocation,
      agingPeriodDays: parseInt(agingForm.agingPeriodDays),
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Inventory Finance & Cost Management</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity-based">Activity-Based Allocation</TabsTrigger>
          <TabsTrigger value="direct">Direct Allocation</TabsTrigger>
          <TabsTrigger value="step-down">Step-Down Allocation</TabsTrigger>
          <TabsTrigger value="aging">Inventory Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity-Based
                </CardTitle>
                <CardDescription>Allocate costs based on activity drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowActivityDialog(true)} className="w-full">
                  Calculate Activity-Based Allocation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Direct Allocation
                </CardTitle>
                <CardDescription>Direct cost allocation to cost objects</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowDirectDialog(true)} className="w-full">
                  Calculate Direct Allocation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Step-Down Allocation
                </CardTitle>
                <CardDescription>Allocate service costs to production</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowStepDownDialog(true)} className="w-full">
                  Calculate Step-Down Allocation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Inventory Aging
                </CardTitle>
                <CardDescription>Analyze aging inventory costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowAgingDialog(true)} className="w-full">
                  Analyze Inventory Aging
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity-based">
          <Card>
            <CardHeader>
              <CardTitle>Activity-Based Cost Allocation</CardTitle>
              <CardDescription>Allocate costs based on activity drivers (machine hours, labor hours, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowActivityDialog(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Activity-Based Allocation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct">
          <Card>
            <CardHeader>
              <CardTitle>Direct Cost Allocation</CardTitle>
              <CardDescription>Allocate costs directly to cost objects</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowDirectDialog(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Direct Allocation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step-down">
          <Card>
            <CardHeader>
              <CardTitle>Step-Down Cost Allocation</CardTitle>
              <CardDescription>Allocate costs from service cost centers to production cost centers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowStepDownDialog(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Step-Down Allocation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Aging Cost Analysis</CardTitle>
              <CardDescription>Calculate carrying costs and obsolescence costs for aging inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAgingDialog(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Analyze Inventory Aging
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity-Based Allocation Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity-Based Cost Allocation</DialogTitle>
            <DialogDescription>Calculate cost allocation based on activity drivers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cost Center</Label>
              <Select value={activityForm.costCenterId} onValueChange={(value) => setActivityForm({...activityForm, costCenterId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cost center" />
                </SelectTrigger>
                <SelectContent>
                  {(costCenters as any[])?.map((cc: any) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.cost_center} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Activity Driver</Label>
              <Select value={activityForm.activityDriver} onValueChange={(value) => setActivityForm({...activityForm, activityDriver: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MACHINE_HOURS">Machine Hours</SelectItem>
                  <SelectItem value="LABOR_HOURS">Labor Hours</SelectItem>
                  <SelectItem value="SETUP_HOURS">Setup Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Activity Quantity</Label>
              <Input
                type="number"
                value={activityForm.activityQuantity}
                onChange={(e) => setActivityForm({...activityForm, activityQuantity: e.target.value})}
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <Label>Material Code (Optional)</Label>
              <Input
                value={activityForm.materialCode}
                onChange={(e) => setActivityForm({...activityForm, materialCode: e.target.value})}
                placeholder="Enter material code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>Cancel</Button>
            <Button onClick={handleActivitySubmit} disabled={activityAllocationMutation.isPending}>
              {activityAllocationMutation.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Allocation Dialog */}
      <Dialog open={showDirectDialog} onOpenChange={setShowDirectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direct Cost Allocation</DialogTitle>
            <DialogDescription>Allocate costs directly to cost objects</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cost Object ID</Label>
              <Input
                type="number"
                value={directForm.costObjectId}
                onChange={(e) => setDirectForm({...directForm, costObjectId: e.target.value})}
                placeholder="Enter cost object ID"
              />
            </div>
            <div>
              <Label>Cost Object Type</Label>
              <Select value={directForm.costObjectType} onValueChange={(value) => setDirectForm({...directForm, costObjectType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTION_ORDER">Production Order</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="PROJECT">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direct Cost Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={directForm.directCostAmount}
                onChange={(e) => setDirectForm({...directForm, directCostAmount: e.target.value})}
                placeholder="Enter cost amount"
              />
            </div>
            <div>
              <Label>Allocation Basis</Label>
              <Select value={directForm.allocationBasis} onValueChange={(value) => setDirectForm({...directForm, allocationBasis: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUANTITY">Quantity</SelectItem>
                  <SelectItem value="VALUE">Value</SelectItem>
                  <SelectItem value="EQUAL">Equal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDirectDialog(false)}>Cancel</Button>
            <Button onClick={handleDirectSubmit} disabled={directAllocationMutation.isPending}>
              {directAllocationMutation.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step-Down Allocation Dialog */}
      <Dialog open={showStepDownDialog} onOpenChange={(open) => {
        setShowStepDownDialog(open);
        if (!open) {
          // Reset form when dialog closes
          setStepDownForm({
            serviceCostCenterIds: [],
            productionCostCenterIds: []
          });
          setSelectedServiceCostCenter('');
          setSelectedProductionCostCenter('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Step-Down Cost Allocation</DialogTitle>
            <DialogDescription>Allocate costs from service cost centers to production cost centers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service Cost Centers *</Label>
              <Select 
                value={selectedServiceCostCenter}
                onValueChange={(value) => {
                  if (value && !stepDownForm.serviceCostCenterIds.includes(value)) {
                    setStepDownForm({
                      ...stepDownForm,
                      serviceCostCenterIds: [...stepDownForm.serviceCostCenterIds, value]
                    });
                  }
                  setSelectedServiceCostCenter(''); // Reset Select after selection
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add service cost center" />
                </SelectTrigger>
                <SelectContent>
                  {(costCenters as any[])?.filter((cc: any) => 
                    !stepDownForm.serviceCostCenterIds.includes(String(cc.id))
                  ).map((cc: any) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.cost_center} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stepDownForm.serviceCostCenterIds.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">Please select at least one service cost center</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {stepDownForm.serviceCostCenterIds.map((id) => {
                  const cc = (costCenters as any[])?.find((c: any) => String(c.id) === id);
                  return (
                    <Badge key={id} variant="secondary" className="px-2 py-1">
                      {cc?.cost_center || id} - {cc?.name || ''}
                      <button
                        className="ml-2 hover:text-destructive"
                        onClick={() => setStepDownForm({
                          ...stepDownForm,
                          serviceCostCenterIds: stepDownForm.serviceCostCenterIds.filter(i => i !== id)
                        })}
                      >×</button>
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Production Cost Centers (Optional)</Label>
              <Select 
                value={selectedProductionCostCenter}
                onValueChange={(value) => {
                  if (value && !stepDownForm.productionCostCenterIds.includes(value)) {
                    setStepDownForm({
                      ...stepDownForm,
                      productionCostCenterIds: [...stepDownForm.productionCostCenterIds, value]
                    });
                  }
                  setSelectedProductionCostCenter(''); // Reset Select after selection
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add production cost center" />
                </SelectTrigger>
                <SelectContent>
                  {(costCenters as any[])?.filter((cc: any) => 
                    !stepDownForm.productionCostCenterIds.includes(String(cc.id))
                  ).map((cc: any) => (
                    <SelectItem key={cc.id} value={String(cc.id)}>{cc.cost_center} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex flex-wrap gap-2">
                {stepDownForm.productionCostCenterIds.map((id) => {
                  const cc = (costCenters as any[])?.find((c: any) => String(c.id) === id);
                  return (
                    <Badge key={id} variant="outline" className="px-2 py-1">
                      {cc?.cost_center || id} - {cc?.name || ''}
                      <button
                        className="ml-2 hover:text-destructive"
                        onClick={() => setStepDownForm({
                          ...stepDownForm,
                          productionCostCenterIds: stepDownForm.productionCostCenterIds.filter(i => i !== id)
                        })}
                      >×</button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStepDownDialog(false)}>Cancel</Button>
            <Button onClick={handleStepDownSubmit} disabled={stepDownAllocationMutation.isPending}>
              {stepDownAllocationMutation.isPending ? 'Calculating...' : 'Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Aging Analysis Dialog */}
      <Dialog open={showAgingDialog} onOpenChange={setShowAgingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory Aging Cost Analysis</DialogTitle>
            <DialogDescription>Calculate carrying costs and obsolescence costs for aging inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Material Code</Label>
              <Input
                value={agingForm.materialCode}
                onChange={(e) => setAgingForm({...agingForm, materialCode: e.target.value})}
                placeholder="Enter material code"
              />
            </div>
            <div>
              <Label>Plant Code</Label>
              <Input
                value={agingForm.plantCode}
                onChange={(e) => setAgingForm({...agingForm, plantCode: e.target.value})}
                placeholder="Enter plant code"
              />
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input
                value={agingForm.storageLocation}
                onChange={(e) => setAgingForm({...agingForm, storageLocation: e.target.value})}
                placeholder="Enter storage location"
              />
            </div>
            <div>
              <Label>Aging Period (Days)</Label>
              <Input
                type="number"
                value={agingForm.agingPeriodDays}
                onChange={(e) => setAgingForm({...agingForm, agingPeriodDays: e.target.value})}
                placeholder="90"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgingDialog(false)}>Cancel</Button>
            <Button onClick={handleAgingSubmit} disabled={agingAnalysisMutation.isPending}>
              {agingAnalysisMutation.isPending ? 'Analyzing...' : 'Analyze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

