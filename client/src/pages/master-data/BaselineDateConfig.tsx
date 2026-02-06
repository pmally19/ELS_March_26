import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus, Search, Settings, Edit, Trash2 } from "lucide-react";

// Define the baseline date schema
const baselineDateSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type BaselineDateFormValues = z.infer<typeof baselineDateSchema>;

interface BaselineDate {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function BaselineDateConfig() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBaselineDate, setEditingBaselineDate] = useState<BaselineDate | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch baseline dates
  const { data: baselineDates = [], isLoading, error } = useQuery({
    queryKey: ["/api/master-data/baseline-dates"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/baseline-dates");
      if (!response.ok) throw new Error("Failed to fetch baseline dates");
      return response.json();
    },
  });

  // Create baseline date mutation
  const createMutation = useMutation({
    mutationFn: async (data: BaselineDateFormValues) => {
      const response = await fetch("/api/master-data/baseline-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create baseline date");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/baseline-dates"] });
      setShowForm(false);
      toast({
        title: "Success",
        description: "Baseline date created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create baseline date",
        variant: "destructive",
      });
    },
  });

  // Update baseline date mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BaselineDateFormValues }) => {
      const response = await fetch(`/api/master-data/baseline-dates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update baseline date");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/baseline-dates"] });
      setIsEditDialogOpen(false);
      setEditingBaselineDate(null);
      toast({
        title: "Success",
        description: "Baseline date updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update baseline date",
        variant: "destructive",
      });
    },
  });

  // Delete baseline date mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/baseline-dates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete baseline date");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/baseline-dates"] });
      toast({
        title: "Success",
        description: "Baseline date deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete baseline date",
        variant: "destructive",
      });
    },
  });

  // Create form
  const form = useForm<BaselineDateFormValues>({
    resolver: zodResolver(baselineDateSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Edit form
  const editForm = useForm<BaselineDateFormValues>({
    resolver: zodResolver(baselineDateSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const handleSubmit = (values: BaselineDateFormValues) => {
    createMutation.mutate(values);
  };

  const handleEdit = (item: BaselineDate) => {
    setEditingBaselineDate(item);
    editForm.reset({
      code: item.code,
      name: item.name,
      description: item.description || "",
      isActive: item.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (values: BaselineDateFormValues) => {
    if (editingBaselineDate) {
      updateMutation.mutate({ id: editingBaselineDate.id, data: values });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this baseline date?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredItems = baselineDates.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Baseline Dates</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Failed to load baseline dates"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/master-data/payment-terms'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payment Terms
          </Button>
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Baseline Date Configuration</h1>
            <p className="text-gray-600">Manage baseline date options for payment terms</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Baseline Date
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search baseline dates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Baseline Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code*</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., document_date"
                          required
                        />
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
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Document Date"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Description of the baseline date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Baseline Date"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Baseline Dates</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredItems.length} baseline dates found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading baseline dates...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No baseline dates found</div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.code}
                      </span>
                      <h3 className="font-semibold">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Baseline Date</DialogTitle>
            <DialogDescription>
              Update the baseline date details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., document_date" required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Document Date" required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Description of the baseline date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}