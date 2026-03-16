import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
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
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Pencil, Trash2, Search, ArrowUpDown, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

// Schema for form validation
const formSchema = z.object({
    code: z.string().min(1, "Code is required").max(10, "Code must be less than 10 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    description: z.string().optional(),
    affects_gl: z.boolean().default(true),
    allows_negative: z.boolean().default(false),
    is_active: z.boolean().default(true)
});

type FormValues = z.infer<typeof formSchema>;

interface MovementClass {
    id: number;
    code: string;
    name: string;
    description?: string;
    affects_gl: boolean;
    allows_negative: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function MovementClasses() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MovementClass | null>(null);

    // Fetch data
    const { data: items = [], isLoading, error, isError } = useQuery<MovementClass[]>({
        queryKey: ['/api/master-data-crud/movement-classes'],
        queryFn: async () => {
            return await apiRequest<MovementClass[]>('/api/master-data-crud/movement-classes', 'GET');
        }
    });

    // Filter data based on search
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Debug effect
    useEffect(() => {
        if (isError) console.error("Movement Classes Fetch Error:", error);
    }, [isError, error]);

    // Create/Update mutation
    const mutation = useMutation({
        mutationFn: async (values: FormValues) => {
            if (selectedItem) {
                return apiRequest(`/api/master-data-crud/movement-classes/${selectedItem.id}`, 'PUT', values);
            } else {
                return apiRequest('/api/master-data-crud/movement-classes', 'POST', values);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data-crud/movement-classes'] });
            setIsDialogOpen(false);
            setSelectedItem(null);
            toast({
                title: selectedItem ? "Updated successfully" : "Created successfully",
                description: `Movement Class has been ${selectedItem ? "updated" : "created"}.`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Something went wrong",
                variant: "destructive"
            });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiRequest(`/api/master-data-crud/movement-classes/${id}`, 'DELETE');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/master-data-crud/movement-classes'] });
            setIsDeleteDialogOpen(false);
            setSelectedItem(null);
            toast({
                title: "Deleted successfully",
                description: "Movement Class has been deleted.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete item",
                variant: "destructive"
            });
        }
    });

    // Form handling
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            affects_gl: true,
            allows_negative: false,
            is_active: true
        }
    });

    const onSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const openCreateDialog = () => {
        setSelectedItem(null);
        form.reset({
            code: "",
            name: "",
            description: "",
            affects_gl: true,
            allows_negative: false,
            is_active: true
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item: MovementClass) => {
        setSelectedItem(item);
        form.reset({
            code: item.code,
            name: item.name,
            description: item.description || "",
            affects_gl: item.affects_gl,
            allows_negative: item.allows_negative,
            is_active: item.is_active
        });
        setIsDialogOpen(true);
    };

    const openDeleteDialog = (item: MovementClass) => {
        setSelectedItem(item);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Movement Classes</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage technical inventory movement logic and control parameters.
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    New Movement Class
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search movement classes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">
                                        <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                                            Code <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                                            Name <ArrowUpDown className="h-3 w-3" />
                                        </div>
                                    </TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px] text-center">Affects GL</TableHead>
                                    <TableHead className="w-[100px] text-center">Neg. Stock</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Loading...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-red-500 font-medium">
                                            Error loading data: {error instanceof Error ? error.message : "Unknown error"}
                                            <br />
                                            <span className="text-xs text-muted-foreground mt-1">Check console for details</span>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                                            <TableCell className="font-medium text-blue-600">{item.code}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                {item.affects_gl ? (
                                                    <div className="flex justify-center">
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <X className="h-4 w-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.allows_negative ? (
                                                    <div className="flex justify-center">
                                                        <Check className="h-4 w-4 text-orange-600" />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <X className="h-4 w-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={item.is_active ? "default" : "secondary"}
                                                    className={item.is_active ? "bg-green-100 text-green-800 hover:bg-green-200 border-none" : "bg-gray-100 text-gray-800 hover:bg-gray-200 border-none"}
                                                >
                                                    {item.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(item)}
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(item)}
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedItem ? "Edit Movement Class" : "New Movement Class"}</DialogTitle>
                        <DialogDescription>
                            {selectedItem ? "Modify the movement class details below." : "Create a new movement class configuration."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Class Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 101, GR_PO" {...field} />
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
                                            <Input placeholder="e.g. GR for Purchase Order" {...field} />
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
                                            <Textarea placeholder="Detailed usage description..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="affects_gl"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Affects GL</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="allows_negative"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Neg. Stock</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active Status</FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {selectedItem ? "Save Changes" : "Create Class"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the movement class
                            <span className="font-semibold text-gray-900 mx-1">{selectedItem?.code}</span>
                            and remove your data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
