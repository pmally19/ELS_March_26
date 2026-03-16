import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  GitMerge,
  Target,
  Zap,
  Settings,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  Download
} from 'lucide-react';

const AutomaticClearing = () => {
  const [clearingJob, setClearingJob] = useState('manual');
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [toleranceAmount, setToleranceAmount] = useState('0.01');

  const { data: clearingData, isLoading } = useQuery({
    queryKey: ['/api/transaction-tiles/automatic-clearing'],
    queryFn: async () => {
      const response = await fetch('/api/transaction-tiles/automatic-clearing');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <GitMerge className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading clearing engine...</p>
        </div>
      </div>
    );
  }

  const clearingItems = clearingData?.data || [];

  // Automatic Clearing specific calculations
  const totalOpenItems = 1247;
  const matchedPairs = clearingItems.filter(item => item.status === 'Matched').length;
  const clearedAmount = clearingItems.reduce((sum, item) => sum + (item.debitAmount || 0), 0);
  const matchingRate = ((matchedPairs / totalOpenItems) * 100).toFixed(1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatic Clearing Engine</h1>
          <p className="text-muted-foreground"> Intelligent open item matching and clearing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure Rules
          </Button>
          <Button>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Clearing Run
          </Button>
        </div>
      </div>

      {/* Clearing Engine Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Items Pool</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpenItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available for matching</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matching Rate</CardTitle>
            <GitMerge className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchingRate}%</div>
            <p className="text-xs text-muted-foreground">Auto-match success</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleared Value</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${clearedAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Today's clearing volume</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.7s</div>
            <p className="text-xs text-muted-foreground">Average per match</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matching-engine" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="matching-engine">Matching Engine</TabsTrigger>
          <TabsTrigger value="clearing-proposals">Proposals</TabsTrigger>
          <TabsTrigger value="tolerance-groups">Tolerance Groups</TabsTrigger>
          <TabsTrigger value="clearing-rules">Rules & Criteria</TabsTrigger>
          <TabsTrigger value="clearing-log">Clearing Log</TabsTrigger>
        </TabsList>

        <TabsContent value="matching-engine">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitMerge className="h-5 w-5" />
                  Intelligent Matching Engine
                </CardTitle>
                <CardDescription>Configure automatic matching parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clearing Job Type</label>
                  <Select value={clearingJob} onValueChange={setClearingJob}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Clearing</SelectItem>
                      <SelectItem value="automatic">Automatic Clearing</SelectItem>
                      <SelectItem value="periodic">Periodic Clearing</SelectItem>
                      <SelectItem value="partial">Partial Clearing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tolerance Amount (USD)</label>
                  <Input
                    value={toleranceAmount}
                    onChange={(e) => setToleranceAmount(e.target.value)}
                    placeholder="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Selection</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {['110100 - Cash Account', '130000 - Accounts Receivable', '200000 - Accounts Payable', '210000 - Accrued Expenses'].map((account) => (
                      <div key={account} className="flex items-center space-x-2">
                        <Checkbox
                          id={account}
                          checked={selectedAccounts.includes(account)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAccounts([...selectedAccounts, account]);
                            } else {
                              setSelectedAccounts(selectedAccounts.filter(a => a !== account));
                            }
                          }}
                        />
                        <label htmlFor={account} className="text-sm">{account}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full">
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Execute Clearing Run
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Real-time Matching Progress</CardTitle>
                <CardDescription>Current clearing job status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Open Items Scanned</span>
                    <span>847 / 1,247</span>
                  </div>
                  <Progress value={68} className="w-full" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Exact Matches</span>
                    </div>
                    <Badge variant="outline">234 pairs</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Tolerance Matches</span>
                    </div>
                    <Badge variant="outline">67 pairs</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Partial Matches</span>
                    </div>
                    <Badge variant="outline">12 pairs</Badge>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Pause Clearing
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clearing-proposals">
          <Card>
            <CardHeader>
              <CardTitle>Clearing Proposals</CardTitle>
              <CardDescription>Review and approve system-generated clearing matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search by document number..." className="max-w-sm" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Proposals</SelectItem>
                    <SelectItem value="exact">Exact Matches</SelectItem>
                    <SelectItem value="tolerance">Tolerance Matches</SelectItem>
                    <SelectItem value="partial">Partial Matches</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Select</TableHead>
                    <TableHead>Debit Document</TableHead>
                    <TableHead>Credit Document</TableHead>
                    <TableHead>Clearing Amount</TableHead>
                    <TableHead>Match Type</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clearingItems.slice(0, 5).map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium">{item.clearingDocument}</TableCell>
                      <TableCell>{item.reference}</TableCell>
                      <TableCell>${item.clearingAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={index % 3 === 0 ? 'default' : index % 3 === 1 ? 'secondary' : 'outline'}>
                          {index % 3 === 0 ? 'Exact' : index % 3 === 1 ? 'Tolerance' : 'Partial'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={95 - index * 5} className="w-16 h-2" />
                          <span className="text-xs">{95 - index * 5}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">5 proposals selected</span>
                <div className="flex gap-2">
                  <Button variant="outline">Reject Selected</Button>
                  <Button>Clear Selected Pairs</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tolerance-groups">
          <Card>
            <CardHeader>
              <CardTitle>Tolerance Groups</CardTitle>
              <CardDescription>Configure clearing tolerance parameters by account groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tolerance groups define acceptable variance amounts for automatic clearing by account type.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Cash Accounts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tolerance:</span>
                        <span>$0.01</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentage:</span>
                        <span>0.01%</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">AR/AP Accounts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tolerance:</span>
                        <span>$5.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentage:</span>
                        <span>0.1%</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Foreign Currency</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tolerance:</span>
                        <span>$10.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentage:</span>
                        <span>0.5%</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearing-rules">
          <Card>
            <CardHeader>
              <CardTitle>Clearing Rules & Criteria</CardTitle>
              <CardDescription>Configure intelligent matching algorithms and business rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-3">Matching Criteria</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked id="amount-match" />
                        <label htmlFor="amount-match" className="text-sm">Amount-based matching</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked id="reference-match" />
                        <label htmlFor="reference-match" className="text-sm">Reference number matching</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked id="date-match" />
                        <label htmlFor="date-match" className="text-sm">Date proximity matching</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="text-match" />
                        <label htmlFor="text-match" className="text-sm">Text pattern matching</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Business Rules</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked id="currency-check" />
                        <label htmlFor="currency-check" className="text-sm">Currency validation</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked id="period-check" />
                        <label htmlFor="period-check" className="text-sm">Posting period check</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="approval-required" />
                        <label htmlFor="approval-required" className="text-sm">Require approval for large amounts</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clearing-log">
          <Card>
            <CardHeader>
              <CardTitle>Clearing Execution Log</CardTitle>
              <CardDescription>Detailed audit trail of clearing activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="Search log entries..." className="max-w-sm" />
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Log
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Items Processed</TableHead>
                    <TableHead>Cleared Pairs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 8 }, (_, i) => (
                    <TableRow key={i}>
                      <TableCell>2024-01-{15 + i} 14:{30 + i}:00</TableCell>
                      <TableCell>CLR-{2024001 + i}</TableCell>
                      <TableCell>{1200 + i * 50}</TableCell>
                      <TableCell>{234 + i * 10}</TableCell>
                      <TableCell>
                        <Badge variant={i % 3 === 0 ? 'default' : 'secondary'}>
                          {i % 3 === 0 ? 'Completed' : 'In Progress'}
                        </Badge>
                      </TableCell>
                      <TableCell>CLEARING_USER</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomaticClearing;