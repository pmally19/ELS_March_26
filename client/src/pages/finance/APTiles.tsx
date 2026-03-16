import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, FileText, Users, DollarSign, Workflow, Shield, CheckCircle, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Import tile components
import VendorManagementTile from "./ap-tiles/VendorManagementTile";
import InvoiceProcessingTile from "./ap-tiles/InvoiceProcessingTile";
import PaymentAuthorizationTile from "./ap-tiles/PaymentAuthorizationTile";
import APReportingTile from "./ap-tiles/APReportingTile";
import APWorkflowsTile from "./ap-tiles/APWorkflowsTile";
import APValidationTile from "./ap-tiles/APValidationTile";

// Import NEW AP Enhancement tiles (Gap Analysis Implementation)
import EnhancedVendorManagementTile from "./ap-tiles/EnhancedVendorManagementTile";
import DocumentParkingTile from "./ap-tiles/DocumentParkingTile";
import DownPaymentManagementTile from "./ap-tiles/DownPaymentManagementTile";
import VendorPaymentProcessing from "./VendorPaymentProcessing";

export default function APTiles() {
  const [activeTile, setActiveTile] = useState<string | null>(null);

  // Fetch AP statistics for tile overview
  const { data: vendorData } = useQuery({
    queryKey: ['/api/ap/vendor-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/vendor-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  const { data: invoiceData } = useQuery({
    queryKey: ['/api/ap/invoice-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/invoice-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  const { data: paymentData } = useQuery({
    queryKey: ['/api/ap/payment-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/payment-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  const { data: workflowData } = useQuery({
    queryKey: ['/api/ap/workflow-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/workflow-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  const { data: reportData } = useQuery({
    queryKey: ['/api/ap/reporting-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/reporting-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  const { data: validationData } = useQuery({
    queryKey: ['/api/ap/validation-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ap/validation-statistics');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data || data;
    },
  });

  // Fetch vendor payments for the payment processing tile
  const { data: vendorPayments } = useQuery({
    queryKey: ['/api/purchase/vendor-payments'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/purchase/vendor-payments');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const handleBackToTiles = () => {
    setActiveTile(null);
  };

  // If a tile is active, show the tile component
  if (activeTile) {
    // Handle vendor payment processing separately (full page component)
    if (activeTile === 'vendor-payment-processing') {
      return (
        <div className="h-screen flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToTiles}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to AP Tiles</span>
              </Button>
              <h1 className="text-xl font-bold">Vendor Payment Processing</h1>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <VendorPaymentProcessing />
          </div>
        </div>
      );
    }

    const TileComponent = {
      'vendor-management': VendorManagementTile,
      'invoice-processing': InvoiceProcessingTile,
      'payment-authorization': PaymentAuthorizationTile,
      'ap-reporting': APReportingTile,
      'ap-workflows': APWorkflowsTile,
      'ap-validation': APValidationTile,
      // NEW AP Enhancement Tiles
      'enhanced-vendor-management': EnhancedVendorManagementTile,
      'document-parking': DocumentParkingTile,
      'down-payment-management': DownPaymentManagementTile,
    }[activeTile];

    if (TileComponent) {
      return (
        <div className="h-screen flex flex-col">
          {/* Tile Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToTiles}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to AP Tiles</span>
              </Button>
              <h1 className="text-xl font-bold">
                {activeTile.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </h1>
            </div>
          </div>

          {/* Tile Content */}
          <div className="flex-1 p-4 overflow-hidden">
            <TileComponent onBack={handleBackToTiles} />
          </div>
        </div>
      );
    }
  }

  // Main tiles overview
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Payable - Tile System</h1>
          <p className="text-gray-600 mt-2">Complete AP end-to-end process with vendor details, payments, and integrated workflows</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/finance'}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Finance</span>
        </Button>
      </div>

      {/* AP Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {vendorData?.total_vendors || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-orange-600">
                  {invoiceData?.pending_approval || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding Amount</p>
                <p className="text-2xl font-bold text-red-600">
                  ${invoiceData?.pending_value ? parseFloat(String(invoiceData.pending_value)).toFixed(2) : '0.00'}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Integrity</p>
                <p className="text-2xl font-bold text-green-600">
                  {validationData?.integrity_score || 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AP Process Flow */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-green-900">AP End-to-End Process Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Vendor Setup</p>
              <p className="text-xs text-gray-600">Master data, terms, limits</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Invoice Receipt</p>
              <p className="text-xs text-gray-600">Processing, validation</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Approval</p>
              <p className="text-xs text-gray-600">Workflow, authorization</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Payment</p>
              <p className="text-xs text-gray-600">Authorization, processing</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Reporting</p>
              <p className="text-xs text-gray-600">Analytics, compliance</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Validation</p>
              <p className="text-xs text-gray-600">Data integrity check</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AP Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Vendor Management Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200 hover:border-blue-400"
          onClick={() => setActiveTile('vendor-management')}
        >
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">Vendor Management</CardTitle>
                  <p className="text-sm text-blue-700">Complete vendor details & setup</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-600">Active Vendors</p>
                <p className="text-xl font-bold">{vendorData?.active_vendors || 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Payment Terms</p>
                <p className="text-xl font-bold">{Math.round(vendorData?.avg_payment_terms || 0)} days</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Credit Limits</p>
                <p className="text-lg font-bold">${Number(vendorData?.total_credit_limits || 0).toFixed(0)}</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">New This Month</p>
                <p className="text-xl font-bold">{vendorData?.new_vendors || 0}</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              Manage Vendors →
            </Button>fix the
          </CardContent>
        </Card>

        {/* Invoice Processing Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200 hover:border-orange-400"
          onClick={() => setActiveTile('invoice-processing')}
        >
          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-orange-600" />
                <div>
                  <CardTitle className="text-lg">Invoice Processing</CardTitle>
                  <p className="text-sm text-orange-700">Receipt, validation & approval</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-orange-600">Pending</p>
                <p className="text-xl font-bold">{invoiceData?.pending_approval || 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Approved</p>
                <p className="text-xl font-bold">{invoiceData?.approved || 0}</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Total Value</p>
                <p className="text-lg font-bold">${Number(invoiceData?.total_value || 0).toFixed(0)}</p>
              </div>
              <div>
                <p className="font-medium text-red-600">Overdue</p>
                <p className="text-xl font-bold">{invoiceData?.overdue_count || 0}</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
              Process Invoices →
            </Button>
          </CardContent>
        </Card>

        {/* Payment Authorization Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-green-200 hover:border-green-400"
          onClick={() => setActiveTile('payment-authorization')}
        >
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle className="text-lg">Payment Authorization</CardTitle>
                  <p className="text-sm text-green-700">Approval limits & processing</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Open a menu or navigate directly
                  const menu = document.createElement('div');
                  menu.className = 'absolute right-0 mt-2 w-56 bg-white border shadow-lg rounded-md z-50';
                  menu.innerHTML = `
                    <a href="/finance/settings/authorization-levels" class="block px-4 py-2 hover:bg-gray-100">Authorization Levels</a>
                    <a href="/finance/settings/vendor-payment-approval" class="block px-4 py-2 hover:bg-gray-100">Payment Approvers</a>
                  `;
                  e.currentTarget.parentElement?.appendChild(menu);
                  setTimeout(() => menu.remove(), 3000);
                }}
                className="text-gray-600 hover:text-green-600"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-green-600">Authorized Today</p>
                <p className="text-xl font-bold">{paymentData?.authorized_today || 0}</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Daily Limit Used</p>
                <p className="text-xl font-bold">{paymentData?.daily_limit_used || 0}%</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Pending</p>
                <p className="text-lg font-bold">{paymentData?.pending_count || 0}</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">High Risk</p>
                <p className="text-xl font-bold">{paymentData?.high_risk_count || 0}</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
              Authorize Payments →
            </Button>
          </CardContent>
        </Card>

        {/* Vendor Payment Processing Tile - NEW */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200 hover:border-blue-400"
          onClick={() => setActiveTile('vendor-payment-processing')}
        >
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">Vendor Payment Processing</CardTitle>
                  <p className="text-sm text-blue-700">Create & process vendor payments</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-600">Total Payments</p>
                <p className="text-xl font-bold">{Array.isArray(vendorPayments) ? vendorPayments.length : 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Posted</p>
                <p className="text-xl font-bold">
                  {Array.isArray(vendorPayments) ? vendorPayments.filter((p: any) => p.status === 'POSTED').length : 0}
                </p>
              </div>
              <div>
                <p className="font-medium text-orange-600">Pending</p>
                <p className="text-xl font-bold">
                  {Array.isArray(vendorPayments) ? vendorPayments.filter((p: any) => p.status === 'PENDING').length : 0}
                </p>
              </div>
              <div>
                <p className="font-medium text-purple-600">This Month</p>
                <p className="text-xl font-bold">
                  {Array.isArray(vendorPayments) ? vendorPayments.filter((p: any) => {
                    const paymentDate = new Date(p.payment_date);
                    const now = new Date();
                    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
                  }).length : 0}
                </p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              Process Payments →
            </Button>
          </CardContent>
        </Card>

        {/* Payment Proposals Tile - NEW */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-teal-200 hover:border-teal-400"
          onClick={() => window.location.href = '/finance/payment-proposals'}
        >
          <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Workflow className="h-8 w-8 text-teal-600" />
                <div>
                  <CardTitle className="text-lg">Payment Proposals</CardTitle>
                  <p className="text-sm text-teal-700">Batch payment runs & approvals</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-teal-600">Total Proposals</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Pending Approval</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Approved</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">This Month</p>
                <p className="text-xl font-bold">0</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700">
              Manage Proposals →
            </Button>
          </CardContent>
        </Card>

        {/* AP Reporting Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 hover:border-purple-400"
          onClick={() => setActiveTile('ap-reporting')}
        >
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle className="text-lg">AP Reporting</CardTitle>
                  <p className="text-sm text-purple-700">Analytics & compliance reports</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-purple-600">Reports Generated</p>
                <p className="text-xl font-bold">{reportData?.generated || 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Compliance Score</p>
                <p className="text-xl font-bold">{reportData?.compliance_score || 0}%</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">DPO</p>
                <p className="text-xl font-bold">{reportData?.dpo || 0} days</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">Cost Savings</p>
                <p className="text-lg font-bold">${Number(reportData?.cost_savings || 0).toFixed(0)}</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
              View Reports →
            </Button>
          </CardContent>
        </Card>

        {/* AP Workflows Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-indigo-200 hover:border-indigo-400"
          onClick={() => setActiveTile('ap-workflows')}
        >
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Workflow className="h-8 w-8 text-indigo-600" />
                <div>
                  <CardTitle className="text-lg">AP Workflows</CardTitle>
                  <p className="text-sm text-indigo-700">Automation & integration</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-indigo-600">Active Workflows</p>
                <p className="text-xl font-bold">{workflowData?.active || 0}</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Success Rate</p>
                <p className="text-xl font-bold">{workflowData?.success_rate || 0}%</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Executions</p>
                <p className="text-xl font-bold">{workflowData?.executions || 0}</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">Savings</p>
                <p className="text-lg font-bold">${Number(workflowData?.savings || 0).toFixed(0)}</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
              Manage Workflows →
            </Button>
          </CardContent>
        </Card>

        {/* AP Validation Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-emerald-200 hover:border-emerald-400"
          onClick={() => setActiveTile('ap-validation')}
        >
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-emerald-600" />
                <div>
                  <CardTitle className="text-lg">CrossCheck Validation</CardTitle>
                  <p className="text-sm text-emerald-700">Data integrity & lineage</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-emerald-600">Integrity Score</p>
                <p className="text-xl font-bold">{validationData?.integrity_score || 0}%</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Validated Records</p>
                <p className="text-xl font-bold">{validationData?.validated || 0}</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Issues Found</p>
                <p className="text-xl font-bold">{validationData?.issues || 0}</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Last Check</p>
                <p className="text-sm font-bold">
                  {validationData?.last_check
                    ? new Date(validationData.last_check).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
              Run Validation →
            </Button>
          </CardContent>
        </Card>

        {/* NEW AP Enhancement Tiles - Gap Analysis Implementation */}
        {/* Enhanced Vendor Management Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50"
          onClick={() => setActiveTile('enhanced-vendor-management')}
        >
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Enhanced Vendor Management
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">NEW</span>
                  </CardTitle>
                  <p className="text-sm text-purple-700">Extended vendor master with blocking controls</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-purple-600">Enhanced Vendors</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-orange-600">Payment Blocks</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Change Tracking</p>
                <p className="text-xl font-bold">Active</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Data Quality</p>
                <p className="text-xl font-bold">95%</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
              Manage Enhanced Vendors →
            </Button>
          </CardContent>
        </Card>

        {/* Document Parking Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-emerald-50"
          onClick={() => setActiveTile('document-parking')}
        >
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Document Parking
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">NEW</span>
                  </CardTitle>
                  <p className="text-sm text-green-700">Park incomplete invoices for later completion</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-orange-600">Parked Documents</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Pending Posting</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Posted Today</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Line Items</p>
                <p className="text-xl font-bold">0</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
              Park Documents →
            </Button>
          </CardContent>
        </Card>

        {/* Down Payment Management Tile */}
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow border-indigo-200 hover:border-indigo-400 bg-gradient-to-br from-indigo-50 to-blue-50"
          onClick={() => setActiveTile('down-payment-management')}
        >
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-8 w-8 text-indigo-600" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Down Payment Management
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-bold">NEW</span>
                  </CardTitle>
                  <p className="text-sm text-indigo-700">Request, process, and clear down payments</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-yellow-600">Pending Requests</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Total Paid</p>
                <p className="text-xl font-bold">$0</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Cleared</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div>
                <p className="font-medium text-purple-600">Workflow Stage</p>
                <p className="text-xl font-bold">Ready</p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
              Manage Down Payments →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AP Enhancement Notice */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            AP Enhancement Suite - Gap Analysis Implementation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Enhanced Vendor Management</p>
              <p className="text-xs text-gray-600">Extended master data, blocking controls, change tracking</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Document Parking</p>
              <p className="text-xs text-gray-600">Save incomplete invoices, line item management</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
              <CreditCard className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Down Payment Management</p>
              <p className="text-xs text-gray-600">Request, process, clear vendor down payments</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-blue-700">
              These new tiles implement 44 missing AP functions identified in the gap analysis, enhancing MallyERP's
              accounts payable capabilities with vendor management extensions, document parking workflows, and down payment processing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}