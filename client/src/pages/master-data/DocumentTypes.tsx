import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Search, FileText, Settings, MoreHorizontal, PowerOff, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
interface DocumentType {
  id: number;
  documentTypeCode: string;
  description: string;
  documentCategory: string;
  numberRange?: string;
  reversalAllowed: boolean;
  accountTypesAllowed: string;
  entryView: string;
  referenceRequired: boolean;
  authorizationGroup?: string;
  companyCodeId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentTypes() {
  const { toast } = useToast();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAccountTypesModal, setShowAccountTypesModal] = useState(false);
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [showAccountTypeForm, setShowAccountTypeForm] = useState(false);
  const [editingAccountTypeId, setEditingAccountTypeId] = useState<number | null>(null);
  const [accountTypeFormData, setAccountTypeFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'asset',
    isActive: true
  });
  const [formData, setFormData] = useState({
    documentTypeCode: '',
    description: '',
    documentCategory: '',
    numberRange: '',
    reversalAllowed: true,
    accountTypesAllowed: 'all',
    entryView: 'standard',
    referenceRequired: false,
    authorizationGroup: '',
    companyCodeId: 1,
    isActive: true
  });

  // Fetch document categories from API
  const { data: documentCategoriesRaw = [], isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/document-categories"],
  });

  // Normalize document categories data (convert snake_case to camelCase)
  const normalizeDocumentCategory = (dc: any) => ({
    id: dc.id,
    code: dc.code,
    name: dc.name,
    description: dc.description || null,
    isActive: dc.is_active !== undefined ? dc.is_active : (dc.isActive !== undefined ? dc.isActive : true),
  });

  const documentCategories = documentCategoriesRaw.map(normalizeDocumentCategory).filter((dc: any) => dc.isActive);

  // Fetch account types from API
  const { data: accountTypesRaw = [], isLoading: accountTypesLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/account-types"],
  });

  // Normalize account types data (convert snake_case to camelCase)
  const normalizeAccountType = (at: any) => ({
    id: at.id,
    code: at.code,
    name: at.name,
    description: at.description || null,
    category: at.category || null,
    isActive: at.is_active !== undefined ? at.is_active : (at.isActive !== undefined ? at.isActive : true),
  });

  const accountTypesForDropdown = Array.isArray(accountTypesRaw) 
    ? accountTypesRaw.map(normalizeAccountType).filter((at: any) => at.isActive)
    : [];

  // Fetch number ranges from API
  const { data: numberRangesRaw = [], isLoading: numberRangesLoading } = useQuery<any[]>({
    queryKey: ["/api/master-data/number-ranges"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/number-ranges");
      const data = await response.json();
      // Handle both array response and object with records property
      return Array.isArray(data) ? data : (data.records?.rows || data.rows || []);
    },
  });

  // Normalize number ranges data (convert snake_case to camelCase)
  const normalizeNumberRange = (nr: any) => ({
    id: nr.id,
    code: nr.code || nr.number_range_code || nr.range_number || '',
    name: nr.name || nr.description || '',
    description: nr.description || null,
    objectType: nr.object_type || nr.object_code || null,
    fromNumber: nr.from_number || nr.number_from || null,
    toNumber: nr.to_number || nr.number_to || null,
    currentNumber: nr.current_number || null,
    isActive: nr.is_active !== undefined ? nr.is_active : (nr.isActive !== undefined ? nr.isActive : true),
  });

  const numberRangesForDropdown = Array.isArray(numberRangesRaw) 
    ? numberRangesRaw.map(normalizeNumberRange).filter((nr: any) => {
        // Only filter out if explicitly inactive (false) or if code is truly missing
        // Allow records with isActive === true, undefined, or null (default to active)
        const isActive = nr.isActive !== false; // Default to true if undefined/null
        const hasCode = nr.code && nr.code.trim() !== '';
        return isActive && hasCode;
      })
    : [];

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Set default category when categories are loaded
  useEffect(() => {
    if (documentCategories.length > 0 && !formData.documentCategory) {
      // Try to find FINANCIAL or FINANCE, otherwise use first available
      const defaultCategory = documentCategories.find((dc: any) => 
        dc.code === 'FINANCIAL' || dc.code === 'FINANCE'
      ) || documentCategories[0];
      
      if (defaultCategory && !editingId) {
        setFormData(prev => ({ ...prev, documentCategory: defaultCategory.code }));
      }
    }
  }, [documentCategories, editingId]);

  // Set default account type when account types are loaded
  useEffect(() => {
    if (accountTypesForDropdown.length > 0 && !formData.accountTypesAllowed) {
      // Try to find 'all', otherwise use first available
      const defaultAccountType = accountTypesForDropdown.find((at: any) => 
        at.code === 'all'
      ) || accountTypesForDropdown[0];
      
      if (defaultAccountType && !editingId) {
        setFormData(prev => ({ ...prev, accountTypesAllowed: defaultAccountType.code }));
      }
    }
  }, [accountTypesForDropdown, editingId]);

  useEffect(() => {
    if (showAccountTypesModal) {
      fetchAccountTypes();
    }
  }, [showAccountTypesModal]);

  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/master-data/document-types');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        toast({
          title: 'Error fetching document types',
          description: errorData.message || `Failed to fetch: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
        setDocumentTypes([]);
        return;
      }
      
      const data = await response.json();
      console.log('Document Types API Response:', data);
      
      // Handle different response structures:
      // 1. { records: { rows: [...] } } - from masterDataCRUDRoutes
      // 2. { records: [...] } - direct array in records
      // 3. [...] - direct array
      // 4. { data: [...] } - wrapped in data
      let documentTypesData: any[] = [];
      
      if (Array.isArray(data)) {
        documentTypesData = data;
      } else if (data.records) {
        if (Array.isArray(data.records)) {
          documentTypesData = data.records;
        } else if (data.records.rows && Array.isArray(data.records.rows)) {
          documentTypesData = data.records.rows;
        }
      } else if (data.data && Array.isArray(data.data)) {
        documentTypesData = data.data;
      } else if (data.rows && Array.isArray(data.rows)) {
        documentTypesData = data.rows;
      }
      
      console.log('Extracted document types data:', documentTypesData.length, 'items');
      
      // Transform API response to match frontend interface
      const transformedData = documentTypesData.map((item: any) => ({
        id: item.id,
        documentTypeCode: item.document_type_code || item.documentTypeCode || item.code || '',
        description: item.description || '',
        documentCategory: item.document_category || item.documentCategory || '',
        numberRange: item.number_range || item.numberRange || null,
        reversalAllowed: item.reversal_allowed !== undefined ? item.reversal_allowed : (item.reversalAllowed !== undefined ? item.reversalAllowed : false),
        accountTypesAllowed: item.account_types_allowed || item.accountTypesAllowed || 'all',
        entryView: item.entry_view || item.entryView || 'standard',
        referenceRequired: item.reference_required !== undefined ? item.reference_required : (item.referenceRequired !== undefined ? item.referenceRequired : false),
        authorizationGroup: item.authorization_group || item.authorizationGroup || '',
        companyCodeId: item.company_code_id || item.companyCodeId || 1,
        isActive: item.is_active !== undefined ? item.is_active : (item.isActive !== undefined ? item.isActive : true),
        createdAt: item.created_at || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_at || item.updatedAt || new Date().toISOString()
      }));
      
      console.log('Transformed document types:', transformedData.length, 'items');
      setDocumentTypes(transformedData);
    } catch (error: any) {
      console.error('Error fetching document types:', error);
      toast({
        title: 'Error fetching document types',
        description: error.message || 'Failed to fetch document types due to an unexpected error.',
        variant: 'destructive',
      });
      setDocumentTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `/api/master-data/document-types/${editingId}`
        : '/api/master-data/document-types';
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchDocumentTypes();
        resetForm();
        toast({
          title: editingId ? 'Document Type updated' : 'Document Type created',
          description: editingId ? 'Document Type updated successfully.' : 'Document Type created successfully.',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error saving document type',
          description: errorData.message || 'Failed to save document type.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving document type:', error);
      toast({
        title: 'Error saving document type',
        description: 'Failed to save document type due to an unexpected error.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (documentType: DocumentType) => {
    setFormData({
      documentTypeCode: documentType.documentTypeCode,
      description: documentType.description,
      documentCategory: documentType.documentCategory,
      numberRange: documentType.numberRange || '',
      reversalAllowed: documentType.reversalAllowed,
      accountTypesAllowed: documentType.accountTypesAllowed,
      entryView: documentType.entryView,
      referenceRequired: documentType.referenceRequired,
      authorizationGroup: documentType.authorizationGroup || '',
      companyCodeId: documentType.companyCodeId,
      isActive: documentType.isActive
    });
    setEditingId(documentType.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this document type?')) {
      try {
        const response = await fetch(`/api/master-data/document-types/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchDocumentTypes();
          toast({
            title: 'Document Type deleted',
            description: 'Document Type deleted successfully.',
          });
        } else {
          const errorData = await response.json();
          toast({
            title: 'Error deleting document type',
            description: errorData.message || 'Failed to delete document type.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error deleting document type:', error);
        toast({
          title: 'Error deleting document type',
          description: 'Failed to delete document type due to an unexpected error.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeactivate = async (id: number) => {
    if (confirm('Are you sure you want to deactivate this Document Type? This will set it to inactive status but preserve all associated records.')) {
      try {
        const response = await fetch(`/api/master-data/document-types/${id}/deactivate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          await fetchDocumentTypes();
          toast({
            title: 'Document Type deactivated',
            description: 'Document Type has been deactivated successfully.',
          });
        } else {
          const errorData = await response.json();
          toast({
            title: 'Error deactivating document type',
            description: errorData.message || 'Failed to deactivate document type.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error deactivating document type:', error);
        toast({
          title: 'Error deactivating document type',
          description: 'Failed to deactivate document type due to an unexpected error.',
          variant: 'destructive',
        });
      }
    }
  };

  // Account Types Management Functions (for the modal)
  const fetchAccountTypes = async () => {
    try {
      const response = await fetch('/api/master-data/account-types');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with records property
        const accountTypesData = Array.isArray(data) ? data : (data.records?.rows || []);
        // Normalize the data
        const normalized = accountTypesData.map((at: any) => ({
          id: at.id,
          code: at.code,
          name: at.name,
          description: at.description || null,
          category: at.category || null,
          isActive: at.is_active !== undefined ? at.is_active : (at.isActive !== undefined ? at.isActive : true),
        }));
        setAccountTypes(normalized);
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
    }
  };

  const handleAccountTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAccountTypeId
        ? `/api/master-data/account-types/${editingAccountTypeId}`
        : '/api/master-data/account-types';
      
      const response = await fetch(url, {
        method: editingAccountTypeId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountTypeFormData)
      });

      if (response.ok) {
        await fetchAccountTypes();
        setAccountTypeFormData({
          code: '',
          name: '',
          description: '',
          category: 'asset',
          isActive: true
        });
        setShowAccountTypeForm(false);
        setEditingAccountTypeId(null);
        toast({
          title: editingAccountTypeId ? 'Account Type updated' : 'Account Type created',
          description: editingAccountTypeId ? 'Account Type updated successfully.' : 'Account Type created successfully.',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error saving account type',
          description: errorData.message || 'Failed to save account type.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving account type:', error);
      toast({
        title: 'Error saving account type',
        description: 'Failed to save account type due to an unexpected error.',
        variant: 'destructive',
      });
    }
  };

  const handleEditAccountType = (accountType: any) => {
    setAccountTypeFormData({
      code: accountType.code,
      name: accountType.name,
      description: accountType.description,
      category: accountType.category,
      isActive: accountType.is_active
    });
    setEditingAccountTypeId(accountType.id);
    setShowAccountTypeForm(true);
  };

  const handleDeleteAccountType = async (id: number) => {
    if (confirm('Are you sure you want to delete this account type?')) {
      try {
        const response = await fetch(`/api/master-data/account-types/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchAccountTypes();
          toast({
            title: 'Account Type deleted',
            description: 'Account Type has been deleted successfully.',
          });
        } else {
          const errorData = await response.json();
          toast({
            title: 'Error deleting account type',
            description: errorData.message || 'Failed to delete account type.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error deleting account type:', error);
        toast({
          title: 'Error deleting account type',
          description: 'Failed to delete account type due to an unexpected error.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeactivateAccountType = async (id: number) => {
    if (confirm('Are you sure you want to deactivate this Account Type?')) {
      try {
        // Deactivate by updating is_active to false
        const response = await fetch(`/api/master-data/account-types/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false })
        });
        
        if (response.ok) {
          await fetchAccountTypes();
          toast({
            title: 'Account Type deactivated',
            description: 'Account Type has been deactivated successfully.',
          });
        } else {
          const errorData = await response.json();
          toast({
            title: 'Error deactivating account type',
            description: errorData.message || 'Failed to deactivate account type.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error deactivating account type:', error);
        toast({
          title: 'Error deactivating account type',
          description: 'Failed to deactivate account type due to an unexpected error.',
          variant: 'destructive',
        });
      }
    }
  };

  const resetForm = () => {
    // Set default category when resetting
    const defaultCategory = documentCategories.find((dc: any) => 
      dc.code === 'FINANCIAL' || dc.code === 'FINANCE'
    ) || (documentCategories.length > 0 ? documentCategories[0] : { code: '' });
    
    // Set default account type when resetting
    const defaultAccountType = accountTypesForDropdown.find((at: any) => 
      at.code === 'all'
    ) || (accountTypesForDropdown.length > 0 ? accountTypesForDropdown[0] : { code: '' });
    
    setFormData({
      documentTypeCode: '',
      description: '',
      documentCategory: defaultCategory?.code || '',
      numberRange: '',
      reversalAllowed: true,
      accountTypesAllowed: defaultAccountType?.code || '',
      entryView: 'standard',
      referenceRequired: false,
      authorizationGroup: '',
      companyCodeId: 1,
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredDocumentTypes = documentTypes.filter(documentType =>
    documentType.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    documentType.documentTypeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    documentType.documentCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-gray-500">
          Master Data → Document Types
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Document Types</h1>
            <p className="text-gray-600">Financial document classification</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open('/master-data/document-categories-config', '_blank')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure Categories
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAccountTypesModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure Account Types
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Document Type
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search document types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit' : 'Add'} Document Type
              {editingId && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    formData.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type Code*</label>
                <Input
                  value={formData.documentTypeCode}
                  onChange={(e) => setFormData({ ...formData, documentTypeCode: e.target.value })}
                  maxLength={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description*</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Document Category* {categoriesLoading ? "(Loading...)" : `(${documentCategories.length} available)`}
                </label>
                <select
                  value={formData.documentCategory}
                  onChange={(e) => setFormData({ ...formData, documentCategory: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  disabled={categoriesLoading || documentCategories.length === 0}
                >
                  {categoriesLoading ? (
                    <option value="">Loading categories...</option>
                  ) : documentCategories.length === 0 ? (
                    <option value="">No categories available</option>
                  ) : (
                    <>
                      <option value="">-- Select Category --</option>
                      {documentCategories.map((category: any) => (
                        <option key={category.id} value={category.code}>
                          {category.code} — {category.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number Range {numberRangesLoading ? "(Loading...)" : `(${numberRangesForDropdown.length} available)`}
                </label>
                {numberRangesLoading ? (
                  <Input
                    value={formData.numberRange || ''}
                    onChange={(e) => setFormData({ ...formData, numberRange: e.target.value })}
                    placeholder="Loading number ranges..."
                    disabled
                    maxLength={20}
                  />
                ) : numberRangesForDropdown.length === 0 ? (
                  <Input
                    value={formData.numberRange || ''}
                    onChange={(e) => setFormData({ ...formData, numberRange: e.target.value })}
                    placeholder="Enter number range code (e.g., 01, 02)"
                    maxLength={20}
                  />
                ) : (
                  <>
                    <select
                      value={formData.numberRange && numberRangesForDropdown.find((nr: any) => nr.code === formData.numberRange) ? formData.numberRange : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__manual__') {
                          setFormData({ ...formData, numberRange: '' });
                        } else {
                          setFormData({ ...formData, numberRange: value });
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">-- Select Number Range (Optional) --</option>
                      {numberRangesForDropdown.map((numberRange: any) => (
                        <option key={numberRange.id} value={numberRange.code}>
                          {numberRange.code} — {numberRange.name || numberRange.description || 'Number Range'} {numberRange.fromNumber && numberRange.toNumber ? `(${numberRange.fromNumber}-${numberRange.toNumber})` : ''}
                        </option>
                      ))}
                      <option value="__manual__">-- Or Enter Manually --</option>
                    </select>
                    {(!formData.numberRange || !numberRangesForDropdown.find((nr: any) => nr.code === formData.numberRange)) && (
                      <Input
                        value={formData.numberRange || ''}
                        onChange={(e) => setFormData({ ...formData, numberRange: e.target.value })}
                        placeholder="Enter number range code manually (e.g., 01, 02)"
                        maxLength={20}
                        className="mt-2"
                      />
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Account Types Allowed {accountTypesLoading ? "(Loading...)" : `(${accountTypesForDropdown.length} available)`}
                </label>
                <select
                  value={formData.accountTypesAllowed}
                  onChange={(e) => setFormData({ ...formData, accountTypesAllowed: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={accountTypesLoading || accountTypesForDropdown.length === 0}
                >
                  {accountTypesLoading ? (
                    <option value="">Loading account types...</option>
                  ) : accountTypesForDropdown.length === 0 ? (
                    <option value="">No account types available</option>
                  ) : (
                    <>
                      {accountTypesForDropdown.map((accountType: any) => (
                        <option key={accountType.id} value={accountType.code}>
                          {accountType.code} — {accountType.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Entry View</label>
                <select
                  value={formData.entryView}
                  onChange={(e) => setFormData({ ...formData, entryView: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="standard">Standard</option>
                  <option value="fast_entry">Fast Entry</option>
                  <option value="enjoy">Enjoy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Authorization Group</label>
                <Input
                  value={formData.authorizationGroup}
                  onChange={(e) => setFormData({ ...formData, authorizationGroup: e.target.value })}
                  maxLength={10}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.reversalAllowed}
                    onChange={(e) => setFormData({ ...formData, reversalAllowed: e.target.checked })}
                  />
                  Reversal Allowed
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.referenceRequired}
                    onChange={(e) => setFormData({ ...formData, referenceRequired: e.target.checked })}
                  />
                  Reference Required
                </label>
              </div>
              <div className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                />
                <div className="space-y-1 leading-none">
                  <label className="text-sm font-medium">Active</label>
                  <p className="text-sm text-gray-600">
                    Is this document type active and available for use?
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 text-sm text-gray-600">
                <p>• <strong>Active:</strong> Document type is available for use in transactions</p>
                <p>• <strong>Inactive:</strong> Document type is disabled and cannot be used</p>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Create'} Document Type
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Document Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Types ({filteredDocumentTypes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Number Range</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Account Types</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Options</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocumentTypes.map((documentType) => (
                  <tr key={documentType.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-mono">{documentType.documentTypeCode}</td>
                    <td className="border border-gray-300 px-4 py-2">{documentType.description}</td>
                    <td className="border border-gray-300 px-4 py-2 capitalize">{documentType.documentCategory}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {(() => {
                        if (!documentType.numberRange) return '-';
                        const numberRange = numberRangesForDropdown.find((nr: any) => nr.code === documentType.numberRange);
                        return numberRange 
                          ? `${numberRange.code} — ${numberRange.name || numberRange.description || 'Number Range'}`
                          : documentType.numberRange;
                      })()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {(() => {
                        const accountType = accountTypesForDropdown.find((at: any) => at.code === documentType.accountTypesAllowed);
                        return accountType ? `${accountType.code} — ${accountType.name}` : documentType.accountTypesAllowed;
                      })()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="text-sm">
                        <div>Rev: {documentType.reversalAllowed ? '✓' : '✗'}</div>
                        <div>Ref: {documentType.referenceRequired ? '✓' : '✗'}</div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        documentType.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {documentType.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(documentType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {documentType.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(documentType.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(documentType.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Account Types Configuration Modal */}
      {showAccountTypesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Configure Account Types</h2>
              <Button
                variant="outline"
                onClick={() => setShowAccountTypesModal(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>

            {/* Account Type Form */}
            {showAccountTypeForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {editingAccountTypeId ? 'Edit' : 'Add'} Account Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAccountTypeSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Code*</label>
                      <Input
                        value={accountTypeFormData.code}
                        onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, code: e.target.value })}
                        maxLength={10}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Name*</label>
                      <Input
                        value={accountTypeFormData.name}
                        onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        value={accountTypeFormData.description}
                        onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category*</label>
                      <select
                        value={accountTypeFormData.category}
                        onChange={(e) => setAccountTypeFormData({ ...accountTypeFormData, category: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="gl">GL Account</option>
                      </select>
                    </div>
                    <div className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                      <Checkbox
                        checked={accountTypeFormData.isActive}
                        onCheckedChange={(checked) => setAccountTypeFormData({ ...accountTypeFormData, isActive: checked as boolean })}
                      />
                      <div className="space-y-1 leading-none">
                        <label className="text-sm font-medium">Active</label>
                        <p className="text-sm text-gray-600">
                          Is this account type active and available for use?
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <Button type="submit">
                        {editingAccountTypeId ? 'Update' : 'Create'} Account Type
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAccountTypeForm(false);
                          setEditingAccountTypeId(null);
                          setAccountTypeFormData({
                            code: '',
                            name: '',
                            description: '',
                            category: 'asset',
                            isActive: true
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Account Types Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Account Types ({accountTypes.length})</CardTitle>
                  <Button onClick={() => setShowAccountTypeForm(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Account Type
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTypes.map((accountType) => (
                        <tr key={accountType.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-mono">{accountType.code}</td>
                          <td className="border border-gray-300 px-4 py-2">{accountType.name}</td>
                          <td className="border border-gray-300 px-4 py-2">{accountType.description || '-'}</td>
                          <td className="border border-gray-300 px-4 py-2 capitalize">{accountType.category}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              accountType.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {accountType.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditAccountType(accountType)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {accountType.is_active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivateAccountType(accountType.id)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <PowerOff className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAccountType(accountType.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}