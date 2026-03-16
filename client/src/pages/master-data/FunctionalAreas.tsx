import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Building2 } from "lucide-react";
import { useLocation } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
const functionalAreaSchema = z.object({
  code: z.string().min(1, "Code is required").max(16, "Code must be 16 characters or less"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().optional(),
  functional_area_type: z.enum(["manufacturing", "sales", "administration", "research", "finance", "hr", "it", "marketing"]),
  responsible_person: z.string().max(100, "Responsible person must be 100 characters or less").optional(),
  cost_center_assignment: z.boolean().default(true),
  profit_center_assignment: z.boolean().default(false),
  consolidation_unit: z.string().max(10, "Consolidation unit must be 10 characters or less").optional(),
  reporting_hierarchy: z.string().max(10, "Reporting hierarchy must be 10 characters or less").optional(),
  parent_functional_area: z.string().max(16, "Parent functional area must be 16 characters or less").optional(),
  active: z.boolean().default(true)
});

type FunctionalArea = z.infer<typeof functionalAreaSchema> & { id: number };

export default function FunctionalAreas() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<FunctionalArea | null>(null);
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: functionalAreas = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/functional-areas"],
  });

  const form = useForm<z.infer<typeof functionalAreaSchema>>({
    resolver: zodResolver(functionalAreaSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      functional_area_type: "manufacturing",
      responsible_person: "",
      cost_center_assignment: true,
      profit_center_assignment: false,
      consolidation_unit: "",
      reporting_hierarchy: "",
      parent_functional_area: "",
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof functionalAreaSchema>) =>
      apiRequest("/api/functional-areas", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/functional-areas"] });
      setOpen(false);
      setEditingArea(null);
      form.reset();
      toast({ title: "Success", description: "Functional area created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create functional area", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof functionalAreaSchema>) =>
      apiRequest(`/api/functional-areas/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/functional-areas"] });
      setOpen(false);
      setEditingArea(null);
      form.reset();
      toast({ title: "Success", description: "Functional area updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update functional area", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/functional-areas/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/functional-areas"] });
      toast({ title: "Success", description: "Functional area deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete functional area", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof functionalAreaSchema>) => {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (area: FunctionalArea) => {
    setEditingArea(area);
    form.reset(area);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingArea(null);
    form.reset();
    setOpen(true);
  };

  const functionalAreaTypes = [
    { value: "manufacturing", label: "Manufacturing" },
    { value: "sales", label: "Sales & Distribution" },
    { value: "administration", label: "General Administration" },
    { value: "research", label: "Research & Development" },
    { value: "finance", label: "Finance & Accounting" },
    { value: "hr", label: "Human Resources" },
    { value: "it", label: "Information Technology" },
    { value: "marketing", label: "Marketing & Communications" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Functional Areas</h1>
            <p className="text-muted-foreground">Configure functional area classifications for detailed reporting and analysis</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Functional Area
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingArea ? "Edit Functional Area" : "Create Functional Area"}
                </DialogTitle>
                <DialogDescription>
                  Configure functional area for detailed cost and revenue classification
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Functional Area Code</FormLabel>
                          <FormControl>
                            <Input placeholder="FA001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Functional Area Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Manufacturing Operations" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="functional_area_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Functional Area Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select functional area type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {functionalAreaTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Functional area description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsible Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Department Manager" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="consolidation_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consolidation Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="CONS001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="reporting_hierarchy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reporting Hierarchy</FormLabel>
                          <FormControl>
                            <Input placeholder="HIER001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="parent_functional_area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Functional Area</FormLabel>
                          <FormControl>
                            <Input placeholder="FA000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingArea ? "Update" : "Create"} Functional Area
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Functional Areas</span>
          </CardTitle>
          <CardDescription>
            Manage functional area classifications for detailed cost allocation and segment reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading functional areas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Responsible Person</TableHead>
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Profit Center</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {functionalAreas.map((area: FunctionalArea) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.code}</TableCell>
                    <TableCell>{area.name}</TableCell>
                    <TableCell className="capitalize">{area.functional_area_type}</TableCell>
                    <TableCell>{area.responsible_person || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        area.cost_center_assignment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {area.cost_center_assignment ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        area.profit_center_assignment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {area.profit_center_assignment ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        area.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {area.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(area)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(area.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}