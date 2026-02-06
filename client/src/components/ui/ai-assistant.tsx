import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, Loader2, Brain, User, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  type: "user" | "agent";
  content: string;
  timestamp: Date;
  agentName?: string;
}

interface AIAssistantProps {
  moduleType: string;
  moduleName: string;
  currentData?: any;
  userRole?: string;
}

const moduleIcons = {
  masterData: "🏗️",
  sales: "💰",
  inventory: "📦",
  purchase: "🛒",
  production: "⚙️",
  finance: "💼",
  controlling: "📊"
};

export default function AIAssistant({ 
  moduleType, 
  moduleName, 
  currentData, 
  userRole 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentCapabilities, setAgentCapabilities] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<string>("unknown");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkAiStatus();
    loadAgentCapabilities();
    addWelcomeMessage();
  }, [moduleType]);

  const checkAiStatus = async () => {
    try {
      const response = await apiRequest("/api/ai/health") as any;
      setAiStatus(response.status || "error");
    } catch (error) {
      setAiStatus("error");
    }
  };

  const loadAgentCapabilities = async () => {
    try {
      const response = await apiRequest(`/api/ai/agents/${moduleType}/capabilities`) as any;
      if (response.success) {
        setAgentCapabilities(response.capabilities);
      }
    } catch (error) {
      console.error("Failed to load agent capabilities:", error);
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: "agent",
      content: `Hello! I'm your ${moduleName} AI Assistant. I can help you with real database operations:

**Interactive Commands:**
• "show customers" - Display all customers with details
• "create customer [name] with email [email]" - Add new customer
• "show materials" - View inventory items
• "create sales order for [customer]" - Start new order
• "edit customer [name]" - Modify customer details

**Business Questions:**
• Explain business processes and terminology
• Analyze your current data for insights
• Provide best practice recommendations

**Try saying:** "show customers" to see real data from your database!`,
      timestamp: new Date(),
      agentName: `${moduleName} Agent`
    };
    setMessages([welcomeMessage]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const context = {
        currentData,
        userRole,
        currentModule: moduleName
      };

      console.log("Sending request to:", `/api/ai/agents/${moduleType}/conversation`);
      console.log("Request payload:", {
        message: inputValue,
        context: {
          ...context,
          userRole: userRole || 'chief'
        }
      });

      const response = await fetch(`/api/ai/agents/${moduleType}/conversation`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          context: {
            ...context,
            userRole: userRole || 'chief'
          }
        })
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("AI Agent Response Data:", responseData);

      let agentContent = "";
      let agentName = "AI Assistant";

      if (responseData && responseData.success === true && responseData.response) {
        agentContent = responseData.response;
        agentName = responseData.agent || `${moduleName} Agent`;
        console.log("Using AI response:", agentContent.substring(0, 100));
      } else if (responseData && responseData.error === "AI_KEY_MISSING") {
        agentContent = "AI features require configuration. Please provide an OpenAI API key to enable intelligent assistance.";
        agentName = "System";
        console.log("API key missing");
      } else {
        agentContent = "I apologize, but I'm experiencing technical difficulties. Please try your question again.";
        agentName = "System";
        console.log("Using fallback response, responseData was:", responseData);
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: agentContent,
        timestamp: new Date(),
        agentName
      };
      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: "I apologize, but I'm experiencing technical difficulties. Please try your question again in a moment.",
        timestamp: new Date(),
        agentName: "System"
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeCurrentData = async () => {
    if (!currentData || isLoading) return;

    setIsLoading(true);
    
    const analysisMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: "Please analyze my current data and provide insights",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, analysisMessage]);

    try {
      const res = await apiRequest(`/api/ai/agents/${moduleType}/analyze`, {
        method: "POST",
        body: JSON.stringify({
          data: currentData,
          analysisType: "comprehensive"
        })
      });
      const response = await res.json();

      let agentContent = "";
      let agentName = "AI Assistant";
      
      console.log("Analysis Response:", response);
      
      if (response && response.success === true && (response.analysis || response.response)) {
        agentContent = response.analysis || response.response;
        agentName = response.agent || "AI Assistant";
        console.log("Using AI analysis:", agentContent.substring(0, 100));
      } else if (response && response.error === "AI_KEY_MISSING") {
        agentContent = "Analysis requires AI configuration. Please provide an OpenAI API key to enable data analysis features.";
        agentName = "System";
      } else {
        agentContent = "I apologize, but I'm experiencing technical difficulties. Please try your question again.";
        agentName = "System";
        console.log("Analysis fallback used, response was:", response);
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content: agentContent,
        timestamp: new Date(),
        agentName: response.agent || "AI Assistant"
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error("Error analyzing data:", error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusBadge = () => {
    switch (aiStatus) {
      case "healthy":
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Sparkles className="h-3 w-3 mr-1" />AI-Powered</Badge>;
      case "api_key_missing":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />API Key Required</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-600"><Bot className="h-3 w-3 mr-1" />Basic Mode</Badge>;
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span>{moduleIcons[moduleType as keyof typeof moduleIcons]} {moduleName} AI Assistant</span>
          <div className="ml-auto">
            {getStatusBadge()}
          </div>
        </CardTitle>
        
        {agentCapabilities && (
          <div className="flex flex-wrap gap-1 mt-2">
            {agentCapabilities.expertise.slice(0, 3).map((skill: string) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill.replace(/_/g, " ")}
              </Badge>
            ))}
            {agentCapabilities.expertise.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{agentCapabilities.expertise.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        <ScrollArea className="flex-1 pr-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-4 pr-2">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                {message.type === "agent" && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Brain className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === "user" 
                    ? "bg-blue-600 text-white ml-auto" 
                    : "bg-gray-100 text-gray-900"
                }`}>
                  {message.type === "agent" && message.agentName && (
                    <div className="text-xs text-gray-500 mb-1 font-medium">
                      {message.agentName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.type === "user" ? "text-blue-100" : "text-gray-500"
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.type === "user" && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-3">
          {currentData && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeCurrentData}
                disabled={isLoading}
                className="text-xs"
              >
                <Brain className="h-3 w-3 mr-1" />
                Analyze Current Data
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={`Ask your ${moduleName} AI assistant anything...\n\nTip: Use Shift+Enter for new lines, Enter to send`}
              disabled={isLoading}
              className="flex-1 min-h-[100px] max-h-[200px] resize-y p-3 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
              rows={4}
            />
            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {inputValue.length > 0 && `${inputValue.length} characters`}
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}