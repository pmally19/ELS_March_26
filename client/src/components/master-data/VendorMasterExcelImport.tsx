import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function VendorMasterExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/master-data/vendor/bulk-import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const data = await response.json();
      setResult(data);
      
      // Refresh the vendor data
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/vendor"] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${data.success} vendors. ${data.failed} failed.`
      });

    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import vendor data. Please check your file format.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'vendor_code',
      'name', 
      'vendor_group',
      'purchase_org',
      'company_code',
      'payment_terms',
      'currency',
      'is_active'
    ];
    
    const csvContent = headers.join(',') + '\n' + 
      'V001,Example Vendor,CHEM,BMP1,BMUS,NET30,USD,true\n' +
      'V002,Sample Supplier,RAW,BMP1,BMUS,NET15,USD,true';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vendor-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Vendor Data
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file to import multiple vendors at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button variant="outline" onClick={downloadTemplate}>
              Download Template
            </Button>
            <p className="text-sm text-muted-foreground">
              Download the template file to see the required format for vendor import.
            </p>
          </div>

          <div className="space-y-2">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button 
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full"
          >
            {importing ? "Importing..." : "Import Vendors"}
          </Button>

          {result && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Successfully imported</span>
                    </div>
                    <span className="text-sm text-green-600">{result.success}</span>
                  </div>
                  
                  {result.failed > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">Failed to import</span>
                      </div>
                      <span className="text-sm text-red-600">{result.failed}</span>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">Import Errors:</span>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-md max-h-40 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <p key={index} className="text-xs text-amber-700">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Required Fields:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>vendor_code: Unique identifier for the vendor</li>
                <li>name: Vendor company name</li>
              </ul>
            </div>
            <div>
              <strong>Optional Fields:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>vendor_group: Classification group</li>
                <li>purchase_org: Purchase organization (default: BMP1)</li>
                <li>company_code: Company code (default: BMUS)</li>
                <li>payment_terms: Payment terms (default: NET30)</li>
                <li>currency: Currency code (default: USD)</li>
                <li>is_active: Active status (true/false, default: true)</li>
              </ul>
            </div>
            <div>
              <strong>Supported Formats:</strong> Excel (.xlsx, .xls) and CSV (.csv)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}