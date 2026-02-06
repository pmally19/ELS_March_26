import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VATRegistration {
  id: number;
  registrationKey: string;
  companyCodeId?: number;
  country: string;
  vatNumber: string;
  taxType: string;
  validFrom: string;
  validTo?: string;
  taxOffice?: string;
  taxOfficerName?: string;
  exemptionCertificate?: string;
  activeStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function VATRegistration() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<VATRegistration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery<VATRegistration[]>({
    queryKey: ['/api/master-data/vat-registration'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/vat-registration');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to load VAT registrations');
      return payload as VATRegistration[];
    }
  });

  const { data: companyCodes = [] } = useQuery<any[]>({
    queryKey: ['/api/master-data/company-codes'],
    queryFn: async () => {
      const res = await fetch('/api/master-data/company-codes');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to load company codes');
      return payload as any[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/master-data/vat-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to create VAT registration');
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vat-registration'] });
      setIsAddDialogOpen(false);
      toast({ title: "VAT Registration created successfully" });
    },
    onError: (err: any) => {
      toast({ title: 'Creation failed', description: err.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/master-data/vat-registration/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Failed to update VAT registration');
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vat-registration'] });
      setEditingRegistration(null);
      toast({ title: "VAT Registration updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/vat-registration/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/vat-registration'] });
      toast({ title: "VAT Registration deleted successfully" });
    },
  });

  const RegistrationForm = ({ registration, onSubmit, onCancel }: {
    registration?: VATRegistration;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      registrationKey: registration?.registrationKey || '',
      companyCodeId: registration?.companyCodeId || '',
      country: registration?.country || '',
      vatNumber: registration?.vatNumber || '',
      taxType: registration?.taxType || 'VAT',
      validFrom: registration?.validFrom || new Date().toISOString().split('T')[0],
      validTo: registration?.validTo || '',
      taxOffice: registration?.taxOffice || '',
      taxOfficerName: registration?.taxOfficerName || '',
      exemptionCertificate: registration?.exemptionCertificate || '',
      activeStatus: registration?.activeStatus ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="registrationKey">Registration Key *</Label>
            <Input
              id="registrationKey"
              value={formData.registrationKey}
              onChange={(e) => setFormData({ ...formData, registrationKey: e.target.value })}
              placeholder="e.g., VAT-001"
              maxLength={20}
              required
            />
          </div>
          <div>
            <Label htmlFor="companyCodeId">Company Code</Label>
            <Select value={formData.companyCodeId.toString()} onValueChange={(value) => setFormData({ ...formData, companyCodeId: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue placeholder="Select company code" />
              </SelectTrigger>
              <SelectContent>
                {companyCodes.map((cc: any) => (
                  <SelectItem key={cc.id} value={cc.id.toString()}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="country">Country *</Label>
            <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="GBR">United Kingdom</SelectItem>
                <SelectItem value="DEU">Germany</SelectItem>
                <SelectItem value="FRA">France</SelectItem>
                <SelectItem value="ITA">Italy</SelectItem>
                <SelectItem value="ESP">Spain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vatNumber">VAT Number *</Label>
            <Input
              id="vatNumber"
              value={formData.vatNumber}
              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
              placeholder="VAT registration number"
              maxLength={20}
              required
            />
          </div>
          <div>
            <Label htmlFor="taxType">Tax Type</Label>
            <Select value={formData.taxType} onValueChange={(value) => setFormData({ ...formData, taxType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VAT">VAT</SelectItem>
                <SelectItem value="GST">GST</SelectItem>
                <SelectItem value="SALES_TAX">Sales Tax</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="validFrom">Valid From *</Label>
            <Input
              id="validFrom"
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="validTo">Valid To</Label>
            <Input
              id="validTo"
              type="date"
              value={formData.validTo}
              onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taxOffice">Tax Office</Label>
            <Input
              id="taxOffice"
              value={formData.taxOffice}
              onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
              placeholder="Tax office name"
              maxLength={50}
            />
          </div>
          <div>
            <Label htmlFor="taxOfficerName">Tax Officer Name</Label>
            <Input
              id="taxOfficerName"
              value={formData.taxOfficerName}
              onChange={(e) => setFormData({ ...formData, taxOfficerName: e.target.value })}
              placeholder="Tax officer contact"
              maxLength={50}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exemptionCertificate">Exemption Certificate</Label>
            <Input
              id="exemptionCertificate"
              value={formData.exemptionCertificate}
              onChange={(e) => setFormData({ ...formData, exemptionCertificate: e.target.value })}
              placeholder="Certificate number"
              maxLength={20}
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="activeStatus"
              checked={formData.activeStatus}
              onCheckedChange={(checked) => setFormData({ ...formData, activeStatus: checked })}
            />
            <Label htmlFor="activeStatus">Active Status</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {registration ? 'Update' : 'Create'} Registration
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading VAT registrations...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → VAT Registration
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">VAT Registration</h1>
            <p className="text-gray-600">Tax registration numbers and compliance settings</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Registration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create VAT Registration</DialogTitle>
            </DialogHeader>
            <RegistrationForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Registrations List */}
      <div className="grid gap-4">
        {registrations.map((registration: VATRegistration) => (
          <Card key={registration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  {registration.registrationKey} - {registration.country}
                  <Badge className="bg-blue-100 text-blue-800">
                    {registration.taxType}
                  </Badge>
                  <Badge className={registration.activeStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {registration.activeStatus ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingRegistration(registration)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(registration.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">VAT Number:</span>
                  <div className="font-medium">{registration.vatNumber}</div>
                </div>
                <div>
                  <span className="text-gray-600">Valid From:</span>
                  <div className="font-medium">{new Date(registration.validFrom).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Valid To:</span>
                  <div className="font-medium">{registration.validTo ? new Date(registration.validTo).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tax Office:</span>
                  <div className="font-medium">{registration.taxOffice || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {registrations.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No VAT Registrations</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first VAT registration.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add VAT Registration
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingRegistration && (
        <Dialog open={true} onOpenChange={() => setEditingRegistration(null)}>
          <DialogContent className="max-w-2xl">
                      <DialogHeader>
            <DialogTitle>Edit VAT Registration</DialogTitle>
          </DialogHeader>
            <RegistrationForm
              registration={editingRegistration}
              onSubmit={(data) => updateMutation.mutate({ id: editingRegistration.id, data })}
              onCancel={() => setEditingRegistration(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}