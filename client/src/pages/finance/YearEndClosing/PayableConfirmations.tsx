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
    CheckCircle2,
    XCircle,
    Mail,
    AlertCircle,
    FileText,
    Send,
    Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayableConfirmation {
    id: number;
    fiscal_year: string;
    vendor_id: number;
    vendor_name: string;
    account_number: string;
    closing_balance: number;
    currency: string;
    status: string;
    confirmation_date: string | null;
    letter_sent_date: string | null;
    is_disputed: boolean;
    dispute_reason: string | null;
    dispute_amount: number | null;
}

export default function PayableConfirmations() {
    const [selectedConfirmation, setSelectedConfirmation] = useState<PayableConfirmation | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showDisputeDialog, setShowDisputeDialog] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [disputeReason, setDisputeReason] = useState("");
    const [disputeAmount, setDisputeAmount] = useState("");
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

    // Fetch payable confirmations
    const { data: confirmations, isLoading } = useQuery({
        queryKey: ['/api/finance/year-end/payables', fiscalYear],
        queryFn: async () => {
            const response = await apiRequest(`/api/finance/year-end/payables?fiscal_year=${fiscalYear}`);
            const data = await response.json();
            return data.data || [];
        },
    });

    // Generate confirmations mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('/api/finance/year-end/payables/generate', {
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
                description: data.message || "Confirmations generated successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/payables'] });
            setShowGenerateDialog(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to generate confirmations",
                variant: "destructive",
            });
        }
    });

    // Confirm mutation
    const confirmMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/finance/year-end/payables/${id}/confirm`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confirmed_by_name: "System User",
                    confirmed_by_email: "user@example.com",
                    notes: "Confirmed via dashboard"
                })
            });
            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Confirmation marked as confirmed",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/payables'] });
            setShowConfirmDialog(false);
            setSelectedConfirmation(null);
        },
    });

    // Dispute mutation
    const disputeMutation = useMutation({
        mutationFn: async ({ id, reason, amount }: { id: number; reason: string; amount: string }) => {
            const response = await apiRequest(`/api/finance/year-end/payables/${id}/dispute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispute_reason: reason,
                    dispute_amount: amount ? parseFloat(amount) : null
                })
            });
            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Dispute created successfully",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/payables'] });
            setShowDisputeDialog(false);
            setSelectedConfirmation(null);
            setDisputeReason("");
            setDisputeAmount("");
        },
    });

    // Send letter mutation
    const sendLetterMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiRequest(`/api/finance/year-end/payables/${id}/send-letter`, {
                method: 'POST',
            });
            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: "Success",
                description: "Confirmation letter sent",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/finance/year-end/payables'] });
        },
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any }> = {
            PENDING: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
            LETTER_SENT: { color: "bg-blue-100 text-blue-800", icon: Mail },
            CONFIRMED: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
            DISPUTED: { color: "bg-red-100 text-red-800", icon: XCircle },
            RESOLVED: { color: "bg-purple-100 text-purple-800", icon: CheckCircle2 },
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

    const formatCurrency = (amount: number, currency: string = "USD") => {
        return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Payable Balance Confirmations</h2>
                    <p className="text-gray-600">Confirm outstanding vendor balances for year-end closing</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4 mr-2" />
                                Generate Confirmations
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate Balance Confirmations</DialogTitle>
                                <DialogDescription>
                                    Generate balance confirmations for all vendors with outstanding balances
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
                                <Button
                                    onClick={() => generateMutation.mutate()}
                                    disabled={generateMutation.isPending}
                                    className="w-full"
                                >
                                    {generateMutation.isPending ? "Generating..." : "Generate Confirmations"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{confirmations?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {confirmations?.filter((c: PayableConfirmation) => c.status === 'PENDING').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Confirmed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {confirmations?.filter((c: PayableConfirmation) => c.status === 'CONFIRMED').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Disputed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {confirmations?.filter((c: PayableConfirmation) => c.status === 'DISPUTED').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Balance Confirmations</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading confirmations...</div>
                    ) : confirmations && confirmations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Account #</TableHead>
                                    <TableHead className="text-right">Closing Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Confirmation Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {confirmations.map((confirmation: PayableConfirmation) => (
                                    <TableRow key={confirmation.id}>
                                        <TableCell className="font-medium">{confirmation.vendor_name}</TableCell>
                                        <TableCell>{confirmation.account_number}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(confirmation.closing_balance, confirmation.currency)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(confirmation.status)}</TableCell>
                                        <TableCell>
                                            {confirmation.confirmation_date
                                                ? new Date(confirmation.confirmation_date).toLocaleDateString()
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {confirmation.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => sendLetterMutation.mutate(confirmation.id)}
                                                        >
                                                            <Send className="h-3 w-3 mr-1" />
                                                            Send Letter
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedConfirmation(confirmation);
                                                                setShowConfirmDialog(true);
                                                            }}
                                                        >
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Confirm
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedConfirmation(confirmation);
                                                                setShowDisputeDialog(true);
                                                            }}
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Dispute
                                                        </Button>
                                                    </>
                                                )}
                                                {confirmation.is_disputed && (
                                                    <Badge variant="outline" className="text-red-600">
                                                        Disputed: {confirmation.dispute_reason}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No confirmations found</p>
                            <p className="text-sm">Click "Generate Confirmations" to create balance confirmations</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirm Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Balance</DialogTitle>
                        <DialogDescription>
                            Mark this balance confirmation as confirmed
                        </DialogDescription>
                    </DialogHeader>
                    {selectedConfirmation && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Vendor</p>
                                <p className="font-medium">{selectedConfirmation.vendor_name}</p>
                                <p className="text-sm text-gray-600 mt-2">Closing Balance</p>
                                <p className="font-medium text-lg">
                                    {formatCurrency(selectedConfirmation.closing_balance, selectedConfirmation.currency)}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => confirmMutation.mutate(selectedConfirmation.id)}
                                    disabled={confirmMutation.isPending}
                                    className="flex-1"
                                >
                                    {confirmMutation.isPending ? "Confirming..." : "Confirm Balance"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dispute Dialog */}
            <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Dispute</DialogTitle>
                        <DialogDescription>
                            Record a dispute for this balance confirmation
                        </DialogDescription>
                    </DialogHeader>
                    {selectedConfirmation && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Vendor</p>
                                <p className="font-medium">{selectedConfirmation.vendor_name}</p>
                                <p className="text-sm text-gray-600 mt-2">Closing Balance</p>
                                <p className="font-medium text-lg">
                                    {formatCurrency(selectedConfirmation.closing_balance, selectedConfirmation.currency)}
                                </p>
                            </div>
                            <div>
                                <Label>Dispute Amount (Optional)</Label>
                                <Input
                                    type="number"
                                    value={disputeAmount}
                                    onChange={(e) => setDisputeAmount(e.target.value)}
                                    placeholder="Enter disputed amount"
                                />
                            </div>
                            <div>
                                <Label>Dispute Reason *</Label>
                                <Textarea
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    placeholder="Enter reason for dispute"
                                    rows={4}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDisputeDialog(false);
                                        setDisputeReason("");
                                        setDisputeAmount("");
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => disputeMutation.mutate({
                                        id: selectedConfirmation.id,
                                        reason: disputeReason,
                                        amount: disputeAmount
                                    })}
                                    disabled={!disputeReason || disputeMutation.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                >
                                    {disputeMutation.isPending ? "Creating..." : "Create Dispute"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
