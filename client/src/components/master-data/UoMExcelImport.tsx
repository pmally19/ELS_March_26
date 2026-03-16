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

type ImportedUoM = {
  code: string;
  name: string;
  category: string;
  description: string;
  isBase: boolean;
};

const UoMExcelImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedUoM[]>([]);
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

  // Read Excel file and convert to UoM objects
  const readExcelFile = async (file: File): Promise<ImportedUoM[]> => {
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
          
          // Map to UoM format and validate
          const uomData = jsonData.map((row: any) => {
            return {
              code: String(row.code || row.Code || '').trim(),
              name: String(row.name || row.Name || '').trim(),
              category: String(row.category || row.Category || '').trim().toLowerCase(),
              description: String(row.description || row.Description || ''),
              isBase: Boolean(row.isBase || row.IsBase || row['Is Base'] || false)
            };
          }).filter(uom => uom.code && uom.name && uom.category); // Filter out incomplete rows
          
          resolve(uomData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  // Import UoMs to the database
  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    
    setImporting(true);
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Process items in batches to avoid overwhelming the server
    for (const uom of previewData) {
      try {
        await apiRequest('/api/master-data/units-of-measure', {
          method: 'POST',
          body: JSON.stringify(uom)
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${uom.code}: ${error.message || 'Unknown error'}`);
      }
    }
    
    setImportResult(results);
    
    if (results.success > 0) {
      // Invalidate the UoM cache to refresh the list
              queryClient.invalidateQueries({ queryKey: ['/api/master-data/units-of-measure'] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${results.success} units of measure${results.failed > 0 ? ` (${results.failed} failed)` : ''}`
      });
    } else {
      toast({
        title: "Import failed",
        description: "None of the units could be imported. Please check the errors.",
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

  // Download sample template
  const downloadTemplate = () => {
    const templateData = [
      {
        Code: 'KG',
        Name: 'Kilogram',
        Category: 'weight',
        Description: 'Base unit for weight',
        IsBase: true
      },
      {
        Code: 'G',
        Name: 'Gram',
        Category: 'weight',
        Description: 'Gram measurement unit',
        IsBase: false
      },
      {
        Code: 'M',
        Name: 'Meter',
        Category: 'length',
        Description: 'Base unit for length',
        IsBase: true
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Units of Measure');
    
    // Generate and download the file
    XLSX.writeFile(workbook, 'UoM_Template.xlsx');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Units of Measure from Excel</CardTitle>
          <CardDescription>
            Upload an Excel file containing UoM data to bulk import them into the system.
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
                  <h3 className="font-medium">Preview: {previewData.length} UoMs</h3>
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
                        <th className="text-left p-2 text-sm">Category</th>
                        <th className="text-left p-2 text-sm">Base Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((uom, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2 text-sm">{uom.code}</td>
                          <td className="p-2 text-sm">{uom.name}</td>
                          <td className="p-2 text-sm">{uom.category}</td>
                          <td className="p-2 text-sm">{uom.isBase ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                      {previewData.length > 5 && (
                        <tr className="border-t">
                          <td colSpan={4} className="p-2 text-sm text-center text-muted-foreground">
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
                  <p>Successfully imported {importResult.success} UoMs.
                  {importResult.failed > 0 && ` Failed to import ${importResult.failed} UoMs.`}</p>
                  
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
                Import {previewData.length} Units
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UoMExcelImport;