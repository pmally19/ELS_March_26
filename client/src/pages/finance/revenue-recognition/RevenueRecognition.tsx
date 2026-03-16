import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Calendar, CheckCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface RevenueContract {
  id: number;
  contract_number: string;
  customer_name: string;
  total_contract_value: number;
  recognized_revenue: number;
  remaining_revenue: number;
  start_date: string;
  end_date: string;
  recognition_method: string;
  status: string;
  performance_obligations: number;
}

interface RevenueSchedule {
  id: number;
  contract_id: number;
  period: string;
  scheduled_amount: number;
  recognized_amount: number;
  status: 'pending' | 'recognized' | 'adjusted';
  recognition_date: string;
}

export default function RevenueRecognition() {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch revenue contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/revenue/revenue-contracts'],
    queryFn: async () => {
      const response = await fetch('/api/revenue/revenue-contracts');
      if (!response.ok) throw new Error('Failed to fetch contracts');
      return response.json();
    }
  });

  // Fetch revenue schedule
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['/api/revenue/revenue-schedule', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/revenue/revenue-schedule?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');
      return response.json();
    }
  });

  // Recognize revenue mutation
  const recognizeRevenueMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/revenue/recognize-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to recognize revenue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revenue/revenue-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revenue/revenue-schedule'] });
      toast({ title: 'Revenue recognized successfully' });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { color: 'bg-green-100 text-green-800', label: 'Active' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'completed': { color: 'bg-blue-100 text-blue-800', label: 'Completed' },
      'recognized': { color: 'bg-green-100 text-green-800', label: 'Recognized' },
      'adjusted': { color: 'bg-orange-100 text-orange-800', label: 'Adjusted' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleRecognizeRevenue = (contractId: number, amount: number) => {
    recognizeRevenueMutation.mutate({
      contract_id: contractId,
      amount: amount,
      recognition_date: new Date().toISOString(),
      currency: selectedCurrency
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/finance">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Finance
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Revenue Recognition</h1>
          <p className="text-gray-600">Automated revenue recognition and contract management</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="schedule">Recognition Schedule</TabsTrigger>
          <TabsTrigger value="rules">Recognition Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Contract Value</p>
                    <p className="text-2xl font-bold">
                      ${contracts?.reduce((sum: number, c: RevenueContract) => sum + c.total_contract_value, 0).toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Recognized Revenue</p>
                    <p className="text-2xl font-bold">
                      ${contracts?.reduce((sum: number, c: RevenueContract) => sum + c.recognized_revenue, 0).toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Remaining Revenue</p>
                    <p className="text-2xl font-bold">
                      ${contracts?.reduce((sum: number, c: RevenueContract) => sum + c.remaining_revenue, 0).toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Contracts</p>
                    <p className="text-2xl font-bold">
                      {contracts?.filter((c: RevenueContract) => c.status === 'active').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Recognition Summary</CardTitle>
                <CardDescription>Current period revenue recognition status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>This Month Target</span>
                    <span className="font-semibold">$245,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Recognized to Date</span>
                    <span className="font-semibold text-green-600">$198,750</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Remaining</span>
                    <span className="font-semibold text-orange-600">$46,250</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '81%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600">81% completion rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Recognition Events</CardTitle>
                <CardDescription>Revenue scheduled for recognition this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border rounded p-3">
                    <div>
                      <p className="font-medium">Contract #RC-2025-001</p>
                      <p className="text-sm text-gray-600">Software License</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">$25,000</p>
                      <p className="text-sm text-gray-600">July 5, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border rounded p-3">
                    <div>
                      <p className="font-medium">Contract #RC-2025-002</p>
                      <p className="text-sm text-gray-600">Service Agreement</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">$18,500</p>
                      <p className="text-sm text-gray-600">July 7, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border rounded p-3">
                    <div>
                      <p className="font-medium">Contract #RC-2025-003</p>
                      <p className="text-sm text-gray-600">Maintenance Contract</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">$12,200</p>
                      <p className="text-sm text-gray-600">July 8, 2025</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Contracts</CardTitle>
              <CardDescription>Manage customer contracts and revenue recognition</CardDescription>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <div className="text-center py-8">Loading contracts...</div>
              ) : (
                <div className="space-y-4">
                  {contracts?.map((contract: RevenueContract) => (
                    <div key={contract.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{contract.contract_number}</h3>
                          {getStatusBadge(contract.status)}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${contract.total_contract_value.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{contract.recognition_method}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <Label className="text-gray-600">Customer</Label>
                          <p>{contract.customer_name}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Recognized</Label>
                          <p className="text-green-600">${contract.recognized_revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Remaining</Label>
                          <p className="text-orange-600">${contract.remaining_revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600">Performance Obligations</Label>
                          <p>{contract.performance_obligations}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleRecognizeRevenue(contract.id, contract.remaining_revenue)}
                          disabled={contract.remaining_revenue <= 0}
                        >
                          Recognize Revenue
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!contracts?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No revenue contracts found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Label htmlFor="period-select">Recognition Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Recognition Schedule</CardTitle>
              <CardDescription>Scheduled revenue recognition for {selectedPeriod} periods</CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleLoading ? (
                <div className="text-center py-8">Loading schedule...</div>
              ) : (
                <div className="space-y-3">
                  {schedule?.map((item: RevenueSchedule) => (
                    <div key={item.id} className="flex items-center justify-between border rounded p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{item.period}</p>
                          <p className="text-sm text-gray-600">Contract #{item.contract_id}</p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${item.scheduled_amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(item.recognition_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!schedule?.length && (
                    <div className="text-center py-8 text-gray-500">
                      No scheduled revenue recognition found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recognition Methods</CardTitle>
                <CardDescription>Configure revenue recognition methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded p-3">
                    <h4 className="font-medium">Point in Time</h4>
                    <p className="text-sm text-gray-600">Recognize revenue when control transfers to customer</p>
                    <Badge className="bg-green-100 text-green-800 mt-2">Active</Badge>
                  </div>
                  <div className="border rounded p-3">
                    <h4 className="font-medium">Over Time</h4>
                    <p className="text-sm text-gray-600">Recognize revenue as performance obligations are satisfied</p>
                    <Badge className="bg-green-100 text-green-800 mt-2">Active</Badge>
                  </div>
                  <div className="border rounded p-3">
                    <h4 className="font-medium">Milestone-Based</h4>
                    <p className="text-sm text-gray-600">Recognize revenue upon achievement of specific milestones</p>
                    <Badge className="bg-yellow-100 text-yellow-800 mt-2">Configured</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Settings</CardTitle>
                <CardDescription>Revenue recognition compliance configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>ASC 606 Compliance</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>IFRS 15 Compliance</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Contract Modifications</span>
                    <Badge className="bg-blue-100 text-blue-800">Tracked</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Performance Obligations</span>
                    <Badge className="bg-blue-100 text-blue-800">Monitored</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Variable Consideration</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Estimated</Badge>
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