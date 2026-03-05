import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, CreditCard, Settings, ArrowLeft, Info, ChevronDown, ChevronRight, AlertCircle, Eye } from 'lucide-react';

interface PaymentTerm {
  id: number;
  paymentTermCode: string; // maps to payment_term_key
  description: string;
  dueDays: number; // maps to payment_due_days
  discountDays1: number; // maps to cash_discount_days
  discountPercent1: number; // maps to cash_discount_percent
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
  tenantId?: string;
  deletedAt?: string | null;
}

export default function PaymentTerms() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingPaymentTerm, setViewingPaymentTerm] = useState<PaymentTerm | null>(null);
  const [adminDataOpen, setAdminDataOpen] = useState(false);
  const [formData, setFormData] = useState({
    paymentTermCode: '',
    description: '',
    dueDays: 30,
    discountDays1: 0,
    discountPercent1: 0.00
  });

  useEffect(() => {
    fetchPaymentTerms();
  }, []);

  const fetchPaymentTerms = async () => {
    try {
      setError(null);
      const response = await fetch('/api/master-data-crud/payment-terms');
      if (response.ok) {
        const data = await response.json();
        const recordsCandidate = data && 'records' in data ? (data as any).records : data;
        const records = Array.isArray(recordsCandidate) ? recordsCandidate : [];
        setPaymentTerms(records);
      } else {
        const text = await response.text();
        setError(`Failed to load payment terms (${response.status}). ${text || ''}`);
        setPaymentTerms([]);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      setError('Network error while fetching payment terms. Check server is running.');
      setPaymentTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `/api/master-data-crud/payment-terms/${editingId}`
        : '/api/master-data-crud/payment-terms';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchPaymentTerms();
        resetForm();
      } else {
        const text = await response.text();
        alert(`Failed to ${editingId ? 'update' : 'create'} payment term: ${text}`);
      }
    } catch (error) {
      console.error('Error saving payment term:', error);
      alert('Network error while saving payment term.');
    }
  };

  const handleEdit = (paymentTerm: PaymentTerm) => {
    setFormData({
      paymentTermCode: paymentTerm.paymentTermCode,
      description: paymentTerm.description,
      dueDays: paymentTerm.dueDays,
      discountDays1: paymentTerm.discountDays1,
      discountPercent1: paymentTerm.discountPercent1
    });
    setEditingId(paymentTerm.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this payment term?')) {
      try {
        const response = await fetch(`/api/master-data-crud/payment-terms/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchPaymentTerms();
        } else {
          const text = await response.text();
          alert(`Failed to delete payment term: ${text}`);
        }
      } catch (error) {
        console.error('Error deleting payment term:', error);
        alert('Network error while deleting payment term.');
      }
    }
  };

  const openDetails = (paymentTerm: PaymentTerm) => {
    setViewingPaymentTerm(paymentTerm);
    setIsDetailsOpen(true);
    setAdminDataOpen(false);
  };

  const resetForm = () => {
    setFormData({
      paymentTermCode: '',
      description: '',
      dueDays: 30,
      discountDays1: 0,
      discountPercent1: 0.00
    });
    setEditingId(null);
    setShowForm(false);
  };

  const safePaymentTerms: PaymentTerm[] = Array.isArray(paymentTerms) ? paymentTerms : [];
  const filteredPaymentTerms = safePaymentTerms.filter((paymentTerm) => {
    const desc = (paymentTerm?.description ?? '').toString().toLowerCase();
    const code = (paymentTerm?.paymentTermCode ?? '').toString().toLowerCase();
    const needle = (searchTerm ?? '').toString().toLowerCase();
    return desc.includes(needle) || code.includes(needle);
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
          <button
            className="ml-4 underline"
            onClick={() => {
              setLoading(true);
              fetchPaymentTerms();
            }}
          >
            Retry
          </button>
        </div>
      )}
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
          Master Data → Payment Terms
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Payment Terms</h1>
            <p className="text-gray-600">Financial terms with discount structures</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Baseline date configuration removed for DB alignment */}
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Payment Term
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payment terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Add'} Payment Term</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Term Code*</label>
                <Input
                  value={formData.paymentTermCode}
                  onChange={(e) => {
                    const raw = (e.target.value || '').toUpperCase();
                    // enforce max 4 characters per DB column payment_term_key (varchar(4))
                    const trimmed = raw.slice(0, 4);
                    setFormData({ ...formData, paymentTermCode: trimmed });
                  }}
                  maxLength={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Max 4 characters, stored as uppercase (DB: payment_term_key)</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description*</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Days*</label>
                <Input
                  type="number"
                  value={formData.dueDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, dueDays: value === '' ? 0 : parseInt(value) || 0 });
                  }}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">DB column: payment_due_days</p>
              </div>
              {/* Baseline Date removed - not in PostgreSQL schema */}
              <div>
                <label className="block text-sm font-medium mb-2">Discount Days 1</label>
                <Input
                  type="number"
                  value={formData.discountDays1}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, discountDays1: value === '' ? 0 : parseInt(value) || 0 });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">DB column: cash_discount_days</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discount Percent 1 (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discountPercent1}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, discountPercent1: value === '' ? 0 : parseFloat(value) || 0 });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">DB column: cash_discount_percent</p>
              </div>
              {/* Second discount tier not supported by DB; removed from UI */}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Payment Term
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog - View Only */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment Term Details</DialogTitle>
            <DialogDescription>
              View complete information for this payment term
            </DialogDescription>
          </DialogHeader>
          {viewingPaymentTerm && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-medium">{viewingPaymentTerm.paymentTermCode}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{viewingPaymentTerm.description}</p>
                  </div>
                </div>
              </div>

              {/* Discount Structure */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Terms Structure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Due Days</p>
                    <p className="font-medium">{viewingPaymentTerm.dueDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount 1</p>
                    <p className="font-medium">
                      {viewingPaymentTerm.discountDays1 > 0
                        ? `${viewingPaymentTerm.discountPercent1}% in ${viewingPaymentTerm.discountDays1} days`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Administrative Data (SAP ECC style) ────────────────── */}
              <div className="border rounded-md overflow-hidden bg-white mt-4">
                <button
                  type="button"
                  onClick={() => setAdminDataOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    Administrative Data
                  </span>
                  {adminDataOpen
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {adminDataOpen && (
                  <dl className="px-4 py-3 space-y-2 bg-white">
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingPaymentTerm.createdAt ? new Date(viewingPaymentTerm.createdAt).toLocaleString() : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Created by (User ID)</dt>
                      <dd className="text-xs text-gray-500">{viewingPaymentTerm.createdBy ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed on</dt>
                      <dd className="text-xs text-gray-500">
                        {viewingPaymentTerm.updatedAt ? new Date(viewingPaymentTerm.updatedAt).toLocaleString() : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-xs text-gray-400">Last changed by (User ID)</dt>
                      <dd className="text-xs text-gray-500">{viewingPaymentTerm.updatedBy ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                      <dt className="text-xs text-gray-400">Tenant / Client</dt>
                      <dd className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                        {viewingPaymentTerm.tenantId || '001'}
                      </dd>
                    </div>
                    {viewingPaymentTerm.deletedAt && (
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-red-50">
                        <dt className="text-xs text-red-400 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Deletion Flag
                        </dt>
                        <dd className="text-xs text-red-500 font-medium">
                          Yes (Soft Deleted on {new Date(viewingPaymentTerm.deletedAt).toLocaleDateString()})
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms ({filteredPaymentTerms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Due Days</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Discount 1</th>

                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPaymentTerms.map((paymentTerm) => (
                  <tr key={paymentTerm.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetails(paymentTerm)}>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{paymentTerm.paymentTermCode}</td>
                    <td className="border border-gray-300 px-4 py-2">{paymentTerm.description}</td>
                    <td className="border border-gray-300 px-4 py-2">{paymentTerm.dueDays} days</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {paymentTerm.discountDays1 > 0
                        ? `${paymentTerm.discountPercent1}% in ${paymentTerm.discountDays1} days`
                        : '-'
                      }
                    </td>

                    <td className="border border-gray-300 px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View Details"
                          onClick={(e) => { e.stopPropagation(); openDetails(paymentTerm); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleEdit(paymentTerm); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleDelete(paymentTerm.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPaymentTerms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payment terms found. {searchTerm && `Try adjusting your search for "${searchTerm}".`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}