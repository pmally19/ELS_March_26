import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Search, Filter, FileUp, FileDown, RefreshCw,
  Building, DollarSign, Calendar, ArrowRight, FileText,
  CheckCircle, XCircle, Clock, Eye, ArrowLeft
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
  id: number;
  quote_number: string;
  customer_name: string;
  quote_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
  grand_total: number;
}

export default function SalesQuotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch quotes from API
  const { data: quotes = [], isLoading, refetch } = useQuery<Quote[]>({
    queryKey: ["/api/sales/quotes", activeTab],
    queryFn: async () => {
      const url = activeTab === "all"
        ? '/api/sales/quotes'
        : `/api/sales/quotes?status=${activeTab}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching quotes: ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Filter quotes based on search term (server already filtered by status)
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === "" ||
      quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Draft</Badge>;
      case "sent":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Sent</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Expired</Badge>;
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
      {/* Enhanced Header Section */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/sales">
              <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Back to Sales
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Quotes & Estimates
              </h1>
              <p className="text-gray-500 mt-1">
                Create and manage customer quotations and price estimates
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileUp className="h-4 w-4" />
              <span>Import</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button
              variant="default"
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Quote</span>
            </Button>
          </div>
        </div>

        <Card className="shadow-sm border-t-2 border-t-indigo-500">
          <CardContent className="p-0">
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search quotes..."
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
                  <TabsTrigger value="all">All Quotes</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  <TabsTrigger value="expired">Expired</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0">
                {isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No quotes found</h3>
                    <p className="text-gray-500 max-w-md mb-4">
                      {searchTerm
                        ? `No quotes matching "${searchTerm}" were found.`
                        : "There are no quotes available. Create a new quote to get started."}
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quote
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Quote #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Quote Date</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuotes.map((quote) => (
                          <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                            <TableCell className="font-medium">{quote.quote_number}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Building className="h-4 w-4 text-gray-400 mr-2" />
                                {quote.customer_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                {new Date(quote.quote_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                                {formatCurrency(quote.grand_total || quote.total_amount)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                {new Date(quote.valid_until).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(quote.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Quote"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {quote.status.toLowerCase() === "sent" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/sales/quote-approval?quoteId=${quote.id}`}>
                                      Submit for Approval
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
                )}
              </TabsContent>

              {/* Other tab contents with filtered content */}
              <TabsContent value="draft" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Quote Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.filter(quote => quote.status === "draft").map((quote) => (
                        <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              {quote.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div>{quote.customer}</div>
                                <div className="text-sm text-gray-500">{quote.contactPerson}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {formatCurrency(quote.totalValue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            {new Date(quote.lastUpdated).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="View Quote"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="sent" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Quote Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.filter(quote => quote.status === "sent").map((quote) => (
                        <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              {quote.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div>{quote.customer}</div>
                                <div className="text-sm text-gray-500">{quote.contactPerson}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {formatCurrency(quote.totalValue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            {new Date(quote.lastUpdated).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/sales/quote-approval?quoteId=${quote.id}`}>
                                  Submit for Approval
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="approved" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Quote Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.filter(quote => quote.status === "approved").map((quote) => (
                        <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              {quote.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div>{quote.customer}</div>
                                <div className="text-sm text-gray-500">{quote.contactPerson}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {formatCurrency(quote.totalValue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            {new Date(quote.lastUpdated).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/sales/orders/new?quoteId=${quote.id}`}>
                                  Create Order
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="rejected" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Quote Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.filter(quote => quote.status === "rejected").map((quote) => (
                        <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              {quote.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div>{quote.customer}</div>
                                <div className="text-sm text-gray-500">{quote.contactPerson}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {formatCurrency(quote.totalValue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            {new Date(quote.lastUpdated).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                Revise Quote
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="expired" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Quote Name</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.filter(quote => quote.status === "expired").map((quote) => (
                        <TableRow key={quote.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              {quote.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div>{quote.customer}</div>
                                <div className="text-sm text-gray-500">{quote.contactPerson}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                              {formatCurrency(quote.totalValue)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {new Date(quote.validUntil).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(quote.status)}</TableCell>
                          <TableCell>
                            {new Date(quote.lastUpdated).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                Renew Quote
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
