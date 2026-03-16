import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export default function AssetReports() {
    const [filters, setFilters] = useState({
        company_code_id: '',
        asset_class_id: '',
        active_only: 'true',
        year: new Date().getFullYear().toString(),
        as_of_date: new Date().toISOString().split('T')[0],
    });

    // Fetch company codes
    const { data: companyCodes = [] } = useQuery({
        queryKey: ['/api/master-data/company-codes'],
        queryFn: async () => {
            const response = await apiClient.get('/api/master-data/company-codes');
            return response.data;
        },
    });

    // Fetch asset classes
    const { data: assetClasses = [] } = useQuery({
        queryKey: ['/api/master-data/asset-classes'],
        queryFn: async () => {
            const response = await apiClient.get('/api/master-data/asset-classes');
            return response.data;
        },
    });

    // Asset Register Report
    const { data: assetRegister, isLoading: loadingRegister } = useQuery({
        queryKey: ['/api/asset-management/reports/asset-register', filters.company_code_id, filters.asset_class_id, filters.active_only],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.company_code_id) params.append('company_code_id', filters.company_code_id);
            if (filters.asset_class_id) params.append('asset_class_id', filters.asset_class_id);
            if (filters.active_only) params.append('active_only', filters.active_only);

            const response = await apiClient.get(`/api/asset-management/reports/asset-register?${params}`);
            return response.data;
        },
    });

    // Depreciation Schedule Report
    const { data: depSchedule, isLoading: loadingSchedule } = useQuery({
        queryKey: ['/api/asset-management/reports/depreciation-schedule', filters.year, filters.company_code_id],
        queryFn: async () => {
            const params = new URLSearchParams({ year: filters.year });
            if (filters.company_code_id) params.append('company_code_id', filters.company_code_id);

            const response = await apiClient.get(`/api/asset-management/reports/depreciation-schedule?${params}`);
            return response.data;
        },
    });

    // Book Values Report
    const { data: bookValues, isLoading: loadingBookValues } = useQuery({
        queryKey: ['/api/asset-management/reports/book-values', filters.as_of_date, filters.company_code_id],
        queryFn: async () => {
            const params = new URLSearchParams({ as_of_date: filters.as_of_date });
            if (filters.company_code_id) params.append('company_code_id', filters.company_code_id);

            const response = await apiClient.get(`/api/asset-management/reports/book-values?${params}`);
            return response.data;
        },
    });

    const exportToCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => row[h]).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Asset Reports</h1>
                <p className="text-gray-500">Comprehensive reporting for asset management</p>
            </div>

            <Tabs defaultValue="register" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="register">Asset Register</TabsTrigger>
                    <TabsTrigger value="schedule">Depreciation Schedule</TabsTrigger>
                    <TabsTrigger value="bookvalues">Book Values</TabsTrigger>
                </TabsList>

                {/* Asset Register Tab */}
                <TabsContent value="register" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Register</CardTitle>
                            <CardDescription>Complete listing of all assets with current values</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Company Code</Label>
                                    <Select
                                        value={filters.company_code_id}
                                        onValueChange={(value) => setFilters({ ...filters, company_code_id: value })}
                                    >
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
                                    <Label>Asset Class</Label>
                                    <Select
                                        value={filters.asset_class_id}
                                        onValueChange={(value) => setFilters({ ...filters, asset_class_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All classes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All Classes</SelectItem>
                                            {assetClasses.map((ac: any) => (
                                                <SelectItem key={ac.id} value={ac.id.toString()}>
                                                    {ac.code} - {ac.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={filters.active_only}
                                        onValueChange={(value) => setFilters({ ...filters, active_only: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Active Only</SelectItem>
                                            <SelectItem value="">All Assets</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        onClick={() => assetRegister && exportToCSV(assetRegister.assets, 'asset-register.csv')}
                                        disabled={!assetRegister || assetRegister.assets?.length === 0}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                </div>
                            </div>

                            {loadingRegister ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : assetRegister ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-sm text-gray-600">Total Assets</p>
                                            <p className="text-2xl font-bold">{assetRegister.total_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Acquisition Cost</p>
                                            <p className="text-2xl font-bold">${assetRegister.total_acquisition_cost?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Net Book Value</p>
                                            <p className="text-2xl font-bold">${assetRegister.total_net_book_value?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="border rounded-md max-h-[500px] overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Asset Number</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Class</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead className="text-right">Acquisition Cost</TableHead>
                                                    <TableHead className="text-right">Accumulated Dep.</TableHead>
                                                    <TableHead className="text-right">Net Book Value</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {assetRegister.assets?.map((asset: any) => (
                                                    <TableRow key={asset.id}>
                                                        <TableCell className="font-medium">{asset.asset_number}</TableCell>
                                                        <TableCell>{asset.asset_name}</TableCell>
                                                        <TableCell>{asset.asset_class}</TableCell>
                                                        <TableCell>{asset.location}</TableCell>
                                                        <TableCell className="text-right">${asset.acquisition_cost?.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">${asset.accumulated_depreciation?.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-semibold">${asset.net_book_value?.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded text-xs ${asset.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {asset.is_active ? 'Active' : 'Retired'}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Depreciation Schedule Tab */}
                <TabsContent value="schedule" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Depreciation Schedule</CardTitle>
                            <CardDescription>Forecasted monthly depreciation for the year</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Select
                                        value={filters.year}
                                        onValueChange={(value) => setFilters({ ...filters, year: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Company Code</Label>
                                    <Select
                                        value={filters.company_code_id}
                                        onValueChange={(value) => setFilters({ ...filters, company_code_id: value })}
                                    >
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

                                <div className="flex items-end">
                                    <Button
                                        onClick={() => depSchedule && exportToCSV(depSchedule.monthly_schedule, 'depreciation-schedule.csv')}
                                        disabled={!depSchedule}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                </div>
                            </div>

                            {loadingSchedule ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : depSchedule ? (
                                <>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Annual Depreciation</p>
                                        <p className="text-3xl font-bold">${depSchedule.total_annual_depreciation?.toFixed(2)}</p>
                                    </div>

                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Period</TableHead>
                                                    <TableHead>Fiscal Year</TableHead>
                                                    <TableHead>Fiscal Period</TableHead>
                                                    <TableHead className="text-right">Total Depreciation</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {depSchedule.monthly_schedule?.map((month: any) => (
                                                    <TableRow key={month.period}>
                                                        <TableCell className="font-medium">{month.period}</TableCell>
                                                        <TableCell>{month.fiscal_year}</TableCell>
                                                        <TableCell>{month.fiscal_period}</TableCell>
                                                        <TableCell className="text-right font-semibold">${month.total_depreciation?.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Book Values Tab */}
                <TabsContent value="bookvalues" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Book Values Summary</CardTitle>
                            <CardDescription>Current asset values by class and location</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>As of Date</Label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-md"
                                        value={filters.as_of_date}
                                        onChange={(e) => setFilters({ ...filters, as_of_date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Company Code</Label>
                                    <Select
                                        value={filters.company_code_id}
                                        onValueChange={(value) => setFilters({ ...filters, company_code_id: value })}
                                    >
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
                            </div>

                            {loadingBookValues ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : bookValues ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-sm text-gray-600">Total Assets</p>
                                            <p className="text-2xl font-bold">{bookValues.totals?.total_assets}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Acquisition Cost</p>
                                            <p className="text-2xl font-bold">${parseFloat(bookValues.totals?.total_acquisition_cost || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Net Book Value</p>
                                            <p className="text-2xl font-bold">${parseFloat(bookValues.totals?.total_net_book_value || 0).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border rounded-md p-4">
                                            <h3 className="font-semibold mb-3">By Asset Class</h3>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Class</TableHead>
                                                        <TableHead className="text-right">Count</TableHead>
                                                        <TableHead className="text-right">Book Value</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bookValues.by_class?.map((row: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{row.asset_class || 'Unassigned'}</TableCell>
                                                            <TableCell className="text-right">{row.assets_count}</TableCell>
                                                            <TableCell className="text-right font-semibold">${parseFloat(row.total_net_book_value || 0).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="border rounded-md p-4">
                                            <h3 className="font-semibold mb-3">By Location</h3>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Location</TableHead>
                                                        <TableHead className="text-right">Count</TableHead>
                                                        <TableHead className="text-right">Book Value</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bookValues.by_location?.map((row: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>{row.asset_class || 'Unassigned'}</TableCell>
                                                            <TableCell className="text-right">{row.assets_count}</TableCell>
                                                            <TableCell className="text-right font-semibold">${parseFloat(row.total_net_book_value || 0).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
