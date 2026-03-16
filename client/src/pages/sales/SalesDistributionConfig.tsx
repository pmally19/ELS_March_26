import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Truck,
  Package,
  Settings,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Factory,
  Users,
  FileText,
  Calculator,
  DollarSign,
  Network,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Copy
} from "lucide-react";

// Form Schemas
const salesOrgSchema = z.object({
  code: z.string().min(1).max(4),
  name: z.string().min(1).max(50),
  companyCode: z.string().min(1).max(4),
  currency: z.string().min(3).max(3),
  address: z.string().optional(),
});

const distributionChannelSchema = z.object({
  code: z.string().min(1).max(2),
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

const divisionSchema = z.object({
  code: z.string().min(1).max(2),
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

const salesAreaSchema = z.object({
  salesOrgCode: z.string().min(1),
  distributionChannelCode: z.string().min(1),
  divisionCode: z.string().min(1),
  name: z.string().min(1).max(100),
});

const documentTypeSchema = z.object({
  code: z.string().min(1).max(4),
  name: z.string().min(1).max(50),
  category: z.enum(["ORDER", "DELIVERY", "BILLING"]),
  numberRange: z.string().optional(),
});

// ─── Copy Control Panel Component ─────────────────────────────────────────────

const copyControlHeaderSchema = z.object({
  sourceDocType: z.string().min(1, 'Source document type is required'),
  targetDocType: z.string().min(1, 'Target document type is required'),
  copyRequirements: z.string().default('001'),
  dataTransfer: z.string().default('001'),
});

const copyControlItemSchema = z.object({
  sourceDocType: z.string().min(1),
  targetDocType: z.string().min(1),
  sourceItemCategory: z.string().min(1, 'Source item category required'),
  targetItemCategory: z.string().min(1, 'Target item category required'),
  copyRequirements: z.string().default('101'),
  dataTransfer: z.string().default('101'),
});

function CopyControlPanel({ documentTypes }: { documentTypes: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedHeader, setExpandedHeader] = useState<number | null>(null);
  const [showHeaderForm, setShowHeaderForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState<{ headerId: number; sourceDoc: string; targetDoc: string } | null>(null);

  // Fetch item categories for dropdowns
  const { data: itemCategories = [] } = useQuery({
    queryKey: ['/api/sales-distribution/item-categories-list'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/item-categories-list');
      if (!res.ok) {
        // Fallback — fetch from sd_item_categories via a direct query
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch copy control headers
  const { data: headers = [], isLoading: headersLoading } = useQuery({
    queryKey: ['/api/sales-distribution/copy-control-headers'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/copy-control-headers');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  // Fetch copy control items
  const { data: allItems = [] } = useQuery({
    queryKey: ['/api/sales-distribution/copy-control-items'],
    queryFn: async () => {
      const res = await fetch('/api/sales-distribution/copy-control-items');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const headerForm = useForm({
    resolver: zodResolver(copyControlHeaderSchema),
    defaultValues: { sourceDocType: '', targetDocType: '', copyRequirements: '001', dataTransfer: '001' },
  });

  const itemForm = useForm({
    resolver: zodResolver(copyControlItemSchema),
    defaultValues: { sourceDocType: '', targetDocType: '', sourceItemCategory: '', targetItemCategory: '', copyRequirements: '101', dataTransfer: '101' },
  });

  const createHeaderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof copyControlHeaderSchema>) => {
      const res = await fetch('/api/sales-distribution/copy-control-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Header Rule Created', description: 'Copy control header rule added.' });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-distribution/copy-control-headers'] });
      headerForm.reset();
      setShowHeaderForm(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteHeaderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales-distribution/copy-control-headers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Header rule removed.' });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-distribution/copy-control-headers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-distribution/copy-control-items'] });
      setExpandedHeader(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof copyControlItemSchema>) => {
      const res = await fetch('/api/sales-distribution/copy-control-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Item Rule Created', description: 'Item category mapping added.' });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-distribution/copy-control-items'] });
      itemForm.reset();
      setShowItemForm(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales-distribution/copy-control-items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Item rule removed.' });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-distribution/copy-control-items'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const orderDocTypes = documentTypes.filter((dt: any) => (dt.category || '').toUpperCase() === 'ORDER' || dt.category === 'SALES');
  const deliveryDocTypes = documentTypes.filter((dt: any) => (dt.category || '').toUpperCase() === 'DELIVERY');
  const billingDocTypes = documentTypes.filter((dt: any) => (dt.category || '').toUpperCase() === 'BILLING');

  // Common item categories hardcoded as fallback
  const itemCatOptions = itemCategories.length > 0
    ? itemCategories
    : [
      { code: 'TAN', name: 'Standard Item' },
      { code: 'ZTAN', name: 'Delivery Sales Order' },
      { code: 'TANN', name: 'Free of Charge Item' },
      { code: 'TATX', name: 'Text Item' },
      { code: 'ZAG1', name: 'Delivery Sales Quote' },
      { code: 'ZTAS', name: 'Third Party Sales' },
    ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Copy Control
              </CardTitle>
              <CardDescription>
                Define how data is copied when creating a delivery or billing from a sales order.
                Each header rule has item-level category mappings below it.
              </CardDescription>
            </div>
            <Button onClick={() => setShowHeaderForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Header Rule
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Create Header Form */}
      {showHeaderForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">New Copy Control Header Rule</CardTitle>
            <CardDescription>Define the source → target document type relationship</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={headerForm.handleSubmit((d) => createHeaderMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source Document Type <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(v) => headerForm.setValue('sourceDocType', v)}>
                    <SelectTrigger><SelectValue placeholder="e.g. OR" /></SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt: any) => (
                        <SelectItem key={dt.code} value={dt.code}>{dt.code} — {dt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {headerForm.formState.errors.sourceDocType && (
                    <p className="text-xs text-red-500 mt-1">{headerForm.formState.errors.sourceDocType.message}</p>
                  )}
                </div>
                <div>
                  <Label>Target Document Type <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(v) => headerForm.setValue('targetDocType', v)}>
                    <SelectTrigger><SelectValue placeholder="e.g. LF" /></SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt: any) => (
                        <SelectItem key={dt.code} value={dt.code}>{dt.code} — {dt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {headerForm.formState.errors.targetDocType && (
                    <p className="text-xs text-red-500 mt-1">{headerForm.formState.errors.targetDocType.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Copy Requirements</Label>
                  <Select defaultValue="001" onValueChange={(v) => headerForm.setValue('copyRequirements', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="001">001 — Standard (All active orders)</SelectItem>
                      <SelectItem value="002">002 — Confirmed orders only</SelectItem>
                      <SelectItem value="003">003 — Open quantity only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Transfer Routine</Label>
                  <Select defaultValue="001" onValueChange={(v) => headerForm.setValue('dataTransfer', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="001">001 — Copy all header fields</SelectItem>
                      <SelectItem value="002">002 — Copy without pricing</SelectItem>
                      <SelectItem value="003">003 — Copy addresses only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowHeaderForm(false); headerForm.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={createHeaderMutation.isPending}>
                  {createHeaderMutation.isPending ? 'Creating...' : 'Create Header Rule'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Headers List */}
      {headersLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading copy control rules...</CardContent></Card>
      ) : headers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Copy className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-muted-foreground font-medium">No copy control rules configured</p>
            <p className="text-sm text-muted-foreground mt-1">Add a header rule above to define document flow (e.g., Sales Order → Delivery)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {headers.map((hdr: any) => {
            const hdrItems = allItems.filter(
              (it: any) => it.source_doc_type === hdr.source_doc_type && it.target_doc_type === hdr.target_doc_type
            );
            const isExpanded = expandedHeader === hdr.id;

            return (
              <Card key={hdr.id} className="overflow-hidden">
                {/* Header Row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedHeader(isExpanded ? null : hdr.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono font-bold text-blue-700 bg-blue-50 border-blue-200">
                        {hdr.source_doc_type}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <Badge variant="outline" className="font-mono font-bold text-green-700 bg-green-50 border-green-200">
                        {hdr.target_doc_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground ml-2">
                      Copy: <span className="font-medium">{hdr.copy_requirements}</span>
                      {' · '}
                      Transfer: <span className="font-medium">{hdr.data_transfer}</span>
                      {' · '}
                      <span className="text-blue-600">{hdrItems.length} item rule{hdrItems.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); deleteHeaderMutation.mutate(hdr.id); }}
                    disabled={deleteHeaderMutation.isPending}
                    title="Delete this header rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded: Item Rules */}
                {isExpanded && (
                  <div className="border-t bg-gray-50/50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Item Category Mapping Rules</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowItemForm({ headerId: hdr.id, sourceDoc: hdr.source_doc_type, targetDoc: hdr.target_doc_type });
                            itemForm.setValue('sourceDocType', hdr.source_doc_type);
                            itemForm.setValue('targetDocType', hdr.target_doc_type);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Item Rule
                        </Button>
                      </div>

                      {/* Add Item Rule Form */}
                      {showItemForm?.headerId === hdr.id && (
                        <div className="mb-4 p-3 bg-white border rounded-lg">
                          <p className="text-xs font-medium text-gray-600 mb-3">
                            Add item category mapping for {hdr.source_doc_type} → {hdr.target_doc_type}
                          </p>
                          <form onSubmit={itemForm.handleSubmit((d) => createItemMutation.mutate(d))} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Source Item Category</Label>
                                <Select onValueChange={(v) => itemForm.setValue('sourceItemCategory', v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="e.g. TAN" /></SelectTrigger>
                                  <SelectContent>
                                    {itemCatOptions.map((ic: any) => (
                                      <SelectItem key={ic.code} value={ic.code}>{ic.code} — {ic.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Target Item Category</Label>
                                <Select onValueChange={(v) => itemForm.setValue('targetItemCategory', v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="e.g. ZTAN" /></SelectTrigger>
                                  <SelectContent>
                                    {itemCatOptions.map((ic: any) => (
                                      <SelectItem key={ic.code} value={ic.code}>{ic.code} — {ic.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Copy Requirements</Label>
                                <Select defaultValue="101" onValueChange={(v) => itemForm.setValue('copyRequirements', v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="101">101 — Delivery-relevant items only</SelectItem>
                                    <SelectItem value="102">102 — All items</SelectItem>
                                    <SelectItem value="103">103 — Open quantity only</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Data Transfer</Label>
                                <Select defaultValue="101" onValueChange={(v) => itemForm.setValue('dataTransfer', v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="101">101 — Copy all item fields</SelectItem>
                                    <SelectItem value="102">102 — Copy without pricing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button type="button" variant="outline" size="sm" onClick={() => { setShowItemForm(null); itemForm.reset(); }}>Cancel</Button>
                              <Button type="submit" size="sm" disabled={createItemMutation.isPending}>
                                {createItemMutation.isPending ? 'Adding...' : 'Add Rule'}
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Items Table */}
                      {hdrItems.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded">
                          No item rules yet. Click "Add Item Rule" to map source → target item categories.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead>Source Item Cat.</TableHead>
                              <TableHead></TableHead>
                              <TableHead>Target Item Cat.</TableHead>
                              <TableHead>Copy Req.</TableHead>
                              <TableHead>Data Transfer</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hdrItems.map((item: any) => (
                              <TableRow key={item.id} className="text-sm">
                                <TableCell>
                                  <Badge variant="secondary" className="font-mono">{item.source_item_category}</Badge>
                                </TableCell>
                                <TableCell className="text-gray-400"><ArrowRight className="h-3 w-3" /></TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="font-mono">{item.target_item_category}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.copy_requirements}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.data_transfer}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-400 hover:text-red-600"
                                    onClick={() => deleteItemMutation.mutate(item.id)}
                                    disabled={deleteItemMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* SAP Standard Reference Box */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">📋 Standard Configuration Reference</p>
          <div className="text-xs text-amber-700 space-y-1">
            <p>• <strong>OR → LF</strong> (Sales Order → Delivery): Source item cat <strong>TAN/ZTAN</strong> → Target <strong>ZTAN</strong></p>
            <p>• <strong>LF → F2</strong> (Delivery → Invoice): Source item cat <strong>ZTAN</strong> → Target <strong>ZTAN</strong></p>
            <p>• Copy Requirements <strong>001/101</strong> = Standard | Data Transfer <strong>001/101</strong> = Copy all fields</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesDistributionConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("enterprise");

  // Configuration Status Query
  const { data: configStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/sales-distribution/config-status"],
  });

  // Enterprise Structure Queries
  const { data: salesOrgs = [] } = useQuery({
    queryKey: ["/api/sales-distribution/sales-organizations"],
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["/api/sales-distribution/distribution-channels"],
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ["/api/sales-distribution/divisions"],
  });

  const { data: salesAreas = [] } = useQuery({
    queryKey: ["/api/sales-distribution/sales-areas"],
  });

  const { data: documentTypes = [] } = useQuery({
    queryKey: ["/api/sales-distribution/document-types"],
  });

  const { data: conditionTypes = [] } = useQuery({
    queryKey: ["/api/sales-distribution/condition-types"],
  });

  const { data: pricingProcedures = [] } = useQuery({
    queryKey: ["/api/sales-distribution/pricing-procedures"],
  });

  // Mutation for initializing basic configuration
  const initConfigMutation = useMutation({
    mutationFn: () => apiRequest("/api/sales-distribution/initialize-basic-config", "POST"),
    onSuccess: () => {
      toast({
        title: "Configuration Initialized",
        description: "Basic Sales & Distribution configuration has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution"] });
    },
    onError: (error) => {
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize basic configuration.",
        variant: "destructive",
      });
    },
  });

  // Sales Organization Form
  const salesOrgForm = useForm({
    resolver: zodResolver(salesOrgSchema),
    defaultValues: {
      code: "",
      name: "",
      companyCode: "",
      currency: "USD",
      address: "",
    },
  });

  const createSalesOrgMutation = useMutation({
    mutationFn: (data: z.infer<typeof salesOrgSchema>) =>
      apiRequest("/api/sales-distribution/sales-organizations", "POST", data),
    onSuccess: () => {
      toast({
        title: "Sales Organization Created",
        description: "Sales organization has been created successfully.",
      });
      salesOrgForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-organizations"] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create sales organization.",
        variant: "destructive",
      });
    },
  });

  // Distribution Channel Form
  const channelForm = useForm({
    resolver: zodResolver(distributionChannelSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: (data: z.infer<typeof distributionChannelSchema>) =>
      apiRequest("/api/sales-distribution/distribution-channels", "POST", data),
    onSuccess: () => {
      toast({
        title: "Distribution Channel Created",
        description: "Distribution channel has been created successfully.",
      });
      channelForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/distribution-channels"] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create distribution channel.",
        variant: "destructive",
      });
    },
  });

  // Division Form
  const divisionForm = useForm({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  const createDivisionMutation = useMutation({
    mutationFn: (data: z.infer<typeof divisionSchema>) =>
      apiRequest("/api/sales-distribution/divisions", "POST", data),
    onSuccess: () => {
      toast({
        title: "Division Created",
        description: "Division has been created successfully.",
      });
      divisionForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/divisions"] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create division.",
        variant: "destructive",
      });
    },
  });

  // Sales Area Form
  const salesAreaForm = useForm({
    resolver: zodResolver(salesAreaSchema),
    defaultValues: {
      salesOrgCode: "",
      distributionChannelCode: "",
      divisionCode: "",
      name: "",
    },
  });

  const createSalesAreaMutation = useMutation({
    mutationFn: (data: z.infer<typeof salesAreaSchema>) =>
      apiRequest("/api/sales-distribution/sales-areas", "POST", data),
    onSuccess: () => {
      toast({
        title: "Sales Area Created",
        description: "Sales area has been created successfully.",
      });
      salesAreaForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/sales-areas"] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create sales area.",
        variant: "destructive",
      });
    },
  });

  // Document Type Form
  const documentTypeForm = useForm({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: {
      code: "",
      name: "",
      category: "ORDER" as const,
      numberRange: "",
    },
  });

  const createDocumentTypeMutation = useMutation({
    mutationFn: (data: z.infer<typeof documentTypeSchema>) =>
      apiRequest("/api/sales-distribution/document-types", "POST", data),
    onSuccess: () => {
      toast({
        title: "Document Type Created",
        description: "Document type has been created successfully.",
      });
      documentTypeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-distribution/document-types"] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create document type.",
        variant: "destructive",
      });
    },
  });

  const ConfigurationOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Organizations</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{salesOrgs.length}</div>
          <div className="flex items-center mt-2">
            {configStatus?.configurationHealth?.enterpriseStructure ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className="text-xs text-muted-foreground">
              {configStatus?.configurationHealth?.enterpriseStructure ? "Configured" : "Not Configured"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Areas</CardTitle>
          <Network className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{salesAreas.length}</div>
          <div className="flex items-center mt-2">
            {configStatus?.configurationHealth?.salesAreas ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className="text-xs text-muted-foreground">
              {configStatus?.configurationHealth?.salesAreas ? "Configured" : "Not Configured"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Document Types</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{documentTypes.length}</div>
          <div className="flex items-center mt-2">
            {configStatus?.configurationHealth?.documentConfig ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className="text-xs text-muted-foreground">
              {configStatus?.configurationHealth?.documentConfig ? "Configured" : "Not Configured"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pricing Config</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pricingProcedures.length}</div>
          <div className="flex items-center mt-2">
            {configStatus?.configurationHealth?.pricingConfig ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className="text-xs text-muted-foreground">
              {configStatus?.configurationHealth?.pricingConfig ? "Configured" : "Not Configured"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading configuration status...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales & Distribution Configuration</h1>
          <p className="text-muted-foreground">
            Configure enterprise structure, document types, and pricing procedures
          </p>
        </div>
        <Button
          onClick={() => initConfigMutation.mutate()}
          disabled={initConfigMutation.isPending}
          variant="outline"
        >
          <Settings className="h-4 w-4 mr-2" />
          Initialize Basic Config
        </Button>
      </div>

      <ConfigurationOverview />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="enterprise">Enterprise Structure</TabsTrigger>
          <TabsTrigger value="sales-areas">Sales Areas</TabsTrigger>
          <TabsTrigger value="documents">Document Types</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="output">Output Control</TabsTrigger>
          <TabsTrigger value="copy-control">Copy Control</TabsTrigger>
        </TabsList>

        <TabsContent value="enterprise" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Organizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Sales Organizations
                </CardTitle>
                <CardDescription>
                  Configure organizational units for sales activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...salesOrgForm}>
                  <form onSubmit={salesOrgForm.handleSubmit((data) => createSalesOrgMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={salesOrgForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesOrgForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Domestic Sales" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesOrgForm.control}
                      name="companyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesOrgForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="JPY">JPY</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createSalesOrgMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Sales Org
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 space-y-2">
                  {salesOrgs.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{org.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">{org.name}</span>
                      </div>
                      <Badge variant="secondary">{org.currency}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Distribution Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Distribution Channels
                </CardTitle>
                <CardDescription>
                  Define how products reach customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...channelForm}>
                  <form onSubmit={channelForm.handleSubmit((data) => createChannelMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={channelForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={channelForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Direct Sales" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={channelForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createChannelMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Channel
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 space-y-2">
                  {channels.map((channel: any) => (
                    <div key={channel.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{channel.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">{channel.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Divisions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Divisions
                </CardTitle>
                <CardDescription>
                  Product responsibility areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...divisionForm}>
                  <form onSubmit={divisionForm.handleSubmit((data) => createDivisionMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={divisionForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={divisionForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Electronics" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={divisionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createDivisionMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Division
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 space-y-2">
                  {divisions.map((division: any) => (
                    <div key={division.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{division.code}</span>
                        <span className="text-sm text-muted-foreground ml-2">{division.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales-areas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Network className="h-5 w-5 mr-2" />
                  Create Sales Area
                </CardTitle>
                <CardDescription>
                  Combine Sales Organization + Distribution Channel + Division
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...salesAreaForm}>
                  <form onSubmit={salesAreaForm.handleSubmit((data) => createSalesAreaMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={salesAreaForm.control}
                      name="salesOrgCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Organization</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sales organization" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {salesOrgs.map((org: any) => (
                                <SelectItem key={org.id} value={org.code}>
                                  {org.code} - {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesAreaForm.control}
                      name="distributionChannelCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distribution Channel</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select distribution channel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {channels.map((channel: any) => (
                                <SelectItem key={channel.id} value={channel.code}>
                                  {channel.code} - {channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesAreaForm.control}
                      name="divisionCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select division" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {divisions.map((division: any) => (
                                <SelectItem key={division.id} value={division.code}>
                                  {division.code} - {division.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={salesAreaForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Area Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Domestic Electronics Sales" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createSalesAreaMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Sales Area
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Sales Areas</CardTitle>
                <CardDescription>
                  All configured sales areas in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesAreas.map((area: any) => (
                    <div key={area.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{area.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Sales Org: {area.salesOrgCode} |
                        Channel: {area.distributionChannelCode} |
                        Division: {area.divisionCode}
                      </div>
                      <Badge variant={area.isActive ? "default" : "secondary"} className="mt-2">
                        {area.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Create Document Type
                </CardTitle>
                <CardDescription>
                  Configure order, delivery, and billing document types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...documentTypeForm}>
                  <form onSubmit={documentTypeForm.handleSubmit((data) => createDocumentTypeMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={documentTypeForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., OR" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={documentTypeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Standard Order" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={documentTypeForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ORDER">Sales Order</SelectItem>
                              <SelectItem value="DELIVERY">Delivery</SelectItem>
                              <SelectItem value="BILLING">Billing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={documentTypeForm.control}
                      name="numberRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number Range</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createDocumentTypeMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Document Type
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Types Overview</CardTitle>
                <CardDescription>
                  All configured document types by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["ORDER", "DELIVERY", "BILLING"].map((category) => (
                    <div key={category}>
                      <h4 className="font-medium mb-2 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {documentTypes
                          .filter((doc: any) => doc.category === category)
                          .map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <span className="font-medium">{doc.code}</span>
                                <span className="text-sm text-muted-foreground ml-2">{doc.name}</span>
                              </div>
                              {doc.numberRange && (
                                <Badge variant="outline">Range: {doc.numberRange}</Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Pricing Configuration
              </CardTitle>
              <CardDescription>
                Condition types and pricing procedures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Condition Types</h4>
                  <div className="space-y-2">
                    {conditionTypes.map((condition: any) => (
                      <div key={condition.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{condition.code}</span>
                          <span className="text-sm text-muted-foreground ml-2">{condition.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Class: {condition.conditionClass}
                          </Badge>
                          <Badge variant="outline">
                            Type: {condition.calculationType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Pricing Procedures</h4>
                  <div className="space-y-2">
                    {pricingProcedures.map((procedure: any) => (
                      <div key={procedure.id} className="p-3 border rounded">
                        <div className="font-medium">{procedure.code}</div>
                        <div className="text-sm text-muted-foreground">{procedure.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {procedure.steps?.length || 0} steps configured
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Output Control</CardTitle>
              <CardDescription>
                Configure output types for forms, emails, and EDI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Output control configuration will be available in the next phase
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy-control" className="space-y-4">
          <CopyControlPanel documentTypes={documentTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}