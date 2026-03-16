import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, CheckCircle, XCircle, BarChart3, Package, Cog } from 'lucide-react';

interface MRPRequest {
  material_id: number;
  plant_id: number;
  demand_quantity: number;
}

interface MRPResult {
  demand: MRPRequest;
  bom: {
    bom_id: number;
    bom_code: string;
    base_quantity: number;
  };
  material_requirements: Array<{
    component_id: number;
    component_code: string;
    component_name: string;
    required_quantity: number;
    unit: string;
  }>;
  capacity_requirements: Array<{
    operation_number: string;
    description: string;
    work_center_code: string;
    work_center_name: string;
    setup_time: number;
    machine_time: number;
    labor_time: number;
    total_time: number;
  }>;
  total_operations: number;
  total_setup_time: number;
  total_production_time: number;
}

export default function ProductionPlanningDashboard() {
  const [mrpRequest, setMrpRequest] = useState<MRPRequest>({
    material_id: 3,
    plant_id: 1,
    demand_quantity: 10
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch end-to-end test results
  const { data: testResults, isLoading: testLoading, refetch: refetchTest } = useQuery({
    queryKey: ['/api/production-planning/end-to-end-test'],
    enabled: false
  });

  // MRP calculation mutation
  const mrpMutation = useMutation({
    mutationFn: async (request: MRPRequest): Promise<MRPResult> => {
      const response = await fetch('/api/production-planning/mrp-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'MRP calculation failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "MRP Calculation Complete",
        description: "Material requirements and capacity analysis completed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "MRP Calculation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Run end-to-end test
  const runEndToEndTest = async () => {
    try {
      await refetchTest();
      toast({
        title: "End-to-End Test Complete",
        description: "Production planning system validation completed"
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "End-to-end test encountered errors",
        variant: "destructive"
      });
    }
  };

  // Calculate MRP
  const calculateMRP = () => {
    mrpMutation.mutate(mrpRequest);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Planning Dashboard</h1>
          <p className="text-muted-foreground">
            End-to-end production planning with MRP and capacity analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runEndToEndTest} disabled={testLoading}>
            {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" />
            Run System Test
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mrp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mrp">MRP Calculation</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="test">System Test</TabsTrigger>
        </TabsList>

        <TabsContent value="mrp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Material Requirements Planning
              </CardTitle>
              <CardDescription>
                Calculate material and capacity requirements based on customer demand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="material_id">Material ID</Label>
                  <Input
                    id="material_id"
                    type="number"
                    value={mrpRequest.material_id}
                    onChange={(e) => setMrpRequest(prev => ({
                      ...prev,
                      material_id: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="plant_id">Plant ID</Label>
                  <Input
                    id="plant_id"
                    type="number"
                    value={mrpRequest.plant_id}
                    onChange={(e) => setMrpRequest(prev => ({
                      ...prev,
                      plant_id: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="demand_quantity">Demand Quantity</Label>
                  <Input
                    id="demand_quantity"
                    type="number"
                    value={mrpRequest.demand_quantity}
                    onChange={(e) => setMrpRequest(prev => ({
                      ...prev,
                      demand_quantity: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
              <Button onClick={calculateMRP} disabled={mrpMutation.isPending} className="w-full">
                {mrpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Calculate MRP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {mrpMutation.data && (
            <div className="grid gap-4">
              {/* Demand Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Demand Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Material ID</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.demand.material_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Plant ID</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.demand.plant_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Demand Quantity</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.demand.demand_quantity}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* BOM Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Bill of Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">BOM ID</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.bom.bom_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">BOM Code</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.bom.bom_code}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Base Quantity</div>
                      <div className="text-lg font-semibold">{mrpMutation.data.bom.base_quantity}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Material Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mrpMutation.data.material_requirements.map((req, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{req.component_name}</div>
                          <div className="text-sm text-muted-foreground">Code: {req.component_code}</div>
                        </div>
                        <Badge variant="secondary">
                          {req.required_quantity} {req.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Capacity Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cog className="h-5 w-5" />
                    Capacity Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Operations</div>
                        <div className="text-lg font-semibold">{mrpMutation.data.total_operations}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Setup Time (min)</div>
                        <div className="text-lg font-semibold">{mrpMutation.data.total_setup_time}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Production Time (min)</div>
                        <div className="text-lg font-semibold">{mrpMutation.data.total_production_time}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {mrpMutation.data.capacity_requirements.map((cap, index) => (
                        <div key={index} className="p-3 border rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{cap.description}</div>
                              <div className="text-sm text-muted-foreground">
                                Operation {cap.operation_number} - {cap.work_center_name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{cap.total_time} min</div>
                              <div className="text-sm text-muted-foreground">
                                Setup: {cap.setup_time} | Machine: {cap.machine_time} | Labor: {cap.labor_time}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!mrpMutation.data && (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run MRP calculation to see results</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          {testResults && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    System Test Results
                  </CardTitle>
                  <CardDescription>
                    Overall Status: {testResults.overall_status} 
                    ({testResults.completion_percentage}% Complete)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testResults.tests?.map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {test.status === 'PASS' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{test.test}</div>
                            {test.data && typeof test.data === 'object' && !Array.isArray(test.data) && (
                              <div className="text-sm text-muted-foreground">
                                {Object.entries(test.data).map(([key, value]) => (
                                  <span key={key} className="mr-4">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={test.status === 'PASS' ? 'default' : 'destructive'}>
                          {test.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!testResults && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run system test to validate end-to-end functionality</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {mrpMutation.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {mrpMutation.error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}