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
  Network
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
          <Card>
            <CardHeader>
              <CardTitle>Copy Control</CardTitle>
              <CardDescription>
                Configure document flow and data transfer between document types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Copy control configuration will be available in the next phase
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}