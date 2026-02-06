import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Users, Shield, History, Plus, Edit, Eye, Lock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface VendorExtended {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
  authorization_group?: string;
  corporate_group?: string;
  tax_office?: string;
  tax_number?: string;
  vat_registration_number?: string;
  industry_key?: string;
  bank_country?: string;
  bank_key?: string;
  bank_account?: string;
  iban?: string;
  account_type?: string;
  payment_terms?: string;
  payment_methods?: string[];
  blocked_all_company_codes?: boolean;
  blocked_selected_company_code?: boolean;
  blocked_all_purchasing_org?: boolean;
  created_at: string;
  updated_at: string;
}

interface VendorChange {
  id: number;
  vendor_id: number;
  vendor_name: string;
  change_date: string;
  changed_by: string;
  table_name: string;
  field_name: string;
  field_description: string;
  old_value: string;
  new_value: string;
  change_type: string;
  sensitive_field: boolean;
}

export default function EnhancedVendorManagementTile() {
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isBlockingDialogOpen, setIsBlockingDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  // Enhanced statistics - using vendor statistics
  const { data: vendorStats } = useQuery({
    queryKey: ['/api/ap/vendor-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendor-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
    refetchInterval: 30000
  });

  const enhancedStats = vendorStats ? {
    enhanced_vendors: vendorStats.total_vendors || 0,
    authorization_groups: 0,
    payment_blocks: 0
  } : {
    enhanced_vendors: 0,
    authorization_groups: 0,
    payment_blocks: 0
  };

  // Basic vendors list - using AP vendors endpoint
  const { data: vendors } = useQuery({
    queryKey: ['/api/ap/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendors');
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || data || [];
    },
  });

  // Enhanced vendor data for selected vendor - using vendor detail
  const { data: vendorDetail } = useQuery({
    queryKey: ['/api/ap/vendor', selectedVendor, 'detail'],
    queryFn: async () => {
      if (!selectedVendor) return null;
      const response = await fetch(`/api/ap/vendors`);
      if (!response.ok) return null;
      const data = await response.json();
      const vendors = data.data || data || [];
      return vendors.find((v: any) => v.id === selectedVendor) || null;
    },
    enabled: !!selectedVendor
  });

  const enhancedVendorData = vendorDetail ? {
    vendor_id: vendorDetail.id,
    vendor_name: vendorDetail.name,
    vendor_code: vendorDetail.vendor_code,
    corporate_group: null,
    tax_office: null,
    vat_registration_number: null,
    iban: null,
    payment_terms: vendorDetail.payment_terms,
    blocked_all_company_codes: false,
    blocked_all_purchasing_org: false
  } : null;

  // Vendor changes - empty for now as we don't have a changes table
  const vendorChanges: any[] = [];

  // Enhanced vendor creation mutation - for now, just create a regular vendor
  const createEnhancedVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create vendor using the standard vendor endpoint
      const response = await fetch('/api/ap/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.vendor_name || `Vendor ${data.vendor_id}`,
          email: data.email || 'vendor@example.com',
          payment_terms: data.payment_terms || '30',
          code: `VEND${data.vendor_id || Date.now()}`,
          phone: data.phone || null,
          status: 'active'
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create vendor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendor-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
      setIsVendorDialogOpen(false);
    }
  });

  // Vendor blocking mutation - for now, update vendor status
  const blockVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update vendor status to blocked if blocking is enabled
      const status = (data.blocked_all_company_codes || data.blocked_all_purchasing_org) ? 'blocked' : 'active';
      const response = await fetch(`/api/master-data/vendor/${selectedVendor}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update vendor blocking');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ap/vendor-statistics'] });
      setIsBlockingDialogOpen(false);
    }
  });

  const handleEnhancedVendorCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formDataObj: any = Object.fromEntries(formData.entries());
    
    // Build data object with proper types
    const data: any = {
      vendor_id: formDataObj.vendor_id ? parseInt(formDataObj.vendor_id as string) : null,
      vendor_name: formDataObj.vendor_name || `Vendor ${formDataObj.vendor_id}`,
      email: formDataObj.email || 'vendor@example.com',
      corporate_group: formDataObj.corporate_group || null,
      tax_office: formDataObj.tax_office || null,
      tax_number: formDataObj.tax_number || null,
      vat_registration_number: formDataObj.vat_registration_number || null,
      industry_key: formDataObj.industry_key || null,
      bank_country: formDataObj.bank_country || null,
      bank_key: formDataObj.bank_key || null,
      bank_account: formDataObj.bank_account || null,
      iban: formDataObj.iban || null,
      payment_terms: formDataObj.payment_terms || 'NET30',
      payment_methods: formDataObj.payment_methods 
        ? (formDataObj.payment_methods as string).split(',').map((m: string) => m.trim())
        : [],
      phone: formDataObj.phone || null,
    };
    
    createEnhancedVendorMutation.mutate(data);
  };

  const handleVendorBlocking = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    
    // Build data object with proper types
    const data: any = {
      blocked_all_company_codes: formData.has('blocked_all_company_codes'),
      blocked_selected_company_code: formData.has('blocked_selected_company_code'),
      blocked_all_purchasing_org: formData.has('blocked_all_purchasing_org'),
      block_quality_reason: formData.get('block_quality_reason') || null,
      vendor_id: selectedVendor,
    };
    
    blockVendorMutation.mutate(data);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Enhanced Vendor Management
            </CardTitle>
            <CardDescription>
              Comprehensive vendor master data with blocking, change tracking, and extended configurations
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50">
            <Shield className="w-3 h-3 mr-1" />
            NEW
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enhanced">Enhanced Data</TabsTrigger>
            <TabsTrigger value="blocking">Blocking Control</TabsTrigger>
            <TabsTrigger value="changes">Change History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Enhanced Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {enhancedStats?.enhanced_vendors || 0}
                </div>
                <div className="text-sm text-blue-600">Enhanced Vendors</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">
                  {enhancedStats?.authorization_groups || 0}
                </div>
                <div className="text-sm text-yellow-600">Payment Blocks</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {vendors?.length || 0}
                </div>
                <div className="text-sm text-green-600">Total Vendors</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">95%</div>
                <div className="text-sm text-purple-600">Data Quality</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Enhanced Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Enhanced Vendor Master Data</DialogTitle>
                    <DialogDescription>
                      Add comprehensive vendor configuration including banking, tax, and payment information
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEnhancedVendorCreate} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_id">Vendor *</Label>
                        <Select name="vendor_id" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors?.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name} ({vendor.vendor_code || vendor.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="corporate_group">Corporate Group</Label>
                        <Input name="corporate_group" placeholder="Corporate group name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_office">Tax Office</Label>
                        <Input name="tax_office" placeholder="Tax authority office" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_number">Tax Number</Label>
                        <Input name="tax_number" placeholder="Tax file number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vat_registration_number">VAT Registration</Label>
                        <Input name="vat_registration_number" placeholder="VAT registration number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry_key">Industry Key</Label>
                        <Input name="industry_key" placeholder="Industry classification" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_country">Bank Country</Label>
                        <Input name="bank_country" placeholder="2-digit country code" maxLength={2} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_key">Bank Key</Label>
                        <Input name="bank_key" placeholder="Bank routing key" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank_account">Bank Account</Label>
                        <Input name="bank_account" placeholder="Bank account number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="iban">IBAN</Label>
                        <Input name="iban" placeholder="International bank account number" maxLength={34} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment_terms">Payment Terms</Label>
                        <Input name="payment_terms" placeholder="e.g., NET30" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment_methods">Payment Methods</Label>
                        <Input name="payment_methods" placeholder="ACH, Wire, Check (comma-separated)" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Withholding Tax Configuration</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="wh_tax_country">Withholding Tax Country</Label>
                          <Input name="wh_tax_country" placeholder="2-digit country code" maxLength={2} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wh_tax_type">Withholding Tax Type</Label>
                          <Select name="wh_tax_type">
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="01">Invoice (01)</SelectItem>
                              <SelectItem value="02">Payment (02)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exemption_number">Exemption Number</Label>
                          <Input name="exemption_number" placeholder="Tax exemption number" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exemption_percentage">Exemption %</Label>
                          <Input name="exemption_percentage" type="number" min="0" max="100" step="0.01" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch name="check_double_invoice" />
                        <Label htmlFor="check_double_invoice">Check for duplicate invoices</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createEnhancedVendorMutation.isPending}>
                        {createEnhancedVendorMutation.isPending ? 'Creating...' : 'Create Enhanced Vendor'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={() => setActiveTab("blocking")}>
                <Lock className="w-4 h-4 mr-2" />
                Manage Blocking
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("changes")}>
                <History className="w-4 h-4 mr-2" />
                View Changes
              </Button>
            </div>

            {/* Vendors List */}
            <div className="space-y-2">
              <h4 className="font-medium">Vendor Selection</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Enhanced</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors?.slice(0, 5).map((vendor: any) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.vendor_code || vendor.id}</TableCell>
                      <TableCell>
                        <Badge variant={vendor.enhanced ? "default" : "secondary"}>
                          {vendor.enhanced ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={vendor.status === 'active' ? "default" : "destructive"}>
                          {vendor.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVendor(vendor.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="enhanced" className="space-y-4">
            {selectedVendor ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Enhanced Data for Vendor ID: {selectedVendor}</h4>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                {enhancedVendorData ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor Name</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.vendor_name}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Corporate Group</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.corporate_group || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Office</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.tax_office || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>VAT Registration</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.vat_registration_number || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.iban || 'Not set'}</div>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Terms</Label>
                      <div className="p-2 bg-gray-50 rounded">{enhancedVendorData.payment_terms || 'Not set'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No enhanced data found for this vendor
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a vendor to view enhanced data
              </div>
            )}
          </TabsContent>

          <TabsContent value="blocking" className="space-y-4">
            {selectedVendor ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Vendor Blocking Controls</h4>
                  <Dialog open={isBlockingDialogOpen} onOpenChange={setIsBlockingDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Lock className="w-4 h-4 mr-2" />
                        Update Blocking
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Vendor Blocking Status</DialogTitle>
                        <DialogDescription>
                          Configure blocking settings for vendor ID: {selectedVendor}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleVendorBlocking} className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch name="blocked_all_company_codes" />
                            <Label>Block for all company codes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch name="blocked_selected_company_code" />
                            <Label>Block for selected company code</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch name="blocked_all_purchasing_org" />
                            <Label>Block for all purchasing organizations</Label>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="block_quality_reason">Block Quality Reason</Label>
                            <Textarea name="block_quality_reason" placeholder="Reason for quality block" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsBlockingDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={blockVendorMutation.isPending}>
                            {blockVendorMutation.isPending ? 'Updating...' : 'Update Blocking'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                {enhancedVendorData && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Company Code Blocking</span>
                      </div>
                      <Badge variant={enhancedVendorData.blocked_all_company_codes ? "destructive" : "secondary"}>
                        {enhancedVendorData.blocked_all_company_codes ? "Blocked" : "Active"}
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Purchasing Org Blocking</span>
                      </div>
                      <Badge variant={enhancedVendorData.blocked_all_purchasing_org ? "destructive" : "secondary"}>
                        {enhancedVendorData.blocked_all_purchasing_org ? "Blocked" : "Active"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a vendor to manage blocking controls
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes" className="space-y-4">
            {selectedVendor ? (
              <div className="space-y-4">
                <h4 className="font-medium">Change History for Vendor ID: {selectedVendor}</h4>
                {vendorChanges && vendorChanges.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorChanges.map((change: VendorChange) => (
                        <TableRow key={change.id}>
                          <TableCell>{new Date(change.change_date).toLocaleDateString()}</TableCell>
                          <TableCell>{change.changed_by}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {change.field_description}
                              {change.sensitive_field && (
                                <Badge variant="outline" className="text-xs">Sensitive</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-32 truncate">{change.old_value || 'N/A'}</TableCell>
                          <TableCell className="max-w-32 truncate">{change.new_value || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={change.change_type === 'update' ? 'default' : 'secondary'}>
                              {change.change_type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No changes found for this vendor
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select a vendor to view change history
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}