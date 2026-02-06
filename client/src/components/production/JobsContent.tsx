import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProductionJob {
  id: number;
  job_number: string;
  production_order: string;
  product_name: string;
  work_center: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  quantity: number;
}

interface ProductionOrder {
  id: number;
  order_number: string;
  product_name: string;
}

interface WorkCenter {
  id: number;
  code: string;
  name: string;
}

export default function JobsContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJob, setNewJob] = useState({
    production_order_id: "",
    work_center_id: "",
    start_date: "",
    end_date: "",
    quantity: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch production jobs
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production/jobs"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/jobs");
      if (!response.ok) {
        throw new Error("Failed to fetch production jobs");
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch production orders for dropdown
  const { data: productionOrders = [] } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production/orders/list"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/orders/list");
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch work centers for dropdown
  const { data: workCenters = [] } = useQuery<WorkCenter[]>({
    queryKey: ["/api/production/work-centers"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/work-centers");
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Fetch unique statuses for filter
  const { data: statuses = [] } = useQuery<string[]>({
    queryKey: ["/api/production/jobs/statuses"],
    queryFn: async () => {
      const response = await apiRequest("/api/production/jobs/statuses");
      if (!response.ok) {
        return [];
      }
      const result = await response.json();
      // New API returns { success: true, data: [...] }
      return result.data || result;
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: {
      production_order_id: number;
      work_center_id: number;
      quantity: number;
      start_date: string;
      end_date: string;
      status?: string;
    }) => {
      const response = await apiRequest("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create production job");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/jobs"] });
      toast({
        title: "Success",
        description: "Production job created successfully",
      });
      setShowNewJobForm(false);
      setNewJob({
        production_order_id: "",
        work_center_id: "",
        start_date: "",
        end_date: "",
        quantity: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create production job",
        variant: "destructive",
      });
    },
  });

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      (job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.production_order?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.work_center?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (job.status?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === "all" || job.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case 'in progress':
        return <Badge variant="default" className="bg-blue-500 text-white">In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-white">Completed</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const handleCreateJob = () => {
    if (!newJob.production_order_id || !newJob.work_center_id || !newJob.quantity || !newJob.start_date || !newJob.end_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createJobMutation.mutate({
      production_order_id: parseInt(newJob.production_order_id),
      work_center_id: parseInt(newJob.work_center_id),
      quantity: parseFloat(newJob.quantity),
      start_date: newJob.start_date,
      end_date: newJob.end_date,
      status: "planned"
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search production jobs..."
            className="pl-8 rounded-md border border-input bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredJobs.length === 0) {
                toast({
                  title: "No Data",
                  description: "No jobs to export",
                  variant: "destructive",
                });
                return;
              }

              const csvContent = filteredJobs.map(job => ({
                JobNumber: job.job_number || "",
                ProductionOrder: job.production_order || "",
                Product: job.product_name || "",
                WorkCenter: job.work_center || "",
                StartDate: formatDate(job.start_date),
                EndDate: formatDate(job.end_date),
                Quantity: job.quantity || 0,
                Status: job.status || ""
              }));

              const csvString = [
                Object.keys(csvContent[0]).join(','),
                ...csvContent.map(row => Object.values(row).join(','))
              ].join('\n');

              const blob = new Blob([csvString], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'production-jobs.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filteredJobs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showNewJobForm} onOpenChange={setShowNewJobForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Production Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="production_order_id">Production Order *</Label>
                  <Select
                    value={newJob.production_order_id}
                    onValueChange={(value) => setNewJob({ ...newJob, production_order_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select production order" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          {order.order_number} - {order.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="work_center_id">Work Center *</Label>
                  <Select
                    value={newJob.work_center_id}
                    onValueChange={(value) => setNewJob({ ...newJob, work_center_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((wc) => (
                        <SelectItem key={wc.id} value={wc.id.toString()}>
                          {wc.code} - {wc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    min="0"
                    value={newJob.quantity}
                    onChange={(e) => setNewJob({ ...newJob, quantity: e.target.value })}
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={newJob.start_date}
                    onChange={(e) => setNewJob({ ...newJob, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={newJob.end_date}
                    onChange={(e) => setNewJob({ ...newJob, end_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewJobForm(false);
                      setNewJob({
                        production_order_id: "",
                        work_center_id: "",
                        start_date: "",
                        end_date: "",
                        quantity: ""
                      });
                    }}
                    disabled={createJobMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateJob}
                    disabled={createJobMutation.isPending}
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Job"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status.toLowerCase()}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading production jobs...</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Production Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Work Center</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.job_number || "N/A"}</TableCell>
                      <TableCell>{job.production_order || "N/A"}</TableCell>
                      <TableCell>{job.product_name || "N/A"}</TableCell>
                      <TableCell>{job.work_center || "N/A"}</TableCell>
                      <TableCell>{formatDate(job.start_date)}</TableCell>
                      <TableCell>{formatDate(job.end_date)}</TableCell>
                      <TableCell>{job.quantity || 0}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              {searchTerm || statusFilter !== "all"
                ? 'No production jobs match your filters.'
                : 'No production jobs found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}