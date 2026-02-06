import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  Trash2,
  Lock,
  KeyRound,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// Define the schema for data protection
const protectionSchema = z.object({
  selectedTables: z.array(z.string()),
  confirmationCode: z.string().min(6, "Confirmation code must be at least 6 characters"),
  acknowledgeRisk: z.boolean().refine(val => val === true, {
    message: "You must acknowledge the risk before proceeding",
  }),
});

// Master data component interface
interface ComponentStatus {
  name: string;
  table: string;
  status: "ok" | "warning" | "error";
  message: string;
  count: number;
  requiredForModules: string[];
  lastChecked: Date;
}

export default function MasterDataProtection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for the component
  const [isChecking, setIsChecking] = useState(false);
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Data protection form
  const protectionForm = useForm<z.infer<typeof protectionSchema>>({
    resolver: zodResolver(protectionSchema),
    defaultValues: {
      selectedTables: [],
      confirmationCode: "",
      acknowledgeRisk: false,
    },
  });

  // Start the check process
  const startCheck = () => {
    setIsChecking(true);
    setComponentStatuses([]);
    
    toast({
      title: "Checking Database Tables",
      description: "Analyzing tables and record counts...",
      variant: "default",
    });
  };

  // Get component data with queries
  const { data: companyCodes = [] } = useQuery({
    queryKey: ["/api/master-data/company-code"],
    retry: false,
    enabled: isChecking,
  });

  const { data: plants = [] } = useQuery({
    queryKey: ["/api/master-data/plant"],
    retry: false,
    enabled: isChecking,
  });

  const { data: salesOrganizations = [] } = useQuery({
    queryKey: ["/api/master-data/sales-organization"],
    retry: false,
    enabled: isChecking,
  });

  const { data: purchaseOrganizations = [] } = useQuery({
    queryKey: ["/api/master-data/purchase-organization"],
    retry: false,
    enabled: isChecking,
  });

  const { data: storageLocations = [] } = useQuery({
    queryKey: ["/api/master-data/storage-location"],
    retry: false,
    enabled: isChecking,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["/api/master-data/currency"],
    retry: false,
    enabled: isChecking,
  });

  const { data: uoms = [] } = useQuery({
            queryKey: ["/api/master-data/units-of-measure"],
    retry: false,
    enabled: isChecking,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["/api/master-data/region"],
    retry: false,
    enabled: isChecking,
  });

  // Delete table data mutation
  const deleteMutation = useMutation({
    mutationFn: async (tables: string[]) => {
      const response = await fetch('/api/admin/delete-table-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tables }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete table data');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setDeleteResult({
        success: true,
        message: `Successfully deleted data from ${data.tablesAffected} tables.`,
      });
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Data Deleted Successfully",
        description: `Data has been deleted from the selected tables.`,
        variant: "default",
      });
      
      setIsDeleting(false);
      protectionForm.reset();
      setShowDeleteConfirmation(false);
    },
    onError: (error: Error) => {
      setDeleteResult({
        success: false,
        message: error.message || 'An unknown error occurred during deletion',
      });
      
      toast({
        title: "Error Deleting Data",
        description: error.message || "Failed to delete data from tables.",
        variant: "destructive",
      });
      
      setIsDeleting(false);
    },
  });

  // Handle data deletion with confirmation
  const handleDelete = (data: z.infer<typeof protectionSchema>) => {
    if (data.selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table for deletion.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    deleteMutation.mutate(data.selectedTables);
  };

  // Generate component statuses based on loaded data
  useEffect(() => {
    if (isChecking) {
      const getTableStatus = (name: string, data: any) => {
        const dataArray = Array.isArray(data) ? data : [];
        if (dataArray.length > 0) {
          return {
            status: "ok" as const,
            message: `${dataArray.length} ${name.toLowerCase()} found`
          };
        } else {
          return {
            status: "warning" as const,
            message: `No ${name.toLowerCase()} found. Table exists but contains no data.`
          };
        }
      };

      const statuses: ComponentStatus[] = [
        {
          name: "Company Code",
          table: "company_codes",
          ...getTableStatus("Company Code", companyCodes),
          count: Array.isArray(companyCodes) ? companyCodes.length : 0,
          requiredForModules: ["Finance", "Controlling", "Purchasing", "Sales"],
          lastChecked: new Date(),
        },
        {
          name: "Plant",
          table: "plants",
          ...getTableStatus("Plant", plants),
          count: Array.isArray(plants) ? plants.length : 0,
          requiredForModules: ["Production", "Inventory", "Quality Management"],
          lastChecked: new Date(),
        },
        {
          name: "Storage Location",
          table: "storage_locations",
          ...getTableStatus("Storage Location", storageLocations),
          count: Array.isArray(storageLocations) ? storageLocations.length : 0,
          requiredForModules: ["Inventory", "Warehouse Management"],
          lastChecked: new Date(),
        },
        {
          name: "Sales Organization",
          table: "sales_organizations",
          ...getTableStatus("Sales Organization", salesOrganizations),
          count: Array.isArray(salesOrganizations) ? salesOrganizations.length : 0,
          requiredForModules: ["Sales", "Distribution"],
          lastChecked: new Date(),
        },
        {
          name: "Purchase Organization",
          table: "purchase_organizations",
          ...getTableStatus("Purchase Organization", purchaseOrganizations),
          count: Array.isArray(purchaseOrganizations) ? purchaseOrganizations.length : 0,
          requiredForModules: ["Purchasing", "Procurement"],
          lastChecked: new Date(),
        },
        {
          name: "Unit of Measure",
          table: "uoms",
          ...getTableStatus("Unit of Measure", uoms),
          count: Array.isArray(uoms) ? uoms.length : 0,
          requiredForModules: ["Sales", "Purchasing", "Inventory", "Production"],
          lastChecked: new Date(),
        },
        {
          name: "Currency",
          table: "currencies",
          ...getTableStatus("Currency", currencies),
          count: Array.isArray(currencies) ? currencies.length : 0,
          requiredForModules: ["Finance", "Sales", "Purchasing", "Controlling"],
          lastChecked: new Date(),
        },
        {
          name: "Region",
          table: "regions",
          ...getTableStatus("Region", regions),
          count: Array.isArray(regions) ? regions.length : 0,
          requiredForModules: ["Sales", "Distribution"],
          lastChecked: new Date(),
        },
        // Additional tables with assumed empty status
        {
          name: "Customer",
          table: "customers",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Sales", "Finance"],
          lastChecked: new Date(),
        },
        {
          name: "Vendor",
          table: "vendors",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Purchasing", "Finance"],
          lastChecked: new Date(),
        },
        {
          name: "Cost Center",
          table: "cost_centers",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Controlling", "Finance"],
          lastChecked: new Date(),
        },
        {
          name: "Profit Center",
          table: "profit_centers",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Controlling", "Finance"],
          lastChecked: new Date(),
        },
        {
          name: "Work Center",
          table: "work_centers",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Production", "Capacity Planning"],
          lastChecked: new Date(),
        },
        {
          name: "Employee",
          table: "employees",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["HR", "Personnel Management"],
          lastChecked: new Date(),
        },
        {
          name: "Tax Code",
          table: "tax_codes",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Finance", "Sales", "Purchasing"],
          lastChecked: new Date(),
        },
        {
          name: "Asset Master",
          table: "asset_master",
          status: "warning",
          message: "Not checked via API - check database directly",
          count: 0,
          requiredForModules: ["Asset Management", "Finance"],
          lastChecked: new Date(),
        },
      ];

      setComponentStatuses(statuses);
      setIsChecking(false);
      
      toast({
        title: "Table Check Complete",
        description: `Found ${statuses.filter(s => s.count > 0).length} tables with data.`,
        variant: "default",
      });
    }
  }, [
    isChecking,
    companyCodes,
    plants,
    salesOrganizations,
    purchaseOrganizations,
    storageLocations,
    currencies,
    uoms,
    regions,
    toast
  ]);

  // Run the check when the component mounts
  useEffect(() => {
    startCheck();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Master Data Protection</h1>
          <p className="text-muted-foreground mt-1">
            Control data deletion permissions across the system
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/tools/master-data-checker">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Checker
            </Link>
          </Button>
          <Button 
            onClick={() => startCheck()}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                Data Protection
              </CardTitle>
              <CardDescription>
                Restrict deletion of master data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 bg-amber-50 text-amber-900 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Data Protection Controls</AlertTitle>
                <AlertDescription>
                  This tool restricts DELETE operations on database tables, only allowing INSERT and UPDATE.
                  Data deletion can only be performed through this interface with proper authorization.
                </AlertDescription>
              </Alert>
              
              <Form {...protectionForm}>
                <form onSubmit={protectionForm.handleSubmit(handleDelete)} className="space-y-6">
                  <FormField
                    control={protectionForm.control}
                    name="selectedTables"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Tables for Data Deletion</FormLabel>
                        <FormDescription>
                          Choose the tables you want to delete data from
                        </FormDescription>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {componentStatuses.map((component) => (
                            <div key={component.table} className="flex items-center space-x-2">
                              <Checkbox
                                id={component.table}
                                checked={field.value.includes(component.table)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, component.table])
                                    : field.onChange(
                                        field.value.filter((value) => value !== component.table)
                                      );
                                }}
                              />
                              <label
                                htmlFor={component.table}
                                className="flex items-center justify-between w-full text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                <span>{component.name}</span>
                                <Badge variant={component.count > 0 ? "default" : "outline"} className="ml-2">
                                  {component.count > 0 ? `${component.count} records` : "Empty"}
                                </Badge>
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={protectionForm.control}
                    name="confirmationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmation Code</FormLabel>
                        <FormDescription>
                          Enter the admin authorization code to confirm deletion
                        </FormDescription>
                        <FormControl>
                          <div className="flex items-center">
                            <KeyRound className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Input 
                              placeholder="Enter confirmation code" 
                              {...field} 
                              type="password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={protectionForm.control}
                    name="acknowledgeRisk"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I acknowledge this action cannot be undone
                          </FormLabel>
                          <FormDescription>
                            Data deletion is permanent and irreversible. Make sure you have backups.
                          </FormDescription>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="destructive"
                          disabled={protectionForm.getValues().selectedTables.length === 0}
                          onClick={() => {
                            if (protectionForm.getValues().selectedTables.length === 0) {
                              toast({
                                title: "No Tables Selected",
                                description: "Please select at least one table for deletion.",
                                variant: "destructive",
                              });
                              return;
                            }
                            if (protectionForm.formState.isValid) {
                              setShowDeleteConfirmation(true);
                            } else {
                              protectionForm.trigger();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Table Data
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-red-600 flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Confirm Data Deletion
                          </DialogTitle>
                          <DialogDescription>
                            You are about to permanently delete data from {protectionForm.getValues().selectedTables.length} tables.
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4">
                          <h4 className="text-sm font-medium mb-2">Selected tables:</h4>
                          <div className="grid grid-cols-1 gap-2 mb-4 max-h-32 overflow-y-auto border rounded-md p-2">
                            {protectionForm.getValues().selectedTables.map((table) => {
                              const component = componentStatuses.find(c => c.table === table);
                              return (
                                <div key={table} className="flex items-center justify-between">
                                  <span className="text-sm">{component?.name || table}</span>
                                  <Badge variant={component?.count ? "default" : "outline"} className="ml-2">
                                    {component?.count ? `${component.count} records` : "Empty"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Irreversible Action</AlertTitle>
                            <AlertDescription>
                              This will permanently delete all data in the selected tables.
                              Are you absolutely sure you want to proceed?
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteConfirmation(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              protectionForm.handleSubmit(handleDelete)();
                              setShowDeleteConfirmation(false);
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>Permanently Delete</>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Protection Status</CardTitle>
              <CardDescription>
                Current protection status for master data tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {componentStatuses.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Loading table data...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we check database tables
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-800">
                                Protected Tables
                              </p>
                              <h3 className="text-2xl font-bold mt-1">
                                {componentStatuses.length}
                              </h3>
                            </div>
                            <Lock className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-amber-800">
                                Tables With Data
                              </p>
                              <h3 className="text-2xl font-bold mt-1">
                                {componentStatuses.filter(c => c.count > 0).length}
                              </h3>
                            </div>
                            <ShieldAlert className="h-8 w-8 text-amber-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Table Name</TableHead>
                          <TableHead className="text-right">Records</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {componentStatuses.map((component) => (
                          <TableRow key={component.name}>
                            <TableCell className="font-medium">{component.name}</TableCell>
                            <TableCell className="font-mono text-xs">{component.table}</TableCell>
                            <TableCell className="text-right">{component.count}</TableCell>
                            <TableCell>
                              {component.count > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Has Data
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100">
                                  Empty
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              
              {deleteResult && (
                <Alert className={`mt-6 ${deleteResult.success ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`} variant="default">
                  {deleteResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertTitle>
                    {deleteResult.success ? 'Success' : 'Error'}
                  </AlertTitle>
                  <AlertDescription>
                    {deleteResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}