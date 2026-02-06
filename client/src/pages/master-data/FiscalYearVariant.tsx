import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, RefreshCw, ArrowLeft, Calendar as CalendarIcon, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

import { useAgentPermissions } from "@/hooks/useAgentPermissions";

const fiscalYearVariantSchema = z.object({
  variant_id: z.string()
    .min(1, "Variant ID is required")
    .max(10, "Variant ID must be 10 characters or less")
    .regex(/^[A-Z0-9]+$/, "Variant ID must contain only uppercase letters and numbers"),
  description: z.string()
    .min(1, "Description is required")
    .max(255, "Description must be 255 characters or less"),
  posting_periods: z.number()
    .min(1, "Posting periods must be at least 1")
    .max(16, "Posting periods cannot exceed 16")
    .default(12),
  special_periods: z.number()
    .min(0, "Special periods cannot be negative")
    .max(4, "Special periods cannot exceed 4")
    .default(0),
  year_shift: z.number()
    .min(-12, "Year shift cannot be less than -12")
    .max(12, "Year shift cannot be greater than 12")
    .default(0),
  fiscal_calendar_id: z.number().optional(),
  active: z.boolean().default(true)
});

type FiscalYearVariant = z.infer<typeof fiscalYearVariantSchema> & { id: number };

export default function FiscalYearVariant() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<FiscalYearVariant | null>(null);
  const [viewingPeriodsVariant, setViewingPeriodsVariant] = useState<FiscalYearVariant | null>(null);
  const [showPeriodsDialog, setShowPeriodsDialog] = useState(false);
  const { toast } = useToast();
  const permissions = useAgentPermissions();
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading, refetch } = useQuery<FiscalYearVariant[]>({
    queryKey: ["/api/master-data/fiscal-year-variants"],
    queryFn: () => apiGet<FiscalYearVariant[]>("/api/master-data/fiscal-year-variants"),
  });

  // Fetch fiscal periods for dropdown
  const { data: fiscalPeriods = [] } = useQuery({
    queryKey: ["/api/master-data/fiscal-period"],
    queryFn: () => apiGet("/api/master-data/fiscal-period"),
  });

  // Fetch fiscal calendars for dropdown
  const { data: fiscalCalendarsResponse, isLoading: calendarsLoading, error: calendarsError } = useQuery({
    queryKey: ["/api/master-data/fiscal-calendar"],
    queryFn: async () => {
      const response = await fetch("/api/master-data/fiscal-calendar");
      const result = await response.json();
      return result.success ? result.data : [];
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });

  const fiscalCalendars = (fiscalCalendarsResponse || []).map((cal: any) => ({
    id: cal.id,
    calendar_id: cal.calendar_id,
    number_of_periods: cal.number_of_periods,
    start_date: cal.start_date,
    end_date: cal.end_date
  }));

  const form = useForm<z.infer<typeof fiscalYearVariantSchema>>({
    resolver: zodResolver(fiscalYearVariantSchema),
    defaultValues: {
      variant_id: "",
      description: "",
      posting_periods: 12,
      special_periods: 0,
      year_shift: 0,
      fiscal_calendar_id: undefined,
      active: true
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof fiscalYearVariantSchema>) =>
      apiPost("/api/master-data/fiscal-year-variants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/fiscal-year-variants"] });
      setOpen(false);
      setEditingVariant(null);
      form.reset();
      toast({ title: "Success", description: "Fiscal year variant created successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create fiscal year variant";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & z.infer<typeof fiscalYearVariantSchema>) =>
      apiPut(`/api/master-data/fiscal-year-variants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/fiscal-year-variants"] });
      setOpen(false);
      setEditingVariant(null);
      form.reset();
      toast({ title: "Success", description: "Fiscal year variant updated successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update fiscal year variant";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/master-data/fiscal-year-variants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-data/fiscal-year-variants"] });
      toast({ title: "Success", description: "Fiscal year variant deleted successfully" });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete fiscal year variant";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: z.infer<typeof fiscalYearVariantSchema>) => {
    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (variant: FiscalYearVariant) => {
    setEditingVariant(variant);
    form.reset(variant);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingVariant(null);
    form.reset();
    setOpen(true);
  };

  const handleViewPeriods = (variant: FiscalYearVariant) => {
    // Navigate to fiscal period page with variant context
    setLocation(`/master-data/fiscal-period?variant_id=${variant.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/master-data")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Master Data
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fiscal Year Variants</h1>
            <p className="text-muted-foreground">Configure fiscal year structures and calendar definitions</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Fiscal Year Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVariant ? "Edit Fiscal Year Variant" : "Create Fiscal Year Variant"}
                </DialogTitle>
                <DialogDescription>
                  Configure fiscal year calendar structure and posting periods
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="variant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="K4"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              maxLength={10}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="posting_periods"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posting Periods</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="12"
                              min="1"
                              max="16"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Standard calendar year with 12 periods" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fiscal_calendar_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Calendar</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value && value !== "__empty__" && value !== "__none__") {
                              const calendarId = parseInt(value);
                              field.onChange(calendarId);

                              // Auto-fill posting periods from selected calendar
                              const selectedCalendar = fiscalCalendars.find(cal => cal.id === calendarId);
                              if (selectedCalendar && selectedCalendar.number_of_periods) {
                                form.setValue('posting_periods', selectedCalendar.number_of_periods);
                              }
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          value={field.value?.toString() || undefined}
                          disabled={calendarsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={calendarsLoading ? "Loading calendars..." : fiscalCalendars.length === 0 ? "No calendars available" : "Select fiscal calendar"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fiscalCalendars.length === 0 && !calendarsLoading ? (
                              <SelectItem value="__empty__" disabled>
                                No fiscal calendars found. Create one first.
                              </SelectItem>
                            ) : (
                              <>
                                <SelectItem value="__none__">
                                  None
                                </SelectItem>
                                {fiscalCalendars.map((calendar) => (
                                  <SelectItem key={calendar.id} value={calendar.id.toString()}>
                                    {calendar.calendar_id} ({calendar.number_of_periods} periods)
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {calendarsError && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Unable to load calendars. You can still create a variant without selecting one.
                          </p>
                        )}
                        {fiscalCalendars.length === 0 && !calendarsLoading && !calendarsError && (
                          <p className="text-xs text-muted-foreground mt-1">
                            No fiscal calendars available. Create fiscal calendars in the Fiscal Calendar page first.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="special_periods"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Periods</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="4"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="year_shift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Shift</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="-1"
                              max="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {editingVariant && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Fiscal Periods</h4>
                          <p className="text-sm text-muted-foreground">
                            Create periods for this fiscal year variant
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            setLocation("/master-data/fiscal-period");
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Manual Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!editingVariant.fiscal_calendar_id) {
                              toast({
                                title: "Error",
                                description: "Please select a fiscal calendar first",
                                variant: "destructive",
                              });
                              return;
                            }

                            const fiscal_year = new Date().getFullYear();

                            try {
                              const response = await fetch('/api/master-data/fiscal-period/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  fiscal_calendar_id: editingVariant.fiscal_calendar_id,
                                  fiscal_year_variant_id: editingVariant.id,
                                  fiscal_year
                                })
                              });

                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.message || 'Failed to generate periods');
                              }

                              const result = await response.json();
                              toast({
                                title: "Success",
                                description: result.message || "Fiscal periods generated successfully",
                              });
                              refetch();
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to generate fiscal periods",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Auto Generate
                        </Button>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable this fiscal year variant
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {editingVariant ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          {editingVariant ? "Update" : "Create"} Fiscal Year Variant
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiscal Year Variants</CardTitle>
          <CardDescription>
            Manage fiscal year calendar structures and posting period definitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading fiscal year variants...</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <svg className="h-12 w-12 mx-auto text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">No fiscal year variants found</p>
              <p className="text-sm">Create your first variant to get started with fiscal year management.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Posting Periods</TableHead>
                  <TableHead>Special Periods</TableHead>
                  <TableHead>Year Shift</TableHead>
                  <TableHead>Fiscal Periods</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(variants as FiscalYearVariant[]).map((variant: FiscalYearVariant) => {
                  const associatedPeriods = Array.isArray(fiscalPeriods)
                    ? fiscalPeriods.filter((period: any) => period.fiscalYearVariantId === variant.id)
                    : [];

                  return (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.variant_id}</TableCell>
                      <TableCell>{variant.description}</TableCell>
                      <TableCell>{variant.posting_periods}</TableCell>
                      <TableCell>{variant.special_periods}</TableCell>
                      <TableCell>{variant.year_shift}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPeriods(variant)}
                          className="flex items-center space-x-2"
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {associatedPeriods.length} period{associatedPeriods.length !== 1 ? 's' : ''}
                          </span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${variant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {variant.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(variant)}
                            disabled={deleteMutation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the fiscal year variant "{variant.variant_id}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(variant.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fiscal Periods View Dialog */}
      <Dialog open={showPeriodsDialog} onOpenChange={setShowPeriodsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Fiscal Periods - {viewingPeriodsVariant?.variant_id}
            </DialogTitle>
            <DialogDescription>
              View all fiscal calendar periods associated with this fiscal year variant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingPeriodsVariant && (() => {
              const associatedPeriods = Array.isArray(fiscalPeriods)
                ? fiscalPeriods.filter((period: any) => period.fiscalYearVariantId === viewingPeriodsVariant.id)
                : [];

              return associatedPeriods.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {associatedPeriods.map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.year}</TableCell>
                        <TableCell>{period.period}</TableCell>
                        <TableCell>{period.name}</TableCell>
                        <TableCell>
                          {new Date(period.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(period.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${period.status === "Open"
                            ? "bg-green-100 text-green-800"
                            : period.status === "Closed"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                            }`}>
                            {period.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No fiscal periods found</p>
                  <p className="text-sm">
                    There are no fiscal calendar periods associated with this variant yet.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setShowPeriodsDialog(false);
                      setLocation("/master-data/fiscal-period");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Fiscal Period
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}