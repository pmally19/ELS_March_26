import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, CreditCard, History, Calendar, Star, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface CustomerOrder {
  id: number;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
  items_count: number;
  estimated_delivery: string;
  tracking_number?: string;
  payment_status: string;
}

interface PaymentMethod {
  id: number;
  type: string;
  last_four: string;
  expiry_date: string;
  is_default: boolean;
}

interface DeliveryOption {
  id: string;
  name: string;
  estimated_days: number;
  cost: number;
  description: string;
}

export default function CustomerPortal() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customer orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/customer-portal/orders'],
    queryFn: async () => {
      const response = await fetch('/api/customer-portal/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  // Fetch payment methods
  const { data: paymentMethods, isLoading: paymentLoading } = useQuery({
    queryKey: ['/api/customer-portal/payment-methods'],
    queryFn: async () => {
      const response = await fetch('/api/customer-portal/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      return response.json();
    }
  });

  // Fetch delivery options
  const { data: deliveryOptions, isLoading: deliveryLoading } = useQuery({
    queryKey: ['/api/customer-portal/delivery-options'],
    queryFn: async () => {
      const response = await fetch('/api/customer-portal/delivery-options');
      if (!response.ok) throw new Error('Failed to fetch delivery options');
      return response.json();
    }
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/customer-portal/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to process payment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-portal/orders'] });
      toast({ title: 'Payment processed successfully' });
      setPaymentProcessing(false);
    }
  });

  // Update delivery mutation
  const updateDeliveryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/customer-portal/update-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update delivery');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-portal/orders'] });
      toast({ title: 'Delivery updated successfully' });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'confirmed': { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      'processing': { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
      'shipped': { color: 'bg-green-100 text-green-800', label: 'Shipped' },
      'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'paid': { color: 'bg-green-100 text-green-800', label: 'Paid' },
      'unpaid': { color: 'bg-red-100 text-red-800', label: 'Unpaid' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleProcessPayment = (orderId: number, amount: number) => {
    setPaymentProcessing(true);
    processPaymentMutation.mutate({
      order_id: orderId,
      amount: amount,
      payment_method_id: paymentMethods?.find((pm: PaymentMethod) => pm.is_default)?.id
    });
  };

  const handleUpdateDelivery = (orderId: number) => {
    updateDeliveryMutation.mutate({
      order_id: orderId,
      delivery_option: selectedDeliveryOption
    });
  };

  const handleReorder = (orderId: number) => {
    toast({ title: 'Reorder initiated', description: 'Items have been added to your cart' });
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
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-gray-600">Self-service order tracking and management</p>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="tracking">Order Tracking</TabsTrigger>
          <TabsTrigger value="payments">Payment & Billing</TabsTrigger>
          <TabsTrigger value="account">Account Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{orders?.length || 0}</p>
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
                      {orders?.filter((o: CustomerOrder) => o.status === 'shipped').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold">
                      ${orders?.reduce((sum: number, o: CustomerOrder) => sum + o.total_amount, 0).toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Loyalty Points</p>
                    <p className="text-2xl font-bold">2,450</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Track and manage your orders</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : (
                <div className="space-y-4">
                  {orders?.map((order: CustomerOrder) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{order.order_number}</h3>
                          {getStatusBadge(order.status)}
                          {getStatusBadge(order.payment_status)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${order.total_amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{order.items_count} items</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <Label className="text-gray-600">Order Date</Label>
                          <p>{new Date(order.order_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Estimated Delivery</Label>
                          <p>{new Date(order.estimated_delivery).toLocaleDateString()}</p>
                        </div>
                        {order.tracking_number && (
                          <div>
                            <Label className="text-gray-600">Tracking Number</Label>
                            <p className="font-mono text-sm">{order.tracking_number}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReorder(order.id)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reorder
                        </Button>
                        {order.payment_status === 'unpaid' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleProcessPayment(order.id, order.total_amount)}
                            disabled={paymentProcessing}
                          >
                            {paymentProcessing ? 'Processing...' : 'Pay Now'}
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Schedule Delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!orders?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No orders found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Order Tracking</CardTitle>
              <CardDescription>Track your shipments in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {orders?.filter((order: CustomerOrder) => order.tracking_number)
                  .map((order: CustomerOrder) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{order.order_number}</h3>
                        <p className="text-sm text-gray-600">Tracking: {order.tracking_number}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        <div>
                          <p className="font-medium">Order Confirmed</p>
                          <p className="text-sm text-gray-600">{new Date(order.order_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        <div>
                          <p className="font-medium">Processing</p>
                          <p className="text-sm text-gray-600">Order is being prepared</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <div>
                          <p className="font-medium">Shipped</p>
                          <p className="text-sm text-gray-600">Package is in transit</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <div>
                          <p className="font-medium text-gray-600">Out for Delivery</p>
                          <p className="text-sm text-gray-600">Expected: {new Date(order.estimated_delivery).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!orders?.some((order: CustomerOrder) => order.tracking_number) && (
                  <div className="text-center py-8 text-gray-500">
                    No trackable orders found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your saved payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="text-center py-4">Loading payment methods...</div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods?.map((method: PaymentMethod) => (
                      <div key={method.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5" />
                            <div>
                              <p className="font-medium">**** **** **** {method.last_four}</p>
                              <p className="text-sm text-gray-600">{method.type} • Expires {method.expiry_date}</p>
                            </div>
                          </div>
                          {method.is_default && (
                            <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">
                      Add New Payment Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery Preferences</CardTitle>
                <CardDescription>Configure your delivery options</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveryLoading ? (
                  <div className="text-center py-4">Loading delivery options...</div>
                ) : (
                  <div className="space-y-3">
                    {deliveryOptions?.map((option: DeliveryOption) => (
                      <div key={option.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{option.name}</p>
                            <p className="text-sm text-gray-600">{option.description}</p>
                            <p className="text-sm text-gray-600">{option.estimated_days} business days</p>
                          </div>
                          <p className="font-semibold">${option.cost}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="font-medium">Order #SO-2025-0006</p>
                    <p className="text-sm text-gray-600">July 2, 2025</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">$299.99</p>
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="font-medium">Order #SO-2025-0005</p>
                    <p className="text-sm text-gray-600">June 28, 2025</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">$156.50</p>
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="font-medium">Order #SO-2025-0004</p>
                    <p className="text-sm text-gray-600">June 25, 2025</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">$89.99</p>
                    <Badge className="bg-green-100 text-green-800">Paid</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="John Smith" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="john.smith@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <Button>Update Profile</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Order confirmations</span>
                    <Badge className="bg-green-100 text-green-800">Email + SMS</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping updates</span>
                    <Badge className="bg-blue-100 text-blue-800">Email</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Promotional offers</span>
                    <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery notifications</span>
                    <Badge className="bg-green-100 text-green-800">SMS</Badge>
                  </div>
                  <Button variant="outline">Configure Notifications</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delivery Scheduling Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Schedule Delivery</CardTitle>
              <CardDescription>Choose your preferred delivery option</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="delivery-option">Delivery Option</Label>
                <Select value={selectedDeliveryOption} onValueChange={setSelectedDeliveryOption}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery option" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryOptions?.map((option: DeliveryOption) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} - ${option.cost} ({option.estimated_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleUpdateDelivery(selectedOrderId)}
                    disabled={!selectedDeliveryOption}
                    className="flex-1"
                  >
                    Confirm
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedOrderId(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}