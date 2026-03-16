import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Database, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus,
  ArrowLeft,
  Building,
  FileText,
  Users,
  Target
} from "lucide-react";
import { Link } from "wouter";

interface CustomerStatus {
  clientId: string;
  hasCustomTables: boolean;
  configuration: {
    client_id: string;
    uses_custom_tables: boolean;
    configuration_status: string;
    table_prefix: string;
  };
}

interface CustomizationType {
  key: string;
  name: string;
  description: string;
}

interface CustomizationHistory {
  id: number;
  client_id: string;
  table_prefix: string;
  action: string;
  details: string;
  created_at: string;
}

export default function SDCustomization() {
  const [clientId, setClientId] = useState("DEMO_CLIENT");
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus | null>(null);
  const [availableTypes, setAvailableTypes] = useState<CustomizationType[]>([]);
  const [history, setHistory] = useState<CustomizationHistory[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableTypes();
    if (clientId) {
      loadCustomerStatus();
      loadCustomizationHistory();
    }
  }, [clientId]);

  const loadAvailableTypes = async () => {
    try {
      const response = await fetch("/api/sd-customization/available-types");
      const data = await response.json();
      setAvailableTypes(data.availableTypes);
    } catch (error) {
      console.error("Error loading available types:", error);
      toast({
        title: "Error",
        description: "Failed to load customization types",
        variant: "destructive",
      });
    }
  };

  const loadCustomerStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sd-customization/customer-status/${clientId}`);
      const data = await response.json();
      setCustomerStatus(data);
    } catch (error) {
      console.error("Error loading customer status:", error);
      toast({
        title: "Error",
        description: "Failed to load customer status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomizationHistory = async () => {
    try {
      const response = await fetch(`/api/sd-customization/history/${clientId}`);
      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error) {
      console.error("Error loading history:", error);
      setHistory([]);
    }
  };

  const handleInitializeCustomer = async () => {
    try {
      setInitializing(true);
      const response = await fetch(`/api/sd-customization/initialize-customer/${clientId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          copyFromStandard: selectedTypes.length > 0,
          configTypes: selectedTypes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize customer');
      }

      toast({
        title: "Success",
        description: "Customer customization initialized successfully",
      });

      // Reload status and history
      await loadCustomerStatus();
      await loadCustomizationHistory();
    } catch (error) {
      console.error("Error initializing customer:", error);
      toast({
        title: "Error",
        description: "Failed to initialize customer customization",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleCopyStandard = async () => {
    if (selectedTypes.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one configuration type to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/sd-customization/copy-standard/${clientId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configTypes: selectedTypes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to copy standard configuration');
      }

      toast({
        title: "Success",
        description: `Copied ${selectedTypes.length} configuration types successfully`,
      });

      await loadCustomizationHistory();
    } catch (error) {
      console.error("Error copying standard configurations:", error);
      toast({
        title: "Error",
        description: "Failed to copy standard configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "customized":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Customized</Badge>;
      case "standard":
        return <Badge variant="secondary"><Database className="w-3 h-3 mr-1" />Standard</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/sales">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Sales Distribution Customization</h1>
          <p className="text-gray-600">Manage customer-specific SD configurations</p>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Client Configuration
          </CardTitle>
          <CardDescription>
            Select or enter a client ID to manage their SD customizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter client ID (e.g., DEMO_CLIENT)"
              />
            </div>
            <Button onClick={loadCustomerStatus} disabled={!clientId || loading}>
              Load Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Status */}
      {customerStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Status: {customerStatus.clientId}
              </span>
              {getStatusBadge(customerStatus?.configuration?.configuration_status || 'pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Custom Tables</Label>
                <div className="flex items-center gap-2 mt-1">
                  {customerStatus.hasCustomTables ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">No</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Table Prefix</Label>
                <div className="mt-1 font-mono text-sm">
                  {customerStatus?.configuration?.table_prefix || 'N/A'}
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Configuration Type</Label>
                <div className="mt-1">
                  {customerStatus.configuration.uses_custom_tables ? "Custom" : "Standard"}
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Status</Label>
                <div className="mt-1 capitalize">
                  {customerStatus.configuration.configuration_status}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">
            <Settings className="w-4 h-4 mr-2" />
            Setup & Configuration
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-4 h-4 mr-2" />
            History & Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Configuration Types Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Configuration Types
              </CardTitle>
              <CardDescription>
                Select which SD configuration types to customize for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTypes.map((type) => (
                  <Card 
                    key={type.key} 
                    className={`cursor-pointer transition-colors ${
                      selectedTypes.includes(type.key) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (selectedTypes.includes(type.key)) {
                        setSelectedTypes(selectedTypes.filter(t => t !== type.key));
                      } else {
                        setSelectedTypes([...selectedTypes, type.key]);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{type.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                        </div>
                        {selectedTypes.includes(type.key) && (
                          <CheckCircle className="w-4 h-4 text-blue-600 ml-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTypes.length > 0 && (
                <Alert className="mt-4">
                  <AlertDescription>
                    Selected {selectedTypes.length} configuration type(s): {selectedTypes.join(", ")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Initialize customer-specific tables or copy standard configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!customerStatus?.hasCustomTables ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      This client doesn't have custom SD tables yet. Initialize them to begin customization.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleInitializeCustomer}
                    disabled={initializing || !clientId}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {initializing ? "Initializing..." : "Initialize Customer Tables"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Client has custom tables. You can copy additional standard configurations.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleCopyStandard}
                    disabled={loading || selectedTypes.length === 0}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {loading ? "Copying..." : "Copy Selected Standard Configurations"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Customization History
              </CardTitle>
              <CardDescription>
                Track all customization activities for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No customization history found for this client</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <Card key={entry.id} className="border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{entry.action}</Badge>
                              <span className="text-sm text-gray-600">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{entry.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Table Prefix: {entry.table_prefix}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}