import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, RefreshCcw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Work Center interface
interface WorkCenter {
  id: number;
  code: string;
  name: string;
  description: string;
  capacity: number;
  capacity_unit: string;
  cost_rate: number;
  status: string;
  plant: string;
  plant_id?: number;
}

// Plant interface
interface Plant {
  id: number;
  code: string;
  name: string;
}

const SimpleWorkCenters = () => {
  // State management
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingWorkCenter, setEditingWorkCenter] = useState<WorkCenter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    capacity: "",
    capacity_unit: "units/day",
    cost_rate: "",
    status: "active",
    plant_id: "none"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Function to fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Fetch work centers
      const wcResponse = await fetch(`/api/master-data/work-center?t=${timestamp}`);
      if (!wcResponse.ok) {
        throw new Error(`Failed to fetch work centers: ${wcResponse.status} ${wcResponse.statusText}`);
      }
      
      const wcData = await wcResponse.json();
      console.log("Work centers data:", wcData);
      console.log("Status details:", wcData.map((wc: any) => ({ id: wc.id, code: wc.code, status: wc.status, is_active: wc.is_active })));
      // Deduplicate by code, prefer last
      const deduped: WorkCenter[] = Array.isArray(wcData)
        ? Array.from(
            (wcData as WorkCenter[]).reduce(
              (map, item) => map.set(String(item.code || ''), item),
              new Map<string, WorkCenter>()
            ).values()
          )
        : [];
      setWorkCenters(deduped);
      
      // Fetch plants for dropdown
      const plantsResponse = await fetch(`/api/master-data/work-center/options/plants?t=${timestamp}`);
      if (plantsResponse.ok) {
        const plantsData = await plantsResponse.json();
        console.log("Plants data:", plantsData);
        setPlants(Array.isArray(plantsData) ? plantsData : []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load work centers. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user edits a field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user updates a select field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.code.trim()) {
      errors.code = "Work Center Code is required";
    }
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (formData.capacity && isNaN(Number(formData.capacity))) {
      errors.capacity = "Capacity must be a number";
    }
    
    if (formData.cost_rate && isNaN(Number(formData.cost_rate))) {
      errors.cost_rate = "Cost Rate must be a number";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form to create/update work center
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      // Process the plant_id (treat "none" as null)
      const plantId = formData.plant_id === "none" ? null : 
                    (formData.plant_id ? Number(formData.plant_id) : null);
      
      const url = isEditMode ? `/api/master-data/work-center/${editingWorkCenter?.id}` : "/api/master-data/work-center";
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          capacity: formData.capacity ? Number(formData.capacity) : null,
          capacity_unit: formData.capacity_unit,
          cost_rate: formData.cost_rate ? Number(formData.cost_rate) : null,
          status: formData.status,
          plant_id: plantId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} work center`);
      }
      
      const workCenterData = await response.json();
      
      if (isEditMode) {
        // Update existing work center in state
        setWorkCenters(prev => prev.map(wc => wc.id === editingWorkCenter?.id ? workCenterData : wc));
      } else {
        // Add new work center to state
        setWorkCenters(prev => Array.isArray(prev) ? [...prev, workCenterData] : [workCenterData]);
      }

      // Reset form and close dialog
      setFormData({
        code: "",
        name: "",
        description: "",
        capacity: "",
        capacity_unit: "units/day",
        cost_rate: "",
        status: "active",
        plant_id: "none"
      });
      
      setIsCreateDialogOpen(false);
      setIsEditMode(false);
      setEditingWorkCenter(null);
      toast({
        title: "Success",
        description: `Work center ${isEditMode ? 'updated' : 'created'} successfully`
      });
      
      // Clear any active search so the new item is visible
      setSearchQuery("");
      
      // Ensure list reflects server state (especially after edits)
      fetchData();
      
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} work center:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} work center`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit work center
  const handleEdit = (workCenter: WorkCenter) => {
    setEditingWorkCenter(workCenter);
    setIsEditMode(true);
    setFormData({
      code: workCenter.code,
      name: workCenter.name,
      description: workCenter.description,
      capacity: workCenter.capacity.toString(),
      capacity_unit: workCenter.capacity_unit,
      cost_rate: workCenter.cost_rate.toString(),
      status: workCenter.status,
      plant_id: workCenter.plant_id?.toString() || "none"
    });
    setIsCreateDialogOpen(true);
  };

  // Handle activate work center
  const handleActivate = async (workCenter: WorkCenter) => {
    if (!confirm(`Are you sure you want to activate work center "${workCenter.name}"? This will set it to active status.`)) {
      return;
    }
    
    try {
      if (deletingId) return;
      setDeletingId(workCenter.id);
      
      const response = await fetch(`/api/master-data/work-center/${workCenter.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "active",
          is_active: true,
          active: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to activate work center");
      }
      
      // Refresh the list to show updated status
      console.log('Activation successful, refreshing data...');
      await fetchData();
      console.log('Data refreshed after activation');
      
      toast({
        title: "Success",
        description: "Work center activated successfully"
      });
    } catch (error: any) {
      console.error("Error activating work center:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate work center",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle deactivate work center
  const handleDeactivate = async (workCenter: WorkCenter) => {
    if (!confirm(`Are you sure you want to deactivate work center "${workCenter.name}"? This will set it to inactive status but preserve all associated records.`)) {
      return;
    }
    
    try {
      if (deletingId) return;
      setDeletingId(workCenter.id);
      
      const response = await fetch(`/api/master-data/work-center/${workCenter.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "inactive",
          is_active: false,
          active: false
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to deactivate work center");
      }
      
      // Refresh the list to show updated status
      fetchData();
      
      toast({
        title: "Success",
        description: "Work center deactivated successfully"
      });
    } catch (error: any) {
      console.error("Error deactivating work center:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate work center",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle delete work center
  const handleDelete = async (workCenter: WorkCenter) => {
    if (!confirm(`Are you sure you want to delete work center "${workCenter.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      if (deletingId) return;
      setDeletingId(workCenter.id);
      let response = await fetch(`/api/master-data/work-center/${workCenter.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        // Fallback: try deletion by code if ID-based deletion fails or ID not found
        response = await fetch(`/api/master-data/work-center/by-code/${encodeURIComponent(workCenter.code)}`, {
          method: "DELETE"
        });
      }
      
      // Handle different response statuses
      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle foreign key constraint errors specifically
        if (response.status === 400 && errorData.code === 'FOREIGN_KEY_CONSTRAINT') {
          const referencingTables = errorData.referencing_tables || [];
          const tableList = referencingTables.length > 0 ? referencingTables.join(', ') : 'other records';
          
          // Ask user if they want to force delete with cascade
          const forceDelete = confirm(
            `Cannot delete work center because it is referenced by ${tableList}.\n\n` +
            `Do you want to force delete this work center and ALL referencing records? ` +
            `This will permanently delete:\n` +
            `- The work center\n` +
            `- All production orders using this work center\n` +
            `- All production work orders using this work center\n` +
            `- All work orders using this work center\n\n` +
            `This action cannot be undone!`
          );
          
          if (forceDelete) {
            // Try cascade deletion
            const cascadeResponse = await fetch(`/api/master-data/work-center/${workCenter.id}/cascade`, {
              method: "DELETE"
            });
            
            if (!cascadeResponse.ok) {
              const cascadeError = await cascadeResponse.json().catch(() => ({}));
              throw new Error(cascadeError.message || "Failed to cascade delete work center");
            }
            
            // Success with cascade deletion
            setWorkCenters(prev => prev.filter(wc => wc.id !== workCenter.id && wc.code !== workCenter.code));
            fetchData();
            
            toast({
              title: "Success",
              description: "Work center and all referencing records deleted successfully"
            });
            return;
          } else {
            throw new Error(`Cannot delete work center because it is referenced by ${tableList}. Please remove these references first or use deactivation instead.`);
          }
        }
        
        throw new Error(errorData.message || "Failed to delete work center");
      }
      
      // Remove from local state and then refresh list to clear duplicates from cache
      setWorkCenters(prev => prev.filter(wc => wc.id !== workCenter.id && wc.code !== workCenter.code));
      fetchData();
      
      toast({
        title: "Success",
        description: "Work center deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting work center:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete work center",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter work centers based on search
  const filteredWorkCenters = workCenters.filter(center => 
    searchQuery === "" ||
    center.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function for status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Work Centers</h1>
          <p className="text-gray-600">Manage production capacity units</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-200">
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-blue-500 mr-2" />
          <span className="text-blue-800 font-medium">
            Work Centers are used to manage and track production capacity and resources in manufacturing facilities.
          </span>
        </div>
      </div>

      {/* Controls bar */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
        <div className="flex space-x-2 w-full md:w-auto">
          <Input 
            placeholder="Search work centers..." 
            className="w-full md:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="default" onClick={() => setSearchQuery("")}>
            Search
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchData} 
            className="flex items-center"
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" /> New Work Center
        </Button>
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile view (cards) */}
          <div className="md:hidden space-y-4">
            {filteredWorkCenters.length > 0 ? (
              filteredWorkCenters.map((center) => (
                <div key={center.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-lg">{center.name}</div>
                      <div className="text-sm text-gray-500">{center.code}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(center.status)}`}>
                      {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="text-sm"><span className="font-medium">Plant:</span> {center.plant}</div>
                    <div className="text-sm"><span className="font-medium">Capacity:</span> {center.capacity} {center.capacity_unit}</div>
                    {center.cost_rate && (
                      <div className="text-sm"><span className="font-medium">Cost Rate:</span> ${center.cost_rate}/hr</div>
                    )}
                    {center.description && (
                      <div className="text-sm mt-1">{center.description}</div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-600 border-blue-200"
                      onClick={() => handleEdit(center)}
                      disabled={!!deletingId || isSubmitting}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200"
                      onClick={() => handleDelete(center)}
                      disabled={deletingId === center.id || isSubmitting}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 bg-white rounded-lg shadow">
                <p className="text-gray-500">No work centers found</p>
                <Button 
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create New Work Center
                </Button>
              </div>
            )}
          </div>

          {/* Desktop view (table) */}
          <div className="hidden md:block bg-white rounded-md shadow">
            <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWorkCenters.length > 0 ? (
                    filteredWorkCenters.map((center) => (
                      <tr key={center.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {center.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {center.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {center.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {center.capacity} {center.capacity_unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(center.status)}`}>
                            {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {center.plant}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-800 mr-2"
                            onClick={() => handleEdit(center)}
                            disabled={!!deletingId || isSubmitting}
                          >
                            Edit
                          </Button>
                          {center.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-orange-600 hover:text-orange-800 mr-2"
                              onClick={() => handleDeactivate(center)}
                              disabled={deletingId === center.id || isSubmitting}
                            >
                              Deactivate
                            </Button>
                          )}
                          {center.status === 'inactive' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-800 mr-2"
                              onClick={() => handleActivate(center)}
                              disabled={deletingId === center.id || isSubmitting}
                            >
                              Activate
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(center)}
                            disabled={deletingId === center.id || isSubmitting}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No work centers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Work Center Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Work Center' : 'Create New Work Center'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the work center details below.' : 'Add a new work center to manage production capacity in your facility.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-right">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="WC-001"
                value={formData.code}
                onChange={handleInputChange}
                className={formErrors.code ? "border-red-500" : ""}
              />
              {formErrors.code && <p className="text-xs text-red-500">{formErrors.code}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Assembly Line 1"
                value={formData.name}
                onChange={handleInputChange}
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the work center's purpose and capabilities"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-right">
                Capacity
              </Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                placeholder="100"
                value={formData.capacity}
                onChange={handleInputChange}
                className={formErrors.capacity ? "border-red-500" : ""}
              />
              {formErrors.capacity && <p className="text-xs text-red-500">{formErrors.capacity}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity_unit" className="text-right">
                Capacity Unit
              </Label>
              <Select 
                name="capacity_unit"
                value={formData.capacity_unit} 
                onValueChange={(value) => handleSelectChange("capacity_unit", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="units/day">Units per day</SelectItem>
                  <SelectItem value="units/hour">Units per hour</SelectItem>
                  <SelectItem value="units/week">Units per week</SelectItem>
                  <SelectItem value="hours/day">Hours per day</SelectItem>
                  <SelectItem value="tons/day">Tons per day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost_rate" className="text-right">
                Cost Rate ($/hr)
              </Label>
              <Input
                id="cost_rate"
                name="cost_rate"
                type="number"
                step="0.01"
                placeholder="45.50"
                value={formData.cost_rate}
                onChange={handleInputChange}
                className={formErrors.cost_rate ? "border-red-500" : ""}
              />
              {formErrors.cost_rate && <p className="text-xs text-red-500">{formErrors.cost_rate}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                name="status"
                value={formData.status} 
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plant_id" className="text-right">
                Plant
              </Label>
              <Select 
                name="plant_id"
                value={formData.plant_id} 
                onValueChange={(value) => handleSelectChange("plant_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {plants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id.toString()}>
                      {plant.name} ({plant.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Work Center' : 'Create Work Center')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleWorkCenters;