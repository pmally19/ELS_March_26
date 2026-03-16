import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, ArrowLeft, MoreHorizontal, FileText, Folder, ChevronRight, ChevronDown, Save, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from "uuid";

// Types
interface AccountMapping {
    fromAccount: string;
    toAccount: string;
    balanceType: "BOTH" | "DEBIT_ONLY" | "CREDIT_ONLY";
}

interface TemplateNode {
    id: string | number;
    parentNodeId: string | number | null;
    name: string;
    nodeType: "ROOT" | "GROUP" | "ITEM";
    accounts: AccountMapping[];
    isExpanded?: boolean;
    // SAP OB58 additional fields
    startOfGroupText?: string | null;
    endOfGroupText?: string | null;
    displayTotalFlag?: boolean;
    graduatedTotalText?: string | null;
    displayGraduatedTotalFlag?: boolean;
    drCrShift?: boolean;
    checkSign?: boolean;
    displayBalance?: boolean;
}

interface TemplateHeader {
    id?: number;
    code: string;
    name: string;
    isActive: boolean;
    chartOfAccountsId?: number | string | null;
}

const templateSchema = z.object({
    code: z.string().min(1, "Code is required").max(50, "Code must be at most 50 characters"),
    name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
    isActive: z.boolean().default(true),
    chartOfAccountsId: z.string().optional().nullable(),
});

