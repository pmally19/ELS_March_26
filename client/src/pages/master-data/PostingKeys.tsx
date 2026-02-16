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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, RefreshCw, Download, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Posting Key type
type PostingKey = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    businessContext: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

// Posting Key Form Schema  
const postingKeySchema = z.object({
    code: z.string()
        .min(1, "Code is required")
        .max(3, "Code must be exactly 3 characters")
        .regex(/^[A-Z0-9]{1,3}$/, "Code must contain only uppercase letters and numbers"),
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().optional(),
    businessContext: z.string().max(100).optional(),
    isActive: z.boolean().default(true),
});

// Posting Keys Management Page
export default function PostingKeysPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [showDialog, setShowDialog] = useState(false);
    const [editingPostingKey, setEditingPostingKey] = useState<PostingKey | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const permissions = useAgentPermissions();

    // Fetch posting keys
    const [postingKeys, setPostingKeys] = useState<PostingKey[]>([]);
    const [filteredPostingKeys, setFilteredPostingKeys] = useState<PostingKey[]>([]);
    const [postingKeysLoading, setPostingKeysLoading] = useState(true);
    const [postingKeysError, setPostingKeysError] = useState<Error | null>(null);

    // Fetch data function
    const fetchData = async () => {
        try {
            setPostingKeysLoading(true);
            const response = await fetch("/api/master-data/transaction-keys", {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const data = result.data || result;
            setPostingKeys(Array.isArray(data) ? data : []);
            setFilteredPostingKeys(Array.isArray(data) ? data : []);
            setPostingKeysLoading(false);
        } catch (error) {
            console.error("Error fetching posting keys:", error);
            setPostingKeysError(error instanceof Error ? error : new Error('Failed to fetch posting keys'));
            setPostingKeysLoading(false);
        }
    };

    // Refresh function
    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest posting keys...",
        });
        await fetchData();
        toast({
            title: "Data Refreshed",
            description: "Posting keys have been updated successfully.",
        });
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Filter posting keys based on search query and status
    useEffect(() => {
        let filtered = postingKeys;

        // Filter by status
        if (filterStatus === "active") {
            filtered = filtered.filter(key => key.isActive);
        } else if (filterStatus === "inactive") {
            filtered = filtered.filter(key => !key.isActive);
        }

        // Filter by search query
        if (searchQuery.trim() !== "") {
            filtered = filtered.filter(
                (key) =>
                    key.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (key.description && key.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (key.businessContext && key.businessContext.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        setFilteredPostingKeys(filtered);
    }, [searchQuery, filterStatus, postingKeys]);

    // Posting key form setup
    const form = useForm<z.infer<typeof postingKeySchema>>({
        resolver: zodResolver(postingKeySchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            businessContext: "",
            isActive: true,
        },
    });

    // Set form values when editing
    useEffect(() => {
        if (editingPostingKey) {
            form.reset({
                code: editingPostingKey.code,
                name: editingPostingKey.name,
                description: editingPostingKey.description || "",
                businessContext: editingPostingKey.businessContext || "",
                isActive: editingPostingKey.isActive,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                businessContext: "",
                isActive: true,
            });
        }
    }, [editingPostingKey, form]);

    // Create posting key mutation
    const createPostingKeyMutation = useMutation({
        mutationFn: (postingKey: z.infer<typeof postingKeySchema>) => {
            return apiRequest(`/api/master-data/transaction-keys`, {
                method: "POST",
                body: JSON.stringify(postingKey)
            }).then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.details || err.error || "Failed to create posting key");
                    });
                }
                return res.json();
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Posting key created successfully",
            });
            fetchData();
            setShowDialog(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create posting key",
                variant: "destructive",
            });
        },
    });

    // Update posting key mutation
    const updatePostingKeyMutation = useMutation({
        mutationFn: (data: { id: number; postingKey: z.infer<typeof postingKeySchema> }) => {
            return apiRequest(`/api/master-data/transaction-keys/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data.postingKey),
            }).then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.details || err.error || "Failed to update posting key");
                    });
                }
                return res.json();
            });
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Posting key updated successfully",
            });
            fetchData();
            setShowDialog(false);
            setEditingPostingKey(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update posting key",
                variant: "destructive",
            });
        },
    });

    // Delete posting key mutation
    const deletePostingKeyMutation = useMutation({
        mutationFn: (id: number) => {
            return apiRequest(`/api/master-data/transaction-keys/${id}`, {
                method: "DELETE",
            }).then(res => res.json());
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Posting key deleted successfully",
            });
            fetchData();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete posting key",
                variant: "destructive",
            });
        },
    });

    // Form submission
    const onSubmit = (values: z.infer<typeof postingKeySchema>) => {
        const updatedValues = {
            ...values,
            code: values.code.toUpperCase(),
        };

        if (editingPostingKey) {
            updatePostingKeyMutation.mutate({ id: editingPostingKey.id, postingKey: updatedValues });
        } else {
            createPostingKeyMutation.mutate(updatedValues);
        }
    };

    // Function to close the dialog
    const closeDialog = () => {
        setShowDialog(false);
        setEditingPostingKey(null);
        form.reset();
    };

    // Function to handle editing
    const handleEdit = (postingKey: PostingKey) => {
        setEditingPostingKey(postingKey);
        setShowDialog(true);
    };

    // Function to handle export
    const handleExport = () => {
        if (filteredPostingKeys.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There are no posting keys to export.",
                variant: "destructive",
            });
            return;
        }

        const exportData = filteredPostingKeys.map(key => ({
            'Code': key.code,
            'Name': key.name,
            'Description': key.description || '',
            'Business Context': key.businessContext || '',
            'Status': key.isActive ? 'Active' : 'Inactive'
        }));

        const headers = Object.keys(exportData[0]);
        const csvContent = [
            headers.join(','),
            ...exportData.map(row =>
                headers.map(header => `"${row[header]}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `posting-keys-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${filteredPostingKeys.length} posting keys to CSV file.`,
        });
    };

    // Function to handle delete
    const handleDelete = (id: number, code: string) => {
        if (window.confirm(`Are you sure you want to delete posting key "${code}"?`)) {
            deletePostingKeyMutation.mutate(id);
        }
    };

    // Check for errors
    if (postingKeysError) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="text-lg font-medium">Error</h3>
                    <p>{postingKeysError.message || "An error occurred"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Posting Keys</h1>
                        <p className="text-sm text-muted-foreground">
                            Universal posting keys for automatic account determination
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {permissions.hasDataModificationRights ? (
                        <>
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                Export to Excel
                            </Button>
                            <Button onClick={() => setShowDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Posting Key
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded">
                            {permissions.getRestrictedMessage()}
                        </div>
                    )}
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                </Select>

                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search posting keys..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={postingKeysLoading}
                    title="Refresh posting keys data"
                >
                    <RefreshCw className={`h-4 w-4 ${postingKeysLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Posting Keys Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Posting Keys</CardTitle>
                    <CardDescription>
                        All registered posting keys for account determination
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
                                        <TableHead className="hidden md:table-cell">Business Context</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {postingKeysLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPostingKeys.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No posting keys found. {searchQuery ? "Try a different search." : "Create your first posting key."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPostingKeys.map((key) => (
                                            <TableRow key={key.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{key.code}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{key.name}</div>
                                                        {key.description && (
                                                            <div className="text-sm text-gray-500 mt-1">{key.description}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    {key.businessContext || '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${key.isActive
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {key.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEdit(key);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(key.id, key.code);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
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

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPostingKey ? 'Edit Posting Key' : 'Create Posting Key'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPostingKey
                                ? 'Update the posting key details below.'
                                : 'Enter the details for the new posting key.'}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Code *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    maxLength={3}
                                                    placeholder="e.g., BSX, GBB, WRX"
                                                    disabled={!!editingPostingKey}
                                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                />
                                            </FormControl>
                                            <FormDescription>3-character uppercase code</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., Inventory Account" />
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
                                                <textarea
                                                    {...field}
                                                    rows={3}
                                                    placeholder="Detailed explanation of this posting key..."
                                                    className="w-full px-3 py-2 border rounded-md"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="businessContext"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business Context</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g., Procurement, Sales, Production" />
                                            </FormControl>
                                            <FormDescription>Business area or process</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Active</FormLabel>
                                                <FormDescription>
                                                    Mark this posting key as active
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingPostingKey ? 'Update' : 'Create'} Posting Key
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
