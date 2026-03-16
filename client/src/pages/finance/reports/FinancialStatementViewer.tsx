import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calculator, Download, Printer, ChevronRight, ChevronDown } from "lucide-react";

interface ReportParams {
    templateId: string;
    fiscalYear: string;
    period: string;
}

export default function FinancialStatementViewer() {
    const [params, setParams] = useState<ReportParams>({
        templateId: "",
        fiscalYear: new Date().getFullYear().toString(),
        period: "12",
    });

    const [queryParams, setQueryParams] = useState<ReportParams | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    // Fetch available templates
    const { data: templates = [], isLoading: templatesLoading } = useQuery<any[]>({
        queryKey: ["/api/finance/report-templates"],
    });

    // Fetch fiscal periods
    const { data: fiscalPeriods = [] } = useQuery<any[]>({
        queryKey: ["/api/master-data/fiscal-period"],
        queryFn: async () => {
            const res = await fetch("/api/master-data/fiscal-period");
            if (!res.ok) throw new Error("Failed to fetch fiscal periods");
            return res.json();
        }
    });

    const availablePeriods = fiscalPeriods.filter((p: any) => p.year.toString() === params.fiscalYear);

    // Fetch report data on demand
    const { data: reportData, isLoading: reportLoading, isFetching } = useQuery<any>({
        queryKey: ["/api/finance/financial-statements/generate", queryParams],
        queryFn: async () => {
            if (!queryParams) return null;
            const q = new URLSearchParams(queryParams as unknown as Record<string, string>).toString();
            const res = await fetch(`/api/finance/financial-statements/generate?${q}`);
            if (!res.ok) throw new Error("Failed to fetch report");
            return res.json();
        },
        enabled: !!queryParams,
    });

    const handleGenerate = () => {
        if (!params.templateId || !params.fiscalYear) return;
        setQueryParams(params);
        // Expand top level nodes by default
        setExpandedNodes({});
    };

    const toggleExpand = (id: string) => {
        setExpandedNodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    // Recursive render function for the tree table
    const renderRow = (node: any, depth = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedNodes[node.id] !== false; // Default true if not explicitly collapsed

        // Update expanded state mapping on first render if missing
        if (expandedNodes[node.id] === undefined && hasChildren) {
            setTimeout(() => setExpandedNodes(prev => ({ ...prev, [node.id]: true })), 0);
        }

        const padLeft = depth * 24;

        const row = (
            <TableRow
                key={node.id}
                className={`${depth === 0 ? 'bg-gray-50/50 font-semibold' : ''} ${node.nodeType === 'ROOT' ? 'border-t-2 border-t-gray-300' : ''}`}
            >
                <TableCell>
                    <div className="flex items-center" style={{ paddingLeft: `${padLeft}px` }}>
                        {hasChildren ? (
                            <button onClick={() => toggleExpand(node.id)} className="w-6 flex justify-center text-gray-400 hover:text-gray-700">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        ) : (
                            <span className="w-6" /> // spacer
                        )}
                        <span className={`
              ${node.nodeType === 'ROOT' ? 'text-gray-900 font-bold' : ''}
              ${node.nodeType === 'GROUP' ? 'text-gray-800 font-medium' : ''}
              ${node.nodeType === 'ITEM' ? 'text-gray-600' : ''}
            `}>
                            {node.name}
                        </span>
                    </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                    <span className={`
            ${node.nodeType === 'ROOT' || node.nodeType === 'GROUP' ? 'font-semibold' : ''}
            ${(node.balance || 0) < 0 ? 'text-red-600' : ''}
          `}>
                        {formatCurrency(node.balance)}
                    </span>
                </TableCell>
            </TableRow>
        );

        let rows = [row];
        if (hasChildren && isExpanded) {
            node.children.forEach((child: any) => {
                rows = [...rows, ...renderRow(child, depth + 1)];
            });
        }

        return rows;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Financial Statement Report</h1>
                <p className="text-gray-500 mt-2">Generate Balance Sheets and P&L Statements from customized templates.</p>
            </div>

            <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">

                        <div className="space-y-2 col-span-2">
                            <Label>Report Template</Label>
                            <Select
                                value={params.templateId}
                                onValueChange={(val) => setParams(prev => ({ ...prev, templateId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>{t.code} - {t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Fiscal Year</Label>
                            <Input
                                type="number"
                                value={params.fiscalYear}
                                onChange={(e) => setParams(prev => ({ ...prev, fiscalYear: e.target.value }))}
                                placeholder="YYYY"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Period</Label>
                            <Select
                                value={params.period}
                                onValueChange={(val) => setParams(prev => ({ ...prev, period: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePeriods.length > 0 ? (
                                        availablePeriods.map((p: any) => (
                                            <SelectItem key={p.period} value={p.period.toString()}>{p.name}</SelectItem>
                                        ))
                                    ) : (
                                        Array.from({ length: 12 }).map((_, i) => (
                                            <SelectItem key={i + 1} value={(i + 1).toString()}>Period {i + 1}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={handleGenerate}
                            disabled={!params.templateId || !params.fiscalYear || isFetching}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <Card className="shadow-md">
                    <CardHeader className="flex flex-row justify-between items-center border-b bg-gray-50/50">
                        <div>
                            <CardTitle>{reportData.template.name}</CardTitle>
                            <CardDescription>
                                Fiscal Year: {reportData.parameters.fiscalYear} | Period: 1 to {reportData.parameters.period}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2" /> Print</Button>
                            <Button variant="outline" size="sm"><Download size={16} className="mr-2" /> Export CSV</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100/50">
                                        <TableHead className="w-[70%] text-black font-bold">Financial Statement Item</TableHead>
                                        <TableHead className="w-[30%] text-right text-black font-bold">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.report?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-10 text-gray-500">
                                                No report hierarchy found in this template.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.report?.map((rootNode: any) => renderRow(rootNode))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
