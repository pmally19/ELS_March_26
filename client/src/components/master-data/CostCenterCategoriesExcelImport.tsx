import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, UploadCloud, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type ImportedCategory = {
    code: string;
    name: string;
    description: string;
};

type ImportResult = {
    success: number;
    failed: number;
    errors: string[];
};

const CostCenterCategoriesExcelImport: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState<ImportedCategory[]>([]);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const isExcelFile = (file: File) =>
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

    const handleFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ): Promise<void> => {
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
                variant: "destructive",
            });
            e.target.value = "";
            return;
        }

        setFile(selectedFile);

        try {
            const data = await readExcelFile(selectedFile);
            setPreviewData(data);
        } catch (_error) {
            toast({
                title: "Error reading file",
                description:
                    "The Excel file couldn't be processed. Please check its format.",
                variant: "destructive",
            });
            setFile(null);
            setPreviewData([]);
            e.target.value = "";
        }
    };

    const readExcelFile = (file: File): Promise<ImportedCategory[]> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: "binary" });

                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

                    const categoryData: ImportedCategory[] = jsonData
                        .map((row: any) => {
                            return {
                                code: String(row.code || row.Code || "").trim().toUpperCase().substring(0, 2),
                                name: String(row.name || row.Name || "").trim(),
                                description: String(row.description || row.Description || ""),
                            };
                        })
                        .filter(
                            (cat) =>
                                cat.code &&
                                cat.name
                        );

                    resolve(categoryData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsBinaryString(file);
        });

    const handleImport = async (): Promise<void> => {
        if (!file || previewData.length === 0) return;

        setImporting(true);

        try {
            const response = await fetch("/api/master-data/cost-center-categories/bulk-import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ categories: previewData }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const results: { created?: any[]; errors?: string[] } =
                await response.json();

            const success = results.created?.length ?? 0;
            const failed = results.errors?.length ?? 0;
            const errors = results.errors ?? [];

            setImportResult({ success, failed, errors });

            if (success > 0) {
                await queryClient.invalidateQueries({
                    queryKey: ["/api/master-data/cost-center-categories"],
                });

                toast({
                    title: "Import completed",
                    description: `Successfully imported ${success} categories${failed > 0 ? ` (${failed} failed)` : ""
                        }`,
                });
            } else {
                toast({
                    title: "Import failed",
                    description:
                        "None of the categories could be imported. Please check the errors.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error("Import error:", error);
            setImportResult({
                success: 0,
                failed: previewData.length,
                errors: [error?.message || "Unknown error occurred during import"],
            });

            toast({
                title: "Import failed",
                description: "An error occurred during import. Please try again.",
                variant: "destructive",
            });
        } finally {
            setImporting(false);
        }
    };

    const resetImport = (): void => {
        setFile(null);
        setPreviewData([]);
        setImportResult(null);
    };

    const downloadTemplate = (): void => {
        const templateData = [
            {
                Code: "M",
                Name: "Marketing",
                Description: "Marketing Department",
            },
            {
                Code: "T",
                Name: "IT",
                Description: "Information Technology",
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
        XLSX.writeFile(workbook, "CostCenterCategories_Template.xlsx");
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Import Cost Center Categories</CardTitle>
                    <CardDescription>
                        Upload an Excel file containing category data. Columns required: Code, Name, Description (optional).
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
                            <Button variant="outline" onClick={downloadTemplate} disabled={importing}>
                                Download Template
                            </Button>
                        </div>

                        {previewData.length > 0 && (
                            <div className="border rounded-md p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-medium">
                                        Preview: {previewData.length} Categories
                                    </h3>
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
                                                <th className="text-left p-2 text-sm">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(0, 5).map((cat, index) => (
                                                <tr key={index} className="border-t">
                                                    <td className="p-2 text-sm">{cat.code}</td>
                                                    <td className="p-2 text-sm">{cat.name}</td>
                                                    <td className="p-2 text-sm">{cat.description}</td>
                                                </tr>
                                            ))}
                                            {previewData.length > 5 && (
                                                <tr className="border-t">
                                                    <td
                                                        colSpan={3}
                                                        className="p-2 text-sm text-center text-muted-foreground"
                                                    >
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
                            <Alert
                                variant={
                                    importResult.failed > 0 ? "destructive" : "default"
                                }
                                className="mt-4"
                            >
                                {importResult.failed > 0 ? (
                                    <AlertCircle className="h-4 w-4" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                <AlertTitle>Import Complete</AlertTitle>
                                <AlertDescription>
                                    <p>
                                        Successfully imported {importResult.success} categories.
                                        {importResult.failed > 0 &&
                                            ` Failed to import ${importResult.failed} categories.`}
                                    </p>

                                    {importResult.errors.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-medium">Errors:</p>
                                            <ul className="list-disc pl-5 text-sm space-y-1 mt-1">
                                                {importResult.errors.slice(0, 5).map((error, i) => (
                                                    <li key={i}>{error}</li>
                                                ))}
                                                {importResult.errors.length > 5 && (
                                                    <li>
                                                        ...and{" "}
                                                        {importResult.errors.length - 5} more errors
                                                    </li>
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
                    <Button
                        variant="outline"
                        onClick={resetImport}
                        disabled={importing || !file}
                    >
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
                                Import {previewData.length} Categories
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default CostCenterCategoriesExcelImport;
