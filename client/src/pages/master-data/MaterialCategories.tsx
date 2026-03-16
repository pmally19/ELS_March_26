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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Define the Material Category type
type MaterialCategory = {
  id: number;
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  parent_code?: string;
  parent_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// Material Category Form Schema
const materialCategorySchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().optional(),
  parent_id: z.number().optional().nullable(),
  active: z.boolean().default(true),
});

// Material Category Management Page
export default function MaterialCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch material categories
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<MaterialCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch data function
  const fetchData = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/master-data/material-categories", {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      // Ensure data is an array and includes all necessary fields
      const validData = Array.isArray(data) ? data.map((cat: any) => ({
        ...cat,
        parent_id: cat.parent_id || null,
        parent_code: cat.parent_code || null,
        parent_name: cat.parent_name || null
      })) : [];
      setCategories(validData);
      setFilteredCategories(validData);
      setCategoriesLoading(false);
    } catch (error: any) {
      console.error("Error fetching material categories:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch material categories",
        variant: "destructive",
      });
      setCategoriesLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    toast({
      title: "Refreshing Data",
      description: "Loading latest material categories...",
    });
    await fetchData();
    toast({
      title: "Data Refreshed",
      description: "Material categories have been updated successfully.",
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

  // Material category form setup
  const form = useForm<z.infer<typeof materialCategorySchema>>({
    resolver: zodResolver(materialCategorySchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      parent_id: null,
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
        parent_id: editingCategory.parent_id || null,
        active: editingCategory.active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        parent_id: null,
        active: true,
      });
    }
  }, [editingCategory, form]);

  // Create material category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (category: z.infer<typeof materialCategorySchema>) => {
      return apiRequest(`/api/master-data/material-categories`, {
        method: "POST",
        body: JSON.stringify(category)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || "Failed to create material category");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Category created successfully",
      });
      fetchData();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create Material Category",
        variant: "destructive",
      });
    },
  });

  // Update material category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (data: { id: number; category: z.infer<typeof materialCategorySchema> }) => {
      return apiRequest(`/api/master-data/material-categories/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.category),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Category updated successfully",
      });
      fetchData();
      setShowDialog(false);
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Material Category",
        variant: "destructive",
      });
    },
  });

  // Delete material category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/material-categories/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Material Category deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/material-categories"] });
      fetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Material Category",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: z.infer<typeof materialCategorySchema>) => {
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
  const handleEdit = (category: MaterialCategory) => {
    setEditingCategory(category);
    setShowDialog(true);
  };

  // Function to handle deleting a category
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this Material Category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  // Fetch parent categories from API (top-level categories only)
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [parentCategoriesLoading, setParentCategoriesLoading] = useState(true);

  const fetchParentCategories = async () => {
    try {
      setParentCategoriesLoading(true);
      const response = await fetch("/api/master-data/parent-categories", {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current category if editing
        const filtered = editingCategory 
          ? data.filter((cat: any) => cat.id !== editingCategory.id)
          : data;
        setParentCategories(filtered);
      }
      setParentCategoriesLoading(false);
    } catch (error) {
      console.error("Error fetching parent categories:", error);
      setParentCategoriesLoading(false);
    }
  };

  // Fetch parent categories when dialog opens or editing changes
  useEffect(() => {
    if (showDialog) {
      fetchParentCategories();
    }
  }, [showDialog, editingCategory]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Material Categories</h1>
            <p className="text-sm text-muted-foreground">
              Classification categories for materials and products
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
            New Category
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search material categories..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Material Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Categories</CardTitle>
          <CardDescription>
            All registered material category classifications
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
                    <TableHead className="hidden md:table-cell">Parent Category</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No material categories found. {searchQuery ? "Try a different search." : "Create your first material category."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => (
                      <TableRow key={category.id} className={category.parent_id ? "bg-blue-50" : ""}>
                        <TableCell className="font-medium">{category.code}</TableCell>
                        <TableCell>
                          {category.name}
                          {category.parent_id && (
                            <span className="ml-2 text-xs text-blue-600">(Child)</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{category.description || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {category.parent_id && category.parent_code && category.parent_name 
                            ? (
                              <span className="text-blue-600 font-medium">
                                {category.parent_code} - {category.parent_name}
                              </span>
                            )
                            : (
                              <span className="text-gray-500 italic">Top Level</span>
                            )}
                        </TableCell>
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

      {/* Material Category Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Material Category" : "Create Material Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the material category details below"
                : "Add a new material category classification"}
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
                        Unique code for this category (max 10 characters)
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
                        Display name for the category
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
                        placeholder="Brief description of this category" 
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
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "NONE" ? null : parseInt(value))}
                      value={field.value ? String(field.value) : "NONE"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None (Top Level)</SelectItem>
                        {parentCategoriesLoading ? (
                          <SelectItem value="loading" disabled>Loading parent categories...</SelectItem>
                        ) : parentCategories.length === 0 ? (
                          <SelectItem value="no-parents" disabled>No parent categories available. Create parent categories first.</SelectItem>
                        ) : (
                          parentCategories.map((parent) => (
                            <SelectItem key={parent.id} value={String(parent.id)}>
                              {parent.code} - {parent.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional: Select a parent category to create a hierarchy
                    </FormDescription>
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
                        Is this category active and available for use?
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

