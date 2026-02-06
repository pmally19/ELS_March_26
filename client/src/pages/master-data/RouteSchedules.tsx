import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft } from 'lucide-react';

interface RouteSchedule {
  id: number;
  code?: string;
  name?: string;
  description?: string;
  routeType?: string;
  status?: string;
  baseQuantity?: string;
  baseUnit?: string;
  validFrom?: string;
  materialId?: number;
  plantId?: number;
  createdAt?: string;
  updatedAt?: string;
  // Any other fields are displayed dynamically
  [key: string]: any;
}

export default function RouteSchedules() {
  const [records, setRecords] = useState<RouteSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [form, setForm] = useState({ 
    code: '', 
    name: '', 
    description: '', 
    routeType: 'PRODUCTION',
    status: 'ACTIVE',
    baseQuantity: '1.000',
    baseUnit: 'EA',
    validFrom: new Date().toISOString().split('T')[0],
    materialId: 1,
    plantId: 1
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const res = await fetch('/api/master-data/route-schedules');
        if (!res.ok) {
          const text = await res.text();
          setError(`Failed to load route schedules (${res.status}). ${text || ''}`);
          setRecords([]);
          return;
        }
        const data = await res.json();
        const arr = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
        setRecords(arr);
      } catch (e) {
        console.error('Error loading route schedules:', e);
        setError('Network error while fetching route schedules.');
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      const payload = { ...form };
      const url = editingId
        ? `/api/master-data/route-schedules/${editingId}`
        : `/api/master-data/route-schedules`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to ${editingId ? 'update' : 'create'}: ${text}`);
        return;
      }
      // reload
      const list = await fetch('/api/master-data/route-schedules');
      const data = await list.json();
      const arr = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setRecords(arr);
      setEditingId(null);
      setForm({ 
        code: '', 
        name: '', 
        description: '', 
        routeType: 'PRODUCTION',
        status: 'ACTIVE',
        baseQuantity: '1.000',
        baseUnit: 'EA',
        validFrom: new Date().toISOString().split('T')[0],
        materialId: 1,
        plantId: 1
      });
    } catch (e) {
      console.error(e);
      alert('Network error.');
    }
  }

  async function handleEdit(row: RouteSchedule) {
    setEditingId(row.id);
    setForm({
      code: row.code ?? '',
      name: row.name ?? '',
      description: row.description ?? '',
      routeType: (row.routeType as string) ?? 'PRODUCTION',
      status: (row.status as string) ?? 'ACTIVE',
      baseQuantity: (row.baseQuantity as string) ?? '1.000',
      baseUnit: (row.baseUnit as string) ?? 'EA',
      validFrom: row.validFrom ? new Date(row.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      materialId: (row.materialId as number) ?? 1,
      plantId: (row.plantId as number) ?? 1
    });
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this route schedule?')) return;
    try {
      const res = await fetch(`/api/master-data/route-schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to delete: ${text}`);
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert('Network error.');
    }
  }

  const filtered = useMemo(() => {
    const q = (search || '').toLowerCase();
    const list = Array.isArray(records) ? records : [];
    if (!q) return list;
    return list.filter((r) => {
      const hay = `${r.code ?? ''} ${r.name ?? ''} ${r.description ?? ''} ${r.routeType ?? ''} ${r.status ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
          <button className="ml-4 underline" onClick={() => window.location.reload()}>Retry</button>
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
          Master Data → Route Schedules
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Route Schedules</h1>
      </div>

      <div className="mb-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search route schedules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit' : 'Add'} Route Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Routing Code*</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.slice(0, 40) })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description*</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Routing Type*</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={form.routeType}
                onChange={(e) => setForm({ ...form, routeType: e.target.value })}
                required
              >
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INSPECTION">INSPECTION</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status*</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                required
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Base Quantity*</label>
              <Input value={form.baseQuantity} onChange={(e) => setForm({ ...form, baseQuantity: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Base Unit*</label>
              <Input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Valid From*</label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} required />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-2">Full Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { 
                  setEditingId(null); 
                  setForm({ 
                    code: '', 
                    name: '', 
                    description: '', 
                    routeType: 'PRODUCTION',
                    status: 'ACTIVE',
                    baseQuantity: '1.000',
                    baseUnit: 'EA',
                    validFrom: new Date().toISOString().split('T')[0],
                    materialId: 1,
                    plantId: 1
                  }); 
                }}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">No route schedules found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">ID</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Routing Code</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Type</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Base Qty</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Unit</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Valid From</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2">{r.id}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.code ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.name ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.routeType ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.status ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.baseQuantity ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.baseUnit ?? '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">{r.validFrom ? new Date(r.validFrom).toLocaleDateString() : '-'}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(r)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


