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
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Lock,
    Unlock,
    CheckCircle2,
    Calendar,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FiscalYear {
    id: number;
    fiscal_year: string;
    company_code_id: number;
    start_date: string;
    end_date: string;
    status: string;
    is_current: boolean;
    closed_date: string | null;
    closed_by: string | null;
}

export default function FiscalYearChange() {
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [showRolloverDialog, setShowRolloverDialog] = useState(false);
    const [newFiscalYear, setNewFiscalYear] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [companyCodeId, setCompanyCodeId] = useState("");
    const [closingNotes, setClosingNotes] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch company codes
    const { data: companyCodes } = useQuery({
        queryKey: ['/api/master-data/company-code'],
        queryFn: async () => {
            const response = await apiRequest('/api/master-data/company-code');
            return await response.json(); // API returns array directly
        },
    });

    // Set default company code when data loads
    useEffect(() => {
        if (companyCodes && companyCodes.length > 0 && !companyCodeId) {
            setCompanyCodeId(companyCodes[0].id.toString());
        }
    }, [companyCodes]);

    // Fetch current fiscal year
    const { data: currentFiscalYear } = useQuery({
        queryKey: ['/api/finance/year-end/fiscal-years/current'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/current');
            const data = await response.json();
            return data.data;
        },
    });

    // Fetch all fiscal years
    const { data: fiscalYears, isLoading } = useQuery({
        queryKey: ['/api/finance/year-end/fiscal-years'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years');
            const data = await response.json();
            return data.data || [];
        },
    });

    // Open fiscal year mutation
    const openYearMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscal_year: newFiscalYear,
                    company_code_id: parseInt(companyCodeId),
                    start_date: startDate,
                    end_date: endDate
                })
            });
            return await response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: data.message || "Fiscal year opened successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/fiscal-years'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/fiscal-years/current'] });
            setShowOpenDialog(false);
            setNewFiscalYear("");
            setStartDate("");
            setEndDate("");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to open fiscal year",
                variant: "destructive",
            });
        }
    });

    // Close fiscal year mutation
    const closeYearMutation = useMutation({
        mutationFn: async (yearId: number) => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fiscal_year_id: yearId,
                    closed_by: "System User",
                    notes: closingNotes
                })
            });
            return await response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: data.message || "Fiscal year closed successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/fiscal-years'] });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/fiscal-years/current'] });
            setShowCloseDialog(false);
            setClosingNotes("");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to close fiscal year",
                variant: "destructive",
            });
        }
    });

    // Rollover fiscal year mutation
    const rolloverMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/rollover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_fiscal_year: currentFiscalYear?.fiscal_year,
                    to_fiscal_year: newFiscalYear,
                    company_code_id: parseInt(companyCodeId)
                })
            });
            return await response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: data.message || "Balance rollover completed successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/fiscal-years'] });
            setShowRolloverDialog(false);
            setNewFiscalYear("");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to rollover balances",
                variant: "destructive",
            });
        }
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any }> = {
            OPEN: { color: "bg-green-100 text-green-800", icon: Unlock },
            CLOSED: { color: "bg-red-100 text-red-800", icon: Lock },
            PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Calendar },
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

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch (error) {
            return '-';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Fiscal Year Management</h2>
                    <p className="text-gray-600">Manage fiscal year periods and balance carryforward</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Unlock className="h-4 w-4 mr-2" />
                                Open New Year
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Open New Fiscal Year</DialogTitle>
                                <DialogDescription>
                                    Create and open a new fiscal year period
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Fiscal Year *</Label>
                                    <Input
                                        value={newFiscalYear}
                                        onChange={(e) => setNewFiscalYear(e.target.value)}
                                        placeholder="2026"
                                    />
                                </div>
                                <div>
                                    <Label>Company Code *</Label>
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
                                <div>
                                    <Label>Start Date *</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>End Date *</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={() => openYearMutation.mutate()}
                                    disabled={!newFiscalYear || !startDate || !endDate || openYearMutation.isPending}
                                    className="w-full"
                                >
                                    {openYearMutation.isPending ? "Opening..." : "Open Fiscal Year"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {currentFiscalYear && currentFiscalYear.status === 'OPEN' && (
                        <>
                            <Dialog open={showRolloverDialog} onOpenChange={setShowRolloverDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Rollover Balances
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Rollover Balances</DialogTitle>
                                        <DialogDescription>
                                            Carry forward balances to the new fiscal year
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-blue-800">
                                                <strong>From:</strong> {currentFiscalYear.fiscal_year}
                                            </p>
                                        </div>
                                        <div>
                                            <Label>To Fiscal Year *</Label>
                                            <Input
                                                value={newFiscalYear}
                                                onChange={(e) => setNewFiscalYear(e.target.value)}
                                                placeholder="2026"
                                            />
                                        </div>
                                        <div>
                                            <Label>Company Code *</Label>
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
                                        <Button
                                            onClick={() => rolloverMutation.mutate()}
                                            disabled={!newFiscalYear || rolloverMutation.isPending}
                                            className="w-full"
                                        >
                                            {rolloverMutation.isPending ? "Rolling Over..." : "Rollover Balances"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                                <DialogTrigger asChild>
                                    <Button className="bg-red-600 hover:bg-red-700">
                                        <Lock className="h-4 w-4 mr-2" />
                                        Close Current Year
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Close Fiscal Year</DialogTitle>
                                        <DialogDescription>
                                            Close the current fiscal year - this action cannot be undone
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex gap-2">
                                                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-sm text-yellow-800">
                                                    <strong>Warning:</strong> Closing the fiscal year will prevent any further
                                                    postings to this period. Ensure all year-end processes are complete.
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Closing Notes</Label>
                                            <Textarea
                                                value={closingNotes}
                                                onChange={(e) => setClosingNotes(e.target.value)}
                                                placeholder="Enter notes about this fiscal year closing..."
                                                rows={4}
                                            />
                                        </div>
                                        <Button
                                            onClick={() => closeYearMutation.mutate(currentFiscalYear.id)}
                                            disabled={closeYearMutation.isPending}
                                            variant="destructive"
                                            className="w-full"
                                        >
                                            {closeYearMutation.isPending ? "Closing..." : "Close Fiscal Year"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            {/* Current Fiscal Year Card */}
            {currentFiscalYear ? (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Current Fiscal Year</span>
                            {getStatusBadge(currentFiscalYear.status)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Fiscal Year</p>
                                <p className="font-semibold text-lg">{currentFiscalYear.fiscal_year}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Start Date</p>
                                <p className="font-semibold">{formatDate(currentFiscalYear.start_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">End Date</p>
                                <p className="font-semibold">{formatDate(currentFiscalYear.end_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Status</p>
                                <p className="font-semibold">{currentFiscalYear.is_current ? 'Active' : 'Inactive'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-gray-200">
                    <CardHeader>
                        <CardTitle>Current Fiscal Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500 text-center py-4">No current fiscal year set. Please open a new fiscal year.</p>
                    </CardContent>
                </Card>
            )}

            {/* Fiscal Years Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Fiscal Years</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading fiscal years...</div>
                    ) : fiscalYears && fiscalYears.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fiscal Year</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Current</TableHead>
                                    <TableHead>Closed Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fiscalYears.map((year: FiscalYear) => (
                                    <TableRow key={year.id}>
                                        <TableCell className="font-medium">{year.fiscal_year}</TableCell>
                                        <TableCell>{formatDate(year.start_date)}</TableCell>
                                        <TableCell>{formatDate(year.end_date)}</TableCell>
                                        <TableCell>{getStatusBadge(year.status)}</TableCell>
                                        <TableCell>
                                            {year.is_current && (
                                                <Badge variant="outline" className="text-blue-600">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Current
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(year.closed_date)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No fiscal years found</p>
                            <p className="text-sm">Click "Open New Year" to create a fiscal year</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
