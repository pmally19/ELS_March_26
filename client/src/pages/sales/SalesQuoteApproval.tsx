import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Search, Filter, RefreshCw, 
  Building, DollarSign, Calendar, ArrowRight, FileText, 
  CheckCircle, XCircle, User, Clock
} from "lucide-react";

export default function SalesQuoteApproval() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Mock quotes for approval
  const quoteApprovals = [
    {
      id: 1,
      number: "QT-2023-0001",
      name: "Enterprise Software Suite - Initial Quote",
      customer: "ABC Manufacturing",
      contactPerson: "John Smith",
      totalValue: 78500,
      submittedDate: "2023-05-12T14:30:00Z",
      status: "pending",
      submittedBy: "Alex Johnson",
      approver: "Maria Garcia",
      notes: "Special pricing applied due to potential long-term partnership"
    },
    {
      id: 2,
      number: "QT-2023-0006",
      name: "Data Migration Services - Gold Package",
      customer: "Tech Innovators Ltd",
      contactPerson: "Robert Chen",
      totalValue: 45000,
      submittedDate: "2023-05-10T09:15:00Z",
      status: "approved",
      submittedBy: "Chris Williams",
      approver: "Maria Garcia",
      notes: "Client is a strategic partner, approved with premium service level"
    },
    {
      id: 3,
      number: "QT-2023-0007",
      name: "Cloud Infrastructure Upgrade",
      customer: "FinServe Corp",
      contactPerson: "Amanda Lewis",
      totalValue: 112500,
      submittedDate: "2023-05-11T10:30:00Z",
      status: "rejected",
      submittedBy: "Sam Taylor",
      approver: "David Wilson",
      notes: "Cost estimates need revision, pricing structure doesn't align with company guidelines"
    },
    {
      id: 4,
      number: "QT-2023-0008",
      name: "Annual Support Contract - Premium",
      customer: "Northern Healthcare",
      contactPerson: "Jessica Moore",
      totalValue: 64000,
      submittedDate: "2023-05-13T11:45:00Z",
      status: "pending",
      submittedBy: "Tom Jackson",
      approver: "Maria Garcia",
      notes: "Awaiting financial review due to non-standard payment terms"
    },
    {
      id: 5,
      number: "QT-2023-0009",
      name: "E-commerce Integration Package",
      customer: "Global Retail Group",
      contactPerson: "Mark Stevens",
      totalValue: 53500,
      submittedDate: "2023-05-09T14:15:00Z",
      status: "approved",
      submittedBy: "Lisa Thompson",
      approver: "David Wilson",
      notes: "Standard approval, meets all guidelines"
    }
  ];

  // Filter quote approvals based on search term and active tab
  const filteredApprovals = quoteApprovals.filter(approval => {
    const matchesSearch = searchTerm === "" || 
      approval.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || 
      (activeTab === "pending" && approval.status === "pending") ||
      (activeTab === "approved" && approval.status === "approved") ||
      (activeTab === "rejected" && approval.status === "rejected");
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quote Approval</h1>
          <p className="text-gray-600 mt-1">
            Review and approve sales quotes before finalizing
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search approvals..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="px-4">
              <TabsList className="mb-4 mt-2">
                <TabsTrigger value="all">All Approvals</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Quote Name</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>By / Approver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell className="font-medium">{approval.number}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                            {approval.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div>{approval.customer}</div>
                              <div className="text-sm text-gray-500">{approval.contactPerson}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                            {formatCurrency(approval.totalValue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                            {new Date(approval.submittedDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center text-sm">
                              <User className="h-3 w-3 mr-1 text-blue-400" />
                              <span>{approval.submittedBy}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <User className="h-3 w-3 mr-1 text-purple-400" />
                              <span>{approval.approver}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(approval.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {approval.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {approval.status === "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/sales/orders/new?quoteId=${approval.id}`}>
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Create Order
                                </Link>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Other tabs would have similar content with different filtering */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}