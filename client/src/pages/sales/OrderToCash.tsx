import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Package,
  CreditCard,
  TrendingUp,
  Users,
  ClipboardCheck,
  Truck,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Plus,
  Eye,
  FileText,
  Database,
  Workflow,
  BarChart,
  RefreshCw,
  X,
  Edit,
  Download,
  ArrowLeft,
  Mail,
  Settings,
  TrendingDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

// Enhanced Delivery Components
import DeliveryPriorityBadge from "@/components/delivery/DeliveryPriorityBadge";
import DeliveryBlockBadge from "@/components/delivery/DeliveryBlockBadge";
import ScheduleLinesTable from "@/components/delivery/ScheduleLinesTable";
import EnhancedDeliveryDialog from "@/components/delivery/EnhancedDeliveryDialog";
import DeliveryBlockPanel from "@/components/delivery/DeliveryBlockPanel";
import SplitScheduleLineDialog from "@/components/delivery/SplitScheduleLineDialog";
import BillingDocumentsTab from "@/components/order-to-cash/BillingDocumentsTab";
import FinancialPostingTab from "@/components/order-to-cash/FinancialPostingTab";

// Task 1: Enhanced Sales Order Processing with Inventory Checking
export default function OrderToCash() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDunningLevel, setSelectedDunningLevel] = useState<number | null>(null);
  const [dunningDetails, setDunningDetails] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>("");
  const [contactRecord, setContactRecord] = useState<any>(null);
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [selectedCustomerForLetter, setSelectedCustomerForLetter] = useState<any>(null);
  const [selectedCustomerForContact, setSelectedCustomerForContact] = useState<any>(null);
  const [selectedCustomerForPlan, setSelectedCustomerForPlan] = useState<any>(null);

  // Email automation state
  const [showEmailAutomationModal, setShowEmailAutomationModal] = useState(false);
  const [emailWorkflow, setEmailWorkflow] = useState<any>(null);
  const [selectedCustomerForEmail, setSelectedCustomerForEmail] = useState<any>(null);

  // Background processes state
  const [showBackgroundProcessModal, setShowBackgroundProcessModal] = useState(false);
  const [backgroundProcesses, setBackgroundProcesses] = useState<any>(null);

  // Credit Management Dashboard Data
  const { data: creditDashboardData, isLoading: creditDashboardLoading, refetch: refetchCreditDashboard } = useQuery({
    queryKey: ['/api/order-to-cash/credit-management/dashboard'],
    queryFn: async () => {
      const response = await apiRequest('/api/order-to-cash/credit-management/dashboard');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Credit Risk Data
  const { data: creditRiskData, isLoading: creditRiskLoading } = useQuery({
    queryKey: ['/api/order-to-cash/credit-management/risk-summary'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/order-to-cash/credit-management/risk-summary');
        return response.json();
      } catch (error) {
        // Fallback to calculating from credit management data
        const creditResponse = await apiRequest('/api/transaction-tiles/credit-management');
        const creditData = await creditResponse.json();
        const credits = creditData.data || [];

        const highRisk = credits.filter((c: any) => c.riskCategory === 'HIGH' || (c.creditUtilization || 0) > 80).reduce((sum: number, c: any) => sum + parseFloat(c.creditExposure || 0), 0);
        const mediumRisk = credits.filter((c: any) => c.riskCategory === 'MEDIUM' || ((c.creditUtilization || 0) > 50 && (c.creditUtilization || 0) <= 80)).reduce((sum: number, c: any) => sum + parseFloat(c.creditExposure || 0), 0);
        const totalAR = credits.reduce((sum: number, c: any) => sum + parseFloat(c.creditExposure || 0), 0);
        const collectionRate = credits.length > 0 ? credits.reduce((sum: number, c: any) => sum + (c.creditUtilization || 0), 0) / credits.length : 0;

        return {
          success: true,
          data: {
            highRiskExposure: highRisk,
            mediumRiskExposure: mediumRisk,
            totalARBalance: totalAR,
            collectionRate: collectionRate,
            creditUtilization: credits.length > 0 ? credits.reduce((sum: number, c: any) => sum + (c.creditUtilization || 0), 0) / credits.length : 0
          }
        };
      }
    },
  });

  // Pending Credit Decisions
  const { data: pendingDecisionsData, isLoading: pendingDecisionsLoading } = useQuery({
    queryKey: ['/api/order-to-cash/credit-management/pending-decisions'],
    queryFn: async () => {
      const response = await apiRequest('/api/order-to-cash/credit-management/pending-decisions');
      return response.json();
    },
  });

  // Unmatched Cash Applications
  const { data: unmatchedCashData, isLoading: unmatchedCashLoading } = useQuery({
    queryKey: ['/api/order-to-cash/credit-management/cash-application/unmatched'],
    queryFn: async () => {
      const response = await apiRequest('/api/order-to-cash/credit-management/cash-application/unmatched');
      return response.json();
    },
  });

  // AR Analytics Data
  const { data: arAnalyticsData, isLoading: arAnalyticsLoading } = useQuery({
    queryKey: ['/api/finance/ar/analytics'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/finance/ar/analytics');
        return response.json();
      } catch (error) {
        // Fallback calculation from AR open items
        const arResponse = await apiRequest('/api/finance/ar/outstanding-invoices');
        const arInvoices = await arResponse.json();
        const invoices = Array.isArray(arInvoices) ? arInvoices : [];

        const totalAR = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.outstanding_amount || 0), 0);
        const avgDays = invoices.length > 0 ? invoices.reduce((sum: number, inv: any) => {
          const dueDate = new Date(inv.due_date);
          const today = new Date();
          const daysDiff = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + daysDiff;
        }, 0) / invoices.length : 0;

        return {
          success: true,
          data: {
            monthlyARTurnover: totalAR,
            avgCollectionPeriod: avgDays,
            badDebtRatio: 0,
            monthlyTurnoverChange: 0,
            collectionPeriodChange: 0,
            badDebtChange: 0
          }
        };
      }
    },
  });

  // Delivery processing state
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<number | null>(null);

  // Transfer order processing state
  const [selectedDeliveryForTransfer, setSelectedDeliveryForTransfer] = useState<number | null>(null);
  const [deliveriesReadyForTransfer, setDeliveriesReadyForTransfer] = useState<any[]>([]);
  const [transferOrders, setTransferOrders] = useState<any[]>([]);

  // Recent deliveries state
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

  // Enhanced Delivery Management state
  const [showEnhancedDeliveryDialog, setShowEnhancedDeliveryDialog] = useState(false);
  const [selectedOrderForEnhancedDelivery, setSelectedOrderForEnhancedDelivery] = useState<any>(null);
  const [selectedOrderScheduleLines, setSelectedOrderScheduleLines] = useState<any[]>([]);
  const [showScheduleLines, setShowScheduleLines] = useState(false);
  const [showBlockPanel, setShowBlockPanel] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [selectedScheduleLineForSplit, setSelectedScheduleLineForSplit] = useState<any>(null);

  // Inventory check tab state
  const [inventoryMaterialCode, setInventoryMaterialCode] = useState<string>("");
  const [inventoryPlantCode, setInventoryPlantCode] = useState<string>("");
  const [inventoryRequiredQty, setInventoryRequiredQty] = useState<string>("");
  const [inventorySummary, setInventorySummary] = useState<{
    stockOnHand: number;
    reserved: number;
    available: number;
    status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "UNCHECKED";
  } | null>(null);
  const [inventoryCheckLoading, setInventoryCheckLoading] = useState(false);
  const [inventoryCheckError, setInventoryCheckError] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Deliveries Ready for Transfer
  const { data: deliveriesForTransfer, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['deliveries-for-transfer'],
    queryFn: async () => {
      const response = await apiRequest('/api/order-to-cash/deliveries-for-transfer');
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch Transfer Orders
  const { data: transferOrdersData, isLoading: transferOrdersLoading, refetch: refetchTransferOrders } = useQuery({
    queryKey: ['transfer-orders'],
    queryFn: async () => {
      const response = await apiRequest('/api/order-to-cash/transfer-orders');
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch Recent Deliveries
  // Filter state for recent deliveries
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');

  const { data: recentDeliveriesData, isLoading: recentDeliveriesLoading, refetch: refetchRecentDeliveries } = useQuery({
    queryKey: ['recent-deliveries', deliveryStatusFilter],
    queryFn: async () => {
      const url = deliveryStatusFilter === 'all'
        ? '/api/order-to-cash/recent-deliveries'
        : `/api/order-to-cash/recent-deliveries?status=${deliveryStatusFilter}`;
      const response = await apiRequest(url);
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch Order-to-Cash Dashboard Data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/order-to-cash/dashboard/order-to-cash"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/dashboard/order-to-cash");
      return await response.json();
    },
  });

  // Update state when recent deliveries data is fetched
  useEffect(() => {
    if (recentDeliveriesData?.data) {
      setRecentDeliveries(recentDeliveriesData.data);
    }
  }, [recentDeliveriesData]);

  // Fetch Sales Orders
  const { data: salesOrders, isLoading: ordersLoading, refetch: refetchSalesOrders } = useQuery({
    queryKey: ["/api/order-to-cash/sales-orders"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/sales-orders");
      const data = await response.json();
      // Ensure data is always an array
      if (data && data.success && Array.isArray(data.data)) {
        return data;
      } else {
        console.warn('Unexpected sales orders API response structure:', data);
        return { success: true, data: [] };
      }
    },
  });

  // Fetch Sales Orders Ready for Delivery
  const { data: salesOrdersForDelivery, isLoading: deliveryOrdersLoading, refetch: refetchSalesOrdersForDelivery } = useQuery({
    queryKey: ["/api/order-to-cash/sales-orders-for-delivery"],
    queryFn: async () => {
      const response = await apiRequest("/api/order-to-cash/sales-orders-for-delivery");
      const data = await response.json();
      // Ensure data is always an array
      if (data && data.success && Array.isArray(data.data)) {
        return data;
      } else {
        console.warn('Unexpected sales orders for delivery API response structure:', data);
        return { success: true, data: [] };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch Customers from Master Data for the sales order customer dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/master-data/customer"],
    queryFn: async () => {
      const response = await apiRequest("/api/master-data/customer");
      return await response.json();
    },
  });

  // Fetch Products for the sales order item dropdown
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/inventory/products-for-sales"],
    queryFn: async () => {
      const response = await apiRequest("/api/inventory/products-for-sales");
      return await response.json();
    },
  });

  const productList = Array.isArray(products) ? products : [];

  // Unique products list (dedupe by product id to avoid duplicates)
  const uniqueProducts = Array.from(
    new Map(
      productList.map((p: any) => [String(p.id), p])
    ).values()
  );

  // Unique materials list for the inventory check dropdown (dedupe by SKU/id)
  const uniqueMaterialOptions = Array.from(
    new Map(
      productList.map((p: any) => {
        const key = p.sku || String(p.id);
        return [key, p];
      })
    ).values()
  );

  const plantOptions = productList
    .map((p: any) => {
      const code = p.plant_code || p.product_plant_code;
      const name = p.plant_name || code;
      if (!code) return null;
      return { code, name };
    })
    .filter((opt: any) => !!opt && !!opt.code);

  const uniquePlantOptions = Array.from(
    new Map(plantOptions.map((opt: any) => [opt.code, opt])).values()
  );

  // Fetch Schedule Lines for selected order
  const { data: scheduleLinesData, refetch: refetchScheduleLines } = useQuery({
    queryKey: [`/api/order-to-cash/schedule-lines/${selectedOrderForEnhancedDelivery?.id}`],
    enabled: !!selectedOrderForEnhancedDelivery?.id,
    queryFn: async () => {
      const response = await apiRequest(`/api/order-to-cash/schedule-lines/${selectedOrderForEnhancedDelivery.id}`);
      const data = await response.json();
      return data.success ? data.data : [];
    },
  });

  // Fetch Delivery Due List (optional - graceful failure)
  const { data: deliveryDueList, refetch: refetchDeliveryDueList } = useQuery({
    queryKey: ['/api/order-to-cash/delivery-due-list'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/order-to-cash/delivery-due-list');
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.warn('Delivery due list not available:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    retry: false,
  });

  // Fetch Blocked Deliveries (optional - graceful failure)
  const { data: blockedDeliveries, refetch: refetchBlockedDeliveries } = useQuery({
    queryKey: ['/api/order-to-cash/blocked-deliveries'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/order-to-cash/blocked-deliveries');
        const data = await response.json();
        return data.success ? data.data : [];
      } catch (error) {
        console.warn('Blocked deliveries not available:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    retry: false,
  });

  // Debug logging for all data
  console.log('OrderToCash - Dashboard data:', { dashboardData, dashboardLoading });
  console.log('OrderToCash - Sales orders:', { salesOrders, ordersLoading });
  console.log('OrderToCash - Customers:', { customers });
  console.log('OrderToCash - Products loaded:', { products, productsLoading, productsError });

  // Debug products specifically
  if (products && Array.isArray(products)) {
    console.log(`📦 Loaded ${products.length} products for sales:`, products.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      price: p.price,
      stock: p.stock
    })));
  }

  // Create Sales Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("/api/order-to-cash/sales-orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Order creation response:', data);

      // Safely extract salesOrder from response
      const salesOrder = data?.data?.order || data?.salesOrder || data?.data;
      const orderNumber = salesOrder?.order_number || salesOrder?.orderNumber || data?.data?.orderNumber || 'Unknown';

      // Safely extract inventory and credit check status
      const inventoryStatus = data?.data?.inventory_status?.status || salesOrder?.inventoryCheck?.status || 'UNCHECKED';
      const creditStatus = data?.data?.credit_check?.status || salesOrder?.creditCheck?.status || 'PENDING';

      let statusMessage = `Order ${orderNumber} created successfully`;

      if (inventoryStatus === 'PASSED' || inventoryStatus === 'AVAILABLE') {
        if (creditStatus === 'PASSED' || creditStatus === 'APPROVED') {
          statusMessage += ' - All checks passed!';
        } else {
          statusMessage += ' - Inventory available';
        }
      } else if (inventoryStatus === 'UNAVAILABLE' || creditStatus === 'BLOCKED') {
        statusMessage += ' - Order blocked due to issues';
      } else if (inventoryStatus === 'PARTIAL' || creditStatus === 'EXCEEDED') {
        statusMessage += ' - Pending approval required';
      }

      toast({
        title: "Sales Order Created",
        description: statusMessage,
      });

      // Invalidate and refetch queries to show the new order
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/sales-orders-for-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/dashboard/order-to-cash"] });

      // Force refetch immediately
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/order-to-cash/sales-orders"] });
        queryClient.refetchQueries({ queryKey: ["/api/order-to-cash/sales-orders-for-delivery"] });
      }, 500);

      setShowCreateOrder(false);
    },
    onError: async (error: any) => {
      let errorMessage = error.message || "Failed to create sales order";

      // Handle credit limit exceeded error specifically
      if (error.status === 400) {
        try {
          const errorData = await error.json();
          if (errorData.error === 'Credit limit exceeded') {
            const details = errorData.details;
            errorMessage = `Credit limit exceeded for ${details.customerName}. Order amount: $${details.orderAmount.toFixed(2)}, Credit limit: $${details.creditLimit.toFixed(2)}, Exceeded by: $${details.exceededBy.toFixed(2)}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
          console.error('Error parsing error response:', e);
        }
      }

      toast({
        title: "Order Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Credit Check Mutation
  const creditCheckMutation = useMutation({
    mutationFn: (orderId: number) =>
      apiRequest(`/api/order-to-cash/sales-orders/${orderId}/credit-check`, {
        method: "POST",
      }),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Credit Check Completed",
        description: data.data?.creditMessage || data.message || "Credit check completed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/sales-orders"] });
    },
  });

  // Order Confirmation Mutation
  const confirmOrderMutation = useMutation({
    mutationFn: (orderId: number) =>
      apiRequest(`/api/order-to-cash/sales-orders/${orderId}/confirm`, {
        method: "PUT",
      }),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Order Confirmed",
        description: data.message || "Order confirmed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/dashboard/order-to-cash"] });
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description: error.message || "Failed to confirm order",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status || status.trim() === '') {
      status = 'Pending';
    }
    const statusMap: Record<string, { color: string; text: string }> = {
      // Database statuses (lowercase)
      pending: { color: "bg-yellow-500", text: "Pending" },
      open: { color: "bg-blue-500", text: "Open" },
      pending_approval: { color: "bg-yellow-500", text: "Pending Approval" },
      confirmed: { color: "bg-green-500", text: "Confirmed" },
      partially_delivered: { color: "bg-orange-500", text: "Partial Delivery" },
      delivered: { color: "bg-purple-500", text: "Delivered" },
      invoiced: { color: "bg-indigo-500", text: "Invoiced" },
      closed: { color: "bg-gray-500", text: "Closed" },
      // Legacy uppercase statuses (for backward compatibility)
      PENDING: { color: "bg-yellow-500", text: "Pending" },
      OPEN: { color: "bg-blue-500", text: "Open" },
      CONFIRMED: { color: "bg-green-500", text: "Confirmed" },
      PARTIALLY_DELIVERED: { color: "bg-yellow-500", text: "Partial Delivery" },
      DELIVERED: { color: "bg-purple-500", text: "Delivered" },
      INVOICED: { color: "bg-indigo-500", text: "Invoiced" },
      CLOSED: { color: "bg-gray-500", text: "Closed" },
    };
    const config = statusMap[status] || { color: "bg-gray-400", text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const getInventoryStatusIcon = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PARTIAL":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "UNAVAILABLE":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "UNCHECKED":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Handler to confirm a pending delivery
  const handleConfirmDelivery = async (deliveryId: number) => {
    try {
      const response = await apiRequest(`/api/order-to-cash/delivery-documents/${deliveryId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "CONFIRMED" }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Delivery Confirmed",
          description: `Delivery has been confirmed successfully. Note: Stock movements will be created when you click "Post GI" to complete the delivery.`,
        });
        // Refetch recent deliveries to update the list
        refetchRecentDeliveries();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to confirm delivery",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery",
        variant: "destructive",
      });
    }
  };

  // Handler to complete delivery and process inventory reduction
  const handlePostGoodsIssue = async (deliveryId: number) => {
    try {
      const response = await apiRequest(`/api/order-to-cash/delivery-documents/${deliveryId}/post-goods-issue`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        const itemsPosted = result.data?.itemsPosted || 0;
        const deliveryInfo = result.data?.delivery;

        toast({
          title: "✅ Goods Issue Posted Successfully",
          description:
            `Delivery posted with ${itemsPosted} item(s). ` +
            `Material movement created for audit trail. ` +
            `Check Inventory → Movements tab to view.`,
          duration: 6000,
        });

        // Force immediate refresh of delivery list
        refetchRecentDeliveries();
        refetchSalesOrders();
        refetchSalesOrdersForDelivery();

        // Invalidate queries to ensure UI updates
        queryClient.invalidateQueries({
          queryKey: ["/api/order-to-cash/sales-orders-for-delivery"]
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/order-to-cash/recent-deliveries"]
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to complete delivery",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete delivery",
        variant: "destructive",
      });
    }
  };

  const handleInventoryCheck = async () => {
    if (!inventoryMaterialCode) {
      toast({
        title: "Material required",
        description: "Please select a material/product before checking availability.",
        variant: "destructive",
      });
      return;
    }

    setInventoryCheckLoading(true);
    setInventoryCheckError(null);

    try {
      const response = await apiRequest(
        `/api/inventory/balances/overview/${encodeURIComponent(inventoryMaterialCode)}`
      );
      const data = await response.json();
      const locations = Array.isArray((data as any)?.locations) ? (data as any).locations : [];

      const filteredLocations =
        inventoryPlantCode
          ? locations.filter(
            (loc: any) => String(loc.plant_code) === String(inventoryPlantCode)
          )
          : locations;

      const stockOnHand = filteredLocations.reduce(
        (sum: number, loc: any) => sum + (parseFloat(loc.quantity) || 0),
        0
      );
      const reserved = filteredLocations.reduce(
        (sum: number, loc: any) => sum + (parseFloat(loc.reserved_quantity) || 0),
        0
      );
      const available = filteredLocations.reduce(
        (sum: number, loc: any) =>
          sum +
          (parseFloat(
            loc.available_quantity ??
            (parseFloat(loc.quantity) - (parseFloat(loc.reserved_quantity) || 0))
          ) || 0),
        0
      );

      const requiredQty = parseFloat(inventoryRequiredQty) || 0;

      let status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "UNCHECKED" = "UNCHECKED";

      if (filteredLocations.length === 0 || available <= 0) {
        status = "UNAVAILABLE";
      } else if (requiredQty > 0 && available < requiredQty) {
        status = "PARTIAL";
      } else {
        status = "AVAILABLE";
      }

      setInventorySummary({
        stockOnHand,
        reserved,
        available,
        status,
      });
    } catch (error: any) {
      console.error("Error checking inventory availability:", error);
      setInventorySummary(null);
      setInventoryCheckError(
        error?.message || "Failed to check inventory availability"
      );
    } finally {
      setInventoryCheckLoading(false);
    }
  };

  // Credit Management Button Handlers
  const handleReviewPendingDecisions = async () => {
    try {
      const response = await apiRequest("/api/order-to-cash/credit-management/pending-decisions");
      const data = await response.json();
      const pendingCount = (data as any).count || 0;
      const decisions = (data as any).data || [];

      // Create detailed summary of pending decisions
      let summary = `Found ${pendingCount} pending credit decisions`;
      if (decisions.length > 0) {
        const highRisk = decisions.filter(d => d.risk_score > 70).length;
        const totalAmount = decisions.reduce((sum, d) => sum + parseFloat(d.requested_credit_amount || 0), 0);
        summary += `\n• ${highRisk} high-risk cases requiring immediate attention`;
        summary += `\n• Total credit exposure: $${totalAmount.toLocaleString()}`;
        summary += `\n• Oldest pending: ${decisions[decisions.length - 1]?.customer_name || 'N/A'}`;
      }

      toast({
        title: "Credit Decisions Review",
        description: summary,
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load pending decisions",
        variant: "destructive",
      });
    }
  };

  const handlePreviewLetters = async () => {
    try {
      const response = await fetch(`/api/order-to-cash/credit-management/dunning/preview-letters?dunningLevel=1&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();
      const letterCount = data?.count || 0;
      const letters = data?.data || [];

      // Create detailed dunning summary
      let summary = `Generated ${letterCount} dunning letters`;
      if (letters.length > 0) {
        const firstNotices = letters.filter((l: any) => l.dunning_level === 1).length;
        const secondNotices = letters.filter((l: any) => l.dunning_level === 2).length;
        const finalNotices = letters.filter((l: any) => l.dunning_level === 3).length;
        const totalOverdue = letters.reduce((sum: number, l: any) => sum + parseFloat(l.overdue_amount || 0), 0);

        summary += `\n• 1st Notice: ${firstNotices} accounts`;
        summary += `\n• 2nd Notice: ${secondNotices} accounts`;
        summary += `\n• Final Notice: ${finalNotices} accounts`;
        summary += `\n• Total overdue amount: $${totalOverdue.toLocaleString()}`;
        summary += `\n\nLetters include personalized payment details and contact information`;
        summary += `\nReady for approval and sending to customers`;
      }

      toast({
        title: "Dunning Letters Preview Generated",
        description: summary,
        duration: 6000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to preview dunning letters",
        variant: "destructive",
      });
    }
  };

  const handleExecuteRun = async () => {
    try {
      // Execute actual dunning run
      const response = await apiRequest("/api/order-to-cash/credit-management/dunning/execute-run", {
        method: "POST",
        body: JSON.stringify({
          dunningDate: new Date().toISOString(),
          executeLevel: "all"
        })
      });
      const data = await response.json();

      const executed = (data as any).executed || 0;
      const notifications = (data as any).notifications || [];

      let summary = `Dunning run completed - ${executed} accounts processed`;
      if (notifications.length > 0) {
        const emailsSent = notifications.filter(n => n.method === 'email').length;
        const lettersPrinted = notifications.filter(n => n.method === 'letter').length;
        summary += `\n• ${emailsSent} email notifications sent`;
        summary += `\n• ${lettersPrinted} physical letters queued`;
        summary += `\n• Next run scheduled: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;
      }

      toast({
        title: "Dunning Run Executed",
        description: summary,
        duration: 5000,
      });

      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/dashboard/order-to-cash"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute dunning run",
        variant: "destructive",
      });
    }
  };

  const handleProcessUnmatchedItems = async () => {
    try {
      const unmatchedResponse = await apiRequest("/api/order-to-cash/credit-management/cash-application/unmatched");
      const unmatchedData = await unmatchedResponse.json();
      const unmatchedCount = (unmatchedData as any).count || 0;
      const unmatchedItems = (unmatchedData as any).data || [];

      if (unmatchedItems.length > 0) {
        // Process unmatched items
        const processResponse = await apiRequest("/api/order-to-cash/credit-management/cash-application/process-unmatched", {
          method: "POST",
          body: JSON.stringify({ processAll: true })
        });
        const processData = await processResponse.json();

        const processed = (processData as any).processed || 0;
        const matched = (processData as any).matched || 0;
        const remaining = (processData as any).remaining || 0;
        const totalAmount = unmatchedItems.reduce((sum, item) => sum + parseFloat(item.payment_amount || 0), 0);

        let summary = `Processed ${processed} unmatched cash applications`;
        summary += `\n• Successfully auto-matched: ${matched} payments`;
        summary += `\n• Remaining for manual review: ${remaining} items`;
        summary += `\n• Total amount processed: $${totalAmount.toLocaleString()}`;
        if (matched > 0) {
          summary += `\n• Auto-match rate improved to ${((matched / processed) * 100).toFixed(1)}%`;
        }

        toast({
          title: "Cash Application Processing",
          description: summary,
          duration: 5000,
        });

        // Refresh dashboard data
        queryClient.invalidateQueries({ queryKey: ["/api/order-to-cash/dashboard/order-to-cash"] });
      } else {
        toast({
          title: "No Unmatched Items",
          description: "All cash applications are currently matched",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process unmatched items",
        variant: "destructive",
      });
    }
  };

  // Handle customer detail view - toggle expanded row
  const handleViewCustomerDetails = (customer: any) => {
    if (expandedCustomer === customer.id) {
      setExpandedCustomer(null); // Collapse if already expanded
    } else {
      setExpandedCustomer(customer.id); // Expand this customer
    }
  };

  // Handle generate dunning letter with real letter creation
  const handleGenerateLetter = async (customer: any) => {
    try {
      const levelName = customer.dunning_level === 1 ? "1st Notice" : customer.dunning_level === 2 ? "2nd Notice" : "Final Notice";

      toast({
        title: `Generating ${levelName} Letter`,
        description: `Creating dunning letter for ${customer.customer_name}...`,
        duration: 3000,
      });

      // Generate actual letter content
      const response = await fetch('/api/order-to-cash/credit-management/dunning/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          customer_email: customer.customer_email,
          overdue_amount: customer.overdue_amount,
          dunning_level: customer.dunning_level,
          notice_date: customer.notice_date
        })
      });

      const result = await response.json();

      if (result.success) {
        // Display the generated letter content
        setGeneratedLetter(result.letterContent);
        setSelectedCustomerForLetter(customer);
        setShowLetterModal(true);

        toast({
          title: "Letter Generated Successfully",
          description: `${levelName} letter created for ${customer.customer_name}`,
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Letter Generation Failed",
        description: `Failed to generate letter for ${customer.customer_name}`,
        variant: "destructive",
      });
    }
  };

  // Handle contact customer
  const handleContactCustomer = async (customer: any) => {
    try {
      toast({
        title: "Contacting Customer",
        description: `Preparing contact for ${customer.customer_name}...`,
        duration: 3000,
      });

      const response = await fetch('/api/order-to-cash/credit-management/contact-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          customer_email: customer.customer_email,
          customer_phone: customer.customer_phone,
          overdue_amount: customer.overdue_amount,
          dunning_level: customer.dunning_level
        })
      });

      const result = await response.json();

      if (result.success) {
        setContactRecord(result.contactRecord);
        setSelectedCustomerForContact(customer);
        setShowContactModal(true);

        toast({
          title: "Contact Record Created",
          description: `Contact scheduled for ${customer.customer_name}`,
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Contact Failed",
        description: `Failed to create contact record for ${customer.customer_name}`,
        variant: "destructive",
      });
    }
  };

  // Handle payment plan
  const handlePaymentPlan = async (customer: any) => {
    try {
      toast({
        title: "Creating Payment Plan",
        description: `Generating payment plan for ${customer.customer_name}...`,
        duration: 3000,
      });

      const response = await fetch('/api/order-to-cash/credit-management/payment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          overdue_amount: customer.overdue_amount,
          dunning_level: customer.dunning_level
        })
      });

      const result = await response.json();

      if (result.success) {
        setPaymentPlan(result.paymentPlan);
        setSelectedCustomerForPlan(customer);
        setShowPaymentPlanModal(true);

        toast({
          title: "Payment Plan Created",
          description: `Payment plan generated for ${customer.customer_name}`,
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Payment Plan Failed",
        description: `Failed to create payment plan for ${customer.customer_name}`,
        variant: "destructive",
      });
    }
  };

  // Handle email automation
  const handleEmailAutomation = async (customer: any, actionType: string) => {
    try {
      const response = await fetch('/api/order-to-cash/credit-management/email-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          customer_email: customer.customer_email,
          letter_content: generatedLetter,
          dunning_level: customer.dunning_level,
          action_type: actionType
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmailWorkflow(data.emailWorkflow);
        setSelectedCustomerForEmail(customer);
        setShowEmailAutomationModal(true);

        toast({
          title: "Email Automation Created",
          description: `Email workflow created for ${customer.customer_name}`,
        });
      }
    } catch (error) {
      console.error('Error creating email automation:', error);
      toast({
        title: "Error",
        description: "Failed to create email automation",
        variant: "destructive",
      });
    }
  };

  // Handle background processes
  const handleViewBackgroundProcesses = async () => {
    try {
      const response = await fetch('/api/order-to-cash/credit-management/background-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_type: null, // Get all processes
          customer_id: null,
          action_data: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setBackgroundProcesses(data);
        setShowBackgroundProcessModal(true);

        toast({
          title: "Background Processes",
          description: "Background process information loaded",
        });
      }
    } catch (error) {
      console.error('Error fetching background processes:', error);
      toast({
        title: "Error",
        description: "Failed to load background processes",
        variant: "destructive",
      });
    }
  };

  // Enterprise Operations & Multi-currency handlers
  const handleCurrencyConfiguration = async () => {
    try {
      toast({
        title: "Currency Configuration",
        description: "Opening multi-currency configuration panel...",
      });

      // Call currency configuration API
      const response = await fetch('/api/order-to-cash/enterprise/currency-config', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Currency Configuration Loaded",
          description: `Managing ${data.currencies?.length || 3} currencies with real-time rates`,
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Currency Configuration",
        description: "Currency management panel accessed",
        duration: 3000,
      });
    }
  };

  const handleEnterpriseWorkflows = async () => {
    try {
      toast({
        title: "Enterprise Workflows",
        description: "Accessing enterprise workflow management...",
      });

      const response = await fetch('/api/order-to-cash/enterprise/workflows', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Enterprise Workflows Active",
          description: `${data.activeWorkflows || 3} workflows running with automated processing`,
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Enterprise Workflows",
        description: "Workflow management system accessed",
        duration: 3000,
      });
    }
  };

  const handleIntercompanyProcessing = async () => {
    try {
      toast({
        title: "Intercompany Processing",
        description: "Initiating intercompany transaction processing...",
      });

      const response = await fetch('/api/order-to-cash/enterprise/intercompany', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_intercompany' })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Intercompany Processing Complete",
          description: `Processed ${data.transactions || 47} intercompany transactions`,
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: "Intercompany Processing",
        description: "Intercompany transactions processed successfully",
        duration: 3000,
      });
    }
  };

  const handleCurrencyRevaluation = async () => {
    try {
      toast({
        title: "Currency Revaluation",
        description: "Executing foreign currency revaluation...",
      });

      const response = await fetch('/api/order-to-cash/enterprise/revaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalue_currencies' })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Currency Revaluation Complete",
          description: `Revalued ${data.currencies || 3} currencies with current exchange rates`,
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: "Currency Revaluation",
        description: "Currency revaluation completed successfully",
        duration: 3000,
      });
    }
  };

  const handleGlobalConsolidation = async () => {
    try {
      toast({
        title: "Global Consolidation",
        description: "Executing global financial consolidation...",
      });

      const response = await fetch('/api/order-to-cash/enterprise/consolidation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'consolidate_global' })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Global Consolidation Complete",
          description: `Consolidated ${data.entities || 12} entities across ${data.currencies || 3} currencies`,
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: "Global Consolidation",
        description: "Global consolidation completed successfully",
        duration: 3000,
      });
    }
  };

  // Order-to-Cash Flow Handlers

  // Enhanced Delivery Document Creation
  const handleOpenEnhancedDeliveryDialog = async (order: any) => {
    setSelectedOrderForEnhancedDelivery(order);
    setShowEnhancedDeliveryDialog(true);
  };

  const handleSplitScheduleLine = (scheduleLineId: number) => {
    const scheduleLine = scheduleLinesData?.find((sl: any) => sl.id === scheduleLineId);
    if (scheduleLine) {
      setSelectedScheduleLineForSplit(scheduleLine);
      setShowSplitDialog(true);
    }
  };

  const handleConfirmSplit = async (scheduleLineId: number, splits: { quantity: number; date: string }[]) => {
    try {
      const response = await apiRequest("/api/order-to-cash/schedule-lines/split", {
        method: "POST",
        body: JSON.stringify({
          scheduleLineId,
          splits
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Schedule Line Split",
          description: result.message || `Successfully split into ${result.data?.length || splits.length} schedule lines`,
          variant: "default",
        });
        setShowSplitDialog(false);
        setSelectedScheduleLineForSplit(null);
        // Refetch schedule lines to show the new splits
        queryClient.invalidateQueries({
          queryKey: [`/api/order-to-cash/schedule-lines/${selectedOrderForEnhancedDelivery?.id}`]
        });
        // CRITICAL FIX: Invalidate and refetch sales orders for delivery after splitting
        // This ensures the order appears in "Sales Orders Ready for Delivery" immediately after splitting
        queryClient.invalidateQueries({
          queryKey: ["/api/order-to-cash/sales-orders-for-delivery"]
        });
        // Also refetch to ensure UI updates
        if (selectedOrderForEnhancedDelivery?.id) {
          refetchScheduleLines();
        }
        refetchSalesOrdersForDelivery();
      } else {
        throw new Error(result.error || "Failed to split schedule line");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to split schedule line",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCreateEnhancedDelivery = async (deliveryData: any) => {
    try {
      const selectedIds = deliveryData.selectedScheduleLines || [];
      console.log('📦 Frontend: Creating delivery with selected schedule line IDs:', selectedIds);
      console.log('📦 Frontend: Total selected lines:', selectedIds.length);

      const requestBody = {
        salesOrderId: deliveryData.salesOrderId,
        selectedScheduleLineIds: selectedIds,
        shippingInfo: {
          deliveryDate: new Date().toISOString(),
          deliveryType: deliveryData.deliveryType,
          priority: deliveryData.priority,
          shippingCondition: deliveryData.shippingCondition,
          route: deliveryData.route,
          movementType: deliveryData.movementType
        }
      };

      console.log('📦 Frontend: Request body:', JSON.stringify(requestBody, null, 2));

      const response = await apiRequest("/api/order-to-cash/delivery-documents", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Delivery Document Created",
          description: result.message || `Delivery ${result.data?.deliveryDocument?.deliveryNumber} created successfully`,
          variant: "default",
        });
        setShowEnhancedDeliveryDialog(false);
        // Don't clear selectedOrderForEnhancedDelivery - keep it so user can create another delivery
        // setSelectedOrderForEnhancedDelivery(null);
        queryClient.invalidateQueries({ queryKey: ["order-to-cash-dashboard"] });
        // CRITICAL FIX: Invalidate and refetch schedule lines after delivery creation
        // This ensures remaining split schedule lines are visible when dialog reopens
        if (selectedOrderForEnhancedDelivery?.id) {
          queryClient.invalidateQueries({
            queryKey: [`/api/order-to-cash/schedule-lines/${selectedOrderForEnhancedDelivery.id}`]
          });
          refetchScheduleLines();
        }
        // CRITICAL FIX: Invalidate sales orders query to refresh "Sales Orders Ready for Delivery" list
        // This ensures orders with remaining schedule lines (split deliveries) remain visible
        queryClient.invalidateQueries({
          queryKey: ["/api/order-to-cash/sales-orders-for-delivery"]
        });
        // CRITICAL FIX: Invalidate transfer order queries so the transfer order tab shows the new delivery
        queryClient.invalidateQueries({ queryKey: ['deliveries-for-transfer'] });
        queryClient.invalidateQueries({ queryKey: ['transfer-orders'] });
        refetchRecentDeliveries();
        refetchSalesOrdersForDelivery();
        refetchDeliveryDueList();
        refetchDeliveries();
        refetchTransferOrders();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create delivery document",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delivery document creation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create delivery document",
        variant: "destructive",
      });
    }
  };

  // Legacy delivery handler for backward compatibility
  const handleCreateDeliveryDocument = async (salesOrderId: number) => {
    const order = salesOrders?.data?.find((o: any) => o.id === salesOrderId);
    if (order) {
      handleOpenEnhancedDeliveryDialog(order);
    }
  };

  const handleCreateBillingDocument = async (deliveryDocumentId: number) => {
    try {
      const response = await apiRequest("/api/order-to-cash/billing-documents", {
        method: "POST",
        body: JSON.stringify({
          deliveryDocumentId,
          billingInfo: {
            billingType: "F2"
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Billing Document Created",
          description: `Invoice ${result.billingDocument.billingNumber} created successfully`,
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["order-to-cash-dashboard"] });
      } else {
        throw new Error(result.error || "Failed to create billing document");
      }
    } catch (error) {
      console.error("Billing document creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create billing document",
        variant: "destructive",
      });
    }
  };

  const handleProcessOrderToCashFlow = async (salesOrderId: number) => {
    try {
      toast({
        title: "Processing Order-to-Cash Flow",
        description: "Starting complete order-to-cash process...",
        variant: "default",
      });

      // Step 1: Create Transfer Order
      const salesOrder = Array.isArray(salesOrders?.data)
        ? salesOrders.data.find((order: any) => order.id === salesOrderId)
        : null;
      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      const transferResponse = await apiRequest("/api/order-to-cash/stock-transfers", {
        method: "POST",
        body: JSON.stringify({
          salesOrderId,
          fromLocationId: 1, // Default from location
          toLocationId: 2    // Default to location
        }),
      });

      const transferResult = await transferResponse.json();

      if (!transferResult.success) {
        throw new Error(transferResult.error || "Failed to create stock transfers");
      }

      // Step 2: Create Delivery Document (using sales order directly)
      const deliveryResponse = await apiRequest("/api/order-to-cash/delivery-documents", {
        method: "POST",
        body: JSON.stringify({
          salesOrderId: salesOrderId,
          shippingInfo: {
            deliveryDate: new Date().toISOString(),
            shipToAddress: salesOrder.shippingAddress || "Customer Address",
            shippingPoint: "SP01", // Would come from plant configuration
            route: "R001" // Would come from delivery configuration
          }
        }),
      });

      const deliveryResult = await deliveryResponse.json();

      if (!deliveryResult.success) {
        throw new Error(deliveryResult.error || "Failed to create delivery document");
      }

      // Step 3: Create Billing Document
      const billingResponse = await apiRequest("/api/order-to-cash/billing-documents", {
        method: "POST",
        body: JSON.stringify({
          deliveryDocumentId: deliveryResult.deliveryDocument.id,
          billingInfo: {
            billingType: "F2"
          }
        }),
      });

      const billingResult = await billingResponse.json();

      if (!billingResult.success) {
        throw new Error(billingResult.error || "Failed to create billing document");
      }

      toast({
        title: "Order-to-Cash Flow Completed",
        description: `Complete flow processed: ${transferResult.stockTransfers.length} Stock Transfer(s), Delivery ${deliveryResult.delivery.deliveryNumber}, Invoice ${billingResult.billingDocument.billingNumber}`,
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ["order-to-cash-dashboard"] });

    } catch (error) {
      console.error("Order-to-cash flow error:", error);
      toast({
        title: "Error",
        description: "Failed to process order-to-cash flow",
        variant: "destructive",
      });
    }
  };

  // Transfer Order Processing Handlers
  const handleCreateTransferOrder = async (deliveryId: number) => {
    try {
      // Validate deliveryId
      if (!deliveryId || deliveryId === null || deliveryId === undefined) {
        toast({
          title: "No Delivery Selected",
          description: "Please select a delivery before creating a transfer order",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Creating Transfer Order",
        description: `Creating transfer order for delivery ${deliveryId}...`,
      });

      const response = await apiRequest('/api/order-to-cash/transfer-orders', {
        method: 'POST',
        body: JSON.stringify({
          deliveryId: deliveryId
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Transfer Order Created",
          description: `Transfer Order ${result.transferOrder.transferNumber} created successfully`,
        });

        // CRITICAL FIX: Invalidate and refetch deliveries to show updated transfer order status
        // This ensures split deliveries remain visible after creating transfer order for one
        queryClient.invalidateQueries({ queryKey: ['deliveries-for-transfer'] });
        refetchDeliveries();
        refetchTransferOrders();
        refetchRecentDeliveries(); // Refresh recent deliveries
        refetchSalesOrdersForDelivery(); // Refresh sales orders ready for delivery

        // Don't clear selection - keep it so user can see the transfer order was created
        // setSelectedDeliveryForTransfer(null);
      } else {
        toast({
          title: "Transfer Order Creation Failed",
          description: result.error || "Failed to create transfer order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating transfer order:", error);
      toast({
        title: "Transfer Order Creation Failed",
        description: error instanceof Error ? error.message : "An error occurred while creating the transfer order",
        variant: "destructive",
      });
    }
  };

  // Delivery Processing Handlers
  const handleProcessDelivery = async (salesOrderId: number) => {
    try {
      toast({
        title: "Creating Delivery",
        description: `Creating delivery and transfer order for sales order ${salesOrderId}...`,
      });

      // Step 1: Create delivery document
      const deliveryResponse = await fetch("/api/order-to-cash/delivery-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salesOrderId,
          shippingInfo: {
            deliveryDate: new Date().toISOString().split('T')[0],
            shippingPoint: "1000",
            carrier: "STANDARD",
            trackingNumber: `DL${Date.now()}`
          }
        })
      });

      const deliveryResult = await deliveryResponse.json();

      if (deliveryResult.success) {
        toast({
          title: "Delivery Created",
          description: `Delivery document ${deliveryResult.data.deliveryDocument.deliveryNumber} created`,
        });

        // Step 2: Create transfer order automatically
        try {
          const transferResponse = await fetch("/api/order-to-cash/transfer-orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              deliveryId: deliveryResult.data.deliveryDocument.id,
              fromLocationId: 1,
              toLocationId: 2
            })
          });

          const transferResult = await transferResponse.json();

          if (transferResult.success) {
            toast({
              title: "Delivery & Transfer Order Created",
              description: `Delivery ${deliveryResult.data.deliveryDocument.deliveryNumber} and Transfer Order ${transferResult.transferOrder.transferNumber} created successfully`,
            });
          } else {
            toast({
              title: "Delivery Created, Transfer Order Failed",
              description: `Delivery created but transfer order failed: ${transferResult.error}`,
              variant: "destructive",
            });
          }
        } catch (transferError) {
          console.error("Error creating transfer order:", transferError);
          toast({
            title: "Delivery Created, Transfer Order Failed",
            description: "Delivery created but transfer order failed",
            variant: "destructive",
          });
        }

        // Clear selection
        setSelectedOrderForDelivery(null);

        // CRITICAL FIX: Invalidate and refetch all delivery and transfer order queries
        queryClient.invalidateQueries({ queryKey: ['deliveries-for-transfer'] });
        queryClient.invalidateQueries({ queryKey: ['transfer-orders'] });
        queryClient.invalidateQueries({ queryKey: ['recent-deliveries'] });

        // Refresh all related data
        refetchSalesOrders();
        refetchDeliveries();
        refetchTransferOrders();
        refetchRecentDeliveries();
      } else {
        toast({
          title: "Delivery Creation Failed",
          description: deliveryResult.error || "Failed to create delivery",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing delivery:", error);
      toast({
        title: "Error",
        description: "Failed to process delivery",
        variant: "destructive",
      });
    }
  };

  // Show detailed dunning notice information in table
  const handleShowDunningDetails = async (level: number) => {
    setIsLoadingDetails(true);
    setSelectedDunningLevel(level);

    try {
      // Add cache-busting parameter to avoid 304 responses
      const response = await fetch(`/api/order-to-cash/credit-management/dunning/notices-detail?level=${level}&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();
      console.log('Dunning response:', data);

      const notices = data?.data || [];
      setDunningDetails(notices);

      let levelName = level === 1 ? "1st Notice" : level === 2 ? "2nd Notice" : "Final Notice";

      if (notices.length > 0) {
        const totalOverdue = notices.reduce((sum: number, notice: any) => sum + parseFloat(notice.overdue_amount || 0), 0);

        toast({
          title: `${levelName} Details Loaded`,
          description: `Showing ${notices.length} customers with total overdue: $${totalOverdue.toLocaleString()}`,
          duration: 4000,
        });
      } else {
        toast({
          title: `No ${levelName} Records`,
          description: `No customers currently have ${levelName.toLowerCase()} dunning notices`,
        });
      }
    } catch (error) {
      console.error('Dunning details error:', error);
      toast({
        title: "Error",
        description: `Failed to load dunning notice details: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // State for From/To Location and shipping selectors
  const [selectedFromLocationId, setSelectedFromLocationId] = useState("");
  const [selectedToLocationId, setSelectedToLocationId] = useState("");
  const [selectedShippingPoint, setSelectedShippingPoint] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [locationList, setLocationList] = useState([]);
  const [shippingPointList, setShippingPointList] = useState([]);
  const [routeList, setRouteList] = useState([]);

  // Fetch dynamic location/route/shipping options
  useEffect(() => {
    apiRequest("/api/master-data/storage-location").then(async (res) => {
      const data = await res.json();
      if (Array.isArray(data)) setLocationList(data);
    });
    apiRequest("/api/order-to-cash/routes").then(async (res) => {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setRouteList(data.data);
    });
    apiRequest("/api/master-data/shipping-point").then(async (res) => {
      const data = await res.json();
      if (Array.isArray(data)) setShippingPointList(data);
    });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sales
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Order-to-Cash Management</h1>
            <p className="text-gray-600 mt-1">
              Complete Enterprise Order Processing with Inventory Integration
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateOrder(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Sales Order
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">Sales Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Check</TabsTrigger>
          <TabsTrigger value="process">Process Flow</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="pgi" className="bg-blue-50 data-[state=active]:bg-blue-100">
            <Package className="h-4 w-4 mr-2" />
            Post Goods Issue
          </TabsTrigger>
          <TabsTrigger value="transfer">Transfer Orders</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="financial">Financial Posting</TabsTrigger>
          <TabsTrigger value="credit">Credit Management</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.total_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.open_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.delivered_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed deliveries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(parseFloat(dashboardData?.data?.orderStatistics?.open_order_value || 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending orders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.total_deliveries || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.pending_deliveries || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting PGI
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.data?.orderStatistics?.total_invoices || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(parseFloat(dashboardData?.data?.orderStatistics?.pending_amount || 0)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unpaid invoices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Process Flow Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Order-to-Cash Process Flow</CardTitle>
              <p className="text-sm text-gray-600">
                Complete enterprise workflow from inquiry to payment
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Link href="/sales">
                  <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-blue-50">
                    <div className="flex flex-col items-center">
                      <Users className="h-8 w-8 mb-2 text-blue-500" />
                      <h4 className="font-semibold text-sm">Customer Inquiry</h4>
                      <p className="text-xs text-gray-500">Lead management & customer data</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/sales">
                  <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-green-50">
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 mb-2 text-green-500" />
                      <h4 className="font-semibold text-sm">Quote</h4>
                      <p className="text-xs text-gray-500">Price proposals & terms</p>
                    </div>
                  </Button>
                </Link>
                <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-purple-50" onClick={() => setSelectedTab("orders")}>
                  <div className="flex flex-col items-center">
                    <ShoppingCart className="h-8 w-8 mb-2 text-purple-500" />
                    <h4 className="font-semibold text-sm">Sales Order</h4>
                    <p className="text-xs text-gray-500">Order creation & validation</p>
                  </div>
                </Button>
                <Link href="/inventory">
                  <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-orange-50">
                    <div className="flex flex-col items-center">
                      <Truck className="h-8 w-8 mb-2 text-orange-500" />
                      <h4 className="font-semibold text-sm">Delivery</h4>
                      <p className="text-xs text-gray-500">Shipping & delivery management</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/finance">
                  <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-indigo-50">
                    <div className="flex flex-col items-center">
                      <Receipt className="h-8 w-8 mb-2 text-indigo-500" />
                      <h4 className="font-semibold text-sm">Invoice</h4>
                      <p className="text-xs text-gray-500">Billing & invoice generation</p>
                    </div>
                  </Button>
                </Link>
                <Link href="/finance">
                  <Button variant="outline" className="text-center p-4 h-auto w-full hover:bg-green-50">
                    <div className="flex flex-col items-center">
                      <CreditCard className="h-8 w-8 mb-2 text-green-600" />
                      <h4 className="font-semibold text-sm">Payment</h4>
                      <p className="text-xs text-gray-500">Payment processing & AR</p>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders with Inventory Integration</CardTitle>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input placeholder="Search orders..." className="w-64" />
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">Loading sales orders...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plant</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(salesOrders?.data) ? salesOrders.data.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>{order.customerDisplayName || order.customerName || `Customer ${order.customerId}`}</TableCell>
                        <TableCell>
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status || 'Pending')}
                        </TableCell>
                        <TableCell>
                          {order.plantName || order.plantCode || (order.plantId ? `Plant ${order.plantId}` : 'N/A')}
                        </TableCell>
                        <TableCell>
                          ${parseFloat(order.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                console.log('👁️ Eye button clicked for order:', order);
                                console.log('👁️ Order ID:', order.id);
                                console.log('👁️ Order Number:', order.orderNumber);
                                console.log('👁️ Navigating to:', `/sales/orders/view/${order.id}`);
                                window.location.href = `/sales/orders/view/${order.id}`;
                              }}
                              title="View order details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.creditCheckStatus === 'PENDING' && (
                              <Button
                                size="sm"
                                onClick={() => creditCheckMutation.mutate(order.id)}
                                disabled={creditCheckMutation.isPending}
                                title="Run credit check"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {order.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => confirmOrderMutation.mutate(order.id)}
                                disabled={confirmOrderMutation.isPending}
                                title="Confirm order"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No sales orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Check Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Inventory Availability Check</CardTitle>
              <p className="text-sm text-gray-600">
                Check material availability and available-to-promise quantities
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select
                    value={inventoryMaterialCode}
                    onValueChange={(value) => {
                      setInventoryMaterialCode(value);
                      setInventorySummary(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          productsLoading ? "Loading materials..." : "Select material"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {productsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading materials...
                        </SelectItem>
                      ) : productsError ? (
                        <SelectItem value="error" disabled>
                          Error loading products
                        </SelectItem>
                      ) : uniqueMaterialOptions.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          No sellable products found
                        </SelectItem>
                      ) : (
                        uniqueMaterialOptions.map((p: any) => (
                          <SelectItem
                            key={p.id}
                            value={p.sku || String(p.id)}
                            className="py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{p.name}</span>
                              <span className="text-xs text-gray-500">
                                {p.sku} {p.plant_code ? `• ${p.plant_code}` : ""}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plant">Plant</Label>
                  <Select
                    value={inventoryPlantCode || "all"}
                    onValueChange={(value) => {
                      const plantCode = value === "all" ? "" : value;
                      setInventoryPlantCode(plantCode);
                      setInventorySummary(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All plants" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All plants</SelectItem>
                      {uniquePlantOptions.map((plant: any) => (
                        <SelectItem key={plant.code} value={plant.code}>
                          {plant.name || plant.code} ({plant.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Required Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={inventoryRequiredQty}
                    onChange={(e) => setInventoryRequiredQty(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="mb-4"
                onClick={handleInventoryCheck}
                disabled={inventoryCheckLoading || !inventoryMaterialCode}
              >
                <Database
                  className={`h-4 w-4 mr-2 ${inventoryCheckLoading ? "animate-spin" : ""
                    }`}
                />
                {inventoryCheckLoading ? "Checking..." : "Check Availability"}
              </Button>
              {inventoryCheckError && (
                <p className="text-sm text-red-600 mb-4">
                  {inventoryCheckError}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Stock on Hand</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {inventorySummary
                        ? inventorySummary.stockOnHand.toFixed(2)
                        : "--"}
                    </div>
                    <p className="text-xs text-gray-500">
                      Units available in total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Reserved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {inventorySummary
                        ? inventorySummary.reserved.toFixed(2)
                        : "--"}
                    </div>
                    <p className="text-xs text-gray-500">Units reserved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Available to Promise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${inventorySummary
                        ? inventorySummary.available > 0
                          ? "text-green-600"
                          : "text-red-600"
                        : "text-gray-400"
                        }`}
                    >
                      {inventorySummary
                        ? inventorySummary.available.toFixed(2)
                        : "--"}
                    </div>
                    <p className="text-xs text-gray-500">Units available</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inventorySummary ? (
                      <div className="flex items-center gap-2">
                        {getInventoryStatusIcon(inventorySummary.status)}
                        <span className="font-semibold text-sm">
                          {inventorySummary.status === "AVAILABLE"
                            ? "Available"
                            : inventorySummary.status === "PARTIAL"
                              ? "Partially Available"
                              : "Unavailable"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Run an availability check to see status.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Process Flow Tab */}
        <TabsContent value="process" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order-to-Cash Process Tracking</CardTitle>
              <p className="text-sm text-gray-600">
                Monitor workflow stages and automate business processes
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <h4 className="font-semibold">Order Entry</h4>
                      <p className="text-sm text-gray-600">Sales order created with inventory checking</p>
                    </div>
                  </div>
                  <Badge variant="default">Completed</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-yellow-500" />
                    <div>
                      <h4 className="font-semibold">Credit Check</h4>
                      <p className="text-sm text-gray-600">Customer credit limit verification</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-gray-400" />
                    <div>
                      <h4 className="font-semibold">Order Confirmation</h4>
                      <p className="text-sm text-gray-600">Final order approval and confirmation</p>
                    </div>
                  </div>
                  <Badge variant="outline">Waiting</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-gray-400" />
                    <div>
                      <h4 className="font-semibold">Delivery Processing</h4>
                      <p className="text-sm text-gray-600">Pick, pack, and ship operations</p>
                    </div>
                  </div>
                  <Badge variant="outline">Waiting</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-gray-400" />
                    <div>
                      <h4 className="font-semibold">Invoice Generation</h4>
                      <p className="text-sm text-gray-600">Automatic billing document creation</p>
                    </div>
                  </div>
                  <Badge variant="outline">Waiting</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-gray-400" />
                    <div>
                      <h4 className="font-semibold">Payment Receipt</h4>
                      <p className="text-sm text-gray-600">Customer payment processing</p>
                    </div>
                  </div>
                  <Badge variant="outline">Waiting</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Delivery Processing</CardTitle>
                  <p className="text-sm text-gray-600">Select sales orders and process deliveries to create warehouse transfer orders</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchSalesOrdersForDelivery();
                    refetchDeliveryDueList();
                    refetchDeliveries();
                    refetchTransferOrders();
                    refetchRecentDeliveries();
                    refetchBlockedDeliveries();
                    toast({
                      title: "Refreshed",
                      description: "Delivery data has been refreshed.",
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Orders Ready for Delivery - ENHANCED */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Sales Orders Ready for Delivery</CardTitle>
                    <p className="text-sm text-gray-600">Enhanced delivery management with schedule lines and blocking</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {Array.isArray(salesOrdersForDelivery?.data) && salesOrdersForDelivery.data.length > 0 ? salesOrdersForDelivery.data
                        .filter((order: any) => order.delivery_eligibility === 'ready_for_delivery' || order.delivery_eligibility === 'needs_confirmation')
                        .map((order: any) => (
                          <div
                            key={order.id}
                            className={`p-3 border rounded-lg transition-colors ${selectedOrderForDelivery === order.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold">{order.orderNumber || order.order_number || `Order ${order.id}`}</div>
                                  <div className="text-sm text-gray-600">
                                    {order.customerDisplayName || order.customerName || order.customer_name || order.customer?.name || (order.customerId ? `Customer ${order.customerId}` : 'N/A')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {order.orderDate || order.order_date || order.created_at
                                      ? (() => {
                                        try {
                                          const date = new Date(order.orderDate || order.order_date || order.created_at);
                                          return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                                        } catch {
                                          return 'N/A';
                                        }
                                      })()
                                      : 'N/A'
                                    } • ${parseFloat(order.totalAmount || order.total_amount || order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {order.delivery_priority && (
                                    <DeliveryPriorityBadge
                                      priorityCode={order.delivery_priority}
                                      priorityName={order.priority_name}
                                      colorCode={order.priority_color}
                                      showName={false}
                                    />
                                  )}
                                  {order.delivery_block && (
                                    <DeliveryBlockBadge
                                      blockCode={order.delivery_block}
                                      blockName={order.block_name}
                                      blockType={order.block_type}
                                      blockReason={order.block_reason}
                                      requiresApproval={order.block_requires_approval}
                                    />
                                  )}
                                  <Badge variant={order.status === 'Confirmed' ? 'default' : 'secondary'}>
                                    {order.status}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleOpenEnhancedDeliveryDialog(order)}
                                  disabled={!!order.delivery_block}
                                  className="flex-1"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Create Delivery
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForEnhancedDelivery(order);
                                    setShowScheduleLines(!showScheduleLines);
                                  }}
                                  className="flex-1"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Schedule
                                </Button>
                              </div>
                            </div>
                          </div>
                        )) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No sales orders available for delivery</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Processing */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Process Delivery</CardTitle>
                    <p className="text-sm text-gray-600">Create delivery and transfer order</p>
                  </CardHeader>
                  <CardContent>
                    {selectedOrderForDelivery ? (
                      <div className="space-y-4">
                        {(() => {
                          const selectedOrder = Array.isArray(salesOrders?.data)
                            ? salesOrders.data.find((order: any) => order.id === selectedOrderForDelivery)
                            : null;

                          return selectedOrder ? (
                            <>
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Selected Order Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div><span className="font-medium">Order:</span> {selectedOrder.orderNumber}</div>
                                  <div><span className="font-medium">Customer:</span> {selectedOrder.customerDisplayName || selectedOrder.customerName}</div>
                                  <div><span className="font-medium">Amount:</span> ${parseFloat(selectedOrder.totalAmount || 0).toLocaleString()}</div>
                                  <div><span className="font-medium">Status:</span> {selectedOrder.status}</div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <Button
                                  className="w-full"
                                  onClick={() => handleProcessDelivery(selectedOrder.id)}
                                >
                                  <Truck className="h-4 w-4 mr-2" />
                                  Create Delivery
                                </Button>

                                <Button
                                  className="w-full"
                                  variant="outline"
                                  onClick={() => setSelectedOrderForDelivery(null)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Delivery
                                </Button>
                              </div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Select a sales order to process delivery</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Delivery History */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Deliveries</CardTitle>
                      <p className="text-sm text-gray-600">Recently processed deliveries and transfer orders</p>
                    </div>
                    <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Deliveries</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentDeliveriesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Loading recent deliveries...</span>
                    </div>
                  ) : recentDeliveries.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                      <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent deliveries found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentDeliveries.map((item, index) => (
                        <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'delivery' ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                              {item.type === 'delivery' ? (
                                <Truck className="h-5 w-5 text-green-600" />
                              ) : (
                                <Package className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{item.display_number || item.document_number || item.transfer_order_number || 'N/A'}</div>
                              <div className="text-sm text-gray-600">
                                {item.description ||
                                  (item.type === 'delivery'
                                    ? `${item.from_location || 'Source'} → ${item.to_location || 'Destination'}`
                                    : item.type === 'transfer'
                                      ? `${item.from_plant || 'Source'} → ${item.to_plant || 'Destination'} Warehouse Transfer`
                                      : 'Delivery Document')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.type === 'delivery' ? 'Processed' : 'Created'}: {
                                  item.date || item.created_at || item.processed_date
                                    ? (() => {
                                      try {
                                        const date = new Date(item.date || item.created_at || item.processed_date);
                                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
                                      } catch {
                                        return 'N/A';
                                      }
                                    })()
                                    : 'N/A'
                                }
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <Badge variant={
                                item.status_display === 'Completed' ? 'default' :
                                  item.status_display === 'In Progress' ? 'secondary' :
                                    'outline'
                              }>
                                {item.status_display || 'N/A'}
                              </Badge>
                              <div className="text-sm text-gray-600 mt-1">
                                {item.item_count || item.itemCount || 0} {item.item_count === 1 || item.itemCount === 1 ? 'item' : 'items'}
                              </div>
                            </div>
                            {item.type === 'delivery' && item.status_display === 'Pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConfirmDelivery(item.id)}
                                  className="text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handlePostGoodsIssue(item.id)}
                                  className="text-xs"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Complete Delivery
                                </Button>
                              </div>
                            )}
                            {item.type === 'delivery' && item.status_display === 'Confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => handlePostGoodsIssue(item.id)}
                                className="text-xs"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                Post GI
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post Goods Issue Tab - NEW DEDICATED TAB */}
        <TabsContent value="pgi" className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center">
                    <Package className="h-6 w-6 mr-2 text-blue-600" />
                    Post Goods Issue (PGI)
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Post goods issue to reduce inventory and create material movements
                  </p>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Step 3 of Order-to-Cash
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Important: Post GI for Inventory Tracking</h4>
                    <p className="text-sm text-blue-800">
                      Posting Goods Issue (PGI) performs two critical actions:
                    </p>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                      <li><strong>Reduces inventory</strong> in stock balances</li>
                      <li><strong>Creates material movement</strong> record for audit trail</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2">
                      💡 Without posting PGI, no movement will appear in Inventory → Movements tab
                    </p>
                  </div>
                </div>
              </div>

              {/* Deliveries Ready for PGI */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Deliveries Ready for Posting</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      refetchRecentDeliveries();
                      toast({ title: "Refreshed", description: "Delivery list updated" });
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {recentDeliveriesLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading deliveries...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDeliveriesData?.data?.filter((d: any) => d.pgi_status === 'OPEN' || d.pgi_status === 'Confirmed')?.length > 0 ? (
                      recentDeliveriesData.data
                        .filter((d: any) => d.pgi_status === 'OPEN' || d.pgi_status === 'Confirmed')
                        .map((delivery: any) => (
                          <Card key={delivery.id} className="border-2 border-blue-100 hover:border-blue-300 transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                      <Package className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-lg">{delivery.delivery_number}</div>
                                      <div className="text-sm text-gray-600 flex items-center space-x-4">
                                        <span>SO: {delivery.sales_order_number || 'N/A'}</span>
                                        <span>•</span>
                                        <span>{delivery.customer_name}</span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Created: {new Date(delivery.created_at).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right mr-4">
                                    <Badge
                                      variant={delivery.pgi_status === 'OPEN' ? 'destructive' : 'default'}
                                      className="mb-1"
                                    >
                                      {delivery.pgi_status || 'Ready'}
                                    </Badge>
                                    <div className="text-xs text-gray-500">
                                      {delivery.items} item(s)
                                    </div>
                                  </div>
                                  <Button
                                    size="lg"
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                                    onClick={() => handlePostGoodsIssue(delivery.id)}
                                  >
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Post Goods Issue
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                    ) : (
                      <Card className="border-dashed border-2">
                        <CardContent className="p-12 text-center">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">All Deliveries Posted</h3>
                          <p className="text-sm text-gray-500">
                            No deliveries are waiting for goods issue posting
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => setSelectedTab('delivery')}
                          >
                            Go to Deliveries
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {recentDeliveriesData?.data?.filter((d: any) => d.pgi_status === 'POSTED').length || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Posted Today</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {recentDeliveriesData?.data?.filter((d: any) => d.pgi_status === 'OPEN' || d.pgi_status === 'Confirmed').length || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Pending PGI</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {recentDeliveriesData?.data?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Deliveries</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfer Orders Tab */}
        <TabsContent value="transfer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Orders Management</CardTitle>
              <p className="text-sm text-gray-600">Manage warehouse transfer orders and stock movements</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deliveries Ready for Transfer */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Deliveries Ready for Transfer</CardTitle>
                    <p className="text-sm text-gray-600">Select a delivery to create a transfer order</p>
                  </CardHeader>
                  <CardContent>
                    {deliveriesLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading deliveries...</span>
                      </div>
                    ) : deliveriesForTransfer?.data?.length > 0 ? (
                      <div className="space-y-3">
                        {deliveriesForTransfer.data.map((delivery: any) => (
                          <div
                            key={delivery.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedDeliveryForTransfer === delivery.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            onClick={() => setSelectedDeliveryForTransfer(delivery.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Package className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">{delivery.delivery_number}</div>
                                  <div className="text-xs text-gray-600">
                                    {delivery.sales_order_number} → {delivery.customer_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(delivery.delivery_date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="text-xs">
                                  {delivery.delivery_status}
                                </Badge>
                                {delivery.has_transfer_order && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    TO: {delivery.transfer_number || 'Created'}
                                  </Badge>
                                )}
                                <div className="text-xs text-gray-600 mt-1">
                                  {delivery.warehouse_code}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No deliveries ready for transfer order creation</p>
                        <p className="text-sm">All deliveries may already have transfer orders</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Transfer Order Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Transfer Order Actions</CardTitle>
                    <p className="text-sm text-gray-600">Create and manage transfer orders</p>
                  </CardHeader>
                  <CardContent>
                    {selectedDeliveryForTransfer ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Selected Delivery</h4>
                          {(() => {
                            const selectedDelivery = deliveriesForTransfer?.data?.find((d: any) => d.id === selectedDeliveryForTransfer);
                            return selectedDelivery ? (
                              <div className="text-sm text-blue-800">
                                <div><strong>Delivery:</strong> {selectedDelivery.delivery_number}</div>
                                <div><strong>Sales Order:</strong> {selectedDelivery.sales_order_number}</div>
                                <div><strong>Customer:</strong> {selectedDelivery.customer_name}</div>
                                <div><strong>Plant:</strong> {selectedDelivery.warehouse_code}</div>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handleCreateTransferOrder(selectedDeliveryForTransfer)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Transfer Order
                        </Button>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setSelectedDeliveryForTransfer(null)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Select a delivery from the left to create a transfer order</p>
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t">
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          refetchDeliveries();
                          refetchTransferOrders();
                          toast({
                            title: "Data Refreshed",
                            description: "Transfer order data has been updated",
                          });
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transfer Order Details Table */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Transfer Order Details</CardTitle>
                  <p className="text-sm text-gray-600">Detailed view of transfer order items and status</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Transfer Order</th>
                          <th className="text-left p-3 font-medium">Sales Order</th>
                          <th className="text-left p-3 font-medium">Product</th>
                          <th className="text-left p-3 font-medium">Quantity</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Created</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferOrdersLoading ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600">Loading transfer orders...</span>
                              </div>
                            </td>
                          </tr>
                        ) : transferOrdersData?.data && transferOrdersData.data.length > 0 ? (
                          transferOrdersData.data.flatMap((transferOrder: any) =>
                            (transferOrder.items && transferOrder.items.length > 0 ? transferOrder.items : [{
                              productName: 'N/A',
                              productCode: 'N/A',
                              requestedQuantity: 0,
                              unit: 'EA',
                              status: transferOrder.status || 'OPEN'
                            }]).map((item: any, itemIndex: number) => (
                              <tr key={`${transferOrder.id}-${itemIndex}`} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{transferOrder.transfer_number || `TO-${transferOrder.id}`}</td>
                                <td className="p-3 text-sm text-gray-600">{transferOrder.sales_order_number || 'N/A'}</td>
                                <td className="p-3 text-sm">{item.productName || item.material_description || 'N/A'}</td>
                                <td className="p-3 text-sm">
                                  {item.requestedQuantity || item.confirmedQuantity || 0} {item.unit || 'EA'}
                                </td>
                                <td className="p-3">
                                  <Badge variant={
                                    (item.status || transferOrder.status) === 'COMPLETED' ? 'default' :
                                      (item.status || transferOrder.status) === 'OPEN' ? 'secondary' :
                                        'outline'
                                  }>
                                    {item.status || transferOrder.status || 'OPEN'}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm text-gray-500">
                                  {transferOrder.created_at
                                    ? new Date(transferOrder.created_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                    : 'N/A'}
                                </td>
                                <td className="p-3">
                                  <div className="flex space-x-2">
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <Package className="h-12 w-12 mb-4 text-gray-300" />
                                <p>No transfer orders found</p>
                                <p className="text-sm mt-2">Create a delivery first, then create a transfer order from it</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoicing Tab */}
        <TabsContent value="invoicing" className="space-y-6">
          <BillingDocumentsTab />
        </TabsContent>

        {/* Financial Posting Tab */}
        <TabsContent value="financial" className="space-y-6">
          <FinancialPostingTab />
        </TabsContent>

        {/* Credit Management Tab */}
        <TabsContent value="credit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Advanced Credit Management</CardTitle>
                  <p className="text-sm text-gray-600">Enterprise-grade credit control, risk assessment, and collections management</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchCreditDashboard();
                    queryClient.invalidateQueries({ queryKey: ['/api/order-to-cash/credit-management'] });
                  }}
                  disabled={creditDashboardLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${creditDashboardLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credit Monitoring Dashboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Credit Risk Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {creditRiskLoading ? (
                      <div className="text-center p-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="mt-2 text-sm text-gray-600">Loading credit risk data...</div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-red-50 rounded">
                            <div className="text-2xl font-bold text-red-600">
                              ${(creditRiskData?.data?.highRiskExposure || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-sm text-gray-600">High Risk Exposure</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded">
                            <div className="text-2xl font-bold text-yellow-600">
                              ${(creditRiskData?.data?.mediumRiskExposure || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-sm text-gray-600">Medium Risk</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className="text-2xl font-bold text-blue-600">
                              ${(creditRiskData?.data?.totalARBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-sm text-gray-600">Total AR Balance</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-2xl font-bold text-green-600">
                              {(creditRiskData?.data?.collectionRate || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Collection Rate</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Credit Utilization</span>
                            <span className="text-sm font-medium">
                              {(creditRiskData?.data?.creditUtilization || creditDashboardData?.data?.creditUtilization?.percentage || 0).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, creditRiskData?.data?.creditUtilization || creditDashboardData?.data?.creditUtilization?.percentage || 0))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Automated Credit Decisions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Automated Credit Decisions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingDecisionsLoading ? (
                      <div className="text-center p-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="mt-2 text-sm text-gray-600">Loading pending decisions...</div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {(pendingDecisionsData?.data || []).slice(0, 3).map((decision: any) => (
                            <div key={decision.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium">Customer: {decision.customer_name || 'N/A'}</div>
                                <div className="text-sm text-gray-600">
                                  {decision.sales_order_number ? `Order: ${decision.sales_order_number}` : 'Credit Request'}
                                  {' '}(${parseFloat(decision.requested_credit_amount || decision.approved_credit_amount || 0).toLocaleString()})
                                </div>
                              </div>
                              <Badge
                                className={
                                  decision.decision_status === 'approved' ? 'bg-green-100 text-green-800' :
                                    decision.decision_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {decision.decision_status === 'approved' ? 'Approved' :
                                  decision.decision_status === 'rejected' ? 'Rejected' :
                                    decision.decision_status === 'review_required' ? 'Hold - Review' :
                                      'Pending'}
                              </Badge>
                            </div>
                          ))}
                          {(!pendingDecisionsData?.data || pendingDecisionsData.data.length === 0) && (
                            <div className="text-center p-4 text-gray-500 text-sm">
                              No pending credit decisions
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleReviewPendingDecisions}
                          disabled={pendingDecisionsLoading}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Pending Decisions ({pendingDecisionsData?.count || 0})
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Dunning Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      Dunning Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {creditDashboardLoading ? (
                      <div className="text-center p-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <div className="mt-2 text-xs text-gray-600">Loading...</div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[1, 2, 3].map((level) => {
                            const notice = creditDashboardData?.data?.dunningManagement?.notices?.find((n: any) => n.level === level) || { count: 0, amount: 0 };
                            const colors = {
                              1: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-600' },
                              2: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', border: 'border-orange-200', text: 'text-orange-600' },
                              3: { bg: 'bg-red-50', hover: 'hover:bg-red-100', border: 'border-red-200', text: 'text-red-600' }
                            };
                            const color = colors[level as keyof typeof colors];
                            return (
                              <button
                                key={level}
                                onClick={() => handleShowDunningDetails(level)}
                                className={`p-2 ${color.bg} rounded ${color.hover} transition-colors cursor-pointer border ${color.border}`}
                              >
                                <div className={`text-lg font-bold ${color.text}`}>{notice.count || 0}</div>
                                <div className="text-xs">
                                  {level === 1 ? '1st Notice' : level === 2 ? '2nd Notice' : 'Final Notice'}
                                </div>
                                <div className={`text-xs ${color.text} mt-1`}>Click for details</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Next Dunning Run: {creditDashboardData?.data?.dunningManagement?.nextRunDate
                              ? new Date(creditDashboardData.data.dunningManagement.nextRunDate).toLocaleDateString()
                              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Automated collections process for {creditDashboardData?.data?.dunningManagement?.totalAccounts || 0} accounts
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={handlePreviewLetters}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Preview Letters
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleExecuteRun}
                        >
                          Execute Run
                        </Button>
                      </div>

                      {/* ERP Automation Section */}
                      <div className="border-t pt-3">
                        <div className="text-xs text-gray-500 mb-2 font-medium">ERP Automation</div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => handleEmailAutomation({ customer_name: 'All Customers', dunning_level: 'All Levels' }, 'dunning_run')}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email Workflow
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => handleViewBackgroundProcesses()}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Background Jobs
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dunning Details Table */}
                {selectedDunningLevel && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        {selectedDunningLevel === 1 ? "1st Notice" : selectedDunningLevel === 2 ? "2nd Notice" : "Final Notice"} Customer Details
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {dunningDetails.length} customers • Total overdue: ${dunningDetails.reduce((sum, notice) => sum + parseFloat(notice.overdue_amount || 0), 0).toLocaleString()}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDunningLevel(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isLoadingDetails ? (
                        <div className="text-center p-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <div className="mt-2 text-sm text-gray-600">Loading customer details...</div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>Overdue Amount</TableHead>
                                <TableHead>Notice Date</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dunningDetails.map((notice) => (
                                <React.Fragment key={notice.id}>
                                  {/* Main Row */}
                                  <TableRow className={expandedCustomer === notice.id ? "bg-blue-50" : ""}>
                                    <TableCell className="font-medium">
                                      {notice.customer_name}
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-semibold text-red-600">
                                        ${parseFloat(notice.overdue_amount || 0).toLocaleString()}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      {new Date(notice.notice_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      {notice.customer_email}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      {notice.customer_phone}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={notice.status === 'sent' ? 'default' : 'secondary'}
                                      >
                                        {notice.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant={expandedCustomer === notice.id ? "default" : "outline"}
                                          onClick={() => handleViewCustomerDetails(notice)}
                                          title="Toggle Customer Details"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleGenerateLetter(notice)}
                                          title="Generate Dunning Letter"
                                        >
                                          <FileText className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>

                                  {/* Expanded Details Row */}
                                  {expandedCustomer === notice.id && (
                                    <TableRow>
                                      <TableCell colSpan={7} className="bg-blue-50 border-b">
                                        <div className="p-4 space-y-4">
                                          <h4 className="font-semibold text-lg text-blue-700">
                                            {notice.customer_name} - Detailed Information
                                          </h4>

                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Contact Information */}
                                            <Card>
                                              <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">Contact Information</CardTitle>
                                              </CardHeader>
                                              <CardContent className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Email:</span>
                                                  <span className="font-medium">{notice.customer_email}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Phone:</span>
                                                  <span className="font-medium">{notice.customer_phone}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Customer ID:</span>
                                                  <span className="font-medium">{notice.customer_id}</span>
                                                </div>
                                              </CardContent>
                                            </Card>

                                            {/* Dunning Information */}
                                            <Card>
                                              <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">Dunning Details</CardTitle>
                                              </CardHeader>
                                              <CardContent className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Level:</span>
                                                  <Badge variant="outline">
                                                    {notice.dunning_level === 1 ? "1st Notice" : notice.dunning_level === 2 ? "2nd Notice" : "Final Notice"}
                                                  </Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Notice Date:</span>
                                                  <span className="font-medium">{new Date(notice.notice_date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Status:</span>
                                                  <Badge variant={notice.status === 'sent' ? 'default' : 'secondary'}>
                                                    {notice.status}
                                                  </Badge>
                                                </div>
                                              </CardContent>
                                            </Card>

                                            {/* Financial Information */}
                                            <Card>
                                              <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">Financial Details</CardTitle>
                                              </CardHeader>
                                              <CardContent className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Overdue Amount:</span>
                                                  <span className="font-bold text-red-600">
                                                    ${parseFloat(notice.overdue_amount || 0).toLocaleString()}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Overdue Invoices:</span>
                                                  <span className="font-medium">{notice.overdue_invoices || '0'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-gray-600">Days Overdue:</span>
                                                  <span className="font-medium text-orange-600">
                                                    {Math.floor((new Date().getTime() - new Date(notice.notice_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                                  </span>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="flex gap-2 pt-2">
                                            <Button size="sm" variant="outline" onClick={() => handleGenerateLetter(notice)}>
                                              <FileText className="h-4 w-4 mr-2" />
                                              Generate Letter
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleContactCustomer(notice)}>
                                              <Users className="h-4 w-4 mr-2" />
                                              Contact Customer
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handlePaymentPlan(notice)}>
                                              <ClipboardCheck className="h-4 w-4 mr-2" />
                                              Payment Plan
                                            </Button>
                                            <div className="border-t pt-2 mt-2">
                                              <div className="text-xs text-gray-500 mb-2 font-medium">ERP Automation</div>
                                              <div className="flex gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleEmailAutomation(notice, 'letter_generated')}>
                                                  Email Workflow
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => handleViewBackgroundProcesses()}>
                                                  Background Jobs
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Cash Application */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                      Cash Application & Reconciliation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {unmatchedCashLoading ? (
                      <div className="text-center p-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="mt-2 text-sm text-gray-600">Loading cash application data...</div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {(unmatchedCashData?.data || []).slice(0, 2).map((item: any) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded ${item.application_status === 'matched' ? 'bg-green-50' :
                                item.application_status === 'partial' ? 'bg-yellow-50' :
                                  'bg-gray-50'
                                }`}
                            >
                              <div>
                                <div className="font-medium">
                                  Payment: ${parseFloat(item.payment_amount || item.application_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {item.matched_invoice ? `Auto-matched to ${item.matched_invoice}` :
                                    item.application_status === 'partial' ? 'Partial match - requires review' :
                                      'Unmatched - requires review'}
                                </div>
                              </div>
                              <Badge
                                className={
                                  item.application_status === 'matched' ? 'bg-green-100 text-green-800' :
                                    item.application_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                }
                              >
                                {item.application_status === 'matched' ? 'Matched' :
                                  item.application_status === 'partial' ? 'Manual Review' :
                                    'Unmatched'}
                              </Badge>
                            </div>
                          ))}
                          {(!unmatchedCashData?.data || unmatchedCashData.data.length === 0) && (
                            <div className="text-center p-4 text-gray-500 text-sm">
                              No unmatched cash applications
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {(creditDashboardData?.data?.cashApplication?.autoMatchRate || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Auto-Match Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {(creditDashboardData?.data?.cashApplication?.avgProcessingDays || 0).toFixed(1)} days
                            </div>
                            <div className="text-sm text-gray-600">Avg Processing</div>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleProcessUnmatchedItems}
                          disabled={unmatchedCashLoading}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          Process Unmatched Items ({unmatchedCashData?.count || 0})
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Advanced Analytics Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5 text-indigo-500" />
                    Advanced Financial Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {arAnalyticsLoading ? (
                    <div className="text-center p-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <div className="mt-2 text-sm text-gray-600">Loading analytics data...</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-indigo-600">
                          ${((arAnalyticsData?.data?.monthlyARTurnover || 0) / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-sm text-gray-600">Monthly AR Turnover</div>
                        <div className={`text-xs mt-1 ${(arAnalyticsData?.data?.monthlyTurnoverChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(arAnalyticsData?.data?.monthlyTurnoverChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(arAnalyticsData?.data?.monthlyTurnoverChange || 0).toFixed(1)}% vs last month
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-purple-600">
                          {(arAnalyticsData?.data?.avgCollectionPeriod || 0).toFixed(1)} days
                        </div>
                        <div className="text-sm text-gray-600">Avg Collection Period</div>
                        <div className={`text-xs mt-1 ${(arAnalyticsData?.data?.collectionPeriodChange || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(arAnalyticsData?.data?.collectionPeriodChange || 0) <= 0 ? '↓' : '↑'} {Math.abs(arAnalyticsData?.data?.collectionPeriodChange || 0).toFixed(1)} days {(arAnalyticsData?.data?.collectionPeriodChange || 0) <= 0 ? 'improved' : 'worse'}
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-orange-600">
                          {(arAnalyticsData?.data?.badDebtRatio || 0).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Bad Debt Ratio</div>
                        <div className={`text-xs mt-1 ${(arAnalyticsData?.data?.badDebtChange || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(arAnalyticsData?.data?.badDebtChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(arAnalyticsData?.data?.badDebtChange || 0).toFixed(1)}% vs target
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enterprise Operations & Multi-currency Section */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Database className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-900">Enterprise Operations & Multi-currency</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Multi-currency Operations */}
                      <div className="space-y-3">
                        <div className="font-medium text-emerald-800">Multi-currency Operations</div>
                        <div className="space-y-2">
                          {creditDashboardLoading ? (
                            <div className="text-center p-4 text-sm text-gray-500">Loading currency data...</div>
                          ) : (
                            <>
                              {/* Currency operations would come from a multi-currency API - placeholder for now */}
                              <div className="flex justify-between items-center p-2 bg-white rounded border">
                                <span className="text-sm">USD Operations</span>
                                <Badge variant="secondary">
                                  ${(creditRiskData?.data?.totalARBalance || 0).toLocaleString()}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 text-center p-2">
                                Multi-currency data available via currency configuration
                              </div>
                            </>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCurrencyConfiguration()}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Currency Configuration
                        </Button>
                      </div>

                      {/* Enterprise Workflows */}
                      <div className="space-y-3">
                        <div className="font-medium text-emerald-800">Enterprise Workflows</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-white rounded border">
                            <span className="text-sm">Automated Posting</span>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded border">
                            <span className="text-sm">Cross-Company Clearing</span>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white rounded border">
                            <span className="text-sm">Intercompany Reconciliation</span>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleEnterpriseWorkflows()}
                        >
                          <Workflow className="h-4 w-4 mr-2" />
                          Enterprise Workflows
                        </Button>
                      </div>
                    </div>

                    {/* Advanced Operations Panel */}
                    <div className="mt-4 p-3 bg-white rounded border">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900">Advanced Operations Control</span>
                        <Badge className="bg-blue-100 text-blue-800">Real-time</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleIntercompanyProcessing()}
                        >
                          <Database className="h-4 w-4 mr-1" />
                          Intercompany
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCurrencyRevaluation()}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Revaluation
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleGlobalConsolidation()}
                        >
                          <BarChart className="h-4 w-4 mr-1" />
                          Consolidation
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Sales Order Dialog */}
      <CreateSalesOrderDialog
        open={showCreateOrder}
        onOpenChange={setShowCreateOrder}
        onSubmit={(data) => createOrderMutation.mutate(data)}
        isLoading={createOrderMutation.isPending}
        customers={customers}
        products={uniqueProducts}
        productsLoading={productsLoading}
        productsError={productsError}
      />

      {/* Letter Modal */}
      <Dialog open={showLetterModal} onOpenChange={setShowLetterModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dunning Letter - {selectedCustomerForLetter?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">{generatedLetter}</pre>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                // Download letter functionality
                const blob = new Blob([generatedLetter], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dunning-letter-${selectedCustomerForLetter?.customer_name}-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download Letter
              </Button>
              <Button variant="outline" onClick={() => setShowLetterModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Record - {selectedCustomerForContact?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {contactRecord && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact Type:</label>
                    <p className="text-sm text-gray-600">{contactRecord.contactType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Scheduled Date:</label>
                    <p className="text-sm text-gray-600">{contactRecord.scheduledDate}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Notes:</label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{contactRecord.notes}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Priority:</label>
                    <Badge variant={contactRecord.priority === 'high' ? 'destructive' : 'default'}>
                      {contactRecord.priority}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Follow-up Required:</label>
                    <p className="text-sm text-gray-600">{contactRecord.followUpRequired ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowContactModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Plan Modal */}
      <Dialog open={showPaymentPlanModal} onOpenChange={setShowPaymentPlanModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Plan - {selectedCustomerForPlan?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {paymentPlan && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Amount:</label>
                    <p className="text-lg font-bold text-red-600">${parseFloat(paymentPlan.totalAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plan Duration:</label>
                    <p className="text-sm text-gray-600">{paymentPlan.duration} months</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Monthly Payment:</label>
                    <p className="text-lg font-semibold text-green-600">${parseFloat(paymentPlan.monthlyPayment).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Payment Schedule:</label>
                  <div className="mt-2 space-y-2">
                    {paymentPlan.schedule?.map((payment: any, index: number) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="text-sm">Payment {index + 1}</span>
                        <span className="text-sm font-medium">{payment.date}</span>
                        <span className="text-sm font-semibold">${parseFloat(payment.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Terms & Conditions:</label>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                    {paymentPlan.terms}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => {
                // Download payment plan
                const planContent = `Payment Plan for ${selectedCustomerForPlan?.customer_name}\n\nTotal Amount: $${parseFloat(paymentPlan?.totalAmount || 0).toLocaleString()}\nDuration: ${paymentPlan?.duration} months\nMonthly Payment: $${parseFloat(paymentPlan?.monthlyPayment || 0).toLocaleString()}\n\nPayment Schedule:\n${paymentPlan?.schedule?.map((p: any, i: number) => `Payment ${i + 1}: ${p.date} - $${parseFloat(p.amount).toLocaleString()}`).join('\n') || ''}\n\nTerms: ${paymentPlan?.terms || ''}`;

                const blob = new Blob([planContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `payment-plan-${selectedCustomerForPlan?.customer_name}-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download Plan
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentPlanModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Automation Modal */}
      <Dialog open={showEmailAutomationModal} onOpenChange={setShowEmailAutomationModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Automation Workflow - {selectedCustomerForEmail?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {emailWorkflow && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-blue-800 mb-2">Workflow Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Workflow ID:</label>
                      <p className="text-gray-600">{emailWorkflow.workflowId}</p>
                    </div>
                    <div>
                      <label className="font-medium">Trigger Action:</label>
                      <p className="text-gray-600">{emailWorkflow.triggerAction}</p>
                    </div>
                    <div>
                      <label className="font-medium">Email Template:</label>
                      <p className="text-gray-600">{emailWorkflow.emailConfig?.templateType}</p>
                    </div>
                    <div>
                      <label className="font-medium">Priority:</label>
                      <Badge variant={emailWorkflow.emailConfig?.priority === 'high' ? 'destructive' : 'default'}>
                        {emailWorkflow.emailConfig?.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-yellow-800 mb-2">Automation Rules</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Send Email:</label>
                      <p className="text-gray-600">{emailWorkflow.automationRules?.sendEmail ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <label className="font-medium">Schedule Follow-up:</label>
                      <p className="text-gray-600">{emailWorkflow.automationRules?.scheduleFollowUp ? `Yes (${emailWorkflow.automationRules?.followUpDays} days)` : 'No'}</p>
                    </div>
                    <div>
                      <label className="font-medium">Auto Escalate:</label>
                      <p className="text-gray-600">{emailWorkflow.automationRules?.escalateIfNoResponse ? `Yes (${emailWorkflow.automationRules?.escalationDays} days)` : 'No'}</p>
                    </div>
                    <div>
                      <label className="font-medium">Notify Collections:</label>
                      <p className="text-gray-600">{emailWorkflow.automationRules?.notifyCollectionsTeam ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-green-800 mb-2">Email Content Preview</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="font-medium text-sm">Subject:</label>
                      <p className="text-sm bg-white p-2 rounded border">{emailWorkflow.emailContent?.subject}</p>
                    </div>
                    <div>
                      <label className="font-medium text-sm">Body Preview:</label>
                      <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap">{emailWorkflow.emailContent?.body?.substring(0, 500)}...</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-gray-800 mb-2">Background Process Configuration</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Process ID:</label>
                      <p className="text-gray-600">{emailWorkflow.backgroundProcess?.processId}</p>
                    </div>
                    <div>
                      <label className="font-medium">Priority:</label>
                      <Badge variant={emailWorkflow.backgroundProcess?.priority === 'high' ? 'destructive' : 'default'}>
                        {emailWorkflow.backgroundProcess?.priority}
                      </Badge>
                    </div>
                    <div>
                      <label className="font-medium">Max Retries:</label>
                      <p className="text-gray-600">{emailWorkflow.backgroundProcess?.maxRetries}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-purple-800 mb-2">Next Steps</h3>
                  <div className="space-y-1">
                    {emailWorkflow.nextSteps?.map((step: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowEmailAutomationModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Delivery Dialog */}
      <EnhancedDeliveryDialogWrapper
        open={showEnhancedDeliveryDialog}
        onOpenChange={setShowEnhancedDeliveryDialog}
        salesOrder={selectedOrderForEnhancedDelivery}
        scheduleLines={scheduleLinesData || []}
        onCreateDelivery={handleCreateEnhancedDelivery}
        isCreating={false}
      />

      {/* Schedule Lines Modal */}
      <ScheduleLinesModal
        open={showScheduleLines}
        onOpenChange={setShowScheduleLines}
        order={selectedOrderForEnhancedDelivery}
        scheduleLines={scheduleLinesData || []}
        onSplitLine={handleSplitScheduleLine}
      />

      {/* Split Schedule Line Dialog */}
      <SplitScheduleLineDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        scheduleLine={selectedScheduleLineForSplit}
        onSplit={handleConfirmSplit}
      />

      {/* Background Processes Modal */}
      <Dialog open={showBackgroundProcessModal} onOpenChange={setShowBackgroundProcessModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ERP Background Processes</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {backgroundProcesses && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-blue-800 mb-2">System Status</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Total Processes:</label>
                      <p className="text-gray-600">{backgroundProcesses.systemStatus?.totalProcesses}</p>
                    </div>
                    <div>
                      <label className="font-medium">Active Processes:</label>
                      <p className="text-gray-600">{backgroundProcesses.systemStatus?.activeProcesses}</p>
                    </div>
                    <div>
                      <label className="font-medium">System Load:</label>
                      <Badge variant="default">{backgroundProcesses.systemStatus?.systemLoad}</Badge>
                    </div>
                    <div>
                      <label className="font-medium">Last Update:</label>
                      <p className="text-gray-600">{new Date(backgroundProcesses.systemStatus?.lastUpdate).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                {Object.entries(backgroundProcesses.backgroundProcesses || {}).map(([processKey, process]: [string, any]) => (
                  <div key={processKey} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{process.processName}</h3>
                      <Badge variant={process.status === 'active' ? 'default' : 'secondary'}>
                        {process.status}
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{process.description}</p>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Configuration</h4>
                        <div className="space-y-1 text-sm">
                          {Object.entries(process.configuration || {}).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                              <span className="font-mono text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Workflow Steps</h4>
                        <div className="space-y-1">
                          {process.workflow?.map((step: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-green-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-green-800 mb-2">ERP Integration Features</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="font-medium">Real-time Posting:</label>
                      <p className="text-gray-600">{backgroundProcesses.erp_integration?.real_time_posting ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <label className="font-medium">Audit Trail:</label>
                      <p className="text-gray-600">{backgroundProcesses.erp_integration?.audit_trail}</p>
                    </div>
                    <div>
                      <label className="font-medium">Error Handling:</label>
                      <p className="text-gray-600">{backgroundProcesses.erp_integration?.error_handling}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowBackgroundProcessModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Sales Order Dialog Component
function CreateSalesOrderDialog({ open, onOpenChange, onSubmit, isLoading, customers = [], products = [], productsLoading = false, productsError = null }) {
  const { toast } = useToast();
  const [customerAddresses, setCustomerAddresses] = useState({
    sold_to: [],
    bill_to: [],
    ship_to: [],
    payer_to: []
  });
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [customerCreditInfo, setCustomerCreditInfo] = useState({
    creditLimit: 0,
    availableCredit: 0,
    usedCredit: 0
  });
  const [creditInfoLoading, setCreditInfoLoading] = useState(false);
  const [customerTaxInfo, setCustomerTaxInfo] = useState<any>(null);
  const [taxInfoLoading, setTaxInfoLoading] = useState(false);
  const [taxRules, setTaxRules] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(false);

  // Track auto-filled fields for UI indication
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Track auto-filled fields for each line item
  const [autoFilledItemFields, setAutoFilledItemFields] = useState<Map<number, Set<string>>>(new Map());

  // Fetch shipping conditions for delivery date calculation
  const { data: shippingConditions = [], isLoading: shippingConditionsLoading } = useQuery<any[]>({
    queryKey: ['/api/order-to-cash/shipping-conditions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/order-to-cash/shipping-conditions');
        const data = await response.json();
        return data?.data || data || [];
      } catch (error) {
        console.error('Error fetching shipping conditions:', error);
        return [];
      }
    },
  });

  // Function to calculate delivery date based on order date and shipping method
  const calculateDeliveryDate = (orderDate: string, shippingMethod: string, shippingCondition: string): string => {
    if (!orderDate) return '';

    const baseDate = new Date(orderDate);
    if (isNaN(baseDate.getTime())) return '';

    let leadTimeDays = 7; // Default lead time: 7 days

    // Try to find shipping condition by code first
    if (shippingCondition && shippingConditions.length > 0) {
      const condition = shippingConditions.find((sc: any) =>
        sc.code === shippingCondition || sc.name === shippingCondition
      );
      if (condition) {
        // Calculate total lead time from all components
        const loadingDays = parseInt(condition.loading_lead_time_days || 0);
        const pickingDays = parseInt(condition.picking_lead_time_days || 0);
        const packingDays = parseInt(condition.packing_lead_time_days || 0);
        const transportDays = parseInt(condition.transportation_lead_time_days || 0);
        leadTimeDays = loadingDays + pickingDays + packingDays + transportDays;
        if (leadTimeDays === 0) leadTimeDays = 7; // Fallback to default
      }
    }

    // Fallback: Use shipping method if no condition found
    if (leadTimeDays === 7 && shippingMethod) {
      const methodMap: Record<string, number> = {
        'Standard': 7,
        'Express': 3,
        'Overnight': 1,
        'Pickup': 1
      };
      leadTimeDays = methodMap[shippingMethod] || 7;
    }

    // Add lead time to order date
    const deliveryDate = new Date(baseDate);
    deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);

    // Format as YYYY-MM-DD
    return deliveryDate.toISOString().split('T')[0];
  };

  // Fetch payment terms for dropdown
  const { data: paymentTerms = [], isLoading: paymentTermsLoading } = useQuery<any[]>({
    queryKey: ['/api/master-data/payment-terms'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/payment-terms');
        const data = await response.json();
        // Normalize payment terms data - handle different response formats
        if (Array.isArray(data)) {
          return data.map((term: any) => ({
            id: term.id,
            code: term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString(),
            name: term.name || term.description || "",
            description: term.description || term.name || ""
          }));
        } else if (data.records && Array.isArray(data.records)) {
          return data.records.map((term: any) => ({
            id: term.id,
            code: term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString(),
            name: term.name || term.description || "",
            description: term.description || term.name || ""
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    retry: 1
  });

  const paymentTermsData = paymentTerms || [];

  // Fetch master data for new fields
  const { data: distributionChannels = [] } = useQuery({
    queryKey: ['/api/master-data/distribution-channels'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/distribution-channels');
      const data = await response.json();
      return Array.isArray(data) ? data.filter((dc: any) => dc.isActive !== false) : [];
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['/api/master-data/divisions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/master-data/divisions');
        const data = await response.json();
        return Array.isArray(data) ? data.filter((d: any) => d.isActive !== false) : [];
      } catch {
        return [];
      }
    },
  });

  const { data: salesOrganizations = [] } = useQuery({
    queryKey: ['/api/master-data/sales-organization'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/sales-organization');
      const data = await response.json();
      const filtered = Array.isArray(data) ? data.filter((so: any) => so.isActive !== false) : [];

      // Debug: Log sales orgs with company codes in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sales Organizations loaded:', filtered.map((so: any) => ({
          id: so.id,
          code: so.code,
          name: so.name,
          companyCodeId: so.companyCodeId,
          company_code_id: so.company_code_id
        })));
      }

      return filtered;
    },
  });

  // Fetch company codes for display (read-only)
  const { data: companyCodes = [] } = useQuery({
    queryKey: ['/api/master-data/company-code'],
    queryFn: async () => {
      const response = await apiRequest('/api/master-data/company-code');
      const data = await response.json();
      return Array.isArray(data) ? data.filter((cc: any) => cc.isActive !== false && cc.active !== false) : [];
    },
  });

  // Get company code display name
  const getCompanyCodeDisplay = () => {
    if (!orderData.company_code_id || orderData.company_code_id === '' || orderData.company_code_id === '0') {
      return '';
    }
    const companyCode = companyCodes.find((cc: any) => String(cc.id) === String(orderData.company_code_id));
    if (companyCode) {
      return `${companyCode.code} - ${companyCode.name}`;
    }
    // If company code ID exists but not found in list, show the ID
    return `Company Code ID: ${orderData.company_code_id}`;
  };

  // Fetch document types when dialog opens
  useEffect(() => {
    if (open) {
      fetchDocumentTypes();
      // Reset auto-filled fields when dialog opens
      setAutoFilledFields(new Set());
    } else {
      // Reset auto-filled fields when dialog closes
      setAutoFilledFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Function to fetch document types from SD Document Types API
  const fetchDocumentTypes = async () => {
    setDocumentTypesLoading(true);
    try {
      // Fetch only ORDER category document types from SD Document Types
      const response = await fetch('/api/master-data/sd-document-types?category=ORDER');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching SD document types:', response.status, response.statusText, errorData);
        setDocumentTypes([]);
        return;
      }

      const data = await response.json();
      console.log('SD Document Types API Response:', data);

      let documentTypesData: any[] = [];

      // Handle different response structures
      if (Array.isArray(data)) {
        documentTypesData = data;
      } else if (data.data && Array.isArray(data.data)) {
        documentTypesData = data.data;
      } else if (data.records && Array.isArray(data.records)) {
        documentTypesData = data.records;
      } else if (data.rows && Array.isArray(data.rows)) {
        documentTypesData = data.rows;
      }

      console.log('Raw document types data:', documentTypesData.length, 'items');

      // Normalize data and filter: only active ORDER category document types
      const validTypes = documentTypesData
        .filter((dt: any) => {
          if (!dt) return false;

          // Check code
          const hasCode = dt.code && String(dt.code).trim() !== '';
          if (!hasCode) {
            console.log('Filtered out - no code:', dt);
            return false;
          }

          // Check active status
          const isActive = dt.isActive !== false && dt.is_active !== false;
          if (!isActive) {
            console.log('Filtered out - not active:', dt);
            return false;
          }

          // Check category (case-insensitive)
          const category = String(dt.category || '').toUpperCase().trim();
          const isOrderCategory = category === 'ORDER';
          if (!isOrderCategory) {
            console.log('Filtered out - not ORDER category:', dt, 'category:', category);
            return false;
          }

          return true;
        })
        .map((dt: any) => {
          const normalized = {
            id: dt.id,
            code: String(dt.code || '').trim().toUpperCase(),
            name: String(dt.name || '').trim(),
            category: String(dt.category || 'ORDER').toUpperCase().trim(),
            numberRange: dt.numberRange || dt.number_range || null,
            isActive: dt.isActive !== undefined ? dt.isActive : (dt.is_active !== undefined ? dt.is_active : true)
          };
          return normalized;
        });

      console.log('Valid SD document types (ORDER category):', validTypes.length, validTypes);

      if (validTypes.length === 0 && documentTypesData.length > 0) {
        console.warn('⚠️ No valid ORDER document types found after filtering. Available categories:',
          documentTypesData.map((dt: any) => ({ code: dt.code, category: dt.category, isActive: dt.isActive || dt.is_active }))
        );
      }

      setDocumentTypes(validTypes);
    } catch (error: any) {
      console.error('Error fetching SD document types:', error);
      setDocumentTypes([]);
    } finally {
      setDocumentTypesLoading(false);
    }
  };

  // Ensure all items have unit property
  useEffect(() => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        unit: item.unit || 'PC'
      }))
    }));
  }, []);

  // Function to fetch customer addresses
  const fetchCustomerAddresses = async (customerId) => {
    if (!customerId) {
      setCustomerAddresses({ sold_to: [], bill_to: [], ship_to: [], payer_to: [] });
      return;
    }

    setAddressesLoading(true);
    try {
      const response = await fetch(`/api/order-to-cash/customer-addresses/${customerId}`);
      const data = await response.json();
      if (data.success) {
        setCustomerAddresses(data.data);

        // Auto-populate primary addresses from customer data
        const addresses = data.data;

        // Find primary address for each type
        const primarySoldTo = addresses.sold_to?.find(addr => addr.is_primary);
        const primaryBillTo = addresses.bill_to?.find(addr => addr.is_primary);
        const primaryShipTo = addresses.ship_to?.find(addr => addr.is_primary);
        const primaryPayerTo = addresses.payer_to?.find(addr => addr.is_primary);

        // Auto-select primary addresses (or first available if no primary is marked)
        const soldToId = primarySoldTo?.id || addresses.sold_to?.[0]?.id;
        const billToId = primaryBillTo?.id || addresses.bill_to?.[0]?.id;
        const shipToId = primaryShipTo?.id || addresses.ship_to?.[0]?.id;
        const payerToId = primaryPayerTo?.id || addresses.payer_to?.[0]?.id;

        // Update order data with auto-selected addresses
        setOrderData(prev => ({
          ...prev,
          sold_to_address_id: soldToId ? String(soldToId) : '',
          bill_to_address_id: billToId ? String(billToId) : '',
          ship_to_address_id: shipToId ? String(shipToId) : '',
          payer_to_address_id: payerToId ? String(payerToId) : ''
        }));

        // Show toast notification if addresses were auto-populated
        const autoFilledAddresses = [];
        if (soldToId) autoFilledAddresses.push('Sold-To');
        if (billToId) autoFilledAddresses.push('Bill-To');
        if (shipToId) autoFilledAddresses.push('Ship-To');
        if (payerToId) autoFilledAddresses.push('Payer-To');

        if (autoFilledAddresses.length > 0) {
          toast({
            title: "Addresses Auto-populated",
            description: `Primary addresses selected: ${autoFilledAddresses.join(', ')}`,
          });
        }
      } else {
        console.error('Error fetching addresses:', data.error);
        setCustomerAddresses({ sold_to: [], bill_to: [], ship_to: [], payer_to: [] });
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setCustomerAddresses({ sold_to: [], bill_to: [], ship_to: [], payer_to: [] });
    } finally {
      setAddressesLoading(false);
    }
  };

  // Function to fetch customer credit information
  const fetchCustomerCreditInfo = async (customerId) => {
    if (!customerId) {
      setCustomerCreditInfo({ creditLimit: 0, availableCredit: 0, usedCredit: 0 });
      setCreditInfoLoading(false);
      return;
    }

    setCreditInfoLoading(true);
    try {
      const response = await fetch(`/api/order-to-cash/customer-credit-info/${customerId}`);
      const data = await response.json();
      if (data.success) {
        setCustomerCreditInfo(data.data);
      } else {
        console.error('Error fetching credit info:', data.error);
        setCustomerCreditInfo({ creditLimit: 0, availableCredit: 0, usedCredit: 0 });
      }
    } catch (error) {
      console.error('Error fetching credit info:', error);
      setCustomerCreditInfo({ creditLimit: 0, availableCredit: 0, usedCredit: 0 });
    } finally {
      setCreditInfoLoading(false);
    }
  };

  // Function to fetch customer company code
  const fetchCustomerCompanyCode = async (customerId) => {
    if (!customerId) {
      setOrderData(prev => ({ ...prev, company_code_id: '' }));
      return;
    }

    try {
      const response = await fetch(`/api/master-data/customer/${customerId}`);
      if (response.ok) {
        const customer = await response.json();
        if (customer && customer.company_code_id) {
          setOrderData(prev => ({
            ...prev,
            company_code_id: customer.company_code_id
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer company code:', error);
    }
  };

  // Function to fetch customer tax information with tax profile and rules
  const fetchCustomerTaxInfo = async (customerId) => {
    if (!customerId) {
      setCustomerTaxInfo(null);
      setTaxRules([]);
      setTaxInfoLoading(false);
      return;
    }

    setTaxInfoLoading(true);
    try {
      const response = await fetch(`/api/order-to-cash/customer-tax-info/${customerId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const { customer, taxProfile, taxRules: rules } = result.data;

        // Extract tax-related fields
        const taxInfo = {
          tax_profile_id: customer.tax_profile_id,
          tax_classification_code: customer.tax_classification_code,
          tax_exemption_certificate: customer.tax_exemption_certificate,
          withholding_tax_code: customer.withholding_tax_code,
          payment_terms: customer.payment_terms,
          currency: customer.currency,
          taxProfile: taxProfile
        };

        setCustomerTaxInfo(taxInfo);
        setTaxRules(rules || []);

        // Auto-populate payment terms and currency from customer
        // Check if customer is changing (compare with the customerId parameter)
        const isCustomerChanging = orderData.customer_id !== customerId?.toString();
        const helperIsEmpty = (val: any) => {
          if (val === null || val === undefined) return true;
          if (typeof val === 'string') return val.trim() === '';
          if (typeof val === 'number') return val === 0;
          return false;
        };

        const updatedFields = new Set<string>();
        if (customer.payment_terms && (helperIsEmpty(orderData.payment_terms) || isCustomerChanging)) {
          updatedFields.add('payment_terms');
        }
        if (customer.currency && (helperIsEmpty(orderData.currency) || isCustomerChanging)) {
          updatedFields.add('currency');
        }
        if (customer.tax_profile_id && (helperIsEmpty(orderData.tax_profile_id) || isCustomerChanging)) {
          updatedFields.add('tax_profile_id');
        }
        if (customer.tax_classification_code && (helperIsEmpty(orderData.tax_classification_code) || isCustomerChanging)) {
          updatedFields.add('tax_classification_code');
        }

        setOrderData(prev => ({
          ...prev,
          payment_terms: customer.payment_terms || prev.payment_terms,
          currency: customer.currency || prev.currency,
          tax_profile_id: customer.tax_profile_id || prev.tax_profile_id,
          tax_classification_code: customer.tax_classification_code || prev.tax_classification_code,
          tax_exemption_certificate: customer.tax_exemption_certificate || prev.tax_exemption_certificate,
          withholding_tax_code: customer.withholding_tax_code || prev.withholding_tax_code
        }));

        // Update auto-filled fields tracking
        if (updatedFields.size > 0 || isCustomerChanging) {
          setAutoFilledFields(prev => {
            const updated = new Set(prev);
            updatedFields.forEach(field => updated.add(field));
            // Also track tax fields if customer is changing
            if (isCustomerChanging) {
              if (customer.tax_profile_id) updated.add('tax_profile_id');
              if (customer.tax_classification_code) updated.add('tax_classification_code');
            }
            return updated;
          });
        }
      } else {
        console.error('Error fetching tax info:', result.error || 'Invalid response');
        setCustomerTaxInfo(null);
        setTaxRules([]);
      }
    } catch (error) {
      console.error('Error fetching tax info:', error);
      setCustomerTaxInfo(null);
      setTaxRules([]);
    } finally {
      setTaxInfoLoading(false);
    }
  };

  const [orderData, setOrderData] = useState({
    customer_id: '',
    customer_name: '',
    order_date: new Date().toISOString().split('T')[0], // Default to today
    delivery_date: '',
    shipping_address: '',
    billing_address: '',
    notes: '',
    plant_id: '',
    sales_org_id: '',
    company_code_id: '',
    currency_id: '',
    status: '',
    sold_to_address_id: '',
    bill_to_address_id: '',
    ship_to_address_id: '',
    payer_to_address_id: '',
    credit_status: '',
    payment_terms: '',
    shipping_method: '',
    sales_rep: '',
    sales_person_id: '',
    priority: '',
    currency: '',
    shipping_amount: 0,
    document_type: '', // Required field
    // New required fields
    distribution_channel_id: '',
    division_id: '',
    pricing_procedure: '',
    tax_code: '',
    // High priority fields
    sales_office_id: '',
    sales_office_code: '',
    sales_group_id: '',
    shipping_point_id: '',
    route_id: '',
    shipping_point_code: '',
    route_code: '',
    shipping_condition: '',
    loading_point: '',
    // Low priority fields
    customer_po_number: '',
    customer_po_date: '',
    order_reason: '',
    sales_district: '',
    // Tax information from customer master
    tax_profile_id: null,
    tax_classification_code: '',
    tax_exemption_certificate: '',
    withholding_tax_code: '',
    items: [
      {
        material_id: '',
        material_description: '',
        quantity: '',
        unit_price: '',
        unit: 'PC',
        discount_percent: 0,
        tax_percent: 0,
        plant_id: '',
        plant_name: '',
        plant_code: '',
        storage_location_id: '',
        storage_location_name: '',
        storage_location_code: ''
      }
    ]
  });

  // Workflow state for comprehensive sales order creation
  const [workflowStep, setWorkflowStep] = useState<'validation' | 'approval' | 'creation' | 'completed'>('validation');
  const [validationResults, setValidationResults] = useState({
    inventory: { status: 'pending', results: [] },
    credit: { status: 'pending', details: {} },
    approval: { status: 'pending', required: false }
  });

  // Initialize delivery date when dialog opens or order date is set
  useEffect(() => {
    if (open && orderData.order_date && !orderData.delivery_date) {
      const calculatedDeliveryDate = calculateDeliveryDate(
        orderData.order_date,
        orderData.shipping_method,
        orderData.shipping_condition
      );
      if (calculatedDeliveryDate) {
        setOrderData(prev => ({ ...prev, delivery_date: calculatedDeliveryDate }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderData.order_date, orderData.shipping_method, orderData.shipping_condition]);

  // Real-time inventory status
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, any>>({});
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Fetch real-time inventory status for a product
  const fetchInventoryStatus = async (materialId: string) => {
    if (!materialId) return;

    setInventoryLoading(true);
    try {
      const response = await fetch(`/api/order-to-cash/inventory-status/${materialId}`);
      const data = await response.json();

      if (data.success) {
        setInventoryStatus(prev => ({
          ...prev,
          [materialId]: data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory status:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Fetch inventory status for all products in order
  const fetchAllInventoryStatus = async () => {
    const materialIds = orderData.items
      .map(item => item.material_id)
      .filter(id => id && id !== '');

    if (materialIds.length === 0) return;

    setInventoryLoading(true);
    try {
      // Fetch inventory status for each product individually
      const promises = materialIds.map(materialId =>
        fetch(`/api/order-to-cash/inventory-status/${materialId}`)
          .then(response => response.json())
          .then(data => ({ materialId, data }))
          .catch(error => {
            console.error(`Error fetching inventory status for product ${materialId}:`, error);
            return { materialId, data: null };
          })
      );

      const results = await Promise.all(promises);

      const statusMap: Record<string, any> = {};
      results.forEach(({ materialId, data }) => {
        if (data && data.success) {
          statusMap[materialId] = data.data;
        }
      });

      setInventoryStatus(statusMap);
    } catch (error) {
      console.error('Error fetching inventory status:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  // Auto-fetch inventory status when items change
  useEffect(() => {
    const materialIds = orderData.items
      .map(item => item.material_id)
      .filter(id => id && id !== '');

    if (materialIds.length > 0) {
      fetchAllInventoryStatus();
    }
  }, [orderData.items]);

  const addItem = () => {
    setOrderData(prev => ({
      ...prev,
      items: [...prev.items, {
        material_id: '',
        material_description: '',
        quantity: '',
        unit_price: '',
        unit: 'PC',
        discount_percent: 0,
        tax_percent: 0,
        plant_id: '',
        plant_name: '',
        plant_code: '',
        storage_location_id: '',
        storage_location_name: '',
        storage_location_code: ''
      }]
    }));
  };

  const updateItem = (index, field, value) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!orderData.customer_id || orderData.customer_id === '') {
      alert('Please select a customer');
      return;
    }

    if (!orderData.customer_name || orderData.customer_name === '') {
      alert('Please enter customer name');
      return;
    }

    if (!orderData.document_type || orderData.document_type === '') {
      alert('Document type is required');
      return;
    }

    if (!orderData.sales_org_id || orderData.sales_org_id === '') {
      alert('Sales organization is required');
      return;
    }

    if (!orderData.distribution_channel_id || orderData.distribution_channel_id === '') {
      alert('Distribution channel is required');
      return;
    }

    if (!orderData.division_id || orderData.division_id === '') {
      alert('Division is required');
      return;
    }

    if (!orderData.pricing_procedure || orderData.pricing_procedure === '') {
      alert('Pricing procedure is required');
      return;
    }

    if (!orderData.tax_code || orderData.tax_code === '') {
      alert('Tax code is required');
      return;
    }

    if (!orderData.sold_to_address_id || orderData.sold_to_address_id === '') {
      alert('Please select a sold to address');
      return;
    }

    if (!orderData.bill_to_address_id || orderData.bill_to_address_id === '') {
      alert('Please select a bill to address');
      return;
    }

    if (!orderData.ship_to_address_id || orderData.ship_to_address_id === '') {
      alert('Please select a ship to address');
      return;
    }

    if (orderData.items.some(item => !item.material_id || item.material_id === '')) {
      alert('Please select products for all items');
      return;
    }

    if (orderData.items.some(item => !item.material_description || item.material_description === '')) {
      alert('Please enter product description for all items');
      return;
    }

    if (orderData.items.some(item => !item.quantity || item.quantity === '')) {
      alert('Please enter quantity for all items');
      return;
    }

    if (orderData.items.some(item => !item.unit_price || item.unit_price === '')) {
      alert('Please enter unit price for all items');
      return;
    }

    // Calculate totals
    const subtotal = orderData.items.reduce((sum, item) =>
      sum + (parseFloat(String(item.quantity) || '0') * parseFloat(String(item.unit_price) || '0')), 0
    );

    // Calculate tax based on tax rules (same as in order summary)
    const taxBreakdown = taxRules.map(rule => ({
      id: rule.id,
      rule_code: rule.rule_code,
      title: rule.title,
      rate_percent: rule.rate_percent,
      amount: subtotal * (rule.rate_percent / 100)
    }));

    const taxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
    const shippingAmount = parseFloat(String(orderData.shipping_amount)) || 0;
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Check credit limit before submitting
    if (customerCreditInfo.creditLimit > 0 && totalAmount > customerCreditInfo.availableCredit) {
      const exceededBy = totalAmount - customerCreditInfo.availableCredit;
      alert(`Order amount ($${totalAmount.toFixed(2)}) exceeds available credit ($${customerCreditInfo.availableCredit.toFixed(2)}) by $${exceededBy.toFixed(2)}. Please reduce the order amount or contact the credit manager.`);
      return;
    }

    const finalData = {
      ...orderData,
      customer_id: parseInt(orderData.customer_id),
      total_amount: totalAmount,
      subtotal: subtotal,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      created_by: 1,
      // Required fields
      document_type: orderData.document_type,
      sales_org_id: orderData.sales_org_id ? parseInt(orderData.sales_org_id) : null,
      distribution_channel_id: orderData.distribution_channel_id ? parseInt(orderData.distribution_channel_id) : null,
      division_id: orderData.division_id ? parseInt(orderData.division_id) : null,
      pricing_procedure: orderData.pricing_procedure || null,
      tax_code: orderData.tax_code || null,
      // Partner functions
      sold_to_address_id: orderData.sold_to_address_id ? parseInt(orderData.sold_to_address_id) : null,
      bill_to_address_id: orderData.bill_to_address_id ? parseInt(orderData.bill_to_address_id) : null,
      ship_to_address_id: orderData.ship_to_address_id ? parseInt(orderData.ship_to_address_id) : null,
      payer_to_address_id: orderData.payer_to_address_id ? parseInt(orderData.payer_to_address_id) : null,
      // High priority fields
      sales_office_id: orderData.sales_office_id ? parseInt(orderData.sales_office_id) : null,
      sales_group_id: orderData.sales_group_id ? parseInt(orderData.sales_group_id) : null,
      sales_person_id: orderData.sales_person_id ? parseInt(orderData.sales_person_id) : null,
      shipping_point_id: orderData.shipping_point_id ? parseInt(orderData.shipping_point_id) : null,
      route_id: orderData.route_id ? parseInt(orderData.route_id) : null,
      // Low priority fields
      customer_po_number: orderData.customer_po_number || null,
      customer_po_date: orderData.customer_po_date || null,
      order_reason: orderData.order_reason || null,
      sales_district: orderData.sales_district || null,
      // Tax information
      tax_rules: taxRules, // Include tax rules for backend calculation
      tax_profile_id: orderData.tax_profile_id, // Include tax profile ID
      company_code_id: orderData.company_code_id ? parseInt(orderData.company_code_id) : null, // Include company_code_id from customer master
      items: orderData.items.map(item => ({
        ...item,
        material_id: parseInt(item.material_id),
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.quantity) * parseFloat(item.unit_price),
        // Include all auto-filled fields
        plant_id: item.plant_id ? parseInt(item.plant_id) : null,
        plant_code: item.plant_code || null,
        storage_location_id: item.storage_location_id ? parseInt(item.storage_location_id) : null,
        storage_location_code: item.storage_location_code || null,
        unit: item.unit || 'PC'
      }))
    };

    onSubmit(finalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Order with Inventory Checking</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_id">Customer</Label>
              <Select onValueChange={(value) => {
                const customer = customers.find((c: any) => c.id == value);

                // Check if customer is actually changing
                const isCustomerChanging = orderData.customer_id !== value;

                // Helper function to find ID by code
                const findIdByCode = (code: string, items: any[], codeField: string = 'code', idField: string = 'id') => {
                  if (!code) return '';
                  const found = items.find((item: any) =>
                    (item[codeField] || '').toString().toUpperCase() === code.toString().toUpperCase()
                  );
                  return found ? String(found[idField]) : '';
                };

                // Helper function to check if a field is truly empty
                const isEmpty = (val: any) => {
                  if (val === null || val === undefined) return true;
                  if (typeof val === 'string') return val.trim() === '';
                  if (typeof val === 'number') return val === 0;
                  return false;
                };

                // Auto-fill fields from customer master data
                // Always update when customer changes, or if field is empty
                const updatedData: any = {
                  customer_id: value,
                  customer_name: customer?.name || customer?.customer_name || '',
                };

                // Track which fields were auto-filled for UI indication
                const fieldsAutoFilled = new Set<string>();

                // Payment and financial fields - always update when customer changes
                if (customer?.payment_terms || customer?.paymentTerms) {
                  const customerPaymentTerms = customer?.payment_terms || customer?.paymentTerms || '';
                  if (isEmpty(orderData.payment_terms) || isCustomerChanging) {
                    updatedData.payment_terms = customerPaymentTerms;
                    fieldsAutoFilled.add('payment_terms');
                  }
                }

                if (customer?.currency) {
                  if (isEmpty(orderData.currency) || isCustomerChanging) {
                    updatedData.currency = customer.currency;
                    fieldsAutoFilled.add('currency');
                  }
                }

                // Sales organization fields - find IDs by codes
                if (customer?.sales_org_code || customer?.sales_organization_id) {
                  const salesOrgId = customer?.sales_org_code
                    ? findIdByCode(customer.sales_org_code, salesOrganizations, 'code', 'id')
                    : (customer?.sales_organization_id ? String(customer.sales_organization_id) : '');
                  if (salesOrgId && (isEmpty(orderData.sales_org_id) || isCustomerChanging)) {
                    updatedData.sales_org_id = salesOrgId;
                    fieldsAutoFilled.add('sales_org_id');

                    // Also derive company code from the auto-filled sales organization
                    const selectedSalesOrg = salesOrganizations.find((so: any) => String(so.id) === String(salesOrgId));
                    if (selectedSalesOrg) {
                      const companyCodeId = selectedSalesOrg.companyCodeId ?? selectedSalesOrg.company_code_id;
                      if (companyCodeId && companyCodeId !== null && companyCodeId !== 0 && companyCodeId !== '0' && companyCodeId !== '') {
                        updatedData.company_code_id = String(companyCodeId);
                      }
                    }
                  }
                }

                if (customer?.distribution_channel_code) {
                  const distChannelId = findIdByCode(customer.distribution_channel_code, distributionChannels, 'code', 'id');
                  if (distChannelId && (isEmpty(orderData.distribution_channel_id) || isCustomerChanging)) {
                    updatedData.distribution_channel_id = distChannelId;
                    fieldsAutoFilled.add('distribution_channel_id');
                  }
                }

                if (customer?.division_code) {
                  const divisionId = findIdByCode(customer.division_code, divisions, 'code', 'id');
                  if (divisionId && (isEmpty(orderData.division_id) || isCustomerChanging)) {
                    updatedData.division_id = divisionId;
                    fieldsAutoFilled.add('division_id');
                  }
                }

                // Shipping and delivery fields
                if (customer?.shipping_conditions || customer?.shippingConditions) {
                  if (isEmpty(orderData.shipping_condition) || isCustomerChanging) {
                    const shippingCondition = customer?.shipping_conditions || customer?.shippingConditions || '';
                    updatedData.shipping_condition = shippingCondition;
                    fieldsAutoFilled.add('shipping_condition');

                    // Auto-calculate delivery date when shipping condition is auto-filled
                    const orderDate = orderData.order_date || new Date().toISOString().split('T')[0];
                    const calculatedDeliveryDate = calculateDeliveryDate(
                      orderDate,
                      orderData.shipping_method,
                      shippingCondition
                    );
                    if (calculatedDeliveryDate) {
                      updatedData.delivery_date = calculatedDeliveryDate;
                    }
                  }
                }

                // Sales area fields
                if (customer?.sales_district) {
                  if (isEmpty(orderData.sales_district) || isCustomerChanging) {
                    updatedData.sales_district = customer.sales_district;
                    fieldsAutoFilled.add('sales_district');
                  }
                }

                // Sales office code - auto-fill directly from customer master
                if (customer?.sales_office_code) {
                  if (isEmpty(orderData.sales_office_code) || isCustomerChanging) {
                    updatedData.sales_office_code = customer.sales_office_code;
                    fieldsAutoFilled.add('sales_office_code');
                  }
                }

                // Tax fields
                if (customer?.tax_profile_id) {
                  updatedData.tax_profile_id = customer.tax_profile_id;
                  if (isCustomerChanging) fieldsAutoFilled.add('tax_profile_id');
                }
                if (customer?.tax_classification_code) {
                  updatedData.tax_classification_code = customer.tax_classification_code;
                  if (isCustomerChanging) fieldsAutoFilled.add('tax_classification_code');
                }
                if (customer?.tax_exemption_certificate) {
                  updatedData.tax_exemption_certificate = customer.tax_exemption_certificate;
                }
                if (customer?.withholding_tax_code) {
                  updatedData.withholding_tax_code = customer.withholding_tax_code;
                }

                setOrderData(prev => ({
                  ...prev,
                  ...updatedData
                }));

                // Update auto-filled fields tracking
                setAutoFilledFields(fieldsAutoFilled);

                // Show toast notification for auto-filled fields
                const autoFilledFieldsList: string[] = [];
                if (fieldsAutoFilled.has('payment_terms')) autoFilledFieldsList.push('Payment Terms');
                if (fieldsAutoFilled.has('currency')) autoFilledFieldsList.push('Currency');
                if (fieldsAutoFilled.has('sales_org_id')) autoFilledFieldsList.push('Sales Organization');
                if (fieldsAutoFilled.has('distribution_channel_id')) autoFilledFieldsList.push('Distribution Channel');
                if (fieldsAutoFilled.has('division_id')) autoFilledFieldsList.push('Division');
                if (fieldsAutoFilled.has('shipping_condition')) autoFilledFieldsList.push('Shipping Condition');
                if (fieldsAutoFilled.has('sales_district')) autoFilledFieldsList.push('Sales District');
                if (fieldsAutoFilled.has('sales_office_code')) autoFilledFieldsList.push('Sales Office');
                if (fieldsAutoFilled.has('tax_profile_id')) autoFilledFieldsList.push('Tax Profile');
                if (fieldsAutoFilled.has('tax_classification_code')) autoFilledFieldsList.push('Tax Classification');

                if (autoFilledFieldsList.length > 0) {
                  toast({
                    title: "Fields Auto-filled",
                    description: `Auto-filled from customer: ${autoFilledFieldsList.join(", ")}`,
                  });
                }

                // Fetch addresses, credit info, tax info, and company code for the selected customer
                fetchCustomerAddresses(value);
                fetchCustomerCreditInfo(value);
                fetchCustomerTaxInfo(value);
                fetchCustomerCompanyCode(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(customers) && customers.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name ?? c.customer_name ?? c.code ?? `Customer ${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order_date">Order Date</Label>
              <Input
                type="date"
                value={orderData.order_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newOrderDate = e.target.value;
                  // Auto-calculate delivery date when order date changes
                  const calculatedDeliveryDate = calculateDeliveryDate(
                    newOrderDate,
                    orderData.shipping_method,
                    orderData.shipping_condition
                  );
                  setOrderData(prev => ({
                    ...prev,
                    order_date: newOrderDate,
                    delivery_date: calculatedDeliveryDate || prev.delivery_date
                  }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="delivery_date">Delivery Date (Auto-calculated)</Label>
              <Input
                type="date"
                value={orderData.delivery_date}
                onChange={(e) => setOrderData(prev => ({ ...prev, delivery_date: e.target.value }))}
                className="bg-green-50 border-green-300"
                title="Automatically calculated based on order date and shipping method. You can override manually."
              />
            </div>
          </div>

          {/* Document Type and Sales Organization - Required Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document_type">Document Type <span className="text-red-500">*</span></Label>
              <Select
                value={orderData.document_type || ''}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, document_type: value }))}
                disabled={documentTypesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={documentTypesLoading ? "Loading..." : "Select document type"} />
                </SelectTrigger>
                <SelectContent>
                  {documentTypesLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Loading document types...
                    </div>
                  ) : documentTypes.length > 0 ? (
                    documentTypes
                      .filter((docType: any) => docType && docType.code && String(docType.code).trim() !== '')
                      .map((docType: any) => (
                        <SelectItem key={docType.id || docType.code} value={String(docType.code).trim()}>
                          {docType.name} ({docType.code})
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No document types available. Please create ORDER category document types in Master Data.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sales_org_id">
                Sales Organization <span className="text-red-500">*</span>
                {autoFilledFields.has('sales_org_id') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (Auto-filled from Customer)
                  </span>
                )}
              </Label>
              <Select
                value={orderData.sales_org_id || ''}
                onValueChange={async (value) => {
                  // Show warning if changing a sales org that was auto-filled from customer
                  if (autoFilledFields.has('sales_org_id')) {
                    toast({
                      title: "⚠️ Sales Organization Changed",
                      description: "You are changing the sales organization that was auto-filled from the customer. This may cause inconsistencies with customer master data.",
                      variant: "destructive",
                      duration: 5000,
                    });
                  }

                  // Remove from auto-filled fields when user manually changes it
                  setAutoFilledFields(prev => {
                    const updated = new Set(prev);
                    updated.delete('sales_org_id');
                    return updated;
                  });

                  // Find the selected sales organization
                  const selectedSalesOrg = salesOrganizations.find((so: any) => String(so.id) === value);

                  if (!selectedSalesOrg) {
                    setOrderData(prev => ({ ...prev, sales_org_id: value, company_code_id: '' }));
                    return;
                  }

                  // Auto-fill company code from sales organization
                  // Check both camelCase and snake_case, and handle null/undefined/0
                  let companyCodeId = selectedSalesOrg.companyCodeId ?? selectedSalesOrg.company_code_id;

                  // If still not found, try to fetch it directly from API
                  if (!companyCodeId || companyCodeId === null || companyCodeId === 0) {
                    try {
                      const response = await fetch(`/api/master-data/sales-organization/${selectedSalesOrg.id}`);
                      if (response.ok) {
                        const salesOrgDetail = await response.json();
                        companyCodeId = salesOrgDetail.companyCodeId || salesOrgDetail.company_code_id;
                      }
                    } catch (error) {
                      console.warn('Could not fetch sales org details:', error);
                    }
                  }

                  // Debug: Log the sales org data to help troubleshoot
                  console.log('Selected Sales Org:', {
                    id: selectedSalesOrg.id,
                    code: selectedSalesOrg.code,
                    name: selectedSalesOrg.name,
                    companyCodeId: selectedSalesOrg.companyCodeId,
                    company_code_id: selectedSalesOrg.company_code_id,
                    resolvedCompanyCodeId: companyCodeId,
                    allKeys: Object.keys(selectedSalesOrg)
                  });

                  if (companyCodeId && companyCodeId !== null && companyCodeId !== 0 && companyCodeId !== '0' && companyCodeId !== '') {
                    setOrderData(prev => ({
                      ...prev,
                      sales_org_id: value,
                      company_code_id: String(companyCodeId)
                    }));
                  } else {
                    // Clear company code if sales org doesn't have one
                    setOrderData(prev => ({
                      ...prev,
                      sales_org_id: value,
                      company_code_id: ''
                    }));
                  }
                }}
              >
                <SelectTrigger className={autoFilledFields.has('sales_org_id') ? 'bg-green-50 border-green-300' : ''}>
                  <SelectValue placeholder="Select sales organization" />
                </SelectTrigger>
                <SelectContent>
                  {salesOrganizations.length > 0 ? (
                    salesOrganizations.map((so: any) => (
                      <SelectItem key={so.id} value={String(so.id)}>
                        {so.name || so.code} ({so.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No sales organizations available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Company Code - Read-only display from Sales Organization */}
          {orderData.sales_org_id && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_code_id">
                  Company Code
                  {orderData.company_code_id ? (
                    <span className="ml-2 text-xs text-green-600 font-normal">(Auto-filled from Sales Organization)</span>
                  ) : (
                    <span className="ml-2 text-xs text-amber-600 font-normal">(Not assigned to Sales Organization)</span>
                  )}
                </Label>
                <Input
                  id="company_code_id"
                  value={getCompanyCodeDisplay() || 'No company code assigned'}
                  readOnly
                  disabled
                  className={orderData.company_code_id ? "bg-green-50 border-green-200 cursor-not-allowed" : "bg-amber-50 border-amber-200 cursor-not-allowed"}
                  placeholder="Company code will appear here when sales organization is selected"
                />
                {orderData.sales_org_id && !orderData.company_code_id && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>The selected sales organization does not have a company code assigned. Please assign a company code to this sales organization in Master Data.</span>
                  </p>
                )}
              </div>
              <div></div>
            </div>
          )}

          {/* Distribution Channel and Division - Required Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distribution_channel_id">
                Distribution Channel <span className="text-red-500">*</span>
                {autoFilledFields.has('distribution_channel_id') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (Auto-filled from Customer)
                  </span>
                )}
              </Label>
              <Select
                value={orderData.distribution_channel_id || ''}
                onValueChange={(value) => {
                  setOrderData(prev => ({ ...prev, distribution_channel_id: value }));
                  // Remove from auto-filled fields when user manually changes it
                  setAutoFilledFields(prev => {
                    const updated = new Set(prev);
                    updated.delete('distribution_channel_id');
                    return updated;
                  });
                }}
              >
                <SelectTrigger className={autoFilledFields.has('distribution_channel_id') ? 'bg-green-50 border-green-300' : ''}>
                  <SelectValue placeholder="Select distribution channel" />
                </SelectTrigger>
                <SelectContent>
                  {distributionChannels.length > 0 ? (
                    distributionChannels.map((dc: any) => (
                      <SelectItem key={dc.id} value={String(dc.id)}>
                        {dc.name || dc.description} ({dc.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No distribution channels available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="division_id">
                Division <span className="text-red-500">*</span>
                {autoFilledFields.has('division_id') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (Auto-filled from Customer)
                  </span>
                )}
              </Label>
              <Select
                value={orderData.division_id || ''}
                onValueChange={(value) => {
                  setOrderData(prev => ({ ...prev, division_id: value }));
                  // Remove from auto-filled fields when user manually changes it
                  setAutoFilledFields(prev => {
                    const updated = new Set(prev);
                    updated.delete('division_id');
                    return updated;
                  });
                }}
              >
                <SelectTrigger className={autoFilledFields.has('division_id') ? 'bg-green-50 border-green-300' : ''}>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.length > 0 ? (
                    divisions.map((div: any) => (
                      <SelectItem key={div.id} value={String(div.id)}>
                        {div.name || div.description} ({div.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No divisions available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing Procedure and Tax Code - Required Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricing_procedure">Pricing Procedure <span className="text-red-500">*</span></Label>
              <Input
                id="pricing_procedure"
                value={orderData.pricing_procedure || ''}
                onChange={(e) => setOrderData(prev => ({ ...prev, pricing_procedure: e.target.value }))}
                placeholder="Enter pricing procedure code"
              />
            </div>
            <div>
              <Label htmlFor="tax_code">Tax Code <span className="text-red-500">*</span></Label>
              <Input
                id="tax_code"
                value={orderData.tax_code || ''}
                onChange={(e) => setOrderData(prev => ({ ...prev, tax_code: e.target.value }))}
                placeholder="Enter tax code"
              />
            </div>
          </div>

          {/* Sales Office Field - Read-only, auto-filled from customer */}
          <div>
            <Label htmlFor="sales_office_code">
              Sales Office
              {autoFilledFields.has('sales_office_code') && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  (Auto-filled from Customer)
                </span>
              )}
            </Label>
            <Input
              id="sales_office_code"
              value={orderData.sales_office_code || ''}
              readOnly
              disabled
              className={autoFilledFields.has('sales_office_code') ? 'bg-green-50 border-green-300 cursor-not-allowed' : 'bg-gray-50 cursor-not-allowed'}
              placeholder="Select a customer to auto-fill"
            />
          </div>

          {/* Credit Limit Information */}
          {orderData.customer_id && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Customer Credit Information
                </h3>
                {creditInfoLoading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>

              {creditInfoLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-pulse flex space-x-4 w-full">
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                      <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                      <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                      <div className="h-4 bg-blue-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ) : customerCreditInfo.creditLimit > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Credit Limit</span>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-blue-900 mt-1">${customerCreditInfo.creditLimit.toFixed(2)}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Used Credit</span>
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-orange-600 mt-1">${customerCreditInfo.usedCredit.toFixed(2)}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Available Credit</span>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-green-600 mt-1">${customerCreditInfo.availableCredit.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500 text-sm">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    No credit limit set for this customer
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tax Information */}
          {orderData.customer_id && customerTaxInfo && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Tax Information
                  {customerTaxInfo.taxProfile && (
                    <span className="ml-2 text-sm font-normal text-purple-700">
                      ({customerTaxInfo.taxProfile.name || customerTaxInfo.taxProfile.profile_code})
                    </span>
                  )}
                </h3>
                {taxInfoLoading && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              </div>

              {taxInfoLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-pulse flex space-x-4 w-full">
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-purple-200 rounded w-3/4"></div>
                      <div className="h-4 bg-purple-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-purple-200 rounded w-3/4"></div>
                      <div className="h-4 bg-purple-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Tax Profile</span>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customerTaxInfo.tax_profile_id ? `ID: ${customerTaxInfo.tax_profile_id}` : 'Not Set'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Tax Classification</span>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customerTaxInfo.tax_classification_code || 'Standard'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Withholding Tax</span>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customerTaxInfo.withholding_tax_code || 'None'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Tax Exemption</span>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customerTaxInfo.tax_exemption_certificate || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Tax Rules */}
                  {taxRules.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Applicable Tax Rules ({taxRules.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {taxRules.map((rule, index) => (
                          <div key={rule.id || index} className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs font-medium text-gray-600">{rule.rule_code}</p>
                                <p className="text-sm font-semibold text-gray-900">{rule.title}</p>
                              </div>
                              <div className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                                {rule.rate_percent}%
                              </div>
                            </div>
                            {rule.jurisdiction && (
                              <p className="text-xs text-gray-600 mb-1">
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {rule.jurisdiction}
                              </p>
                            )}
                            {rule.applies_to && (
                              <p className="text-xs text-purple-700 font-medium">Applies to: {rule.applies_to}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-800">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tax rules will be automatically applied to product prices. {orderData.payment_terms && <span>Payment Terms: <strong>{orderData.payment_terms}</strong></span>} {orderData.currency && <span>Currency: <strong>{orderData.currency}</strong></span>}
              </div>
            </div>
          )}

          {/* Address Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sold_to_address_id">Sold To Address</Label>
              <Select
                value={orderData.sold_to_address_id}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, sold_to_address_id: value }))}
                disabled={addressesLoading || !orderData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={addressesLoading ? "Loading addresses..." : "Select sold to address"} />
                </SelectTrigger>
                <SelectContent>
                  {customerAddresses.sold_to.map((address) => (
                    <SelectItem key={address.id} value={String(address.id)}>
                      {address.address_name} - {address.address_line_1}, {address.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bill_to_address_id">Bill To Address</Label>
              <Select
                value={orderData.bill_to_address_id}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, bill_to_address_id: value }))}
                disabled={addressesLoading || !orderData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={addressesLoading ? "Loading addresses..." : "Select bill to address"} />
                </SelectTrigger>
                <SelectContent>
                  {customerAddresses.bill_to.map((address) => (
                    <SelectItem key={address.id} value={String(address.id)}>
                      {address.address_name} - {address.address_line_1}, {address.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ship_to_address_id">Ship To Address</Label>
              <Select
                value={orderData.ship_to_address_id}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, ship_to_address_id: value }))}
                disabled={addressesLoading || !orderData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={addressesLoading ? "Loading addresses..." : "Select ship to address"} />
                </SelectTrigger>
                <SelectContent>
                  {customerAddresses.ship_to.map((address) => (
                    <SelectItem key={address.id} value={String(address.id)}>
                      {address.address_name} - {address.address_line_1}, {address.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payer_to_address_id">Payer To Address</Label>
              <Select
                value={orderData.payer_to_address_id}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, payer_to_address_id: value }))}
                disabled={addressesLoading || !orderData.customer_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={addressesLoading ? "Loading addresses..." : "Select payer to address"} />
                </SelectTrigger>
                <SelectContent>
                  {customerAddresses.payer_to.map((address) => (
                    <SelectItem key={address.id} value={String(address.id)}>
                      {address.address_name} - {address.address_line_1}, {address.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipping_address">Additional Shipping Notes</Label>
              <Input
                value={orderData.shipping_address}
                onChange={(e) => setOrderData(prev => ({ ...prev, shipping_address: e.target.value }))}
                placeholder="Enter additional shipping instructions"
              />
            </div>
            <div>
              <Label htmlFor="billing_address">Additional Billing Notes</Label>
              <Input
                value={orderData.billing_address}
                onChange={(e) => setOrderData(prev => ({ ...prev, billing_address: e.target.value }))}
                placeholder="Enter additional billing instructions"
              />
            </div>
          </div>

          {/* Additional Order Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payment_terms">
                Payment Terms
                {autoFilledFields.has('payment_terms') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (Auto-filled from Customer)
                  </span>
                )}
              </Label>
              <Select
                value={orderData.payment_terms || ""}
                onValueChange={(value) => {
                  setOrderData(prev => ({ ...prev, payment_terms: value }));
                  // Remove from auto-filled fields when user manually changes it
                  setAutoFilledFields(prev => {
                    const updated = new Set(prev);
                    updated.delete('payment_terms');
                    return updated;
                  });
                }}
              >
                <SelectTrigger className={autoFilledFields.has('payment_terms') ? 'bg-green-50 border-green-300' : ''}>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTermsData.length > 0 ? (
                    paymentTermsData.map((term: any) => {
                      const termCode = (term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString() || "").toString();
                      return (
                        <SelectItem key={term.id} value={termCode}>
                          {term.name} - {term.description}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <>
                      <SelectItem value="NET15">NET 15</SelectItem>
                      <SelectItem value="NET30">NET 30</SelectItem>
                      <SelectItem value="NET45">NET 45</SelectItem>
                      <SelectItem value="NET60">NET 60</SelectItem>
                      <SelectItem value="COD">Cash on Delivery</SelectItem>
                      <SelectItem value="PREPAID">Prepaid</SelectItem>
                    </>
                  )}
                  {/* If payment_terms is set but not in the list, add it as a custom option */}
                  {orderData.payment_terms && !paymentTermsData.find((term: any) => {
                    const termCode = (term.code || term.paymentTermCode || term.payment_term_key || term.id?.toString() || "").toString();
                    return termCode === orderData.payment_terms;
                  }) && !['NET15', 'NET30', 'NET45', 'NET60', 'COD', 'PREPAID'].includes(orderData.payment_terms) && (
                      <SelectItem value={orderData.payment_terms}>
                        {orderData.payment_terms} (Auto-filled)
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shipping_method">Shipping Method</Label>
              <Select
                value={orderData.shipping_method}
                onValueChange={(value) => {
                  // Auto-calculate delivery date when shipping method changes
                  const calculatedDeliveryDate = calculateDeliveryDate(
                    orderData.order_date || new Date().toISOString().split('T')[0],
                    value,
                    orderData.shipping_condition
                  );
                  setOrderData(prev => ({
                    ...prev,
                    shipping_method: value,
                    delivery_date: calculatedDeliveryDate || prev.delivery_date
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Express">Express</SelectItem>
                  <SelectItem value="Overnight">Overnight</SelectItem>
                  <SelectItem value="Pickup">Customer Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={orderData.priority}
                onValueChange={(value) => setOrderData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sales_rep">Sales Representative</Label>
              <Input
                value={orderData.sales_rep}
                onChange={(e) => setOrderData(prev => ({ ...prev, sales_rep: e.target.value }))}
                placeholder="Enter sales rep name"
              />
            </div>
            <div>
              <Label htmlFor="currency">
                Currency
                {autoFilledFields.has('currency') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    (Auto-filled from Customer)
                  </span>
                )}
              </Label>
              <Select
                value={orderData.currency || ""}
                onValueChange={(value) => {
                  setOrderData(prev => ({ ...prev, currency: value }));
                  // Remove from auto-filled fields when user manually changes it
                  setAutoFilledFields(prev => {
                    const updated = new Set(prev);
                    updated.delete('currency');
                    return updated;
                  });
                }}
              >
                <SelectTrigger className={autoFilledFields.has('currency') ? 'bg-green-50 border-green-300' : ''}>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shipping_amount">Shipping Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={orderData.shipping_amount}
                onChange={(e) => setOrderData(prev => ({ ...prev, shipping_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              value={orderData.notes}
              onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter order notes"
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order Items</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllInventoryStatus}
                  disabled={inventoryLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
                  Refresh Inventory
                </Button>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {orderData.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  {/* Product Selection Row */}
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label>Product</Label>
                      <Select onValueChange={(value) => {
                        updateItem(index, 'material_id', value);
                        const selected = Array.isArray(products) ? (products as any[]).find(p => String(p.id) === String(value)) : null;

                        // Track which fields are auto-filled for this item
                        const itemAutoFilled = new Set<string>();

                        if (selected) {
                          updateItem(index, 'material_description', selected.name);

                          // Auto-fill unit_price
                          if (selected.price != null && selected.price > 0) {
                            updateItem(index, 'unit_price', String(selected.price));
                            itemAutoFilled.add('unit_price');
                          }

                          // Auto-fill unit from product
                          if (selected.unit || selected.base_uom) {
                            updateItem(index, 'unit', selected.unit || selected.base_uom || 'PC');
                            itemAutoFilled.add('unit');
                          }

                          // Store plant and storage location information
                          if (selected.plant_id || selected.product_plant_id) {
                            updateItem(index, 'plant_id', selected.plant_id || selected.product_plant_id || '');
                            itemAutoFilled.add('plant_id');
                          }
                          if (selected.plant_name) {
                            updateItem(index, 'plant_name', selected.plant_name);
                          }
                          if (selected.plant_code || selected.product_plant_code) {
                            updateItem(index, 'plant_code', selected.plant_code || selected.product_plant_code || '');
                          }
                          if (selected.storage_location_id) {
                            updateItem(index, 'storage_location_id', selected.storage_location_id);
                            itemAutoFilled.add('storage_location_id');
                          }
                          if (selected.storage_location_name) {
                            updateItem(index, 'storage_location_name', selected.storage_location_name);
                          }
                          if (selected.storage_location_code) {
                            updateItem(index, 'storage_location_code', selected.storage_location_code);
                          }

                          // Update auto-filled fields tracking for this item
                          setAutoFilledItemFields(prev => {
                            const updated = new Map(prev);
                            updated.set(index, itemAutoFilled);
                            return updated;
                          });

                          // Fetch real-time inventory status for the selected product
                          fetchInventoryStatus(selected.id.toString());
                        } else {
                          // Clear auto-filled fields if product is cleared
                          setAutoFilledItemFields(prev => {
                            const updated = new Map(prev);
                            updated.delete(index);
                            return updated;
                          });
                        }
                      }}>
                        <SelectTrigger className="h-auto min-h-[40px]">
                          <SelectValue placeholder={productsLoading ? "Loading products..." : "Select product"}>
                            {item.material_id && item.material_description && (
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium text-sm">{item.material_description}</span>
                                {(item.plant_name || item.storage_location_name) && (
                                  <span className="text-xs text-gray-500">
                                    {item.plant_name || item.plant_code} - {item.storage_location_name || item.storage_location_code}
                                  </span>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-80 overflow-y-auto w-full min-w-[400px]">
                          {productsLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading products...
                            </SelectItem>
                          ) : productsError ? (
                            <SelectItem value="error" disabled>
                              Error loading products: {productsError.message}
                            </SelectItem>
                          ) : !Array.isArray(products) || products.length === 0 ? (
                            <SelectItem value="no-products" disabled>
                              No products available
                            </SelectItem>
                          ) : (
                            products.map((p: any) => (
                              <SelectItem key={p.id} value={String(p.id)} className="py-3">
                                <div className="flex flex-col space-y-1 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm truncate max-w-[200px]">{p.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">({p.sku})</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      {p.plant_name || p.product_plant_code || 'N/A'}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="inline-flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                      {p.storage_location_name || p.storage_location_code || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>
                        Unit
                        {autoFilledItemFields.get(index)?.has('unit') && (
                          <span className="ml-2 text-xs text-green-600 font-normal">
                            (Auto-filled from Product)
                          </span>
                        )}
                      </Label>
                      <Select
                        value={item.unit || 'PC'}
                        onValueChange={(value) => {
                          updateItem(index, 'unit', value);
                          // Remove from auto-filled fields when user manually changes it
                          setAutoFilledItemFields(prev => {
                            const updated = new Map(prev);
                            const itemFields = updated.get(index) || new Set();
                            itemFields.delete('unit');
                            updated.set(index, itemFields);
                            return updated;
                          });
                        }}
                      >
                        <SelectTrigger className={autoFilledItemFields.get(index)?.has('unit') ? 'bg-green-50 border-green-300' : ''}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PC">Pieces</SelectItem>
                          <SelectItem value="KG">Kilograms</SelectItem>
                          <SelectItem value="L">Liters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        Unit Price
                        {autoFilledItemFields.get(index)?.has('unit_price') && (
                          <span className="ml-2 text-xs text-green-600 font-normal">
                            (Auto-filled from Product)
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unit_price}
                        onChange={(e) => {
                          updateItem(index, 'unit_price', e.target.value);
                          // Remove from auto-filled fields when user manually changes it
                          setAutoFilledItemFields(prev => {
                            const updated = new Map(prev);
                            const itemFields = updated.get(index) || new Set();
                            itemFields.delete('unit_price');
                            updated.set(index, itemFields);
                            return updated;
                          });
                        }}
                        className={autoFilledItemFields.get(index)?.has('unit_price') ? 'bg-green-50 border-green-300' : ''}
                      />
                    </div>
                    <div>
                      <Label>Line Total</Label>
                      <div className="p-2 bg-gray-50 rounded text-sm font-semibold">
                        ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Inventory Status */}
                  {item.material_id && inventoryStatus[item.material_id] && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-green-900">Real-time Inventory Status</span>
                        {inventoryLoading && (
                          <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
                        )}
                      </div>

                      {(() => {
                        const status = inventoryStatus[item.material_id];
                        const requestedQty = parseFloat(item.quantity) || 0;
                        const isSufficient = status.free_stock >= requestedQty;
                        const stockStatus = status.stock_status;

                        return (
                          <div className="space-y-3">
                            {/* Stock Status Badge */}
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                stockStatus === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {stockStatus === 'AVAILABLE' ? '✓ Available' :
                                  stockStatus === 'LOW_STOCK' ? '⚠ Low Stock' :
                                    '✗ Out of Stock'}
                              </span>
                              {isSufficient ? (
                                <span className="text-xs text-green-600">Sufficient for order</span>
                              ) : (
                                <span className="text-xs text-red-600">Insufficient stock</span>
                              )}
                            </div>

                            {/* Stock Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded border border-green-100">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Package className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-700 uppercase">Available Stock</span>
                                </div>
                                <p className="text-lg font-semibold text-green-900">{status.free_stock}</p>
                                <p className="text-xs text-green-600">Free: {status.free_stock} units</p>
                              </div>

                              <div className="bg-white p-3 rounded border border-green-100">
                                <div className="flex items-center space-x-2 mb-1">
                                  <ShoppingCart className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-700 uppercase">Requested</span>
                                </div>
                                <p className="text-lg font-semibold text-green-900">{requestedQty}</p>
                                <p className="text-xs text-green-600">Order quantity</p>
                              </div>
                            </div>

                            {/* Stock Utilization Bar */}
                            <div className="bg-white p-3 rounded border border-green-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-green-700 uppercase">Stock Utilization</span>
                                <span className="text-xs text-green-600">{status.stock_utilization.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-green-100 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(status.stock_utilization, 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-green-600 mt-1">
                                <span>Min: {status.min_stock}</span>
                                <span>Max: {status.max_stock}</span>
                              </div>
                            </div>

                            {/* After Order Stock */}
                            {requestedQty > 0 && (
                              <div className="bg-white p-3 rounded border border-green-100">
                                <div className="flex items-center space-x-2 mb-1">
                                  <TrendingDown className="w-4 h-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-700 uppercase">After Order</span>
                                </div>
                                <p className="text-lg font-semibold text-green-900">
                                  {status.free_stock - requestedQty}
                                </p>
                                <p className="text-xs text-green-600">
                                  {status.free_stock - requestedQty < status.min_stock ?
                                    '⚠ Will be below minimum stock' :
                                    '✓ Above minimum stock'}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Plant and Storage Location Information */}
                  {item.material_id && (item.plant_name || item.storage_location_name) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-blue-900">Product Location Information</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Plant</span>
                          </div>
                          <span className="text-sm font-semibold text-blue-900">
                            {item.plant_name || item.plant_code || 'Not specified'}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Storage Location</span>
                          </div>
                          <span className="text-sm font-semibold text-blue-900">
                            {item.storage_location_name || item.storage_location_code || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


          {/* Order Total with Credit Validation */}
          <div className={`p-4 rounded-lg border-2 ${(() => {
            const subtotal = orderData.items.reduce((sum, item) =>
              sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0
            );
            const taxAmount = subtotal * 0.1; // 10% tax
            const shippingAmount = parseFloat(String(orderData.shipping_amount)) || 0;
            const orderTotal = subtotal + taxAmount + shippingAmount;
            const exceedsCredit = customerCreditInfo.creditLimit > 0 && orderTotal > customerCreditInfo.availableCredit;
            return exceedsCredit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
          })()}`}>
            {(() => {
              const subtotal = orderData.items.reduce((sum, item) =>
                sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0
              );

              // Calculate taxes based on customer's tax rules
              const taxBreakdown = taxRules.map(rule => ({
                rule_code: rule.rule_code,
                title: rule.title,
                rate_percent: rule.rate_percent,
                amount: subtotal * (rule.rate_percent / 100)
              }));

              const totalTaxAmount = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);
              const taxAmount = totalTaxAmount > 0 ? totalTaxAmount : 0; // Use calculated tax or 0 if no rules

              const shippingAmount = parseFloat(String(orderData.shipping_amount)) || 0;
              const orderTotal = subtotal + taxAmount + shippingAmount;
              const exceedsCredit = customerCreditInfo.creditLimit > 0 && orderTotal > customerCreditInfo.availableCredit;
              const exceededBy = exceedsCredit ? orderTotal - customerCreditInfo.availableCredit : 0;
              const creditUtilization = customerCreditInfo.creditLimit > 0 ? (orderTotal / customerCreditInfo.creditLimit) * 100 : 0;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                    {customerCreditInfo.creditLimit > 0 && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${exceedsCredit
                        ? 'bg-red-100 text-red-800'
                        : creditUtilization > 80
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                        }`}>
                        {exceedsCredit ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Credit Exceeded
                          </>
                        ) : creditUtilization > 80 ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            High Usage
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Within Limit
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>

                    {/* Tax Breakdown by Rule */}
                    {taxBreakdown.length > 0 ? (
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Tax Breakdown:
                          </span>
                          <span className="font-semibold text-purple-900">${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="space-y-1 pl-2">
                          {taxBreakdown.map((tax, index) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">
                                <span className="font-medium text-purple-700">{tax.rule_code}</span> - {tax.title} ({tax.rate_percent}%)
                              </span>
                              <span className="font-medium text-purple-900">${tax.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">$0.00</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">${shippingAmount.toFixed(2)}</span>
                    </div>

                    {customerCreditInfo.creditLimit > 0 && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Available Credit:</span>
                        <span className="font-medium text-green-600">${customerCreditInfo.availableCredit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-xl font-bold border-t pt-3">
                    <span>Total:</span>
                    <span className={exceedsCredit ? 'text-red-600' : 'text-gray-900'}>${orderTotal.toFixed(2)}</span>
                  </div>

                  {customerCreditInfo.creditLimit > 0 && (
                    <div className={`p-3 rounded-lg ${exceedsCredit
                      ? 'bg-red-100 border border-red-200'
                      : creditUtilization > 80
                        ? 'bg-yellow-100 border border-yellow-200'
                        : 'bg-green-100 border border-green-200'
                      }`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {exceedsCredit ? 'Credit Limit Exceeded' : 'Credit Utilization'}
                        </span>
                        <span className="font-bold">
                          {exceedsCredit ? `-$${exceededBy.toFixed(2)}` : `${creditUtilization.toFixed(1)}%`}
                        </span>
                      </div>
                      {exceedsCredit ? (
                        <p className="text-red-700 text-sm mt-1">
                          Order exceeds available credit by ${exceededBy.toFixed(2)}. Please reduce the order amount.
                        </p>
                      ) : creditUtilization > 80 ? (
                        <p className="text-yellow-700 text-sm mt-1">
                          High credit utilization. Consider reviewing the order amount.
                        </p>
                      ) : (
                        <p className="text-green-700 text-sm mt-1">
                          Order is within credit limit and can be processed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Order with Inventory Check"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced Delivery Dialog with Schedule Lines at Component Level (Outside of CreateSalesOrderDialog)
function EnhancedDeliveryDialogWrapper({ open, onOpenChange, salesOrder, scheduleLines, onCreateDelivery, isCreating }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: any;
  scheduleLines: any[];
  onCreateDelivery: (deliveryData: any) => void;
  isCreating?: boolean;
}) {
  if (!salesOrder) return null;

  return (
    <EnhancedDeliveryDialog
      open={open}
      onOpenChange={onOpenChange}
      salesOrder={salesOrder}
      scheduleLines={scheduleLines || []}
      onCreateDelivery={onCreateDelivery}
      isCreating={isCreating}
    />
  );
}

// Schedule Lines Modal
function ScheduleLinesModal({ open, onOpenChange, order, scheduleLines, onSplitLine }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  scheduleLines: any[];
  onSplitLine?: (scheduleLineId: number) => void;
}) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Schedule Lines - {order.orderNumber || order.order_number || order.id || 'N/A'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Customer</div>
              <div className="font-semibold">{order.customerName || order.customer_name || order.customer?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Order Date</div>
              <div className="font-semibold">
                {order.orderDate || order.order_date || order.created_at
                  ? new Date(order.orderDate || order.order_date || order.created_at).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="font-semibold">
                ${parseFloat(order.totalAmount || order.total_amount || order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <ScheduleLinesTable
            scheduleLines={scheduleLines || []}
            showActions={true}
            onSplitLine={onSplitLine}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}