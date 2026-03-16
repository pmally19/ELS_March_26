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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, MoreHorizontal, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Define the Parent Category type
type ParentCategory = {
  id: number;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// Parent Category Form Schema
const parentCategorySchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

// Parent Category Management Page
export default function ParentCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ParentCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch parent categories
  const [categories, setCategories] = useState<ParentCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ParentCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch data function
  const fetchData = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/master-data/parent-categories", {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      
      const data = await response.json();
      // Backend already filters to parent_id IS NULL, but add defensive check
      const parentCategoriesOnly = Array.isArray(data) 
        ? data.filter((cat: any) => {
            // Ensure only true parent categories (parent_id is null/undefined)
            return (cat.parent_id == null || cat.parent_id === undefined) && 
                   // Also ensure the category doesn't have parent_code/parent_name (defensive)
                   (!cat.parent_code && !cat.parent_name);
          })
        : [];
      setCategories(parentCategoriesOnly);
      setFilteredCategories(parentCategoriesOnly);
      setCategoriesLoading(false);
    } catch (error: any) {
      console.error("Error fetching parent categories:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch parent categories",
        variant: "destructive",
      });
      setCategoriesLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest parent categories...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Parent categories have been updated successfully.",
    });
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Filter categories based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(categories);
    } else {
      setFilteredCategories(
        categories.filter(
          (category) =>
            category.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (category.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, categories]);

  // Parent category form setup
  const form = useForm<z.infer<typeof parentCategorySchema>>({
    resolver: zodResolver(parentCategorySchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingCategory) {
      form.reset({
        code: editingCategory.code,
        name: editingCategory.name,
        description: editingCategory.description || "",
        active: editingCategory.active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        active: true,
      });
    }
  }, [editingCategory, form]);

  // Create parent category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (category: z.infer<typeof parentCategorySchema>) => {
      const res = await apiRequest(`/api/master-data/parent-categories`, {
        method: "POST",
        body: JSON.stringify(category)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to create parent category");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parent Category created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/parent-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-categories"] });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Parent Category",
        variant: "destructive",
      });
    },
  });

  // Update parent category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: number; category: z.infer<typeof parentCategorySchema> }) => {
      const res = await apiRequest(`/api/master-data/parent-categories/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.category),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to update parent category");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Parent Category updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/parent-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-categories"] });
      fetchData();
      setShowDialog(false);
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Parent Category",
        variant: "destructive",
      });
    },
  });

  // Delete parent category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/master-data/parent-categories/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to delete parent category");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const message = data?.message || "Parent Category deleted successfully";
      const hasChildren = data?.hadChildCategories ? " (inactive child categories were preserved)" : "";
      
      toast({
        title: "Success",
        description: message + hasChildren,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/parent-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-categories"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Parent Category",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof parentCategorySchema>) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, category: values });
    } else {
      createCategoryMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingCategory(null);
    form.reset();
  };

  // Function to handle editing a category
  const handleEdit = (category: ParentCategory) => {
    setEditingCategory(category);
    setShowDialog(true);
  };

  // Function to handle deleting a category
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Parent Category? This will affect all child categories that reference it.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Parent Categories</h1>
            <p className="text-sm text-muted-foreground">
              Top-level category classifications for materials
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={categoriesLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${categoriesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Parent Category
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parent categories..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Parent Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parent Categories</CardTitle>
          <CardDescription>
            Top-level categories that can be used as parent categories for material categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No parent categories found. {searchQuery ? "Try a different search." : "Create your first parent category."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id} className="bg-green-50">
                        <TableCell className="font-medium">{category.code}</TableCell>
                        <TableCell>
                          {category.name}
                          <span className="ml-2 text-xs text-green-600">(Parent)</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{category.description || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              category.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {category.active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parent Category Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Parent Category" : "Create Parent Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the parent category details below"
                : "Add a new top-level category that can be used as a parent for material categories"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="E.g., FINISHED" 
                          {...field} 
                          disabled={!!editingCategory}
                        />
                      </FormControl>
                      <FormDescription>
                        Unique code for this parent category (max 10 characters)
                      </FormDescription>
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
                          placeholder="E.g., Finished Products" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Display name for the parent category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of this parent category" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Is this parent category active and available for use?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                    "Saving..."
                  ) : (
                    editingCategory ? "Save Changes" : "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

