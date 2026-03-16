import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ReceivableConfirmations from "./YearEndClosing/ReceivableConfirmations";
import PayableConfirmations from "./YearEndClosing/PayableConfirmations";
import AssetYearEnd from "./YearEndClosing/AssetYearEnd";
import FiscalYearChange from "./YearEndClosing/FiscalYearChange";

export default function YearEndClosingDashboard() {
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch current fiscal year
    const { data: currentFiscalYear } = useQuery({
        queryKey: ['/api/finance/year-end/fiscal-years/current'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/fiscal-years/current');
            return await response.json();
        },
    });

    // Fetch receivable confirmations stats
    const { data: receivablesStats } = useQuery({
        queryKey: ['/api/finance/year-end/receivables'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/receivables');
            const data = await response.json();
            return {
                total: data.count || 0,
                pending: data.data?.filter((r: any) => r.status === 'PENDING').length || 0,
                confirmed: data.data?.filter((r: any) => r.status === 'CONFIRMED').length || 0,
                disputed: data.data?.filter((r: any) => r.status === 'DISPUTED').length || 0,
            };
        },
    });

    // Fetch payable confirmations stats
    const { data: payablesStats } = useQuery({
        queryKey: ['/api/finance/year-end/payables'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/payables');
            const data = await response.json();
            return {
                total: data.count || 0,
                pending: data.data?.filter((p: any) => p.status === 'PENDING').length || 0,
                confirmed: data.data?.filter((p: any) => p.status === 'CONFIRMED').length || 0,
                disputed: data.data?.filter((p: any) => p.status === 'DISPUTED').length || 0,
            };
        },
    });

    // Fetch asset year-end history
    const { data: assetHistory } = useQuery({
        queryKey: ['/api/finance/year-end/assets/history'],
        queryFn: async () => {
            const response = await apiRequest('/api/finance/year-end/assets/history');
            const data = await response.json();
            return data.data || [];
        },
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/finance'}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Finance
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Year-End Closing</h1>
                                <p className="text-gray-600 mt-2">
                                    Manage year-end closing processes and validations
                                    {currentFiscalYear?.data && (
                                        <span className="ml-2 text-sm">
                                            • Fiscal Year: <strong>{currentFiscalYear.data.fiscal_year}</strong>
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Receivable Confirmations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{receivablesStats?.total || 0}</div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                    {receivablesStats?.confirmed || 0} Confirmed
                                </Badge>
                                <Badge variant="outline" className="text-xs text-yellow-600">
                                    {receivablesStats?.pending || 0} Pending
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Payable Confirmations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{payablesStats?.total || 0}</div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                    {payablesStats?.confirmed || 0} Confirmed
                                </Badge>
                                <Badge variant="outline" className="text-xs text-yellow-600">
                                    {payablesStats?.pending || 0} Pending
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Asset Year-End Runs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{assetHistory?.length || 0}</div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs text-green-600">
                                    {assetHistory?.filter((h: any) => h.status === 'COMPLETED').length || 0} Completed
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Fiscal Year Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currentFiscalYear?.data?.status || 'N/A'}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${currentFiscalYear?.data?.status === 'OPEN'
                                        ? 'text-green-600'
                                        : 'text-gray-600'
                                        }`}
                                >
                                    {currentFiscalYear?.data?.is_current ? 'Current' : 'Not Current'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Card>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <div className="border-b px-4">
                            <TabsList className="bg-transparent h-12 p-0 rounded-none">
                                <TabsTrigger
                                    value="overview"
                                    className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
                                >
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger
                                    value="receivables"
                                    className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
                                >
                                    Receivable Confirmations
                                </TabsTrigger>
                                <TabsTrigger
                                    value="payables"
                                    className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
                                >
                                    Payable Confirmations
                                </TabsTrigger>
                                <TabsTrigger
                                    value="assets"
                                    className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
                                >
                                    Asset Year-End
                                </TabsTrigger>
                                <TabsTrigger
                                    value="fiscal-year"
                                    className="data-[state=active]:border-b-2 border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none h-12 px-4"
                                >
                                    Fiscal Year Change
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="overview" className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Year-End Closing Checklist</h3>
                                    <div className="space-y-3">
                                        <Card className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    <div>
                                                        <p className="font-medium">Receivable Balance Confirmations</p>
                                                        <p className="text-sm text-gray-600">
                                                            {receivablesStats?.confirmed || 0} of {receivablesStats?.total || 0} confirmed
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab('receivables')}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </Card>

                                        <Card className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    <div>
                                                        <p className="font-medium">Payable Balance Confirmations</p>
                                                        <p className="text-sm text-gray-600">
                                                            {payablesStats?.confirmed || 0} of {payablesStats?.total || 0} confirmed
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab('payables')}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </Card>

                                        <Card className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                                    <div>
                                                        <p className="font-medium">Asset Year-End Depreciation</p>
                                                        <p className="text-sm text-gray-600">
                                                            {assetHistory?.length || 0} depreciation runs completed
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab('assets')}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </Card>

                                        <Card className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="h-5 w-5 text-indigo-600" />
                                                    <div>
                                                        <p className="font-medium">Fiscal Year Change</p>
                                                        <p className="text-sm text-gray-600">
                                                            Current: {currentFiscalYear?.data?.fiscal_year || 'N/A'} ({currentFiscalYear?.data?.status || 'N/A'})
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab('fiscal-year')}
                                                >
                                                    Manage
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="receivables" className="p-6">
                            <ReceivableConfirmations />
                        </TabsContent>

                        <TabsContent value="payables" className="p-6">
                            <PayableConfirmations />
                        </TabsContent>

                        <TabsContent value="assets" className="p-6">
                            <AssetYearEnd />
                        </TabsContent>

                        <TabsContent value="fiscal-year" className="p-6">
                            <FiscalYearChange />
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
