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
import { Search, TrendingUp, AlertTriangle, Shield, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CreditManagementTileProps {
  onBack: () => void;
}

export default function CreditManagementTile({ onBack }: CreditManagementTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [showCreditForm, setShowCreditForm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch credit management data
  const { data: creditData, isLoading } = useQuery({
    queryKey: ['/api/ar/credit-management'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/credit-management');
      return await response.json();
    },
  });

  // Fetch credit alerts
  const { data: creditAlerts } = useQuery({
    queryKey: ['/api/ar/credit-alerts'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/credit-alerts');
      return await response.json();
    },
  });

  // Fetch credit scoring data
  const { data: creditScoring } = useQuery({
    queryKey: ['/api/ar/credit-scoring'],
    queryFn: async () => {
      const response = await apiRequest('/api/ar/credit-scoring');
      return await response.json();
    },
  });

  // Update credit limit mutation
  const updateCreditMutation = useMutation({
    mutationFn: async (creditData: any) => {
      return await apiRequest('/api/ar/update-credit-limit', {
        method: 'POST',
        body: JSON.stringify(creditData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Credit Limit Updated",
        description: "Customer credit limit has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/credit-management'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ar/credit-alerts'] });
      setShowCreditForm(false);
      setSelectedCustomer(null);
      setNewCreditLimit("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Credit Limit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate credit report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest('/api/ar/generate-credit-report', {
        method: 'POST',
        body: JSON.stringify({ customer_id: customerId }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Credit Report Generated",
        description: "Credit report has been generated and is ready for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate Report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateCredit = () => {
    if (!selectedCustomer || !newCreditLimit || !paymentTerms || !riskLevel) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    updateCreditMutation.mutate({
      customer_id: selectedCustomer.customer_id,
      credit_limit: parseFloat(newCreditLimit),
      payment_terms: paymentTerms,
      risk_level: riskLevel,
      updated_by: 'Current User',
      updated_date: new Date().toISOString(),
    });
  };

  const creditCustomers = creditData?.customers || [];
  const filteredCustomers = Array.isArray(creditCustomers)
    ? creditCustomers.filter((customer: any) =>
      customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-500 text-white">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-500 text-white">High Risk</Badge>;
      default:
        return <Badge variant="outline">{riskLevel}</Badge>;
    }
  };

  const getCreditUtilizationBadge = (utilization: number) => {
    if (utilization >= 90) return <Badge className="bg-red-500 text-white">Critical</Badge>;
    if (utilization >= 75) return <Badge className="bg-orange-500 text-white">High</Badge>;
    if (utilization >= 50) return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
    return <Badge className="bg-green-500 text-white">Good</Badge>;
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Credit Management Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit Exposure</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${creditData?.summary?.total_exposure?.toFixed(2) || '0.00'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Credit</p>
                <p className="text-2xl font-bold text-green-600">
                  ${creditData?.summary?.available_credit?.toFixed(2) || '0.00'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credit Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {(creditAlerts?.length ?? 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Credit Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {creditScoring?.average_score ?? creditScoring?.customers?.length > 0
                    ? Math.round(creditScoring.customers.reduce((sum: number, c: any) => sum + (parseFloat(c.credit_score) || 0), 0) / creditScoring.customers.length)
                    : 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Form */}
      {showCreditForm && (
        <Card>
          <CardHeader>
            <CardTitle>Update Credit Management</CardTitle>
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
                <Label>Current Credit Limit</Label>
                <Input
                  value={selectedCustomer ? `$${selectedCustomer.credit_limit}` : ''}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>New Credit Limit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="Enter new credit limit"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Terms (Days)</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="45">45 Days</SelectItem>
                    <SelectItem value="60">60 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Credit Score</Label>
                <Input
                  value={selectedCustomer ? selectedCustomer.credit_score : ''}
                  disabled
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreditForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCredit}
                disabled={updateCreditMutation.isPending}
              >
                {updateCreditMutation.isPending ? 'Updating...' : 'Update Credit'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Alerts */}
      {creditAlerts && creditAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Credit Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(creditAlerts) ? creditAlerts.map((alert, index) => (
                <div key={index} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-800">{alert.customer_name}</p>
                      <p className="text-sm text-red-600">{alert.alert_message}</p>
                    </div>
                    <Badge className="bg-red-500 text-white">{alert.severity}</Badge>
                  </div>
                </div>
              )) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Credit Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Credit Management</CardTitle>
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
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Credit Used</TableHead>
                  <TableHead>Utilization %</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(filteredCustomers) ? filteredCustomers.map((customer) => {
                    const creditUsed = parseFloat(customer.credit_used || customer.credit_exposure || 0);
                    const creditLimit = parseFloat(customer.credit_limit || 0);
                    const utilization = creditLimit > 0 ?
                      (creditUsed / creditLimit) * 100 : 0;

                    // Get credit score from credit scoring data if available
                    const customerScore = creditScoring?.customers?.find(
                      (c: any) => c.customer_id === customer.customer_id
                    )?.credit_score || customer.credit_score || null;

                    return (
                      <TableRow key={customer.customer_id || customer.id}>
                        <TableCell className="font-medium">{customer.customer_name || 'Unknown'}</TableCell>
                        <TableCell>${creditLimit.toFixed(2)}</TableCell>
                        <TableCell>${creditUsed.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{utilization.toFixed(1)}%</span>
                            {getCreditUtilizationBadge(utilization)}
                          </div>
                        </TableCell>
                        <TableCell>{customerScore || (typeof customer.credit_utilization === 'number' ? customer.credit_utilization.toFixed(0) : 'N/A')}</TableCell>
                        <TableCell>{getRiskBadge(customer.risk_level || customer.risk_category?.toLowerCase() || 'medium')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setNewCreditLimit(customer.credit_limit ? customer.credit_limit.toString() : '0');
                                setPaymentTerms(customer?.payment_terms?.toString() || '30');
                                setRiskLevel(customer.risk_level || customer.risk_category?.toLowerCase() || 'medium');
                                setShowCreditForm(true);
                              }}
                            >
                              Manage
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => generateReportMutation.mutate(customer.customer_id)}
                              disabled={generateReportMutation.isPending}
                            >
                              Report
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : null
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}