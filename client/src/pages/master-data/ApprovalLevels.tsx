import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/apiClient";
import { Link } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCw, Plus, Pencil, Trash2, ChevronRight, ArrowLeft } from "lucide-react";

interface ApprovalLevel {
  id: number;
  level: number;
  name: string;
  description: string;
  value_limit: number | null;
  created_at: string;
  updated_at: string;
}

// Create validation schema
const approvalLevelSchema = z.object({
  level: z.coerce.number().min(1, "Level must be at least 1"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  value_limit: z.union([
    z.coerce.number().min(0, "Value limit must be a positive number"),
    z.literal("").transform(() => null)
  ]),
});

type ApprovalLevelFormValues = z.infer<typeof approvalLevelSchema>;

export default function ApprovalLevelsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<ApprovalLevel | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form setup with proper type
  const form = useForm<ApprovalLevelFormValues>({
    resolver: zodResolver(approvalLevelSchema),
    defaultValues: {
      level: 1,
      name: "",
      description: "",
      value_limit: "" as any, // Fix for type compatibility
    },
  });

  // Edit form setup
  const editForm = useForm<ApprovalLevelFormValues>({
    resolver: zodResolver(approvalLevelSchema),
    defaultValues: {
      level: 1,
      name: "",
      description: "",
      value_limit: "" as any,
    },
  });
  
  // Fetch approval levels data
  const { data: approvalLevels = [], isLoading, refetch } = useQuery<ApprovalLevel[]>({
    queryKey: ["/api/master-data/approval-level"],
    retry: 1,
  });

  // Create approval level mutation
  const createApprovalLevelMutation = useMutation({
    mutationFn: async (data: ApprovalLevelFormValues) => {
      const response = await fetch("/api/master-data/approval-level", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create approval level");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval level created successfully",
      });
      setIsDialogOpen(false);
      form.reset({
        level: 1,
        name: "",
        description: "",
        value_limit: "" as any,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/approval-level"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create approval level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update approval level mutation
  const updateApprovalLevelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ApprovalLevelFormValues }) => {
      const response = await fetch(`/api/master-data/approval-level/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update approval level");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval level updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingLevel(null);
      editForm.reset({
        level: 1,
        name: "",
        description: "",
        value_limit: "" as any,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/approval-level"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update approval level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete approval level mutation
  const deleteApprovalLevelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/master-data/approval-level/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete approval level");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approval level deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/approval-level"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete approval level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission with correct typing
  const onSubmit = async (data: ApprovalLevelFormValues) => {
    createApprovalLevelMutation.mutate(data);
  };

  // Handle search
  const filteredApprovalLevels = approvalLevels.filter((level) => {
    return (
      level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      level.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      level.level.toString().includes(searchTerm)
    );
  });

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "Unlimited";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Sort approval levels by level number
  const sortedApprovalLevels = [...filteredApprovalLevels].sort((a, b) => a.level - b.level);

  // Handle edit button click
  const handleEditClick = (level: ApprovalLevel) => {
    setEditingLevel(level);
    editForm.reset({
      level: level.level,
      name: level.name,
      description: level.description || "",
      value_limit: level.value_limit?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle edit form submission
  const onEditSubmit = async (data: ApprovalLevelFormValues) => {
    if (editingLevel) {
      updateApprovalLevelMutation.mutate({ id: editingLevel.id, data });
    }
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this approval level?")) {
      deleteApprovalLevelMutation.mutate(id);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
        <div className="flex items-center mb-6">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Approval Levels</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage purchase approval hierarchy and authorization limits
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                Add Approval Level
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Approval Level</DialogTitle>
                <DialogDescription>
                  Define a new level in the purchase approval hierarchy
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                  <FormField
                    control={form.control as any}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Numeric level in the approval hierarchy (e.g., 1, 2, 3)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Department Manager" {...field} />
                        </FormControl>
                        <FormDescription>
                          Name or title of the approval level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Approves department purchases up to $10,000" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="value_limit"
                    render={({ field: { ref, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Value Limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000 (leave empty for unlimited)" 
                            {...field}
                            onChange={(e) => onChange(e.target.value)}
                            ref={ref}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum transaction value in USD (leave empty for unlimited)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-6">
                    <Button 
                      type="submit"
                      disabled={createApprovalLevelMutation.isPending}
                    >
                      {createApprovalLevelMutation.isPending && (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Approval Level
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
            <div>
              <CardTitle>Approval Levels</CardTitle>
              <CardDescription>
                Define approval levels for purchase requisitions and other financial transactions
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search approval levels..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p>Loading approval levels...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Level</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Value Limit</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedApprovalLevels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          {searchTerm ? "No matching approval levels found." : "No approval levels found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedApprovalLevels.map((level) => (
                        <TableRow key={level.id}>
                          <TableCell className="font-medium">{level.level}</TableCell>
                          <TableCell>{level.name}</TableCell>
                          <TableCell>{level.description}</TableCell>
                          <TableCell>
                            {level.value_limit === null ? (
                              <Badge variant="outline">Unlimited</Badge>
                            ) : (
                              formatCurrency(level.value_limit)
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => handleEditClick(level)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => handleDelete(level.id)}
                                disabled={deleteApprovalLevelMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile View */}
              <div className="md:hidden">
                {sortedApprovalLevels.length === 0 ? (
                  <div className="bg-white border rounded-md p-6 text-center text-gray-500">
                    {searchTerm ? "No matching approval levels found." : "No approval levels found."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedApprovalLevels.map((level) => (
                      <div key={`mobile-level-${level.id}`} className="bg-white border rounded-md overflow-hidden">
                        <div className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                Level {level.level}
                              </Badge>
                              <div className="font-medium text-base">{level.name}</div>
                            </div>
                            <div>
                              {level.value_limit === null ? (
                                <Badge variant="outline">Unlimited</Badge>
                              ) : (
                                <Badge variant="secondary">{formatCurrency(level.value_limit)}</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm text-muted-foreground">
                            {level.description}
                          </div>
                          
                          <div className="mt-3 flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditClick(level)}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(level.id)}
                              disabled={deleteApprovalLevelMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Approval Level</DialogTitle>
            <DialogDescription>
              Update the approval level details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit as any)} className="space-y-4">
              <FormField
                control={editForm.control as any}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Numeric level in the approval hierarchy (e.g., 1, 2, 3)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control as any}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Department Manager" {...field} />
                    </FormControl>
                    <FormDescription>
                      Name or title of the approval level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control as any}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Approves department purchases up to $10,000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control as any}
                name="value_limit"
                render={({ field: { ref, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Value Limit</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10000 (leave empty for unlimited)" 
                        {...field}
                        onChange={(e) => onChange(e.target.value)}
                        ref={ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum transaction value in USD (leave empty for unlimited)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingLevel(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateApprovalLevelMutation.isPending}
                >
                  {updateApprovalLevelMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Approval Level
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}