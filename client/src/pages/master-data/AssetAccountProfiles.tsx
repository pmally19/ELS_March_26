import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Eye, Search, MoreHorizontal, Key } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

interface AssetAccountProfile {
    id: number;
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

const assetAccountProfileSchema = z.object({
    code: z.string().min(1, "Code is required").max(50, "Code must be 50 characters or less"),
    name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
    description: z.string().optional(),
    is_active: z.boolean(),
});

type AssetAccountProfileFormValues = z.infer<typeof assetAccountProfileSchema>;

export default function AssetAccountProfiles() {
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<AssetAccountProfile | null>(null);
    const [viewingProfile, setViewingProfile] = useState<AssetAccountProfile | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterActive, setFilterActive] = useState<string>("all");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: profiles = [], isLoading, refetch } = useQuery<AssetAccountProfile[]>({
        queryKey: ["/api/master-data/asset-account-profiles", filterActive],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterActive !== "all") {
                params.append("is_active", filterActive);
            }
            const response = await apiRequest(`/api/master-data/asset-account-profiles?${params.toString()}`);
            return await response.json();
        },
    });

    const form = useForm<AssetAccountProfileFormValues>({
        resolver: zodResolver(assetAccountProfileSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
            is_active: true,
        },
    });

    useEffect(() => {
        if (editingProfile) {
            form.reset({
                code: editingProfile.code,
                name: editingProfile.name,
                description: editingProfile.description || "",
                is_active: editingProfile.is_active,
            });
        } else {
            form.reset({
                code: "",
                name: "",
                description: "",
                is_active: true,
            });
        }
    }, [editingProfile, form]);

    const createMutation = useMutation({
        mutationFn: async (data: AssetAccountProfileFormValues) => {
            const response = await apiRequest("/api/master-data/asset-account-profiles", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to create asset account profile");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-profiles"] });
            toast({
                title: "Success",
                description: "Asset account profile created successfully",
            });
            setOpen(false);
            setEditingProfile(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create asset account profile",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: AssetAccountProfileFormValues }) => {
            const response = await apiRequest(`/api/master-data/asset-account-profiles/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update asset account profile");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-profiles"] });
            toast({
                title: "Success",
                description: "Asset account profile updated successfully",
            });
            setOpen(false);
            setEditingProfile(null);
            form.reset();
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update asset account profile",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/master-data/asset-account-profiles/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to delete asset account profile");
            }
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/master-data/asset-account-profiles"] });
            toast({
                title: "Success",
                description: "Asset account profile deleted successfully",
            });
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete asset account profile",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: AssetAccountProfileFormValues) => {
        if (editingProfile) {
            updateMutation.mutate({ id: editingProfile.id, data: values });
        } else {
            createMutation.mutate(values);
        }
    };

    const filteredProfiles = profiles.filter((profile) => {
        const matchesSearch =
            profile.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (profile.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesSearch;
    });

    const handleEdit = (profile: AssetAccountProfile) => {
        setEditingProfile(profile);
        setOpen(true);
    };

    const handleView = (profile: AssetAccountProfile) => {
        setViewingProfile(profile);
        setViewOpen(true);
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    const handleRefresh = async () => {
        toast({
            title: "Refreshing Data",
            description: "Loading latest asset account profiles...",
        });
        await refetch();
        toast({
            title: "Data Refreshed",
            description: "Asset account profiles have been updated successfully.",
        });
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
                        <h1 className="text-2xl font-bold">Asset Account Profile</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage asset account profile configurations used for asset account determination
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Profile
                    </Button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search profiles..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterActive} onValueChange={setFilterActive}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="true">Active Only</SelectItem>
                        <SelectItem value="false">Inactive Only</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading} title="Refresh data">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Asset Account Profile</CardTitle>
                    <CardDescription>
                        All asset account profile configurations in your organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[120px]">Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                        <TableHead className="w-[100px] text-center">Status</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                Loading...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredProfiles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                No asset account profiles found. {searchQuery ? "Try a different search." : "Create your first profile."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProfiles.map((profile) => (
                                            <TableRow key={profile.id}>
                                                <TableCell className="font-medium">{profile.code}</TableCell>
                                                <TableCell>{profile.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{profile.description || "-"}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={profile.is_active ? "default" : "secondary"}
                                                        className={profile.is_active ? "bg-green-500" : ""}
                                                    >
                                                        {profile.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="More actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleView(profile)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(profile)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => setDeleteId(profile.id)}
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

            {/* Create/Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProfile ? "Edit Asset Account Profile" : "Create Asset Account Profile"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProfile
                                ? "Update the asset account profile details below"
                                : "Add a new asset account profile configuration"}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., ANKA-001" {...field} disabled={!!editingProfile} />
                                        </FormControl>
                                        <FormDescription>
                                            Unique code identifier for the asset account profile (max 50 characters)
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
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Standard Asset Account Profile" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Display name for the asset account profile (max 100 characters)
                                        </FormDescription>
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
                                            <Textarea
                                                placeholder="Description of the asset account profile configuration"
                                                {...field}
                                                rows={3}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Optional description explaining the purpose of this asset account profile
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Active</FormLabel>
                                            <FormDescription>
                                                Is this asset account profile active and available for use?
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => {
                                    setOpen(false);
                                    setEditingProfile(null);
                                    form.reset();
                                }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingProfile ? "Update" : "Create")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Asset Account Profile Details</DialogTitle>
                        <DialogDescription>View asset account profile information</DialogDescription>
                    </DialogHeader>
                    {viewingProfile && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Code</label>
                                <p className="text-sm font-medium">{viewingProfile.code}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                <p className="text-sm">{viewingProfile.name}</p>
                            </div>
                            {viewingProfile.description && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <p className="text-sm">{viewingProfile.description}</p>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <Badge variant={viewingProfile.is_active ? "default" : "secondary"} className={viewingProfile.is_active ? "bg-green-500" : ""}>
                                    {viewingProfile.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            {viewingProfile.created_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                    <p className="text-sm">{new Date(viewingProfile.created_at).toLocaleString()}</p>
                                </div>
                            )}
                            {viewingProfile.updated_at && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                                    <p className="text-sm">{new Date(viewingProfile.updated_at).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the asset account profile.
                            {deleteId && profiles.find(p => p.id === deleteId)?.code && (
                                <span className="block mt-2 font-medium">
                                    Profile: {profiles.find(p => p.id === deleteId)?.code}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteId) {
                                    handleDelete(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
