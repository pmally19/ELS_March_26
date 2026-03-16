import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Loader2, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeliveryTabVL02N from "@/components/delivery/DeliveryTabVL02N";

export default function DeliveryView() {
  const [, params] = useRoute("/logistics/delivery/view/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="text-destructive font-bold text-xl">Invalid Delivery ID</div>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery {id}</h1>
            <p className="text-muted-foreground text-sm">Detailed delivery view and management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print Slip
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Reusing the heavy-duty Delivery component */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <DeliveryTabVL02N 
          deliveryId={parseInt(id)} 
          inline={true} 
        />
      </div>
    </div>
  );
}
