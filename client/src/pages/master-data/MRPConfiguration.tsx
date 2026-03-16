import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal, Settings, ListFilter, ClipboardCheck, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Generic Schema for simple entities (Procurement Type, Lot Size, MRP Procedure)
const genericSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// MRP Type Schema (More complex)
const mrpTypeSchema = genericSchema.extend({
  planningIndicator: z.boolean().default(true),
  mrpProcedure: z.string().optional(),
});

type GenericEntity = z.infer<typeof genericSchema> & { id: number; createdAt: string; updatedAt: string };
type MrpTypeEntity = z.infer<typeof mrpTypeSchema> & { id: number; createdAt: string; updatedAt: string };

export default function MRPConfiguration() {
  const [activeTab, setActiveTab] = useState("mrp-types");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Data
  const { data: mrpTypes = [], isLoading: isLoadingMrpTypes } = useQuery<MrpTypeEntity[]>({
    queryKey: ["/api/master-data/mrp-config/mrp-types"],
  });

  const { data: procurementTypes = [], isLoading: isLoadingProcurement } = useQuery<GenericEntity[]>({
    queryKey: ["/api/master-data/mrp-config/procurement-types"],
  });

  const { data: lotSizes = [], isLoading: isLoadingLotSizes } = useQuery<GenericEntity[]>({
    queryKey: ["/api/master-data/mrp-config/lot-sizes"],
  });

  const { data: mrpProcedures = [], isLoading: isLoadingProcedures } = useQuery<GenericEntity[]>({
    queryKey: ["/api/master-data/mrp-config/mrp-procedures"],
  });

  // Determine current dataset and schema based on tab
  const getTabData = () => {
    switch (activeTab) {
      case "mrp-types": return { data: mrpTypes, label: "MRP Type", endpoint: "/api/master-data/mrp-config/mrp-types", schema: mrpTypeSchema };
      case "procurement-types": return { data: procurementTypes, label: "Procurement Type", endpoint: "/api/master-data/mrp-config/procurement-types", schema: genericSchema };
      case "lot-sizes": return { data: lotSizes, label: "Lot Size", endpoint: "/api/master-data/mrp-config/lot-sizes", schema: genericSchema };
      case "mrp-procedures": return { data: mrpProcedures, label: "MRP Procedure", endpoint: "/api/master-data/mrp-config/mrp-procedures", schema: genericSchema };
      default: return { data: [], label: "", endpoint: "", schema: genericSchema };
    }
  };

  const { data: currentData, label: currentLabel, endpoint: currentEndpoint, schema: currentSchema } = getTabData();

  const filteredData = currentData.filter((item: any) => 
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Form Setup
  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
      planningIndicator: true,
      mrpProcedure: "",
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset({
        code: editingItem.code,
        name: editingItem.name,
        description: editingItem.description || "",
        isActive: editingItem.isActive,
        planningIndicator: editingItem.planningIndicator ?? true,
        mrpProcedure: editingItem.mrpProcedure || "",
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        isActive: true,
        planningIndicator: true,
        mrpProcedure: "",
      });
    }
  }, [editingItem, form, activeTab]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => apiRequest(currentEndpoint, { method: "POST", body: JSON.stringify(values) }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEndpoint] });
      toast({ title: "Success", description: `${currentLabel} created successfully` });
      setShowDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create record", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; values: any }) => 
      apiRequest(`${currentEndpoint}/${data.id}`, { method: "PUT", body: JSON.stringify(data.values) }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEndpoint] });
      toast({ title: "Success", description: `${currentLabel} updated successfully` });
      setShowDialog(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update record", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`${currentEndpoint}/${id}`, { method: "DELETE" }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEndpoint] });
      toast({ title: "Success", description: `${currentLabel} deleted successfully` });
    }
  });

  const onSubmit = (values: any) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [currentEndpoint] });
    toast({ title: "Refreshing", description: `Updating ${currentLabel} data...` });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/master-data">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MRP Configuration</h1>
            <p className="text-muted-foreground">Manage Material Requirements Planning master data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingItem(null); setShowDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add {currentLabel}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full lg:w-[600px]">
          <TabsTrigger value="mrp-types">MRP Types</TabsTrigger>
          <TabsTrigger value="procurement-types">Procurement</TabsTrigger>
          <TabsTrigger value="lot-sizes">Lot Sizes</TabsTrigger>
          <TabsTrigger value="mrp-procedures">Procedures</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentLabel}s</CardTitle>
                <CardDescription>Configuration for {currentLabel.toLowerCase()} used in Material Master</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${currentLabel.toLowerCase()}s...`}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {activeTab === "mrp-types" && <TableHead>Planning Ind.</TableHead>}
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "mrp-types" ? 6 : 5} className="text-center h-24 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                      {activeTab === "mrp-types" && (
                        <TableCell>
                          <Badge variant={item.planningIndicator ? "default" : "secondary"}>
                            {item.planningIndicator ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={item.isActive ? "success" : "destructive"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingItem(item); setShowDialog(true); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => { if(confirm(`Are you sure you want to delete this ${currentLabel}?`)) deleteMutation.mutate(item.id); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"} {currentLabel}</DialogTitle>
            <DialogDescription>
              Enter the details for the {currentLabel.toLowerCase()} below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. PD" maxLength={10} disabled={!!editingItem} />
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={`Enter ${currentLabel.toLowerCase()} name`} />
                    </FormControl>
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
                      <Input {...field} placeholder="Optional description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {activeTab === "mrp-types" && (
                <>
                  <FormField
                    control={form.control}
                    name="planningIndicator"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Planning Indicator</FormLabel>
                          <p className="text-xs text-muted-foreground">Relevant for MRP planning runs</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mrpProcedure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MRP Procedure</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. D" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-xs text-muted-foreground">Available for use in the system</p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
