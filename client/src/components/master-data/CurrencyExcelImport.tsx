import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, FileUp, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import * as XLSX from 'xlsx';

interface CurrencyImportData {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  conversionRate: number;
  baseCurrency: boolean;
  isActive: boolean;
  notes?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export default function CurrencyExcelImport() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<CurrencyImportData[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setData([]);
      setValidationResults([]);
      setImportResults(null);
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      setProgress(50);

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        toast({
          title: "Invalid file format",
          description: "The Excel file must contain at least a header row and one data row.",
          variant: "destructive"
        });
        return;
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      setProgress(70);

      const parsedData: CurrencyImportData[] = rows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const rowData: any = {};
          headers.forEach((header, headerIndex) => {
            const value = row[headerIndex];
            rowData[header.toLowerCase().replace(/\s+/g, '')] = value;
          });

          return {
            code: rowData.code || '',
            name: rowData.name || '',
            symbol: rowData.symbol || '',
            decimalPlaces: parseInt(rowData.decimalplaces) || 2,
            conversionRate: parseFloat(rowData.conversionrate) || 1.0,
            baseCurrency: rowData.basecurrency === 'Yes' || rowData.basecurrency === 'true' || rowData.basecurrency === true || rowData.basecurrency === 1,
            isActive: rowData.isactive === 'Yes' || rowData.isactive === 'true' || rowData.isactive === true || rowData.isactive === 1,
            notes: rowData.notes || ''
          };
        });

      setProgress(90);

      // Validate data
      const validations = parsedData.map(validateCurrency);
      
      setData(parsedData);
      setValidationResults(validations);
      setProgress(100);

      const validCount = validations.filter(v => v.isValid).length;
      const invalidCount = validations.filter(v => !v.isValid).length;

      toast({
        title: "File processed successfully",
        description: `Found ${validCount} valid records and ${invalidCount} records with errors.`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File processing failed",
        description: "There was an error reading the Excel file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateCurrency = (currency: CurrencyImportData): ValidationResult => {
    const errors: string[] = [];

    if (!currency.code || currency.code.length < 2) {
      errors.push('Code is required (minimum 2 characters)');
    }

    if (!currency.name || currency.name.length < 1) {
      errors.push('Name is required');
    }

    if (!currency.symbol || currency.symbol.length < 1) {
      errors.push('Symbol is required');
    }

    if (currency.decimalPlaces < 0 || currency.decimalPlaces > 4) {
      errors.push('Decimal places must be between 0 and 4');
    }

    if (currency.conversionRate < 0) {
      errors.push('Conversion rate must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleImport = async () => {
    const validData = data.filter((_, index) => validationResults[index]?.isValid);
    
    if (validData.length === 0) {
      toast({
        title: "No valid data to import",
        description: "Please fix the validation errors before importing.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      setProgress(30);
      
      const response = await apiRequest('/api/master-data/currency/bulk-import', 'POST', validData);
      
      setProgress(100);
      setImportResults(response);

      toast({
        title: "Import completed",
        description: `Successfully imported ${response.success} currencies. ${response.failed} failed.`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Code', 'Name', 'Symbol', 'Decimal Places', 'Conversion Rate', 'Base Currency', 'Is Active', 'Notes'],
      ['USD', 'US Dollar', '$', '2', '1.0', 'Yes', 'Yes', 'Primary currency'],
      ['EUR', 'Euro', '€', '2', '0.85', 'No', 'Yes', 'European currency'],
      ['GBP', 'British Pound', '£', '2', '0.73', 'No', 'Yes', 'UK currency'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Currencies');
    XLSX.writeFile(workbook, 'currencies-template.xlsx');

    toast({
      title: "Template downloaded",
      description: "Excel template has been downloaded to your computer.",
    });
  };

  const resetImport = () => {
    setFile(null);
    setData([]);
    setValidationResults([]);
    setImportResults(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Select an Excel file (.xlsx, .xls) containing currency data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={downloadTemplate}
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Preview */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Review the imported data and validation results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => {
                    const validation = validationResults[index];
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {validation?.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="font-mono">{item.symbol}</TableCell>
                        <TableCell>{item.conversionRate}</TableCell>
                        <TableCell>
                          {item.baseCurrency ? (
                            <Badge variant="default">Base</Badge>
                          ) : (
                            <Badge variant="secondary">Regular</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {validation?.errors && validation.errors.length > 0 && (
                            <div className="space-y-1">
                              {validation.errors.map((error, errorIndex) => (
                                <Badge key={errorIndex} variant="destructive" className="text-xs">
                                  {error}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{validationResults.filter(v => v.isValid).length} valid</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{validationResults.filter(v => !v.isValid).length} invalid</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetImport}>
                  Reset
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isProcessing || validationResults.filter(v => v.isValid).length === 0}
                >
                  Import {validationResults.filter(v => v.isValid).length} Currencies
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {importResults.errors && importResults.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Import Errors:</strong>
                    {importResults.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm">• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}