export default function ReportTemplateBuilder() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateHeader | null>(null);
    const [activeTab, setActiveTab] = useState("basic");

    // Tree State
    const [nodes, setNodes] = useState<TemplateNode[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | number | null>(null);

    // Fetch Chart of Accounts for dropdown
    const { data: chartOfAccounts = [] } = useQuery<any[]>({
        queryKey: ['/api/master-data/tax-account-determination/chart-of-accounts'],
    });

    // Initial Fetch for Table
    const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateHeader[]>({
        queryKey: ["/api/finance/report-templates"],
    });

    // Fetch Details for Editing Structure
    const { data: templateDetails, isFetching: detailsLoading } = useQuery<any>({
        queryKey: [`/api/finance/report-templates/${editingTemplate?.id}`],
        enabled: !!editingTemplate?.id && showDialog,
    });

    // Filter Templates
    const filteredTemplates = templates.filter(t =>
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const form = useForm<z.infer<typeof templateSchema>>({
        resolver: zodResolver(templateSchema),
        defaultValues: { code: "", name: "", isActive: true },
    });

    useEffect(() => {
        if (editingTemplate) {
            form.reset({
                code: editingTemplate.code,
                name: editingTemplate.name,
                isActive: editingTemplate.isActive,
                chartOfAccountsId: editingTemplate.chartOfAccountsId ? String(editingTemplate.chartOfAccountsId) : null,
            });
        }
    }, [editingTemplate, form]);

    useEffect(() => {
        if (!showDialog) return;

        if (editingTemplate && templateDetails) {
            if (templateDetails.flatNodes && templateDetails.flatNodes.length > 0) {
                const loadedNodes = templateDetails.flatNodes.map((n: any) => ({
                    ...n,
                    isExpanded: true,
                    accounts: n.accounts || []
                }));
                setNodes(loadedNodes);
            } else {
                setNodes([{
                    id: uuidv4(),
                    parentNodeId: null,
                    name: "Financial Statement Root",
                    nodeType: "ROOT",
                    accounts: [],
                    isExpanded: true,
                    displayTotalFlag: true,
                    displayGraduatedTotalFlag: false,
                    drCrShift: false,
                    checkSign: false,
                    displayBalance: true
                }]);
            }
            setSelectedNodeId(null);
        } else if (!editingTemplate) {
            // It's a new template being created, already handled by handleAddTemplate
        }
    }, [templateDetails, editingTemplate, showDialog]);

    // Mutations
    const createHeaderMutation = useMutation({
        mutationFn: async (data: z.infer<typeof templateSchema>) => {
            const res = await apiRequest("/api/finance/report-templates", { method: "POST", body: data as any });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to create template");
            return res.json();
        }
    });

    const updateHeaderMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number, data: z.infer<typeof templateSchema> }) => {
            const res = await apiRequest(`/api/finance/report-templates/${id}`, { method: "PUT", body: data as any });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to update template");
            return res.json();
        }
    });

    const deleteHeaderMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest(`/api/finance/report-templates/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to delete template");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/finance/report-templates"] });
            toast({ title: "Success", description: "Template deleted successfully." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const saveNodesMutation = useMutation({
        mutationFn: async (templateId: number) => {
            console.log("Saving nodes for template:", templateId, "Total nodes in state:", nodes.length);
            const cleanNodes = nodes.map(({ isExpanded, ...rest }) => rest);
            console.log("Cleaned nodes payload:", JSON.stringify({ nodes: cleanNodes }).substring(0, 100) + '...');

            try {
                const res = await apiRequest(`/api/finance/report-templates/${templateId}/nodes`, {
                    method: "POST",
                    body: { nodes: cleanNodes } as any
                });
                console.log("saveNodesMutation API response status:", res.status);
                if (!res.ok) throw new Error("Failed to save tree structure");
                return res.json();
            } catch (e) {
                console.error("saveNodesMutation apiRequest failed:", e);
                throw e;
            }
        }
    });

    const onSubmit = async (values: z.infer<typeof templateSchema>) => {
        try {
            console.log("onSubmit triggered with values:", values);
            let savedId = editingTemplate?.id;

            if (savedId) {
                console.log("Updating existing template header ID:", savedId);
                await updateHeaderMutation.mutateAsync({ id: savedId, data: values });
            } else {
                console.log("Creating new template header");
                const newDoc = await createHeaderMutation.mutateAsync(values);
                savedId = newDoc.id;
            }

            // After header is saved, save the tree structure
            if (savedId) {
                console.log("Template header saved/updated. Initiating nodes save for ID:", savedId);
                await saveNodesMutation.mutateAsync(savedId);
                console.log("saveNodesMutation completed successfully!");
            } else {
                console.error("No savedId available after header mutation!");
            }

            queryClient.invalidateQueries({ queryKey: ["/api/finance/report-templates"] });
            if (savedId) {
                // Remove the cache entirely so the next Edit Configuration click fetches fresh data
                queryClient.removeQueries({ queryKey: ["/api/finance/report-templates", savedId] });
                queryClient.invalidateQueries({ queryKey: ["/api/finance/report-templates", savedId] });
            }

            toast({ title: "Success", description: "Template saved successfully." });
            closeDialog();
        } catch (error: any) {
            console.error("onSubmit failed:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const closeDialog = () => {
        setShowDialog(false);
        setTimeout(() => {
            setEditingTemplate(null);
            setActiveTab("basic");
            setNodes([]);
            setSelectedNodeId(null);
            form.reset();
        }, 300); // clear after animation
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setActiveTab("basic");
        form.reset({ code: "", name: "", isActive: true });
        setNodes([{
            id: uuidv4(),
            parentNodeId: null,
            name: "Financial Statement Root",
            nodeType: "ROOT",
            accounts: [],
            isExpanded: true,
            displayTotalFlag: true,
            displayGraduatedTotalFlag: false,
            drCrShift: false,
            checkSign: false,
            displayBalance: true
        }]);
        setSelectedNodeId(null);
        setShowDialog(true);
    };

    const handleEdit = (template: TemplateHeader) => {
        setEditingTemplate(template);
        setShowDialog(true);
    };

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this Financial Statement Template? All associated hierarchy rules will be lost.")) {
            deleteHeaderMutation.mutate(id);
        }
    };

    // --- Tree Structure Operations ---
    const toggleExpand = (id: string | number) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, isExpanded: !n.isExpanded } : n));
    };

    const addNode = (parentId: string | number | null, type: "GROUP" | "ITEM") => {
        setNodes(nodes.map(n => n.id === parentId ? { ...n, isExpanded: true } : n));
        const newNode: TemplateNode = {
            id: uuidv4(),
            parentNodeId: parentId,
            name: "New Node",
            nodeType: type,
            accounts: [],
            isExpanded: true,
            displayTotalFlag: true,
            displayGraduatedTotalFlag: false,
            drCrShift: false,
            checkSign: false,
            displayBalance: true
        };
        setNodes([...nodes, newNode]);
        setSelectedNodeId(newNode.id);
    };

    const updateNodeName = (id: string | number, newName: string) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, name: newName } : n));
    };

    const updateNodeConfig = (id: string | number, field: keyof TemplateNode, value: any) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
    };

    const deleteNode = (id: string | number) => {
        const getChildrenIds = (parentId: string | number): (string | number)[] => {
            const children = nodes.filter(n => n.parentNodeId === parentId);
            return [...children.map(c => c.id), ...children.flatMap(c => getChildrenIds(c.id))];
        };
        const idsToDelete = [id, ...getChildrenIds(id)];
        setNodes(nodes.filter(n => !idsToDelete.includes(n.id)));
        if (idsToDelete.includes(selectedNodeId!)) setSelectedNodeId(null);
    };

    // --- Account Assignments (for selected node) ---
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    const addAccountRange = () => {
        if (!selectedNodeId) return;
        setNodes(nodes.map(n => n.id === selectedNodeId ? {
            ...n, accounts: [...n.accounts, { fromAccount: "", toAccount: "", balanceType: "BOTH" }]
        } : n));
    };

    const updateAccountRange = (idx: number, field: keyof AccountMapping, value: string) => {
        if (!selectedNodeId) return;
        setNodes(nodes.map(n => {
            if (n.id === selectedNodeId) {
                const newAccounts = [...n.accounts];
                newAccounts[idx] = { ...newAccounts[idx], [field]: value };
                return { ...n, accounts: newAccounts };
            }
            return n;
        }));
    };

    const deleteAccountRange = (idx: number) => {
        if (!selectedNodeId) return;
        setNodes(nodes.map(n => {
            if (n.id === selectedNodeId) {
                const newAccounts = [...n.accounts];
                newAccounts.splice(idx, 1);
                return { ...n, accounts: newAccounts };
            }
            return n;
        }));
    };

    const renderTree = (parentId: string | number | null, depth = 0) => {
        const children = nodes.filter(n => {
            return parentId == null ? n.parentNodeId == null : n.parentNodeId == parentId;
        });
        if (children.length === 0) return null;

        return (
            <div className="pl-4 border-l border-gray-200 ml-2 mt-1">
                {children.map(node => (
                    <div key={node.id} className="mb-1">
                        <div className={`flex items-center group py-1 px-2 rounded-md ${selectedNodeId === node.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}`}>
                            <button type="button" onClick={() => toggleExpand(node.id)} className="w-5 flex justify-center text-gray-500 mr-1">
                                {nodes.some(n => n.parentNodeId === node.id) ? (
                                    node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                                ) : <span className="w-4" />}
                            </button>
                            <div className="flex items-center cursor-pointer flex-1" onClick={() => setSelectedNodeId(node.id)}>
                                {node.nodeType === "ROOT" && <Folder size={16} className="text-gray-700 mr-2" />}
                                {node.nodeType === "GROUP" && <Folder size={16} className="text-blue-500 mr-2" />}
                                {node.nodeType === "ITEM" && <FileText size={16} className="text-green-600 mr-2" />}
                                <Input
                                    value={node.name}
                                    onChange={(e) => updateNodeName(node.id, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            // Optional: Move focus or keep it, but strictly prevent form submission
                                        }
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="h-7 text-sm border-transparent bg-transparent shadow-none hover:border-gray-200 focus:bg-white flex-1 max-w-[250px]"
                                />
                            </div>
                            <div className="hidden group-hover:flex items-center gap-1">
                                {(node.nodeType === "ROOT" || node.nodeType === "GROUP") && (
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => addNode(node.id, "GROUP")} title="Add Group">
                                        <Folder size={14} className="text-blue-500" />
                                    </Button>
                                )}
                                {(node.nodeType === "ROOT" || node.nodeType === "GROUP") && (
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => addNode(node.id, "ITEM")} title="Add Item">
                                        <FileText size={14} className="text-green-600" />
                                    </Button>
                                )}
                                {node.nodeType !== "ROOT" && (
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteNode(node.id)} title="Delete Node">
                                        <Trash2 size={14} />
                                    </Button>
                                )}
                            </div>
                        </div>
                        {node.isExpanded && renderTree(node.id, depth + 1)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                    <Link href="/finance" className="mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financial Statement Versions</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure hierarchical blueprints for Balance Sheets and P&L statements.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button onClick={handleAddTemplate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4" />
                        Add Template
                    </Button>
                </div>
            </div>

            {/* List View Card */}
            <Card className="border-t-4 border-t-blue-600 shadow-md">
                <CardHeader className="bg-gray-50/50 pb-4 border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Report Templates Directory
                        </CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 border-gray-300 focus:border-blue-500 rounded-full bg-white shadow-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow>
                                    <TableHead className="font-semibold text-gray-600 py-3">Code</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Template Name</TableHead>
                                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-gray-600 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templatesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10">
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                                                <p className="text-base font-medium text-gray-900">No templates found</p>
                                                <p className="text-sm">We couldn't find any financial statement templates.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map((t) => (
                                        <TableRow key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleEdit(t)}>
                                                    <span className="font-mono text-sm text-blue-700 hover:underline">{t.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium text-gray-900">{t.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                {t.isActive !== false ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 shadow-sm border-emerald-200">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 shadow-sm">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleEdit(t)}>
                                                            <Edit className="h-4 w-4 text-gray-500" /> Edit Configuration
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(t.id!)}>
                                                            <Trash2 className="h-4 w-4" /> Delete Template
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
                </CardContent>
            </Card>

            {/* Config Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b pb-4 shrink-0">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            {editingTemplate ? `Edit Template: ${editingTemplate.code}` : "Create Financial Statement Template"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the header details and the structural hierarchy for this report.
                        </DialogDescription>
                    </DialogHeader>

                    {detailsLoading && editingTemplate ? (
                        <div className="flex-1 flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form id="template-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-auto pt-4 flex flex-col">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                    <TabsList className="grid w-full grid-cols-2 mb-4 shrink-0">
                                        <TabsTrigger value="basic">General Details</TabsTrigger>
                                        <TabsTrigger value="structure">Tree Structure</TabsTrigger>
                                    </TabsList>

                                    {/* General Details Tab */}
                                    <TabsContent value="basic" className="flex-1 p-1">
                                        <div className="space-y-4 max-w-lg">
                                            <FormField
                                                control={form.control}
                                                name="code"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-700">Template Code <span className="text-red-500">*</span></FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. INDIA_GAAP" {...field} className="uppercase bg-gray-50 focus:bg-white transition-colors" />
                                                        </FormControl>
                                                        <FormDescription>Unique identifier for this print/view format.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-700">Template Description <span className="text-red-500">*</span></FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. Standard Financial Statements" {...field} className="bg-gray-50 focus:bg-white transition-colors" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="chartOfAccountsId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-gray-700">Chart of Accounts</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled={!!editingTemplate}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                                                                    <SelectValue placeholder="Select Chart of Accounts" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {chartOfAccounts.map(coa => (
                                                                    <SelectItem key={coa.id} value={String(coa.id)}>
                                                                        {coa.code} - {coa.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>Link this template to a specific Chart of Accounts for validation.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="isActive"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-gray-50">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base">Active Status</FormLabel>
                                                            <FormDescription>Determines if this template is available for reporting.</FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Structure Tab - Nested Pane */}
                                    <TabsContent value="structure" className="flex-1 flex flex-col gap-4 m-0 overflow-hidden">
                                        <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 text-sm text-blue-800 shrink-0 flex items-start gap-2">
                                            <Folder className="h-5 w-5 shrink-0 mt-0.5" />
                                            <p>Organize your balance sheet and P&L by dragging and dropping folders. Click on any node to assign G/L account ranges to it in the right pane.</p>
                                        </div>

                                        <div className="grid grid-cols-12 gap-6 flex-1 min-h-[400px] overflow-hidden">
                                            {/* Tree View */}
                                            <Card className="col-span-12 md:col-span-6 flex flex-col overflow-hidden shadow-sm">
                                                <CardHeader className="bg-gray-50/80 pb-3 border-b py-3">
                                                    <CardTitle className="text-sm">Hierarchy Blueprint</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-1 overflow-auto p-4">
                                                    {renderTree(null)}
                                                </CardContent>
                                            </Card>

                                            {/* Account Assignment View */}
                                            <Card className="col-span-12 md:col-span-6 flex flex-col overflow-hidden shadow-sm bg-gray-50">
                                                <CardHeader className="pb-3 border-b border-gray-200 bg-white py-3">
                                                    <CardTitle className="text-sm">G/L Account Mapping</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-1 overflow-auto p-4">
                                                    {!selectedNode ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                                                            <FileText size={40} className="mb-3 opacity-20" />
                                                            <p className="text-sm">Select a node from the tree on the left to map accounts to it.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm flex items-center gap-2 text-sm mb-4">
                                                                <Folder className="text-blue-500 h-4 w-4 shrink-0" />
                                                                <span className="font-medium text-gray-800">Assigning to: {selectedNode.name}</span>
                                                            </div>

                                                            {/* SAP OB58 Style Node Configuration */}
                                                            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm space-y-4 mb-4">
                                                                <h4 className="text-sm font-semibold text-gray-800 pb-2 border-b">Node Configuration</h4>
                                                                
                                                                {/* Checkboxes row */}
                                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    <div className="flex flex-row items-center border p-2 rounded-md bg-gray-50/50 justify-between">
                                                                        <Label className="text-xs text-gray-700 cursor-pointer" htmlFor={`flag-total-${selectedNode.id}`}>Total Flag</Label>
                                                                        <input id={`flag-total-${selectedNode.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedNode.displayTotalFlag !== false} onChange={(e) => updateNodeConfig(selectedNode.id, 'displayTotalFlag', e.target.checked)} />
                                                                    </div>
                                                                    <div className="flex flex-row items-center border p-2 rounded-md bg-gray-50/50 justify-between">
                                                                        <Label className="text-xs text-gray-700 cursor-pointer" htmlFor={`flag-grad-${selectedNode.id}`}>Graduated Total</Label>
                                                                        <input id={`flag-grad-${selectedNode.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedNode.displayGraduatedTotalFlag === true} onChange={(e) => updateNodeConfig(selectedNode.id, 'displayGraduatedTotalFlag', e.target.checked)} />
                                                                    </div>
                                                                    <div className="flex flex-row items-center border p-2 rounded-md bg-gray-50/50 justify-between">
                                                                        <Label className="text-xs text-gray-700 cursor-pointer" htmlFor={`flag-balance-${selectedNode.id}`}>Display Balance</Label>
                                                                        <input id={`flag-balance-${selectedNode.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedNode.displayBalance !== false} onChange={(e) => updateNodeConfig(selectedNode.id, 'displayBalance', e.target.checked)} />
                                                                    </div>
                                                                    <div className="flex flex-row items-center border p-2 rounded-md bg-gray-50/50 justify-between">
                                                                        <Label className="text-xs text-gray-700 cursor-pointer" htmlFor={`flag-dr-${selectedNode.id}`}>Dr/Cr Shift</Label>
                                                                        <input id={`flag-dr-${selectedNode.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedNode.drCrShift === true} onChange={(e) => updateNodeConfig(selectedNode.id, 'drCrShift', e.target.checked)} />
                                                                    </div>
                                                                    <div className="flex flex-row items-center border p-2 rounded-md bg-gray-50/50 justify-between">
                                                                        <Label className="text-xs text-gray-700 cursor-pointer" htmlFor={`flag-sign-${selectedNode.id}`}>Check +/- Sign</Label>
                                                                        <input id={`flag-sign-${selectedNode.id}`} type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedNode.checkSign === true} onChange={(e) => updateNodeConfig(selectedNode.id, 'checkSign', e.target.checked)} />
                                                                    </div>
                                                                </div>

                                                                {/* Texts row */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                                    <div>
                                                                        <Label className="text-xs text-gray-500 mb-1">Start of Group Text</Label>
                                                                        <Input className="h-8 text-sm bg-gray-50" placeholder="e.g. Current Assets" value={selectedNode.startOfGroupText || ''} onChange={(e) => updateNodeConfig(selectedNode.id, 'startOfGroupText', e.target.value)} />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-gray-500 mb-1">End of Group Text</Label>
                                                                        <Input className="h-8 text-sm bg-gray-50" placeholder="e.g. Total Current Assets" value={selectedNode.endOfGroupText || ''} onChange={(e) => updateNodeConfig(selectedNode.id, 'endOfGroupText', e.target.value)} />
                                                                    </div>
                                                                    {selectedNode.displayGraduatedTotalFlag && (
                                                                        <div className="md:col-span-2">
                                                                            <Label className="text-xs text-gray-500 mb-1">Graduated Total Text</Label>
                                                                            <Input className="h-8 text-sm bg-gray-50" placeholder="e.g. Gross Margin" value={selectedNode.graduatedTotalText || ''} onChange={(e) => updateNodeConfig(selectedNode.id, 'graduatedTotalText', e.target.value)} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between items-center mt-6">
                                                                <Label className="text-sm font-semibold text-gray-700">Account Ranges</Label>
                                                                <Button type="button" variant="outline" size="sm" onClick={addAccountRange} className="h-7 text-xs flex items-center gap-1">
                                                                    <Plus size={12} /> Add Range
                                                                </Button>
                                                            </div>

                                                            {selectedNode.accounts.length === 0 ? (
                                                                <div className="text-sm text-gray-500 p-4 text-center border border-dashed rounded-md bg-white">
                                                                    No G/L account ranges assigned yet.
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {selectedNode.accounts.map((acc, idx) => (
                                                                        <div key={idx} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm space-y-3 relative group transition-all">
                                                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 absolute top-2 right-2" onClick={() => deleteAccountRange(idx)}>
                                                                                <Trash2 size={12} />
                                                                            </Button>
                                                                            <div className="pr-8">
                                                                                <Label className="text-xs text-gray-500 mb-1 block">Account Range</Label>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Input placeholder="From Acc" className="h-8 text-sm font-mono" value={acc.fromAccount} onChange={(e) => updateAccountRange(idx, "fromAccount", e.target.value)} />
                                                                                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                                                                                    <Input placeholder="To Acc" className="h-8 text-sm font-mono" value={acc.toAccount} onChange={(e) => updateAccountRange(idx, "toAccount", e.target.value)} />
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <Label className="text-xs text-gray-500 mb-1 block">Balance Evaluation</Label>
                                                                                <Select value={acc.balanceType} onValueChange={(val: any) => updateAccountRange(idx, "balanceType", val)}>
                                                                                    <SelectTrigger className="h-8 text-sm bg-gray-50">
                                                                                        <SelectValue placeholder="Handling" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="BOTH">Debit & Credit (+/-)</SelectItem>
                                                                                        <SelectItem value="DEBIT_ONLY">Debit Only (+)</SelectItem>
                                                                                        <SelectItem value="CREDIT_ONLY">Credit Only (-)</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </form>
                        </Form>
                    )}

                    <DialogFooter className="mt-4 border-t pt-4 shrink-0">
                        <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button
                            type="submit"
                            form="template-form"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
                            disabled={createHeaderMutation.isPending || updateHeaderMutation.isPending || saveNodesMutation.isPending}
                        >
                            <Save size={16} /> {editingTemplate ? "Save All Changes" : "Create Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
