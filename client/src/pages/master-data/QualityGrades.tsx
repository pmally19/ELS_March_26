import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface QualityGrade {
  id: number;
  code: string;
  name: string;
  description?: string;
  gradeLevel?: number;
  qualityStandard?: string;
  inspectionRequired?: boolean;
  certificationRequired?: boolean;
  isActive?: boolean;
}

export default function QualityGrades() {
  const [items, setItems] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/master-data/quality-grades');
        if (!res.ok) throw new Error('Failed to fetch');
        const raw = await res.json();
        const rows: any[] = Array.isArray(raw) ? raw : (raw?.rows || raw?.data || []);
        const unique = new Map<string, QualityGrade>();
        rows.forEach((r: any) => {
          const row: QualityGrade = {
            id: r.id,
            code: r.code || r.grade_code || '',
            name: r.name || r.grade_name || r.description || '',
            description: r.description || '',
            gradeLevel: r.gradeLevel ?? r.grade_level,
            qualityStandard: r.qualityStandard || r.quality_standard,
            inspectionRequired: typeof r.inspectionRequired === 'boolean' ? r.inspectionRequired : !!r.inspection_required,
            certificationRequired: typeof r.certificationRequired === 'boolean' ? r.certificationRequired : !!r.certification_required,
            isActive: typeof r.isActive === 'boolean' ? r.isActive : !!(r.active ?? true)
          };
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

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (r) => r.code.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
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
          Master Data → Quality Grades
        </div>
      </div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Quality Grades</h1>
        <p className="text-gray-600">Product quality classifications and standards</p>
      </div>

      <div className="mb-4 w-full max-w-md">
        <Input placeholder="Search by code, name or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grades ({filtered.length})</CardTitle>
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
                    <th className="border px-3 py-2 text-left">Level</th>
                    <th className="border px-3 py-2 text-left">Standard</th>
                    <th className="border px-3 py-2 text-left">Inspection</th>
                    <th className="border px-3 py-2 text-left">Certification</th>
                    <th className="border px-3 py-2 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-3 py-2 font-mono">{row.code}</td>
                      <td className="border px-3 py-2">{row.name}</td>
                      <td className="border px-3 py-2">{row.gradeLevel ?? '-'}</td>
                      <td className="border px-3 py-2">{row.qualityStandard || '-'}</td>
                      <td className="border px-3 py-2">{row.inspectionRequired ? 'Yes' : 'No'}</td>
                      <td className="border px-3 py-2">{row.certificationRequired ? 'Yes' : 'No'}</td>
                      <td className="border px-3 py-2">{row.isActive ? 'Yes' : 'No'}</td>
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


