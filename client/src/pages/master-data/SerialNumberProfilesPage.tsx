import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface SerialNumberProfile {
  id: number;
  code: string;
  name: string;
  description?: string;
  serialNumberFormat?: string;
  serialNumberLength?: number;
  trackingLevel?: string;
  warrantyTracking?: boolean;
  isActive?: boolean;
}

export default function SerialNumberProfilesPage() {
  const [items, setItems] = useState<SerialNumberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<SerialNumberProfile> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/master-data/serial-number-profiles');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const unique = new Map<string, SerialNumberProfile>();
        (data as SerialNumberProfile[]).forEach((row) => {
          const key = (row.code || '').trim().toLowerCase();
          if (!unique.has(key)) unique.set(key, row);
        });
        setItems(Array.from(unique.values()));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/master-data/serial-number-profiles');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditing({
      code: '',
      name: '',
      description: '',
      serialNumberFormat: '',
      serialNumberLength: undefined,
      trackingLevel: '',
      warrantyTracking: false,
      isActive: true,
    });
  }

  function startEdit(row: SerialNumberProfile) {
    setEditing({ ...row });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      code: editing.code?.trim(),
      name: editing.name?.trim(),
      description: editing.description ?? '',
      serialNumberFormat: editing.serialNumberFormat ?? '',
      serialNumberLength: editing.serialNumberLength ?? null,
      trackingLevel: editing.trackingLevel ?? '',
      warrantyTracking: !!editing.warrantyTracking,
      isActive: editing.isActive !== false,
    };
    if (!payload.code || !payload.name) {
      alert('Code and Name are required');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const res = await fetch(`/api/master-data/serial-number-profiles/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/master-data/serial-number-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      await refresh();
      setEditing(null);
    } catch (err) {
      console.error(err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="p-6">
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
          Master Data → Serial Number Profiles
        </div>
      </div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Serial Number Profiles</h1>
        <p className="text-gray-600">Manage asset tracking profiles</p>
      </div>

      <div className="mb-4 w-full max-w-md">
        <Input placeholder="Search by code, name or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{editing?.id ? 'Edit Profile' : 'Create Profile'}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Code</label>
                <Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Format</label>
                <Input value={editing.serialNumberFormat || ''} onChange={(e) => setEditing({ ...editing, serialNumberFormat: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Length</label>
                <Input type="number" value={editing.serialNumberLength ?? ''} onChange={(e) => setEditing({ ...editing, serialNumberLength: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <label className="block text-sm mb-1">Tracking Level</label>
                <Input value={editing.trackingLevel || ''} onChange={(e) => setEditing({ ...editing, trackingLevel: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input id="warranty" type="checkbox" checked={!!editing.warrantyTracking} onChange={(e) => setEditing({ ...editing, warrantyTracking: e.target.checked })} />
                <label htmlFor="warranty">Warranty Tracking</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input id="active" type="checkbox" checked={editing.isActive !== false} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                <label htmlFor="active">Active</label>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Description</label>
                <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="md:col-span-3 flex gap-2 mt-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button onClick={startCreate}>New Profile</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profiles ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border px-3 py-2 text-left">Code</th>
                    <th className="border px-3 py-2 text-left">Name</th>
                    <th className="border px-3 py-2 text-left">Format</th>
                    <th className="border px-3 py-2 text-left">Length</th>
                    <th className="border px-3 py-2 text-left">Tracking Level</th>
                    <th className="border px-3 py-2 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 font-mono">{row.code}</td>
                      <td className="border px-3 py-2">{row.name}</td>
                      <td className="border px-3 py-2">{row.serialNumberFormat || '-'}</td>
                      <td className="border px-3 py-2">{row.serialNumberLength ?? '-'}</td>
                      <td className="border px-3 py-2">{row.trackingLevel || '-'}</td>
                      <td className="border px-3 py-2 flex items-center gap-2">
                        <span>{row.isActive ? 'Yes' : 'No'}</span>
                        <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>Edit</Button>
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


