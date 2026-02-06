import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { 
  Edit3, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Copy, 
  Save, 
  X,
  Mail,
  Phone,
  MapPin
} from "lucide-react";

// Fix for non-responsive edit icons issue from testing report
interface ResponsiveEditActionsProps {
  item: any;
  itemType: 'lead' | 'customer' | 'opportunity' | 'quote' | 'order' | 'invoice';
  onEdit?: (updatedItem: any) => void;
  onDelete?: (id: number) => void;
  onView?: (item: any) => void;
}

export default function ResponsiveEditActions({ 
  item, 
  itemType, 
  onEdit, 
  onDelete, 
  onView 
}: ResponsiveEditActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editData, setEditData] = useState(item);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Edit mutation with proper API endpoints
  const editMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const apiEndpoint = getEditEndpoint(itemType, item.id);
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update ${itemType}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Updated`,
        description: `Successfully updated ${data.data?.name || data.data?.customer_name || 'item'}`,
      });
      
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${itemType}s`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sales-fix/refresh/${itemType}s`] });
      
      if (onEdit) onEdit(data.data);
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/sales/${itemType}s/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${itemType}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Deleted`,
        description: `Successfully deleted ${itemType}`,
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/sales/${itemType}s`] });
      
      if (onDelete) onDelete(item.id);
      setIsDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get correct API endpoint for editing
  const getEditEndpoint = (type: string, id: number) => {
    switch (type) {
      case 'lead':
        return `/api/sales-fix/leads/${id}`;
      case 'customer':
        return `/api/sales-fix/customers/${id}`;
      case 'opportunity':
        return `/api/sales-fix/opportunities/${id}`;
      case 'quote':
        return `/api/sales-fix/quotes/${id}`;
      case 'order':
        return `/api/sales-fix/orders/${id}`;
      case 'invoice':
        return `/api/sales-fix/invoices/${id}`;
      default:
        return `/api/sales/${type}s/${id}`;
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Common required fields
    if (itemType === 'lead' || itemType === 'customer') {
      if (!editData.name?.trim()) {
        errors.name = "Name is required";
      }
      if (editData.email && !editData.email.includes('@')) {
        errors.email = "Valid email is required";
      }
    }

    if (itemType === 'opportunity') {
      if (!editData.name?.trim()) {
        errors.name = "Opportunity name is required";
      }
      if (!editData.amount || editData.amount <= 0) {
        errors.amount = "Amount must be greater than 0";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors and try again",
        variant: "destructive",
      });
      return;
    }

    editMutation.mutate(editData);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  // Render edit form based on item type
  const renderEditForm = () => {
    switch (itemType) {
      case 'lead':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Name *</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Lead name"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={editData.contact_person || ''}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                placeholder="Contact person name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email address"
                className={validationErrors.email ? 'border-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={editData.source || ''} onValueChange={(value) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Cold Call">Cold Call</SelectItem>
                  <SelectItem value="Social Media">Social Media</SelectItem>
                  <SelectItem value="Trade Show">Trade Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editData.status || ''} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'customer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Customer Name *</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Customer name"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email address"
                className={validationErrors.email ? 'border-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={editData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Customer address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credit_limit">Credit Limit</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  value={editData.credit_limit || ''}
                  onChange={(e) => handleInputChange('credit_limit', parseFloat(e.target.value) || 0)}
                  placeholder="Credit limit"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Select value={editData.payment_terms || ''} onValueChange={(value) => handleInputChange('payment_terms', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET30">NET30</SelectItem>
                    <SelectItem value="NET15">NET15</SelectItem>
                    <SelectItem value="NET60">NET60</SelectItem>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'opportunity':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="required">Opportunity Name *</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Opportunity name"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="amount" className="required">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={editData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="Opportunity amount"
                className={validationErrors.amount ? 'border-red-500' : ''}
              />
              {validationErrors.amount && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.amount}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select value={editData.stage || ''} onValueChange={(value) => handleInputChange('stage', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prospecting">Prospecting</SelectItem>
                    <SelectItem value="Qualification">Qualification</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Closed Won">Closed Won</SelectItem>
                    <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={editData.probability || ''}
                  onChange={(e) => handleInputChange('probability', parseInt(e.target.value) || 0)}
                  placeholder="Win probability"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={editData.expected_close_date || ''}
                onChange={(e) => handleInputChange('expected_close_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Opportunity description"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add notes"
                rows={4}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Responsive Action Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView && (
            <DropdownMenuItem onClick={() => onView(item)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(JSON.stringify(item, null, 2))}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Data
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsDeleteOpen(true)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Make changes to the {itemType} information below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            {renderEditForm()}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {itemType}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(item.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
          .required::after {
            content: ' *';
            color: #ef4444;
          }
        `
      }} />
    </>
  );
}