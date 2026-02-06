import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, X, Download, ArrowLeft, RefreshCw, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAgentPermissions } from "@/hooks/useAgentPermissions";

// Define the Employee type (matches database schema)
type Employee = {
  id: number;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  company_code_id: number | null;
  cost_center_id: number | null;
  join_date: string | null;
  manager_id: number | null;
  is_active: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// Employee Form Schema
const employeeSchema = z.object({
  employee_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  company_code_id: z.number().optional(),
  cost_center_id: z.number().optional(),
  join_date: z.string().optional(),
  manager_id: z.number().optional(),
  is_active: z.boolean().default(true),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const Employees = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const permissions = useAgentPermissions();

  // Fetch employees
  const { data: employeesData, isLoading, error: employeesError, refetch } = useQuery({
    queryKey: ["/api/master-data/employees"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/employees", {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.status}`);
      }
      const data = await response.json();
      return data.data || data; // Handle both { data: [] } and [] formats
    },
  });

  const employees: Employee[] = employeesData || [];

  // Filter employees based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      setFilteredEmployees(
        employees.filter(
          (employee) =>
            `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.position?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, employees]);

  // Employee form setup
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      company_code_id: undefined,
      cost_center_id: undefined,
      join_date: "",
      manager_id: undefined,
      is_active: true,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (editingEmployee) {
      form.reset({
        employee_id: editingEmployee.employee_id || "",
        first_name: editingEmployee.first_name,
        last_name: editingEmployee.last_name,
        email: editingEmployee.email || "",
        phone: editingEmployee.phone || "",
        department: editingEmployee.department || "",
        position: editingEmployee.position || "",
        company_code_id: editingEmployee.company_code_id || undefined,
        cost_center_id: editingEmployee.cost_center_id || undefined,
        join_date: editingEmployee.join_date || "",
        manager_id: editingEmployee.manager_id || undefined,
        is_active: editingEmployee.is_active !== false,
      });
    } else {
      form.reset({
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department: "",
        position: "",
        company_code_id: undefined,
        cost_center_id: undefined,
        join_date: "",
        manager_id: undefined,
        is_active: true,
      });
    }
  }, [editingEmployee, form]);

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: (employee: EmployeeFormValues) => {
      return apiRequest(`/api/master-data/employees`, {
        method: "POST",
        body: JSON.stringify(employee)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || "Failed to create employee");
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/employees"] });
      refetch();
      setShowDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: (data: { id: number; employee: EmployeeFormValues }) => {
      return apiRequest(`/api/master-data/employees/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.employee),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/employees"] });
      refetch();
      setShowDialog(false);
      setEditingEmployee(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/master-data/employees/${id}`, {
        method: "DELETE",
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/employees"] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = (values: EmployeeFormValues) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, employee: values });
    } else {
      createEmployeeMutation.mutate(values);
    }
  };

  // Function to close the dialog and reset state
  const closeDialog = () => {
    setShowDialog(false);
    setEditingEmployee(null);
    form.reset();
  };

  // Function to handle editing an employee
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowDialog(true);
  };

  // Function to handle exporting employees to CSV
  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no employees to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredEmployees.map(employee => ({
      'Employee ID': employee.employee_id || '',
      'First Name': employee.first_name,
      'Last Name': employee.last_name,
      'Email': employee.email || '',
      'Phone': employee.phone || '',
      'Department': employee.department || '',
      'Position': employee.position || '',
      'Join Date': employee.join_date || '',
      'Status': employee.is_active && employee.active ? 'Active' : 'Inactive',
      'Created At': employee.created_at,
    }));

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredEmployees.length} employees to CSV file.`,
    });
  };

  // Function to handle deleting an employee
  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (employee: Employee) => {
    const isActive = employee.is_active && employee.active;
    return (
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  // Check for errors
  if (employeesError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{(employeesError as Error).message || "An error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/master-data" className="mr-4 p-2 rounded-md hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
          </Link>
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-gray-600">Manage employee records and HR data</p>
        </div>
      </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {permissions.hasDataModificationRights && (
            <Button
            onClick={() => {
                setEditingEmployee(null);
                setShowDialog(true);
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Employee
            </Button>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No employees found. {permissions.hasDataModificationRights && 'Click "New Employee" to add one.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.employee_id || `#${employee.id}`}
                      </TableCell>
                      <TableCell>
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.email || '-'}</TableCell>
                      <TableCell>{employee.phone || '-'}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>{formatDate(employee.join_date)}</TableCell>
                      <TableCell>{getStatusBadge(employee)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(employee.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
        </div>
      )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Create New Employee"}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? "Update employee information below."
                : "Fill in the employee information below to create a new employee record."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} />
                      </FormControl>
                      <FormDescription>Optional employee identifier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.smith@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="555-123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Manufacturing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Production Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="join_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Employee is active in the system</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
                  {editingEmployee ? "Update" : "Create"} Employee
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
