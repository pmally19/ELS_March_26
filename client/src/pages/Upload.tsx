import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Upload as UploadIcon, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Database,
  Brain,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  success: boolean;
  validation: {
    success: boolean;
    validation: string;
    agent: string;
    module: string;
  };
  dataPreview: any[];
  totalRows: number;
  fileName: string;
  targetTable: string;
}

interface TableInfo {
  [tableName: string]: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
}

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetTable, setTargetTable] = useState<string>('');
  const [mappingConfig, setMappingConfig] = useState<string>('{}');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available tables
  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['/api/upload/tables'],
    queryFn: async () => {
      const response = await fetch('/api/upload/tables');
      if (!response.ok) throw new Error('Failed to fetch tables');
      return response.json() as Promise<{ success: boolean; tables: TableInfo }>;
    }
  });

  // File upload and validation mutation
  const validateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/validate', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload validation failed');
      return response.json() as Promise<ValidationResult>;
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setIsValidating(false);
      toast({
        title: "File Validated",
        description: `Upload AI Agent has analyzed your ${data.fileName} file.`
      });
    },
    onError: (error) => {
      setIsValidating(false);
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: error.message
      });
    }
  });

  // Process upload mutation
  const processMutation = useMutation({
    mutationFn: async ({ formData, validateOnly }: { formData: FormData; validateOnly: boolean }) => {
      formData.append('validateOnly', validateOnly.toString());
      const response = await fetch('/api/upload/process', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload processing failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.validateOnly ? "Validation Complete" : "Upload Complete",
        description: data.validateOnly 
          ? `Validated ${data.totalRows} records with Upload AI Agent`
          : `Successfully inserted ${data.insertedCount} of ${data.totalRows} records`
      });
      if (!data.validateOnly) {
        queryClient.invalidateQueries({ queryKey: ['/api/upload/history'] });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error.message
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (allowedTypes.includes(fileExt)) {
        setSelectedFile(file);
        setValidationResult(null);
        setUploadProgress(0);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file (.csv, .xlsx, .xls)"
        });
      }
    }
  };

  const handleValidate = async () => {
    if (!selectedFile || !targetTable) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a file and target table"
      });
      return;
    }

    setIsValidating(true);
    setUploadProgress(25);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('targetTable', targetTable);
    formData.append('mappingConfig', mappingConfig);

    validateMutation.mutate(formData);
  };

  const handleProcess = (validateOnly: boolean = false) => {
    if (!selectedFile || !targetTable) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('targetTable', targetTable);
    formData.append('mappingConfig', mappingConfig);

    processMutation.mutate({ formData, validateOnly });
  };

  const renderValidationStatus = () => {
    if (!validationResult) return null;

    const { validation } = validationResult;
    const isValid = validation.success;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Upload AI Agent Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <Badge variant={isValid ? "default" : "secondary"}>
                {validation.agent}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Analyzed {validationResult.totalRows} records
              </span>
            </div>
            
            <Alert>
              <AlertDescription>
                <div className="whitespace-pre-wrap">{validation.validation}</div>
              </AlertDescription>
            </Alert>

            {validationResult.dataPreview && (
              <div>
                <Label className="text-sm font-medium">Data Preview (First 5 rows)</Label>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(validationResult.dataPreview[0] || {}).map(key => (
                          <th key={key} className="border border-gray-300 px-2 py-1 text-left">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validationResult.dataPreview.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-1">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => handleProcess(true)}
                variant="outline"
                disabled={processMutation.isPending}
              >
                <Eye className="h-4 w-4 mr-2" />
                Validate Only
              </Button>
              <Button 
                onClick={() => handleProcess(false)}
                disabled={processMutation.isPending || !isValid}
              >
                <Database className="h-4 w-4 mr-2" />
                Import to MallyERP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Upload & Validation</h1>
          <p className="text-muted-foreground mt-2">
            Import external data with AI-powered validation for MallyERP integration
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadIcon className="h-5 w-5" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="file-upload">Select CSV or Excel File</Label>
                <div 
                  className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-blue-500" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadIcon className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-lg font-medium">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">Supports CSV, XLSX, XLS files up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="target-table">Target MallyERP Table</Label>
                <Select value={targetTable} onValueChange={setTargetTable}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select destination table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tablesLoading ? (
                      <SelectItem value="loading" disabled>Loading tables...</SelectItem>
                    ) : (
                      tablesData?.tables && Object.keys(tablesData.tables).map(tableName => (
                        <SelectItem key={tableName} value={tableName}>
                          {tableName} ({tablesData.tables[tableName].length} columns)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              <Button 
                onClick={handleValidate}
                disabled={!selectedFile || !targetTable || isValidating || validateMutation.isPending}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-spin" />
                    Validating with Upload AI Agent...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Validate with Upload AI Agent
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {renderValidationStatus()}
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label htmlFor="mapping-config">JSON Mapping Configuration</Label>
                <Textarea
                  id="mapping-config"
                  value={mappingConfig}
                  onChange={(e) => setMappingConfig(e.target.value)}
                  placeholder='{"source_field": "target_field", "Customer Name": "customer_name"}'
                  className="h-32"
                />
                <p className="text-sm text-muted-foreground">
                  Define how source fields map to target table columns. If empty, automatic mapping will be used.
                </p>

                {targetTable && tablesData?.tables[targetTable] && (
                  <div className="mt-4">
                    <Label>Available Columns in {targetTable}</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {tablesData.tables[targetTable].map(column => (
                        <Badge key={column.name} variant="outline" className="justify-start">
                          {column.name}
                          {!column.nullable && <span className="text-red-500 ml-1">*</span>}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      * Required fields. Upload AI Agent will validate these are present.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload history will be displayed here</p>
                <p className="text-sm">Track all your data imports and validation results</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}