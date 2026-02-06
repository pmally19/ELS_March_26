import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Settings } from "lucide-react";
import { useLocation } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";
const fieldStatusSchema = z.object({
  variant_code: z.string().min(1, "Variant code is required").max(10, "Variant code must be 10 characters or less"),
  variant_name: z.string().min(1, "Variant name is required").max(100, "Variant name must be 100 characters or less"),
  company_code_id: z.number().min(1, "Company code is required"),
  description: z.string().optional(),
  field_status_groups: z.array(z.object({
    group_code: z.string(),
    group_name: z.string(),
    field_controls: z.object({
      posting_key: z.enum(["optional", "required", "suppressed"]).default("optional"),
      account: z.enum(["optional", "required", "suppressed"]).default("required"),
      amount: z.enum(["optional", "required", "suppressed"]).default("required"),
      text: z.enum(["optional", "required", "suppressed"]).default("optional"),
      assignment: z.enum(["optional", "required", "suppressed"]).default("optional"),
      value_date: z.enum(["optional", "required", "suppressed"]).default("optional"),
      cost_center: z.enum(["optional", "required", "suppressed"]).default("optional"),
      profit_center: z.enum(["optional", "required", "suppressed"]).default("optional"),
      business_area: z.enum(["optional", "required", "suppressed"]).default("optional"),
      functional_area: z.enum(["optional", "required", "suppressed"]).default("optional"),
      tax_code: z.enum(["optional", "required", "suppressed"]).default("optional")
    })
  })),
  active: z.boolean().default(true)
});

type FieldStatusVariant = z.infer<typeof fieldStatusSchema> & { id: number };

const fieldStatusGroups = [
  { code: "G001", name: "General (with text, allocation)" },
  { code: "G003", name: "Material consumption accounts" },
  { code: "G004", name: "Cost accounts" },
  { code: "G005", name: "Bank accounts (obligatory value date)" },
  { code: "G006", name: "Material accounts" },
  { code: "G007", name: "Asset accounts" },
  { code: "G029", name: "Revenue accounts" },
  { code: "G030", name: "Change in stock accounts" },
  { code: "G067", name: "Reconciliation accounts" }
];

export default function FieldStatusVariants() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<FieldStatusVariant | null>(null);
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/field-status-variants"],
  });

  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/company-codes"],
  });

  const form = useForm<z.infer<typeof fieldStatusSchema>>({
    resolver: zodResolver(fieldStatusSchema),
    defaultValues: {
      variant_code: "",
      variant_name: "",
      company_code_id: 0,
      description: "",
      field_status_groups: [],
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof fieldStatusSchema>) =>
      apiRequest("/api/field-status-variants", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-status-variants"] });
      setOpen(false);
      setEditingVariant(null);
      form.reset();
      toast({ title: "Success", description: "Field status variant created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create field status variant", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof fieldStatusSchema>) =>
      apiRequest(`/api/field-status-variants/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-status-variants"] });
      setOpen(false);
      setEditingVariant(null);
      form.reset();
      toast({ title: "Success", description: "Field status variant updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update field status variant", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/field-status-variants/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-status-variants"] });
      toast({ title: "Success", description: "Field status variant deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete field status variant", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof fieldStatusSchema>) => {
    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (variant: FieldStatusVariant) => {
    setEditingVariant(variant);
    form.reset(variant);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingVariant(null);
    form.reset();
    setOpen(true);
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Field Status Variants</h1>
            <p className="text-muted-foreground">Configure field control settings for document entry screens</p>
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
                Create Field Status Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVariant ? "Edit Field Status Variant" : "Create Field Status Variant"}
                </DialogTitle>
                <DialogDescription>
                  Configure field control settings to determine which fields are optional, required, or suppressed
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="variant_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant Code</FormLabel>
                          <FormControl>
                            <Input placeholder="BA00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="variant_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Standard Field Status" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="company_code_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Code</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companyCodes.map((companyCode: any) => (
                              <SelectItem key={companyCode.id} value={companyCode.id.toString()}>
                                {companyCode.code} - {companyCode.name}
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
                          <Input placeholder="Field status variant description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Field Status Groups</h3>
                    <div className="grid gap-4">
                      {fieldStatusGroups.map((group) => (
                        <Card key={group.code}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              {group.code} - {group.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="font-medium">Field</div>
                              <div className="text-center">Optional</div>
                              <div className="text-center">Required</div>
                              <div className="text-center">Suppressed</div>
                              
                              {["account", "amount", "text", "cost_center"].map((field) => (
                                <div key={field} className="contents">
                                  <div className="capitalize">{field.replace("_", " ")}</div>
                                  <div className="text-center">
                                    <Checkbox />
                                  </div>
                                  <div className="text-center">
                                    <Checkbox />
                                  </div>
                                  <div className="text-center">
                                    <Checkbox />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingVariant ? "Update" : "Create"} Field Status Variant
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
            <Settings className="h-5 w-5" />
            <span>Field Status Variants</span>
          </CardTitle>
          <CardDescription>
            Manage field control settings for document entry screens and data validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading field status variants...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant Code</TableHead>
                  <TableHead>Variant Name</TableHead>
                  <TableHead>Company Code</TableHead>
                  <TableHead>Field Groups</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant: FieldStatusVariant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{variant.variant_code}</TableCell>
                    <TableCell>{variant.variant_name}</TableCell>
                    <TableCell>{variant.company_code_id}</TableCell>
                    <TableCell>{variant.field_status_groups?.length || 0} groups</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        variant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {variant.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(variant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(variant.id)}
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