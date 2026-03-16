import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, Plus, Edit2, Eye, Clock, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAgentPermissions } from "@/hooks/useAgentPermissions";
import { Link } from 'wouter';

//  Time Management Type Definitions
interface TimeEntry {
  id: string;
  employeeNumber: string;
  employeeName: string;
  date: string;
  timeType: string;
  startTime: string;
  endTime: string;
  duration: number;
  workOrder: string;
  activity: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approvedBy: string;
  approvedDate: string;
  companyCode: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  supervisor: string;
}

export default function TimeManagement() {
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("10001");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Query Time Entries from API with proper parameters
  const { data: timeEntries, isLoading, refetch } = useQuery({
    queryKey: ['/api/transaction-tiles/time-management', selectedEmployee, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append('employee', selectedEmployee);
      if (selectedDate) params.append('date', selectedDate);
      const response = await fetch(`/api/transaction-tiles/time-management?${params}`);
      return response.json();
    }
  });

  // Query employees from API
  const { data: employeesData } = useQuery({
    queryKey: ['/api/master-data/employees'],
    queryFn: async () => {
      const response = await fetch('/api/master-data/employees');
      const json = await response.json();
      return json.data || [];
    }
  });

  // Mutation for creating new time entries
  const createTimeMutation = useMutation({
    mutationFn: async (entryData: Partial<TimeEntry>) => {
      const response = await fetch('/api/transaction-tiles/time-management/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/time-management'] });
      setShowDialog(false);
    }
  });

  // Mutation for approving time entries
  const approveMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/transaction-tiles/time-management/${entryId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to approve');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transaction-tiles/time-management'] });
    }
  });

  // Convert employees data to dropdown format
  const employees = (employeesData || []).map((emp: any) => ({
    id: emp.id.toString(),
    name: `${emp.first_name} ${emp.last_name}`,
    department: emp.department || 'N/A'
  }));

  const timeTypes = [
    'Regular Hours',
    'Overtime',
    'Sick Leave',
    'Vacation',
    'Training',
    'Maintenance'
  ];

  const handleRefresh = (): void => {
    refetch();
  };

  const handleAdd = (): void => {
    if (!permissions.canCreate) {
      alert('You do not have permission to create time entries');
      return;
    }
    setSelectedEntry(null);
    setShowDialog(true);
  };

  const handleEdit = (entry: TimeEntry): void => {
    if (!permissions.canEdit) {
      alert('You do not have permission to modify time entries');
      return;
    }
    setSelectedEntry(entry);
    setShowDialog(true);
  };

  const handleView = (entry: TimeEntry): void => {
    setSelectedEntry(entry);
    setShowDialog(true);
  };

  const handleApprove = (entry: TimeEntry): void => {
    if (!permissions.canApprove) {
      alert('You do not have permission to approve time entries');
      return;
    }
    if (entry.status === 'Approved') {
      alert('This entry is already approved');
      return;
    }
    if (confirm(`Approve time entry for ${entry.employeeName} on ${entry.date}?`)) {
      approveMutation.mutate(entry.id);
    }
  };

  const handleSave = (): void => {
    const entryData = {
      employeeNumber: selectedEmployee,
      date: selectedDate,
      timeType: 'Regular Hours',
      startTime: '08:00',
      endTime: '17:00',
      duration: 8.0,
      workOrder: 'WO-2025-NEW',
      activity: 'General Work',
      status: 'Draft' as const,
      companyCode: '1000'
    };

    createTimeMutation.mutate(entryData);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Draft': 'bg-yellow-100 text-yellow-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const displayData = timeEntries?.data || [];

  // Calculate real-time metrics from actual data
  const totalHours = displayData.reduce((sum, entry) => sum + (parseFloat(entry.duration) || 0), 0);
  const regularHours = displayData
    .filter(entry => entry.timeType === 'Regular Hours')
    .reduce((sum, entry) => sum + (parseFloat(entry.duration) || 0), 0);
  const overtimeHours = displayData
    .filter(entry => entry.timeType === 'Overtime')
    .reduce((sum, entry) => sum + (parseFloat(entry.duration) || 0), 0);
  const approvedEntries = displayData.filter(entry => entry.status === 'Approved').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Time Management</h1>
            <p className="text-muted-foreground"> HR-TM | Track employee time and attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            CAT2/CAT3
          </Badge>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Recording Center
              </CardTitle>
              <CardDescription>
                Manage employee time entries and attendance tracking
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!permissions.canCreate}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours Today</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Hours</p>
                    <p className="text-2xl font-bold">{regularHours.toFixed(1)}</p>
                  </div>
                  <User className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overtime Hours</p>
                    <p className="text-2xl font-bold">{overtimeHours.toFixed(1)}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Entries</p>
                    <p className="text-2xl font-bold">{approvedEntries}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Entries Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time Type</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{entry.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{entry.employeeNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.timeType}</TableCell>
                    <TableCell>{entry.startTime}</TableCell>
                    <TableCell>{entry.endTime}</TableCell>
                    <TableCell>{formatDuration(entry.duration)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.activity}</div>
                        <div className="text-sm text-muted-foreground">{entry.workOrder}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {permissions.canApprove && entry.status !== 'Approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(entry)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? 'Edit Time Entry' : 'Create New Time Entry'}
            </DialogTitle>
            <DialogDescription>
              Record employee time and attendance information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeType">Time Type</Label>
              <Select defaultValue="Regular Hours">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  defaultValue="08:00"
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  defaultValue="17:00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="activity">Activity</Label>
              <Input
                id="activity"
                placeholder="Work activity description"
                defaultValue="General Work"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createTimeMutation.isPending}
            >
              {createTimeMutation.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}