import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Trash2, ArrowLeft } from "lucide-react";

type ShippingCondition = {
  id: number;
  conditionCode: string;
  description: string;
  loadingGroup?: string;
  plantCode?: string;
  proposedShippingPoint?: string;
  manualShippingPointAllowed?: boolean;
  countryOfDeparture?: string;
  departureZone?: string;
  transportationGroup?: string;
  countryOfDestination?: string;
  receivingZone?: string;
  weightGroup?: string;
  proposedRoute?: string;
  isActive?: boolean;
};

export default function ShippingConditions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conditions = [], isLoading, refetch } = useQuery<ShippingCondition[]>({
    queryKey: ["/api/sales-distribution/shipping-conditions"],
    queryFn: async () => {
      const res = await apiRequest("/api/sales-distribution/shipping-conditions");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch shipping points for dropdown
  const { data: shippingPoints = [] } = useQuery({
    queryKey: ["/api/sales-distribution/shipping-points"],
    queryFn: async () => {
      const res = await apiRequest("/api/sales-distribution/shipping-points");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const [form, setForm] = useState<Partial<ShippingCondition>>({
    conditionCode: "",
    description: "",
    isActive: true,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<ShippingCondition>) => {
      const res = await apiRequest("/api/sales-distribution/shipping-conditions", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Shipping condition created" });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/shipping-conditions"] });
      setForm({ conditionCode: "", description: "", isActive: true });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    }
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/sales-distribution/shipping-conditions/seed-basic", { method: "POST" });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Seeded", description: "Sample shipping conditions added" });
      refetch();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to seed", variant: "destructive" });
    }
  });

  const handleChange = (key: keyof ShippingCondition, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = () => {
    if (!form.conditionCode || !form.description) {
      toast({ title: "Validation", description: "Condition Code and Description are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="p-6 space-y-6">
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
          Master Data → Shipping Conditions
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shipping Conditions</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>Seed Sample</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Condition Code *</Label>
              <Input value={form.conditionCode || ""} onChange={(e) => handleChange("conditionCode", e.target.value)} placeholder="STND / EXPR / PICK" />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description || ""} onChange={(e) => handleChange("description", e.target.value)} placeholder="Standard Shipping" />
            </div>
            <div className="space-y-2">
              <Label>Loading Group</Label>
              <Input value={form.loadingGroup || ""} onChange={(e) => handleChange("loadingGroup", e.target.value)} placeholder="0001" />
            </div>
            <div className="space-y-2">
              <Label>Plant (Delivering)</Label>
              <Input value={form.plantCode || ""} onChange={(e) => handleChange("plantCode", e.target.value)} placeholder="1001" />
            </div>
            <div className="space-y-2">
              <Label>Proposed Shipping Point</Label>
              <Select
                value={form.proposedShippingPoint || ""}
                onValueChange={(value) => handleChange("proposedShippingPoint", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping point" />
                </SelectTrigger>
                <SelectContent>
                  {shippingPoints.map((point: any) => (
                    <SelectItem key={point.id} value={point.code || point.shipping_point_code || String(point.id)}>
                      {point.code || point.shipping_point_code} - {point.name || point.description || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proposed Route</Label>
              <Input value={form.proposedRoute || ""} onChange={(e) => handleChange("proposedRoute", e.target.value)} placeholder="R001" />
            </div>
            <div className="space-y-2">
              <Label>Country of Departure</Label>
              <Input value={form.countryOfDeparture || ""} onChange={(e) => handleChange("countryOfDeparture", e.target.value)} placeholder="US" />
            </div>
            <div className="space-y-2">
              <Label>Transportation Group</Label>
              <Input value={form.transportationGroup || ""} onChange={(e) => handleChange("transportationGroup", e.target.value)} placeholder="0001" />
            </div>
            <div className="space-y-2">
              <Label>Country of Destination</Label>
              <Input value={form.countryOfDestination || ""} onChange={(e) => handleChange("countryOfDestination", e.target.value)} placeholder="US" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Create</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>Ship Point</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Manual</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conditions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.conditionCode}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>{c.plantCode || "-"}</TableCell>
                    <TableCell>{c.proposedShippingPoint || "-"}</TableCell>
                    <TableCell>{c.proposedRoute || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!c.manualShippingPointAllowed}
                        onCheckedChange={async (val) => {
                          try {
                            const res = await apiRequest(`/api/sales-distribution/shipping-conditions/${c.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ manualShippingPointAllowed: val })
                            });
                            await res.json();
                            refetch();
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to update', variant: 'destructive' });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.isActive !== false}
                        onCheckedChange={async (val) => {
                          try {
                            const res = await apiRequest(`/api/sales-distribution/shipping-conditions/${c.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ isActive: val })
                            });
                            await res.json();
                            refetch();
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to update', variant: 'destructive' });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>{c.countryOfDeparture || "-"}</TableCell>
                    <TableCell>{c.countryOfDestination || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await apiRequest(`/api/sales-distribution/shipping-conditions/${c.id}`, { method: 'DELETE' });
                            await res.json();
                            toast({ title: 'Deleted', description: `${c.conditionCode} removed` });
                            refetch();
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {conditions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No shipping conditions found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


