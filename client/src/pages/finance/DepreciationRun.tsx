import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Eye, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface PreviewResult {
    asset_id: number;
    asset_number: string;
    period_depreciation: number;
    accumulated_depreciation: number;
    new_book_value: number;
    method: string;
}

interface DepreciationRunResult {
    run_id?: number;
    status: 'completed' | 'failed';
    assets_processed: number;
    total_depreciation: number;
    errors: string[];
    test_run?: boolean;
}

export default function DepreciationRun() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [fiscalYear, setFiscalYear] = useState(currentYear);
    const [fiscalPeriod, setFiscalPeriod] = useState(currentMonth);
    const [companyCodeId, setCompanyCodeId] = useState<string>('');
    const [depreciationAreaId, setDepreciationAreaId] = useState<string>('');
    const [previewData, setPreviewData] = useState<PreviewResult[] | null>(null);
    const [runResult, setRunResult] = useState<DepreciationRunResult | null>(null);

    // Fetch company codes
    const { data: companyCodes = [] } = useQuery({
        queryKey: ['/api/master-data/company-codes'],
        queryFn: async () => {
            const response = await apiClient.get('/api/master-data/company-codes');
            return response.data;
        },
    });

    // Fetch depreciation areas
    const { data: depreciationAreas = [] } = useQuery({
        queryKey: ['/api/master-data/depreciation-areas'],
        queryFn: async () => {
            const response = await apiClient.get('/api/master-data/depreciation-areas');
            return response.data;
        },
    });

    // Preview mutation
    const previewMutation = useMutation({
        mutationFn: async () => {
            const params = new URLSearchParams({
                fiscal_year: fiscalYear.toString(),
                fiscal_period: fiscalPeriod.toString(),
            });

            if (companyCodeId) params.append('company_code_id', companyCodeId);
            if (depreciationAreaId) params.append('depreciation_area_id', depreciationAreaId);

            const response = await apiClient.get(`/api/asset-management/depreciation/preview?${params}`);
            return response.data;
        },
        onSuccess: (data) => {
            setPreviewData(data.assets);
            setRunResult(null);
            toast({
                title: 'Preview Generated',
                description: `${data.assets_count} assets will be depreciated for $${data.total_depreciation.toFixed(2)}`,
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Preview Failed',
                description: error.response?.data?.error || error.message,
                variant: 'destructive',
            });
        },
    });

    // Execute run mutation
    const executeMutation = useMutation({
        mutationFn: async (testRun: boolean) => {
            const response = await apiClient.post('/api/asset-management/depreciation/run', {
                fiscal_year: fiscalYear,
                fiscal_period: fiscalPeriod,
                company_code_id: companyCodeId ? parseInt(companyCodeId) : undefined,
                depreciation_area_id: depreciationAreaId ? parseInt(depreciationAreaId) : undefined,
                test_run: testRun,
            });
            return response.data;
        },
        onSuccess: (data) => {
            setRunResult(data);
            if (data.status === 'completed' && !data.test_run) {
                queryClient.invalidateQueries({ queryKey: ['/api/master-data/assets'] });
                queryClient.invalidateQueries({ queryKey: ['/api/asset-management/depreciation/runs'] });
                toast({
                    title: 'Depreciation Run Completed',
                    description: `${data.assets_processed} assets processed. Total depreciation: $${data.total_depreciation.toFixed(2)}`,
                });
            }
        },
        onError: (error: any) => {
            toast({
                title: 'Depreciation Run Failed',
                description: error.response?.data?.error || error.message,
                variant: 'destructive',
            });
        },
    });

    const handlePreview = () => {
        previewMutation.mutate();
    };

    const handleExecute = (testRun: boolean = false) => {
        if (!previewData || previewData.length === 0) {
            toast({
                title: 'Preview Required',
                description: 'Please preview the depreciation run before executing',
                variant: 'destructive',
            });
            return;
        }

        executeMutation.mutate(testRun);
    };

    const exportToExcel = () => {
        if (!previewData) return;

        const csv = [
            ['Asset Number', 'Period Depreciation', 'Accumulated Depreciation', 'New Book Value', 'Method'].join(','),
            ...previewData.map(row => [
                row.asset_number,
                row.period_depreciation.toFixed(2),
                row.accumulated_depreciation.toFixed(2),
                row.new_book_value.toFixed(2),
                row.method
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `depreciation-preview-${fiscalYear}-${fiscalPeriod}.csv`;
        a.click();
    };

    const totalPreviewDepreciation = previewData?.reduce((sum, row) => sum + row.period_depreciation, 0) || 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Run Depreciation</CardTitle>
                    <CardDescription>
                        Calculate and post depreciation for assets for a specific period
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Selection Form */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Fiscal Year</Label>
                            <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Period (Month)</Label>
                            <Select value={fiscalPeriod.toString()} onValueChange={(v) => setFiscalPeriod(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <SelectItem key={month} value={month.toString()}>
                                            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Company Code (Optional)</Label>
                            <Select value={companyCodeId} onValueChange={setCompanyCodeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All companies" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Companies</SelectItem>
                                    {companyCodes.map((cc: any) => (
                                        <SelectItem key={cc.id} value={cc.id.toString()}>
                                            {cc.code} - {cc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Depreciation Area (Optional)</Label>
                            <Select value={depreciationAreaId} onValueChange={setDepreciationAreaId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All areas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Areas</SelectItem>
                                    {depreciationAreas.map((da: any) => (
                                        <SelectItem key={da.id} value={da.id.toString()}>
                                            {da.code} - {da.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handlePreview}
                            disabled={previewMutation.isPending}
                            variant="outline"
                        >
                            {previewMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={() => handleExecute(false)}
                            disabled={executeMutation.isPending || !previewData || previewData.length === 0}
                        >
                            {executeMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Execute Run
                                </>
                            )}
                        </Button>

                        {previewData && previewData.length > 0 && (
                            <Button onClick={exportToExcel} variant="secondary">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        )}
                    </div>

                    {/* Results Display */}
                    {runResult && (
                        <Alert className={runResult.status === 'completed' ? 'border-green-500' : 'border-red-500'}>
                            {runResult.status === 'completed' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <AlertDescription>
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        {runResult.status === 'completed' ? 'Depreciation Run Successful' : 'Depreciation Run Failed'}
                                    </p>
                                    <p>Assets Processed: {runResult.assets_processed}</p>
                                    <p>Total Depreciation: ${runResult.total_depreciation.toFixed(2)}</p>
                                    {runResult.run_id && <p>Run ID: {runResult.run_id}</p>}
                                    {runResult.errors.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-semibold text-red-600">Errors:</p>
                                            <ul className="list-disc list-inside text-sm">
                                                {runResult.errors.map((error, idx) => (
                                                    <li key={idx}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Preview Table */}
                    {previewData && previewData.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    Preview Results ({previewData.length} assets)
                                </h3>
                                <p className="text-lg font-bold">
                                    Total: ${totalPreviewDepreciation.toFixed(2)}
                                </p>
                            </div>

                            <div className="border rounded-md max-h-96 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset Number</TableHead>
                                            <TableHead className="text-right">Period Depreciation</TableHead>
                                            <TableHead className="text-right">Accumulated</TableHead>
                                            <TableHead className="text-right">New Book Value</TableHead>
                                            <TableHead>Method</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((row) => (
                                            <TableRow key={row.asset_id}>
                                                <TableCell className="font-medium">{row.asset_number}</TableCell>
                                                <TableCell className="text-right">
                                                    ${row.period_depreciation.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ${row.accumulated_depreciation.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ${row.new_book_value.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">{row.method}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {previewMutation.isPending === false && previewData && previewData.length === 0 && (
                        <Alert>
                            <AlertDescription>
                                No assets found for the selected criteria. Either all assets have already been depreciated
                                for this period, or there are no eligible assets.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
