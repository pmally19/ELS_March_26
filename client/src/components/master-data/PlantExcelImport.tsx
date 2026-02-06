import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, UploadCloud, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

type CompanyCode = {
  id: number;
  code: string;
  name: string;
};

type ImportedPlant = {
  code: string;
  name: string;
  description: string;
  companyCodeId: number;
  type: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  timezone: string;
  operatingHours: string;
  coordinates: string;
  status: string;
  isActive: boolean;
};

interface PlantExcelImportProps {
  companyCodes: CompanyCode[];
}

const PlantExcelImport = ({ companyCodes }: PlantExcelImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedPlant[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Excel file validation
  const isExcelFile = (file: File) => {
    return (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    );
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportResult(null);
    
    if (!e.target.files || e.target.files.length === 0) {
      setFile(null);
      setPreviewData([]);
      return;
    }
    
    const selectedFile = e.target.files[0];
    
    if (!isExcelFile(selectedFile)) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    setFile(selectedFile);
    
    // Read file and generate preview
    try {
      const data = await readExcelFile(selectedFile);
      setPreviewData(data);
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "The Excel file couldn't be processed. Please check its format.",
        variant: "destructive"
      });
      setFile(null);
      setPreviewData([]);
      e.target.value = '';
    }
  };

  // Find company code ID by code
  const findCompanyCodeId = (code: string): number => {
    const companyCode = companyCodes.find(cc => cc.code === code);
    return companyCode ? companyCode.id : 0;
  };

  // Read Excel file and convert to Plant objects
  const readExcelFile = async (file: File): Promise<ImportedPlant[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          // Map to Plant format and validate
          const plantData = jsonData.map((row: any) => {
            const isActive = typeof row.isActive === 'boolean' 
              ? row.isActive
              : row.isActive === 'Yes' || row.isActive === 'TRUE' || row.isActive === '1' || row.isActive === 1 || row.isActive === 'true';
            
            // Find company code ID from code - handle both "code" and "code - name" formats
            let companyCodeCode = String(row.companyCode || row.CompanyCode || row['Company Code'] || '').trim();
            
            // If format is "code - name", extract just the code part
            if (companyCodeCode.includes(' - ')) {
              companyCodeCode = companyCodeCode.split(' - ')[0].trim();
            }
            
            const companyCodeId = findCompanyCodeId(companyCodeCode);
            
            return {
              code: String(row.code || row.Code || '').trim(),
              name: String(row.name || row.Name || '').trim(),
              description: String(row.description || row.Description || '').trim(),
              companyCodeId: companyCodeId,
              type: String(row.type || row.Type || 'Manufacturing').trim(),
              category: String(row.category || row.Category || '').trim(),
              address: String(row.address || row.Address || '').trim(),
              city: String(row.city || row.City || '').trim(),
              state: String(row.state || row.State || '').trim(),
              country: String(row.country || row.Country || '').trim(),
              postalCode: String(row.postalCode || row.PostalCode || row['Postal Code'] || '').trim(),
              phone: String(row.phone || row.Phone || '').trim(),
              email: String(row.email || row.Email || '').trim(),
              manager: String(row.manager || row.Manager || '').trim(),
              timezone: String(row.timezone || row.Timezone || '').trim(),
              operatingHours: String(row.operatingHours || row.OperatingHours || row['Operating Hours'] || '').trim(),
              coordinates: String(row.coordinates || row.Coordinates || '').trim(),
              status: String(row.status || row.Status || 'active').toLowerCase().trim(),
              isActive: isActive
            };
          }).filter(plant => 
            plant.code && 
            plant.name && 
            plant.companyCodeId > 0
          ); // Filter out incomplete rows
          
          resolve(plantData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  // Import Plants to the database using bulk import
  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    
    setImporting(true);
    
    try {
      // Map data to match backend structure - remove empty strings and convert to null
      const mappedData = previewData.map(plant => {
        const mapped: any = {
          code: plant.code.trim(),
          name: plant.name.trim(),
          companyCodeId: plant.companyCodeId,
          type: plant.type.trim() || 'Manufacturing',
          status: plant.status || 'active',
          isActive: plant.isActive !== undefined ? plant.isActive : true
        };

        // Only include optional fields if they have values
        if (plant.description && plant.description.trim()) mapped.description = plant.description.trim();
        if (plant.category && plant.category.trim()) mapped.category = plant.category.trim();
        if (plant.address && plant.address.trim()) mapped.address = plant.address.trim();
        if (plant.city && plant.city.trim()) mapped.city = plant.city.trim();
        if (plant.state && plant.state.trim()) mapped.state = plant.state.trim();
        if (plant.country && plant.country.trim()) mapped.country = plant.country.trim();
        if (plant.postalCode && plant.postalCode.trim()) mapped.postalCode = plant.postalCode.trim();
        if (plant.phone && plant.phone.trim()) mapped.phone = plant.phone.trim();
        if (plant.email && plant.email.trim()) mapped.email = plant.email.trim();
        if (plant.manager && plant.manager.trim()) mapped.manager = plant.manager.trim();
        if (plant.timezone && plant.timezone.trim()) mapped.timezone = plant.timezone.trim();
        if (plant.operatingHours && plant.operatingHours.trim()) mapped.operatingHours = plant.operatingHours.trim();
        if (plant.coordinates && plant.coordinates.trim()) mapped.coordinates = plant.coordinates.trim();

        return mapped;
      });

      // Backend expects { plants: [...] }
      const response = await apiRequest('/api/master-data/plant/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ plants: mappedData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      
      // Backend returns { created: [], errors: [] }
      const successCount = results.created?.length || 0;
      const failedCount = results.errors?.length || 0;
      const errorMessages = results.errors?.map((err: any) => {
        if (typeof err === 'string') return err;
        if (err.error) return `${err.data?.code || 'Plant'}: ${err.error}`;
        return JSON.stringify(err);
      }) || [];

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errorMessages
      });
      
      if (successCount > 0) {
        // Invalidate the cache to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/master-data/plant'] });
        
        toast({
          title: "Import completed",
          description: `Successfully imported ${successCount} plants${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
        });
      } else {
        toast({
          title: "Import failed",
          description: "None of the plants could be imported. Please check the errors.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Unknown error occurred during import';
      
      setImportResult({
        success: 0,
        failed: previewData.length,
        errors: [errorMessage]
      });
      
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    setImporting(false);
  };

  // Reset the import form
  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
  };

  // Get company code name from ID
  const getCompanyCodeName = (id: number): string => {
    const companyCode = companyCodes.find(cc => cc.id === id);
    return companyCode ? `${companyCode.code} - ${companyCode.name}` : "Unknown";
  };

  // Download sample template
  const downloadTemplate = () => {
    // First ensure there are company codes available
    if (companyCodes.length === 0) {
      toast({
        title: "Missing Company Codes",
        description: "Please create at least one Company Code before downloading the template.",
        variant: "destructive"
      });
      return;
    }

    // Use the first company code as an example
    const exampleCompanyCode = companyCodes[0].code;
    
    const templateData = [
      {
        Code: 'P001',
        Name: 'Main Factory',
        Description: 'Primary manufacturing facility',
        CompanyCode: exampleCompanyCode,
        Type: 'Manufacturing',
        Category: 'Production',
        Address: '123 Industry Way',
        City: 'Chicago',
        State: 'IL',
        Country: 'United States',
        PostalCode: '60601',
        Phone: '+1 312-555-1234',
        Email: 'factory@example.com',
        Manager: 'John Smith',
        Timezone: 'America/Chicago',
        OperatingHours: 'Mon-Fri 8:00-17:00',
        Coordinates: '41.8781,-87.6298',
        Status: 'active',
        IsActive: true
      },
      {
        Code: 'W001',
        Name: 'East Coast Warehouse',
        Description: 'Main distribution center for east coast',
        CompanyCode: exampleCompanyCode,
        Type: 'Warehouse',
        Category: 'Storage',
        Address: '500 Storage Blvd',
        City: 'Newark',
        State: 'NJ',
        Country: 'United States',
        PostalCode: '07101',
        Phone: '+1 973-555-6789',
        Email: 'warehouse@example.com',
        Manager: 'Jane Doe',
        Timezone: 'America/New_York',
        OperatingHours: '24/7',
        Coordinates: '40.7357,-74.1724',
        Status: 'active',
        IsActive: true
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plants');
    
    // Generate and download the file
    XLSX.writeFile(workbook, 'Plant_Template.xlsx');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Plants from Excel</CardTitle>
          <CardDescription>
            Upload an Excel file containing plant data to bulk import them into the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileChange} 
                disabled={importing}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                disabled={importing}
              >
                Download Template
              </Button>
            </div>
            
            {previewData.length > 0 && (
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Preview: {previewData.length} Plants</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetImport}
                    disabled={importing}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 text-sm">Code</th>
                        <th className="text-left p-2 text-sm">Name</th>
                        <th className="text-left p-2 text-sm">Company Code</th>
                        <th className="text-left p-2 text-sm">Type</th>
                        <th className="text-left p-2 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((plant, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 text-sm">{plant.code}</td>
                          <td className="p-2 text-sm">{plant.name}</td>
                          <td className="p-2 text-sm">{getCompanyCodeName(plant.companyCodeId)}</td>
                          <td className="p-2 text-sm">{plant.type}</td>
                          <td className="p-2 text-sm">{plant.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                      {previewData.length > 5 && (
                        <tr className="border-t">
                          <td colSpan={5} className="p-2 text-sm text-center text-muted-foreground">
                            + {previewData.length - 5} more items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"} className="mt-4">
                {importResult.failed > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  <p>Successfully imported {importResult.success} plants.
                  {importResult.failed > 0 && ` Failed to import ${importResult.failed} plants.`}</p>
                  
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetImport} disabled={importing || !file}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || previewData.length === 0}
          >
            {importing ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Importing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Import {previewData.length} Plants
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PlantExcelImport;