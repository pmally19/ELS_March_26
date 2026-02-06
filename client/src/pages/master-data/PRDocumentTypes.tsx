import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/apiClient";
import { Link } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Edit, Trash2, ArrowLeft, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SearchRefreshBar } from "@/components/ui/search-refresh-bar";

// Types
interface PRDocumentType {
    id: number;
    code: string;
    name: string;
    description?: string;
    numberRangeId?: number;
    itemControl?: string;
    processingControl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Validation Schema
const prDocTypeSchema = z.object({
    code: z.string()
        .min(2, "Code must be at least 2 characters")
        .max(10, "Code must be at most 10 characters")
        .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, underscores, and hyphens")
        .transform(val => val.toUpperCase()),
    name: z.string()
        .min(3, "Name must be at least 3 characters")
        .max(100, "Name must be 100 characters or less"),
    description: z.string().optional().or(z.literal("")),
    numberRangeId: z.coerce.number().optional().nullable(),
    itemControl: z.string().optional().or(z.literal("")),
    processingControl: z.string().optional().or(z.literal("")),
    isActive: z.boolean().default(true),
});

export default function PRDocumentTypes() {
    // State
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<PRDocumentType | null>(null);
    const [deletingType, setDeletingType] = useState<PRDocumentType | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Forms
    const addForm = useForm<z.infer<typeof prDocTypeSchema>>({
        resolver: zodResolver(prDocTypeSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            numberRangeId: null,
            itemControl: "0",
            processingControl: "0",
            isActive: true,
        },
    });

    const editForm = useForm<z.infer<typeof prDocTypeSchema>>({
        resolver: zodResolver(prDocTypeSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            numberRangeId: null,
            itemControl: "0",
            processingControl: "0",
            isActive: true,
        },
    });

    // Queries
    const { data: documentTypes = [], isLoading } = useQuery<PRDocumentType[]>({
        queryKey: ['/api/master-data/pr-document-types'],
    });

    // Fetch number ranges from document_number_ranges table
    const { data: numberRanges = [] } = useQuery({
        queryKey: ['/api/master-data/number-ranges'],
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (data: z.infer<typeof prDocTypeSchema>) =>
            apiRequest('/api/master-data/pr-document-types', 'POST', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/pr-document-types'] });
            setIsAddDialogOpen(false);
            addForm.reset();
            toast({ title: "Success", description: "PR Document Type created." });
        },
        onError: (err: any) => {
            toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create." });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: z.infer<typeof prDocTypeSchema> }) =>
            apiRequest(`/api/master-data/pr-document-types/${id}`, 'PUT', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/pr-document-types'] });
            setIsEditDialogOpen(false);
            setEditingType(null);
            toast({ title: "Success", description: "PR Document Type updated." });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiRequest(`/api/master-data/pr-document-types/${id}`, 'DELETE'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data/pr-document-types'] });
            setIsDeleteDialogOpen(false);
            toast({ title: "Success", description: "PR Document Type deleted." });
        },
    });

    // Handlers
    const openEditDialog = (type: PRDocumentType) => {
        setEditingType(type);
        editForm.reset({
            code: type.code,
            name: type.name,
            description: type.description || "",
            numberRangeId: type.numberRangeId || null,
            itemControl: type.itemControl || "0",
            processingControl: type.processingControl || "0",
            isActive: type.isActive,
        });
        setIsEditDialogOpen(true);
    };

    const filteredTypes = documentTypes.filter(type =>
        !searchQuery ||
        type.code.toUpperCase().includes(searchQuery.toUpperCase()) ||
        type.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">PR Document Types</h1>
                        <p className="text-sm text-muted-foreground">Manage purchase requisition document types and number ranges</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Document Type
                </Button>
            </div>

            <SearchRefreshBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                resourceName="PR document type"
                queryKey="/api/master-data/pr-document-types"
            />

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Number Range</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                                </TableRow>
                            ) : filteredTypes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">No PR Document Types found</TableCell>
                                </TableRow>
                            ) : (
                                filteredTypes.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.code}</TableCell>
                                        <TableCell>{type.name}</TableCell>
                                        <TableCell>
                                            {type.numberRangeId ? (
                                                <Badge variant="outline">
                                                    {numberRanges.find(nr => nr.id === type.numberRangeId)?.code || type.numberRangeId}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {type.description || <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={type.isActive ? "default" : "secondary"}>
                                                {type.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(type)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingType(type); setIsDeleteDialogOpen(true); }}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
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

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create PR Document Type</DialogTitle>
                        <DialogDescription>Add a new purchase requisition document type with number range assignment.</DialogDescription>
                    </DialogHeader>
                    <Form {...addForm}>
                        <form onSubmit={addForm.handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={addForm.control} name="code" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code *</FormLabel>
                                        <FormControl><Input {...field} maxLength={10} placeholder="e.g. STD" className="uppercase" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={addForm.control} name="numberRangeId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number Range</FormLabel>
                                        <Select onValueChange={v => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select number range" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {numberRanges.map((nr: any) => (
                                                    <SelectItem key={nr.id} value={nr.id.toString()}>
                                                        {nr.code} - {nr.name} ({nr.fromNumber} to {nr.toNumber})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={addForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g. Standard Purchase Requisition" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={addForm.control} name="itemControl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Control</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "0"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="0">No Limit</SelectItem>
                                                <SelectItem value="1">One Item Only</SelectItem>
                                                <SelectItem value="2">Multiple Items Required</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={addForm.control} name="processingControl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Processing Control</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "0"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="0">Normal Processing</SelectItem>
                                                <SelectItem value="1">Release Immediately</SelectItem>
                                                <SelectItem value="2">Blocked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={addForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea {...field} placeholder="Describe the purpose of this document type..." rows={3} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={addMutation.isPending}>
                                    {addMutation.isPending ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit PR Document Type</DialogTitle>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit((d) => editingType && updateMutation.mutate({ id: editingType.id, data: d }))} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={editForm.control} name="code" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code *</FormLabel>
                                        <FormControl><Input {...field} maxLength={10} className="uppercase" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={editForm.control} name="numberRangeId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number Range</FormLabel>
                                        <Select onValueChange={v => field.onChange(v ? parseInt(v) : null)} value={field.value?.toString() || ""}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select number range" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {numberRanges.map((nr: any) => (
                                                    <SelectItem key={nr.id} value={nr.id.toString()}>
                                                        {nr.code} - {nr.name} ({nr.fromNumber} to {nr.toNumber})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={editForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={editForm.control} name="itemControl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Item Control</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "0"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="0">No Limit</SelectItem>
                                                <SelectItem value="1">One Item Only</SelectItem>
                                                <SelectItem value="2">Multiple Items Required</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={editForm.control} name="processingControl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Processing Control</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "0"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="0">Normal Processing</SelectItem>
                                                <SelectItem value="1">Release Immediately</SelectItem>
                                                <SelectItem value="2">Blocked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={editForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl><Textarea {...field} rows={3} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Updating..." : "Update"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the PR document type
                            <span className="font-bold"> {deletingType?.code} - {deletingType?.name}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletingType && deleteMutation.mutate(deletingType.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
