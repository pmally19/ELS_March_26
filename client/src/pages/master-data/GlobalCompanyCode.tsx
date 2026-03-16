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
import { Globe, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface GlobalCompanyCode {
  id: number;
  globalCode: string;
  description: string;
  consolidationCompany?: string;
  reportingCurrency: string;
  consolidationChart?: string;
  eliminationLedger?: string;
  managementType: string;
  activeStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function GlobalCompanyCode() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<GlobalCompanyCode | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading } = useQuery<GlobalCompanyCode[]>({
    queryKey: ['/api/master-data/global-company-codes'],
  });

  // Fetch currencies from API
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery<Array<{ id: number; code: string; name: string; symbol: string }>>({
    queryKey: ['/api/master-data/currencies'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/currencies');
      if (!response.ok) throw new Error('Failed to fetch currencies');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => 
      fetch('/api/master-data/global-company-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/global-company-codes'] });
      setIsAddDialogOpen(false);
      toast({ title: "Global Company Code created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`/api/master-data/global-company-codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/global-company-codes'] });
      setEditingCode(null);
      toast({ title: "Global Company Code updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/master-data/global-company-codes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/master-data/global-company-codes'] });
      toast({ title: "Global Company Code deleted successfully" });
    },
  });

  const CodeForm = ({ code, onSubmit, onCancel, currencies, currenciesLoading }: {
    code?: GlobalCompanyCode;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    currencies: Array<{ id: number; code: string; name: string; symbol: string }>;
    currenciesLoading: boolean;
  }) => {
    const [formData, setFormData] = useState({
      globalCode: code?.globalCode || '',
      description: code?.description || '',
      consolidationCompany: code?.consolidationCompany || '',
      reportingCurrency: code?.reportingCurrency || 'USD',
      consolidationChart: code?.consolidationChart || '',
      eliminationLedger: code?.eliminationLedger || '',
      managementType: code?.managementType || 'CENTRAL',
      activeStatus: code?.activeStatus ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="globalCode">Global Code *</Label>
            <Input
              id="globalCode"
              value={formData.globalCode}
              onChange={(e) => setFormData({ ...formData, globalCode: e.target.value })}
              placeholder="e.g., 3140"
              maxLength={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Global company description"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reportingCurrency">Reporting Currency *</Label>
            <Select value={formData.reportingCurrency} onValueChange={(value) => setFormData({ ...formData, reportingCurrency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currenciesLoading ? (
                  <SelectItem value="" disabled>Loading currencies...</SelectItem>
                ) : currencies.length === 0 ? (
                  <SelectItem value="" disabled>No currencies available</SelectItem>
                ) : (
                  currencies.map((currency: any) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="managementType">Management Type</Label>
            <Select value={formData.managementType} onValueChange={(value) => setFormData({ ...formData, managementType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CENTRAL">Central</SelectItem>
                <SelectItem value="DECENTRAL">Decentral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="consolidationCompany">Consolidation Company</Label>
            <Input
              id="consolidationCompany"
              value={formData.consolidationCompany}
              onChange={(e) => setFormData({ ...formData, consolidationCompany: e.target.value })}
              placeholder="e.g., CONS"
              maxLength={4}
            />
          </div>
          <div>
            <Label htmlFor="consolidationChart">Consolidation Chart</Label>
            <Input
              id="consolidationChart"
              value={formData.consolidationChart}
              onChange={(e) => setFormData({ ...formData, consolidationChart: e.target.value })}
              placeholder="e.g., COA1"
              maxLength={4}
            />
          </div>
          <div>
            <Label htmlFor="eliminationLedger">Elimination Ledger</Label>
            <Input
              id="eliminationLedger"
              value={formData.eliminationLedger}
              onChange={(e) => setFormData({ ...formData, eliminationLedger: e.target.value })}
              placeholder="e.g., EL"
              maxLength={2}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="activeStatus"
            checked={formData.activeStatus}
            onCheckedChange={(checked) => setFormData({ ...formData, activeStatus: checked })}
          />
          <Label htmlFor="activeStatus">Active Status</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {code ? 'Update' : 'Create'} Global Code
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading global company codes...</div>;
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
          Master Data → Global Company Code
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Global Company Code</h1>
            <p className="text-gray-600">Global consolidation and reporting company structure</p>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Global Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Global Company Code</DialogTitle>
            </DialogHeader>
            <CodeForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddDialogOpen(false)}
              currencies={currencies}
              currenciesLoading={currenciesLoading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Codes List */}
      <div className="grid gap-4">
        {codes.map((code: GlobalCompanyCode) => (
          <Card key={code.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Globe className="h-5 w-5" />
                  {code.globalCode} - {code.description}
                  <Badge className="bg-blue-100 text-blue-800">
                    {code.reportingCurrency}
                  </Badge>
                  <Badge className={code.activeStatus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {code.activeStatus ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCode(code)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(code.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Management:</span>
                  <div className="font-medium">{code.managementType}</div>
                </div>
                <div>
                  <span className="text-gray-600">Consolidation Company:</span>
                  <div className="font-medium">{code.consolidationCompany || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Consolidation Chart:</span>
                  <div className="font-medium">{code.consolidationChart || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Elimination Ledger:</span>
                  <div className="font-medium">{code.eliminationLedger || 'N/A'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {codes.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Global Company Codes</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first global company code.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Global Company Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editingCode && (
        <Dialog open={true} onOpenChange={() => setEditingCode(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Global Company Code</DialogTitle>
            </DialogHeader>
            <CodeForm
              code={editingCode}
              onSubmit={(data) => updateMutation.mutate({ id: editingCode.id, data })}
              onCancel={() => setEditingCode(null)}
              currencies={currencies}
              currenciesLoading={currenciesLoading}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}