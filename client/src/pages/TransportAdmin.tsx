import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Plus, Edit, Save, AlertCircle } from "lucide-react";

interface NumberRange {
  id: number;
  range_prefix: string;
  range_type: string;
  description: string;
  current_number: number;
  max_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TransportAdmin() {
  const [numberRanges, setNumberRanges] = useState<NumberRange[]>([]);
  const [editingRange, setEditingRange] = useState<NumberRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for new range
  const [newRange, setNewRange] = useState({
    range_prefix: '',
    range_type: 'STANDARD',
    description: '',
    current_number: 100000,
    max_number: 999999,
    is_active: true
  });

  useEffect(() => {
    fetchNumberRanges();
  }, []);

  const fetchNumberRanges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transport-direct/admin/number-ranges');
      const data = await response.json();
      setNumberRanges(data.ranges || []);
    } catch (error) {
      console.error('Error fetching number ranges:', error);
      setError('Failed to fetch number ranges');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRange = async (range: NumberRange) => {
    try {
      const response = await fetch(`/api/transport-direct/admin/number-ranges/${range.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_number: range.current_number,
          max_number: range.max_number,
          is_active: range.is_active,
          description: range.description
        })
      });

      if (response.ok) {
        fetchNumberRanges();
        setEditingRange(null);
        alert('Number range updated successfully');
      } else {
        throw new Error('Failed to update number range');
      }
    } catch (error) {
      console.error('Error updating number range:', error);
      alert('Error updating number range');
    }
  };

  const handleCreateRange = async () => {
    try {
      const response = await fetch('/api/transport-direct/admin/number-ranges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRange)
      });

      if (response.ok) {
        fetchNumberRanges();
        setNewRange({
          range_prefix: '',
          range_type: 'STANDARD',
          description: '',
          current_number: 100000,
          max_number: 999999,
          is_active: true
        });
        alert('Number range created successfully');
      } else {
        throw new Error('Failed to create number range');
      }
    } catch (error) {
      console.error('Error creating number range:', error);
      alert('Error creating number range');
    }
  };

  const getRangeStatusBadge = (range: NumberRange) => {
    const usage = ((range.current_number - 100000) / (range.max_number - 100000)) * 100;
    
    if (!range.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    } else if (usage >= 90) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (usage >= 75) {
      return <Badge className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  const getRangeUsage = (range: NumberRange) => {
    const usage = ((range.current_number - 100000) / (range.max_number - 100000)) * 100;
    return Math.round(usage);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading transport number ranges...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transport Number Range Administration</h1>
          <p className="text-gray-600 mt-2">
            Manage transport request number ranges for different object types
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Range
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Number Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prefix">Range Prefix</Label>
                  <Input
                    id="prefix"
                    placeholder="e.g., A1, Y1, Z1"
                    value={newRange.range_prefix}
                    onChange={(e) => setNewRange(prev => ({ ...prev, range_prefix: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Range Type</Label>
                  <Select value={newRange.range_type} onValueChange={(value) => setNewRange(prev => ({ ...prev, range_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard Objects</SelectItem>
                      <SelectItem value="CUSTOM_DEV">Custom Development</SelectItem>
                      <SelectItem value="CUSTOMER">Customer Objects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Range description..."
                  value={newRange.description}
                  onChange={(e) => setNewRange(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current">Current Number</Label>
                  <Input
                    id="current"
                    type="number"
                    value={newRange.current_number}
                    onChange={(e) => setNewRange(prev => ({ ...prev, current_number: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max">Max Number</Label>
                  <Input
                    id="max"
                    type="number"
                    value={newRange.max_number}
                    onChange={(e) => setNewRange(prev => ({ ...prev, max_number: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewRange({
                  range_prefix: '',
                  range_type: 'STANDARD',
                  description: '',
                  current_number: 100000,
                  max_number: 999999,
                  is_active: true
                })}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRange}>
                  Create Range
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Number Range Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Standard Objects (A Series)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberRanges.filter(r => r.range_type === 'STANDARD').length}
            </div>
            <p className="text-gray-600 text-sm">Active Ranges</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Custom Development (Y Series)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberRanges.filter(r => r.range_type === 'CUSTOM_DEV').length}
            </div>
            <p className="text-gray-600 text-sm">Active Ranges</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customer Objects (Z Series)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numberRanges.filter(r => r.range_type === 'CUSTOMER').length}
            </div>
            <p className="text-gray-600 text-sm">Active Ranges</p>
          </CardContent>
        </Card>
      </div>

      {/* Number Ranges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Number Ranges</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prefix</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numberRanges.map((range) => (
                <TableRow key={range.id}>
                  <TableCell className="font-mono font-bold">{range.range_prefix}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {range.range_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingRange?.id === range.id ? (
                      <Input
                        value={editingRange.description}
                        onChange={(e) => setEditingRange(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                    ) : (
                      range.description
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRange?.id === range.id ? (
                      <Input
                        type="number"
                        value={editingRange.current_number}
                        onChange={(e) => setEditingRange(prev => prev ? { ...prev, current_number: parseInt(e.target.value) } : null)}
                      />
                    ) : (
                      range.current_number.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRange?.id === range.id ? (
                      <Input
                        type="number"
                        value={editingRange.max_number}
                        onChange={(e) => setEditingRange(prev => prev ? { ...prev, max_number: parseInt(e.target.value) } : null)}
                      />
                    ) : (
                      range.max_number.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            getRangeUsage(range) >= 90 ? 'bg-red-500' : 
                            getRangeUsage(range) >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(getRangeUsage(range), 100)}%` }}
                        />
                      </div>
                      <span className="text-sm">{getRangeUsage(range)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRangeStatusBadge(range)}
                  </TableCell>
                  <TableCell>
                    {editingRange?.id === range.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleUpdateRange(editingRange)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRange(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditingRange({...range})}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Number Range Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-green-700">A Series (A1-A9)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Standard ERP objects like master data, organizational units, and system configurations
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-blue-700">Y Series (Y1-Y9)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Custom development objects, enhancements, and custom programs
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-purple-700">Z Series (Z1-Z9)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Customer-specific customizations and modifications
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Auto-increment:</strong> When a range reaches its limit (999999), the system automatically creates the next level (e.g., A1 → A2 → A3 ... → A9)</p>
            <p><strong>Usage monitoring:</strong> Monitor usage percentages to plan for range transitions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}