import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Database, RefreshCw, ArrowRight, LineChart, Settings, Wrench, FileCheck, AlertCircle, Workflow, ArrowLeft } from "lucide-react";

const Tools = () => {
  const tools = [
    {
      id: "end-to-end-processes",
      title: "End-to-End Processes",
      icon: <Workflow className="h-8 w-8 text-purple-500" />,
      description: "Execute complete business workflows across all ERP modules",
      path: "/end-to-end-processes",
      status: "Active"
    },
    {
      id: "master-data-checker",
      title: "Master Data Checker",
      icon: <Database className="h-8 w-8 text-blue-500" />,
      description: "Verify and manage master data for all ERP modules",
      path: "/tools/master-data-checker",
      status: "Active"
    },
    {
      id: "test-application",
      title: "Test Application",
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      description: "Validate application functionality and features",
      path: "/tools/test-application",
      status: "Active"
    },
    {
      id: "master-data-protection",
      title: "Master Data Protection",
      icon: <Settings className="h-8 w-8 text-purple-500" />,
      description: "Protect master data from unauthorized changes",
      path: "/tools/master-data-protection",
      status: "Active"
    },
    {
      id: "api-tester",
      title: "API Testing Tool",
      icon: <AlertCircle className="h-8 w-8 text-blue-500" />,
      description: "Test and diagnose API endpoints to fix connection issues",
      path: "/tools/api-tester",
      status: "Active"
    },
    {
      id: "business-rule-testing",
      title: "Business Rule Testing",
      icon: <CheckCircle className="h-8 w-8 text-emerald-500" />,
      description: "Test real-world business scenarios and exception handling",
      path: "/tools/business-rule-testing",
      status: "Active"
    },
    {
      id: "data-migration",
      title: "Data Migration",
      icon: <RefreshCw className="h-8 w-8 text-orange-500" />,
      description: "Import and export data between systems",
      path: "/tools/data-migration",
      status: "Coming Soon"
    },
    {
      id: "data-validation",
      title: "Data Validation",
      icon: <FileCheck className="h-8 w-8 text-indigo-500" />,
      description: "Validate data integrity across all modules",
      path: "/tools/data-validation",
      status: "Coming Soon"
    },
    {
      id: "metrics-dashboard",
      title: "System Metrics",
      icon: <LineChart className="h-8 w-8 text-yellow-500" />,
      description: "View performance metrics and system statistics",
      path: "/tools/metrics",
      status: "Active"
    }
  ];

  return (
    <div className="container p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="bg-primary/10 p-2 rounded-md">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Application Tools</h1>
        </div>
        <p className="text-muted-foreground">Manage, test, and optimize your ERP system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="overflow-hidden border border-gray-200 dark:border-gray-800 transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                {tool.icon}
                <div className={`text-xs px-2 py-1 rounded-full ${
                  tool.status === "Active" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>
                  {tool.status}
                </div>
              </div>
              <CardTitle className="text-xl mt-2">{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-2 pb-4">
              {tool.status === "Active" ? (
                <Link href={tool.path}>
                  <Button className="w-full">
                    Open Tool
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button disabled className="w-full opacity-70">
                  Coming Soon
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Tools;