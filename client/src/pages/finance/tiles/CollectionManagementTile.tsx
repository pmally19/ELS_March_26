import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Phone, Mail, FileText, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CollectionManagementTileProps {
  onBack: () => void;
}

export default function CollectionManagementTile({ onBack }: CollectionManagementTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [activityType, setActivityType] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [showActivityForm, setShowActivityForm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch overdue customers
  const { data: overdueCustomers, isLoading } = useQuery({
    queryKey: ['/api/ar/overdue-customers'],
  });

  // Fetch collection activities
  const { data: collectionActivities } = useQuery({
    queryKey: ['/api/ar/collection-activities'],
  });

  // Fetch dunning configurations
  const { data: dunningConfigs } = useQuery({
    queryKey: ['/api/ar/dunning-configurations'],
  });

  // Add collection activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      return await apiRequest('/api/ar/collection-activities', {
        method: 'POST',
        body: JSON.stringify(activityData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Collection Activity Added",
        description: "Collection activity has been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/collection-activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/overdue-customers'] });
      setShowActivityForm(false);
      setSelectedCustomer(null);
      setActivityNotes("");
      setNextFollowUp("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate dunning letter mutation
  const generateDunningMutation = useMutation({
    mutationFn: async (dunningData: any) => {
      return await apiRequest('/api/ar/generate-dunning', {
        method: 'POST',
        body: JSON.stringify(dunningData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Dunning Letter Generated",
        description: "Dunning letter has been generated and queued for delivery.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/collection-activities'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate Dunning Letter",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddActivity = () => {
    if (!selectedCustomer || !activityType || !activityNotes) {
      toast({
        title: "Missing Information",
        description: "Please select customer, activity type, and enter notes.",
        variant: "destructive",
      });
      return;
    }

    addActivityMutation.mutate({
      customer_id: selectedCustomer.customer_id,
      activity_type: activityType,
      activity_date: new Date().toISOString(),
      notes: activityNotes,
      follow_up_date: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
      performed_by: 'Current User', // In real implementation, get from auth context
    });
  };

  const handleGenerateDunning = (customer: any, level: number) => {
    generateDunningMutation.mutate({
      customer_id: customer.customer_id,
      dunning_level: level,
      overdue_amount: customer.overdue_amount,
      days_overdue: customer.days_overdue,
    });
  };

  const filteredCustomers = Array.isArray(overdueCustomers) 
    ? overdueCustomers.filter((customer: any) =>
        customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getOverdueBadge = (daysOverdue: number) => {
    if (daysOverdue <= 30) return <Badge className="bg-yellow-500 text-white">1-30 Days</Badge>;
    if (daysOverdue <= 60) return <Badge className="bg-orange-500 text-white">31-60 Days</Badge>;
    if (daysOverdue <= 90) return <Badge className="bg-red-500 text-white">61-90 Days</Badge>;
    return <Badge className="bg-red-800 text-white">90+ Days</Badge>;
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Collection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  ${Array.isArray(overdueCustomers) ? overdueCustomers.reduce((sum, cust) => sum + parseFloat(cust.overdue_amount || 0), 0).toFixed(2) : '0.00'}
                </p>
              </div>
              <Phone className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(overdueCustomers?.length ?? 0)}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activities Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {Array.isArray(collectionActivities) ? collectionActivities.filter((a) => 
                    new Date(a.activity_date).toDateString() === new Date().toDateString()
                  ).length : 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Follow-ups Due</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Array.isArray(collectionActivities) ? collectionActivities.filter((a) => 
                    a.follow_up_date && new Date(a.follow_up_date) <= new Date()
                  ).length : 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Form */}
      {showActivityForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Collection Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input
                  value={selectedCustomer ? `${selectedCustomer.customer_name} (${selectedCustomer.customer_id})` : ''}
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label>Overdue Amount</Label>
                <Input
                  value={selectedCustomer ? `$${selectedCustomer.overdue_amount}` : ''}
                  disabled
                />
              </div>
              
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="visit">Site Visit</SelectItem>
                    <SelectItem value="payment_plan">Payment Plan</SelectItem>
                    <SelectItem value="legal_action">Legal Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Next Follow-up Date</Label>
                <Input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label>Activity Notes</Label>
                <textarea
                  className="w-full min-h-20 p-2 border rounded-md"
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="Enter detailed notes about the collection activity..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowActivityForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddActivity}
                disabled={addActivityMutation.isPending}
              >
                {addActivityMutation.isPending ? 'Adding...' : 'Add Activity'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Customers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overdue Customers</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Overdue Amount</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No overdue customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      <TableCell>${parseFloat(customer.overdue_amount).toFixed(2)}</TableCell>
                      <TableCell>{customer.days_overdue} days</TableCell>
                      <TableCell>{customer.last_contact ? new Date(customer.last_contact).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>{getOverdueBadge(customer.days_overdue)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowActivityForm(true);
                            }}
                          >
                            Add Activity
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGenerateDunning(customer, 1)}
                            disabled={generateDunningMutation.isPending}
                          >
                            Dunning
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Collection Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Collection Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Activity Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(collectionActivities) ? collectionActivities.slice() : []).map((activity: any) => (
                  <TableRow key={activity.id}>
                    <TableCell>{new Date(activity.activity_date).toLocaleDateString()}</TableCell>
                    <TableCell>{activity.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{activity.activity_type.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{activity.notes}</TableCell>
                    <TableCell>
                      {activity.follow_up_date ? new Date(activity.follow_up_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{activity.performed_by}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No collection activities found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}