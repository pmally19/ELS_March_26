import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import IncotermsSelector from "@/components/sales/IncotermsSelector";
import { FileText, User, Package } from "lucide-react";
export default function SalesOrderWithIncoterms() {
    var toast = useToast().toast;
    var _a = useState(), salesOrderId = _a[0], setSalesOrderId = _a[1];
    var _b = useState(""), customerId = _b[0], setCustomerId = _b[1];
    var _c = useState(null), incoterms = _c[0], setIncoterms = _c[1];
    var handleIncotermsChange = function (newIncoterms) {
        setIncoterms(newIncoterms);
    };
    var handleCreateOrder = function () {
        if (!customerId) {
            toast({ title: "Validation Error", description: "Customer ID is required", variant: "destructive" });
            return;
        }
        if (!(incoterms === null || incoterms === void 0 ? void 0 : incoterms.incotermsKey) || !(incoterms === null || incoterms === void 0 ? void 0 : incoterms.incotermsLocation)) {
            toast({ title: "Validation Error", description: "Incoterms are required before creating order", variant: "destructive" });
            return;
        }
        // Simulate order creation
        var newOrderId = Math.floor(Math.random() * 10000) + 1000;
        setSalesOrderId(newOrderId);
        toast({
            title: "Order Created",
            description: "Sales Order ".concat(newOrderId, " created with incoterms ").concat(incoterms.incotermsKey, " at ").concat(incoterms.incotermsLocation)
        });
    };
    return (<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Order with Incoterms</h1>
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5"/>
          <span>Order #{salesOrderId || "New"}</span>
        </div>
      </div>

      {/* Order Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5"/>
            <span>Order Header</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-id">Customer ID</Label>
              <Input id="customer-id" value={customerId} onChange={function (e) { return setCustomerId(e.target.value); }} placeholder="Enter customer ID"/>
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]}/>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoterms Selection */}
      <IncotermsSelector salesOrderId={salesOrderId} customerId={customerId ? parseInt(customerId) : undefined} onIncotermsChange={handleIncotermsChange} initialIncoterms={incoterms || undefined}/>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5"/>
            <span>Order Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50"/>
            <p>Order items will be added here</p>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      {incoterms && (<Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Customer ID:</span>
                <span className="font-medium">{customerId || "Not specified"}</span>
              </div>
              <div className="flex justify-between">
                <span>Incoterms Rule:</span>
                <span className="font-medium">{incoterms.incotermsKey}</span>
              </div>
              <div className="flex justify-between">
                <span>Incoterms Location:</span>
                <span className="font-medium">{incoterms.incotermsLocation}</span>
              </div>
            </div>
          </CardContent>
        </Card>)}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline">Save Draft</Button>
        <Button onClick={handleCreateOrder} disabled={!customerId || !(incoterms === null || incoterms === void 0 ? void 0 : incoterms.incotermsKey) || !(incoterms === null || incoterms === void 0 ? void 0 : incoterms.incotermsLocation)}>
          Create Order
        </Button>
      </div>
    </div>);
}
