import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Play,
    CheckCircle2,
    Clock,
    FileText,
    TrendingDown,
    AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssetClosingRun {
    id: number;
    fiscal_year: string;
    company_code_id: number;
    run_date: string;
    status: string;
    total_assets: number;
    total_depreciation: number;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
}

export default function AssetYearEnd() {
    const [showRunDialog, setShowRunDialog] = useState(false);
    const [fiscalYear, setFiscalYear] = useState("");
    const [companyCodeId, setCompanyCodeId] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch current fiscal year
    const { data: currentFiscalYear } = useQuery({
        queryKey: ['/api/finance/year-end/fiscal-years/current'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/current');
            const data = await response.json();
            return data.data;
        },
    });

    // Fetch company codes
    const { data: companyCodes } = useQuery({
        queryKey: ['/api/master-data/company-code'],
        queryFn: async () => {
            const response = await apiRequest('/api/master-data/company-code');
            return await response.json(); // API returns array directly
        },
    });

    // Fetch all fiscal years
    const { data: fiscalYears } = useQuery({
        queryKey: ['/api/finance/year-end/fiscal-years'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Set defaults when data loads
    useEffect(() => {
        if (currentFiscalYear && !fiscalYear) {
            setFiscalYear(currentFiscalYear.fiscal_year);
        }
        if (companyCodes && companyCodes.length > 0 && !companyCodeId) {
            setCompanyCodeId(companyCodes[0].id.toString());
        }
    }, [currentFiscalYear, companyCodes]);

    // Fetch asset closing history
    const { data: closingHistory, isLoading } = useQuery({
        queryKey: ['/api/finance/year-end/assets/history'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/assets/history');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Fetch latest status
    const { data: latestStatus } = useQuery({
        queryKey: ['/api/finance/year-end/assets/status'],
        queryFn: async () => {
            try {
                const response = await apiRequest('/api/finance/year-end/assets/status');
                if (!response.ok) {
                    // 404 means no runs exist yet, which is fine
                    if (response.status === 404) {
                        return null;
                    }
                    throw new Error('Failed to fetch status');
                }
                const data = await response.json();
                return data.data;
            } catch (error) {
                // Return null instead of throwing to prevent error state
                return null;
            }
        },
        refetchInterval: 5000, // Poll every 5 seconds
        retry: false, // Don't retry on 404
    });

    // Run asset closing mutation
    const runClosingMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('/api/finance/year-end/assets/run-closing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscal_year: fiscalYear,
                    company_code_id: parseInt(companyCodeId)
                })
            });
            return await response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: data.message || "Asset year-end closing started",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/assets/history'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/assets/status'] });
            setShowRunDialog(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to run asset closing",
                variant: "destructive",
            });
        }
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any }> = {
            PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
            IN_PROGRESS: { color: "bg-blue-100 text-blue-800", icon: Play },
            COMPLETED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
            FAILED: { color: "bg-red-100 text-red-800", icon: AlertCircle },
        };

        const config = statusConfig[status] || statusConfig.PENDING;
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} flex items-center gap-1`}>
                <Icon className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Asset Year-End Depreciation</h2>
                    <p className="text-gray-600">Calculate and post year-end depreciation for all assets</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Play className="h-4 w-4 mr-2" />
                                Run Year-End Closing
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Run Asset Year-End Closing</DialogTitle>
                                <DialogDescription>
                                    Calculate depreciation for all assets and post year-end entries
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Fiscal Year</Label>
                                    <select
                                        value={fiscalYear}
                                        onChange={(e) => setFiscalYear(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Fiscal Year</option>
                                        {fiscalYears?.map((fy: any) => (
                                            <option key={fy.id} value={fy.fiscal_year}>
                                                {fy.fiscal_year} ({fy.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label>Company Code</Label>
                                    <select
                                        value={companyCodeId}
                                        onChange={(e) => setCompanyCodeId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Company Code</option>
                                        {companyCodes?.map((cc: any) => (
                                            <option key={cc.id} value={cc.id}>
                                                {cc.code} - {cc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-yellow-800">
                                            <strong>Warning:</strong> This process will calculate depreciation for all assets
                                            and post year-end entries. Ensure all asset transactions are complete before running.
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => runClosingMutation.mutate()}
                                    disabled={runClosingMutation.isPending}
                                    className="w-full"
                                >
                                    {runClosingMutation.isPending ? "Starting..." : "Start Year-End Closing"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Current Status Card */}
            {latestStatus && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Current Run Status</span>
                            {getStatusBadge(latestStatus.status)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Fiscal Year</p>
                                <p className="font-semibold">{latestStatus.fiscal_year}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Assets</p>
                                <p className="font-semibold">{latestStatus.total_assets || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Depreciation</p>
                                <p className="font-semibold">{formatCurrency(latestStatus.total_depreciation || 0)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Started At</p>
                                <p className="font-semibold text-sm">{formatDate(latestStatus.started_at)}</p>
                            </div>
                        </div>
                        {latestStatus.error_message && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-800">
                                    <strong>Error:</strong> {latestStatus.error_message}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Runs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{closingHistory?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {closingHistory?.filter((r: AssetClosingRun) => r.status === 'COMPLETED').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {closingHistory?.filter((r: AssetClosingRun) => r.status === 'IN_PROGRESS').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {closingHistory?.filter((r: AssetClosingRun) => r.status === 'FAILED').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Closing History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Closing Run History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading history...</div>
                    ) : closingHistory && closingHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fiscal Year</TableHead>
                                    <TableHead>Run Date</TableHead>
                                    <TableHead className="text-right">Total Assets</TableHead>
                                    <TableHead className="text-right">Total Depreciation</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closingHistory.map((run: AssetClosingRun) => (
                                    <TableRow key={run.id}>
                                        <TableCell className="font-medium">{run.fiscal_year}</TableCell>
                                        <TableCell>{formatDate(run.run_date)}</TableCell>
                                        <TableCell className="text-right">{run.total_assets || 0}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(run.total_depreciation || 0)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                                        <TableCell>
                                            {run.completed_at
                                                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No closing runs found</p>
                            <p className="text-sm">Click "Run Year-End Closing" to start the depreciation process</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
