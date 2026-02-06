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
import { Building, Phone, Mail, CreditCard, Calendar, AlertTriangle, CheckCircle, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VendorManagementTileProps {
  onBack: () => void;
}

export default function VendorManagementTile({ onBack }: VendorManagementTileProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vendors with complete details
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Fetch vendor statistics
  const { data: vendorStats } = useQuery<{
    total_vendors?: number;
    active_vendors?: number;
    avg_payment_terms?: number;
    total_credit_limits?: number;
  }>({
    queryKey: ['/api/ap/vendor-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendor-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  // Fetch vendor payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ['/api/ap/vendor', selectedVendor?.id, 'payment-history'],
    queryFn: async () => {
      if (!selectedVendor?.id) return [];
      const response = await fetch(`/api/ap/vendor/${selectedVendor.id}/payment-history`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
    enabled: !!selectedVendor?.id,
  });

  // Fetch vendor invoices
  const { data: vendorInvoices } = useQuery({
    queryKey: ['/api/ap/vendor', selectedVendor?.id, 'invoices'],
    queryFn: async () => {
      if (!selectedVendor?.id) return [];
      const response = await fetch(`/api/ap/vendor/${selectedVendor.id}/invoices`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
    enabled: !!selectedVendor?.id,
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      return await apiRequest('/api/ap/create-vendor', {
        method: 'POST',
        body: JSON.stringify(vendorData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Vendor Created",
        description: "New vendor has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendor-statistics'] });
      setShowVendorForm(false);
      setVendorName("");
      setVendorEmail("");
      setPaymentTerms("");
      setCreditLimit("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Vendor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor credit limit mutation
  const updateCreditLimitMutation = useMutation({
    mutationFn: async ({ vendorId, creditLimit }: { vendorId: string; creditLimit: number }) => {
      return await apiRequest('/api/ap/update-vendor-credit-limit', {
        method: 'PUT',
        body: JSON.stringify({ vendor_id: vendorId, credit_limit: creditLimit }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Credit Limit Updated",
        description: "Vendor credit limit has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      return await apiRequest(`/api/master-data/vendor/${vendorData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(vendorData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Vendor Updated",
        description: "Vendor has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendor-statistics'] });
      setIsEditDialogOpen(false);
      setEditingVendor(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const response = await fetch(`/api/master-data/vendor/${vendorId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete vendor');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vendor Deleted",
        description: "Vendor has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendor-statistics'] });
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      if (selectedVendor?.id === vendorToDelete?.id) {
        setSelectedVendor(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateVendor = () => {
    if (!vendorName || !vendorEmail || !paymentTerms || !creditLimit) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createVendorMutation.mutate({
      name: vendorName,
      email: vendorEmail,
      payment_terms: parseInt(paymentTerms),
      credit_limit: parseFloat(creditLimit),
      status: 'active',
      created_by: 'Current User',
      created_date: new Date().toISOString(),
    });
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setVendorName(vendor.name || "");
    setVendorEmail(vendor.email || "");
    setPaymentTerms(vendor.payment_terms?.toString() || "");
    setCreditLimit(vendor.credit_limit?.toString() || "");
    setIsEditDialogOpen(true);
    setShowVendorForm(true);
  };

  const handleDelete = (vendor: any) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (vendorToDelete) {
      deleteVendorMutation.mutate(vendorToDelete.id);
    }
  };

  const handleUpdateVendor = () => {
    if (!vendorName || !vendorEmail || !paymentTerms || !creditLimit || !editingVendor) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    updateVendorMutation.mutate({
      id: editingVendor.id,
      name: vendorName,
      email: vendorEmail,
      payment_terms: parseInt(paymentTerms),
      credit_limit: parseFloat(creditLimit),
      status: editingVendor.status || 'active',
    });
  };

  const filteredVendors = Array.isArray(vendors) ? vendors.filter((vendor) =>
    vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor?.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500 text-white">Inactive</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500 text-white">Blocked</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return <Badge className="bg-green-500 text-white">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-500 text-white">High Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Vendor Management Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {((vendorStats as any)?.total_vendors ?? 0)}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-green-600">
                  {((vendorStats as any)?.active_vendors ?? 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Payment Terms</p>
                <p className="text-2xl font-bold text-purple-600">
                  {((vendorStats as any)?.avg_payment_terms ?? 0)} days
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Credit Limits</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${Number((vendorStats as any)?.total_credit_limits || 0).toFixed(0)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Creation Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isEditDialogOpen ? 'Edit Vendor' : 'Create New Vendor'}</CardTitle>
            <Button
              onClick={() => {
                if (isEditDialogOpen) {
                  setIsEditDialogOpen(false);
                  setEditingVendor(null);
                }
                setShowVendorForm(!showVendorForm);
                if (!showVendorForm && !isEditDialogOpen) {
                  setVendorName("");
                  setVendorEmail("");
                  setPaymentTerms("");
                  setCreditLimit("");
                }
              }}
              variant={showVendorForm ? "outline" : "default"}
            >
              {showVendorForm ? 'Hide Form' : 'New Vendor'}
            </Button>
          </div>
        </CardHeader>
        {showVendorForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  placeholder="vendor@company.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Terms (Days)</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Net 15</SelectItem>
                    <SelectItem value="30">Net 30</SelectItem>
                    <SelectItem value="45">Net 45</SelectItem>
                    <SelectItem value="60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Credit Limit</Label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4 gap-2">
              {isEditDialogOpen && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingVendor(null);
                    setShowVendorForm(false);
                    setVendorName("");
                    setVendorEmail("");
                    setPaymentTerms("");
                    setCreditLimit("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={isEditDialogOpen ? handleUpdateVendor : handleCreateVendor}
                disabled={isEditDialogOpen ? updateVendorMutation.isPending : createVendorMutation.isPending}
              >
                {isEditDialogOpen 
                  ? (updateVendorMutation.isPending ? 'Updating...' : 'Update Vendor')
                  : (createVendorMutation.isPending ? 'Creating...' : 'Create Vendor')}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Vendor Details View */}
      {selectedVendor && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <div className="flex items-center justify-between">
              <CardTitle>Vendor Details: {selectedVendor.name}</CardTitle>
              <Button
                variant="outline"
                onClick={() => setSelectedVendor(null)}
              >
                Close Details
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Basic Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Code: {selectedVendor.vendor_code}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedVendor.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedVendor.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Status: </span>
                    {getStatusBadge(selectedVendor.status)}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Financial Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Credit Limit:</span>
                    <span className="text-sm font-medium">${Number(selectedVendor?.credit_limit || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Outstanding:</span>
                    <span className="text-sm font-medium text-red-600">${Number(selectedVendor?.outstanding_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Terms:</span>
                    <span className="text-sm font-medium">Net {selectedVendor.payment_terms} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Risk Level:</span>
                    {getRiskBadge(selectedVendor.risk_level)}
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Invoices:</span>
                    <span className="text-sm font-medium">{selectedVendor.total_invoices || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Paid:</span>
                    <span className="text-sm font-medium text-green-600">${Number(selectedVendor?.total_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Days to Pay:</span>
                    <span className="text-sm font-medium">{selectedVendor.avg_payment_days || 0} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Payment:</span>
                    <span className="text-sm font-medium">
                      {selectedVendor.last_payment_date ? new Date(selectedVendor.last_payment_date).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-4">Recent Invoices</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(vendorInvoices) ? vendorInvoices.slice() : []).map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoice_number}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>${Number(invoice.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Payment History */}
            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-4">Payment History</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(paymentHistory) ? paymentHistory.slice() : []).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>${Number(payment.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.reference_number}</TableCell>
                        <TableCell>{payment.invoice_number}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          No payment history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendor Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search vendors..."
                className="w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(filteredVendors) ? filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                      <TableCell>{vendor.name}</TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell>Net {vendor.payment_terms} days</TableCell>
                      <TableCell>${Number(vendor?.credit_limit || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-red-600">${Number(vendor?.outstanding_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVendor(vendor)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(vendor)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(vendor)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : null
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will delete the vendor{" "}
              <strong>{vendorToDelete?.name}</strong> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteVendorMutation.isPending}
            >
              {deleteVendorMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}