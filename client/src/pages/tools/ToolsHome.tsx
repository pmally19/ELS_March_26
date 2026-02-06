import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Database, PlusCircle, RefreshCw, ArrowRight, LineChart, Settings, Wrench, FileCheck, Zap } from "lucide-react";
import PageHeading from "@/components/ui/page-heading";

const ToolsHome = () => {
  const tools = [
    {
      id: "business-integration-wizard",
      title: "Business Integration Wizard",
      icon: <Settings className="h-8 w-8 text-purple-600" />,
      description: "Guided setup for new business integrations with complete ERP structure",
      path: "/tools/business-integration-wizard",
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
      id: "diagnostic-tool",
      title: "System Diagnostics",
      icon: <Wrench className="h-8 w-8 text-purple-500" />,
      description: "Monitor system health and troubleshoot issues",
      path: "/tools/diagnostics",
      status: "Coming Soon"
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
      status: "Coming Soon"
    }
  ];

  return (
    <div className="container p-6">
      <PageHeading 
        title="Application Tools" 
        description="Manage, test, and optimize your ERP system"
        icon={<Wrench className="h-6 w-6" />}
      />

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

export default ToolsHome;