import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, MapPin, Clock, DollarSign, Route, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface Shipment {
  id: number;
  order_number: string;
  carrier: string;
  tracking_number: string;
  status: string;
  origin: string;
  destination: string;
  estimated_delivery: string;
  shipping_cost: number;
  weight: number;
  dimensions: string;
  created_at: string;
}

interface RouteOptimization {
  id: number;
  route_name: string;
  total_distance: number;
  estimated_time: number;
  fuel_cost: number;
  stops: number;
  status: 'planned' | 'active' | 'completed';
  created_at: string;
}

export default function ShippingLogistics() {
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [routeOptimizing, setRouteOptimizing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shipments
  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['/api/logistics/shipments'],
    queryFn: async () => {
      const response = await fetch('/api/logistics/shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      return response.json();
    }
  });

  // Fetch route optimizations
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ['/api/logistics/routes'],
    queryFn: async () => {
      const response = await fetch('/api/logistics/routes');
      if (!response.ok) throw new Error('Failed to fetch routes');
      return response.json();
    }
  });

  // Optimize route mutation
  const optimizeRouteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/logistics/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to optimize route');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logistics/routes'] });
      toast({ title: 'Route optimized successfully' });
      setRouteOptimizing(false);
    }
  });

  const handleOptimizeRoute = () => {
    setRouteOptimizing(true);
    optimizeRouteMutation.mutate({
      carrier: selectedCarrier,
      optimization_type: 'distance',
      include_traffic: true
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'in_transit': { color: 'bg-blue-100 text-blue-800', label: 'In Transit' },
      'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      'delayed': { color: 'bg-red-100 text-red-800', label: 'Delayed' },
      'planned': { color: 'bg-gray-100 text-gray-800', label: 'Planned' },
      'active': { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/sales/order-to-cash">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order-to-Cash
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Shipping & Logistics</h1>
          <p className="text-gray-600">Advanced shipping management and route optimization</p>
        </div>
      </div>

      <Tabs defaultValue="shipments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shipments">Active Shipments</TabsTrigger>
          <TabsTrigger value="carriers">Carrier Integration</TabsTrigger>
          <TabsTrigger value="routing">Route Optimization</TabsTrigger>
          <TabsTrigger value="analytics">Logistics Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Shipments</p>
                    <p className="text-2xl font-bold">{shipments?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">In Transit</p>
                    <p className="text-2xl font-bold">
                      {shipments?.filter((s: Shipment) => s.status === 'in_transit').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">
                      {shipments?.filter((s: Shipment) => s.status === 'pending').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold">
                      ${shipments?.reduce((sum: number, s: Shipment) => sum + s.shipping_cost, 0).toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
              <CardDescription>Real-time tracking of all active shipments</CardDescription>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="text-center py-8">Loading shipments...</div>
              ) : (
                <div className="space-y-4">
                  {shipments?.map((shipment: Shipment) => (
                    <div key={shipment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{shipment.order_number}</h3>
                          {getStatusBadge(shipment.status)}
                        </div>
                        <Badge variant="outline">{shipment.carrier}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-600">Tracking Number</Label>
                          <p className="font-mono">{shipment.tracking_number}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Origin → Destination</Label>
                          <p>{shipment.origin} → {shipment.destination}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Estimated Delivery</Label>
                          <p>{new Date(shipment.estimated_delivery).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Cost</Label>
                          <p>${shipment.shipping_cost ? shipment.shipping_cost.toFixed(2) : '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!shipments?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No active shipments found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-700 rounded flex items-center justify-center text-white font-bold">UPS</div>
                  UPS Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Rate Limit:</span>
                    <span>1000/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Shipments:</span>
                    <span>{shipments?.filter((s: Shipment) => s.carrier === 'UPS').length || 0}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Configure UPS Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold">FX</div>
                  FedEx Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Rate Limit:</span>
                    <span>800/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Shipments:</span>
                    <span>{shipments?.filter((s: Shipment) => s.carrier === 'FedEx').length || 0}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Configure FedEx Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-600 rounded flex items-center justify-center text-white font-bold">DH</div>
                  DHL Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Rate Limit:</span>
                    <span>500/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Shipments:</span>
                    <span>{shipments?.filter((s: Shipment) => s.carrier === 'DHL').length || 0}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Configure DHL Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Route Optimization
              </CardTitle>
              <CardDescription>AI-powered route planning and optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="carrier-select">Select Carrier</Label>
                    <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose carrier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleOptimizeRoute} 
                    disabled={!selectedCarrier || routeOptimizing}
                    className="w-full"
                  >
                    {routeOptimizing ? 'Optimizing...' : 'Optimize Route'}
                  </Button>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Active Routes</h3>
                  {routesLoading ? (
                    <div>Loading routes...</div>
                  ) : (
                    <div className="space-y-2">
                      {routes?.map((route: RouteOptimization) => (
                        <div key={route.id} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{route.route_name}</span>
                            {getStatusBadge(route.status)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Distance: {route.total_distance} miles</p>
                            <p>Stops: {route.stops} | Cost: ${route.fuel_cost}</p>
                          </div>
                        </div>
                      ))}
                      {!routes?.length && (
                        <p className="text-gray-500">No active routes</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>On-Time Delivery Rate</span>
                    <Badge className="bg-green-100 text-green-800">94.2%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Transit Time</span>
                    <span>2.8 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cost per Shipment</span>
                    <span>$12.45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Customer Satisfaction</span>
                    <Badge className="bg-blue-100 text-blue-800">4.7/5</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>UPS</span>
                    <span>45% ($2,150)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>FedEx</span>
                    <span>35% ($1,680)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>DHL</span>
                    <span>20% ($960)</span>
                  </div>
                  <div className="border-t pt-2 mt-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Monthly</span>
                      <span>$4,790</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}