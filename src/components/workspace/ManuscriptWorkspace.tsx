import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useManuscripts } from "@/contexts/ManuscriptsContext";
import { 
  ArrowLeft, 
  RotateCcw, 
  Settings2, 
  Play, 
  Download, 
  Send,
  User,
  SettingsIcon,
  Filter,
  MessageSquare,
  AlertTriangle,
  Plus,
  ChevronDown,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentCanvas } from "./DocumentCanvas";

const ManuscriptWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { manuscripts } = useManuscripts();
  const [manuscript, setManuscript] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("changes");
  const [showRunAIModal, setShowRunAIModal] = useState(false);
  const [showStyleRules, setShowStyleRules] = useState(false);
  const [showToolRunning, setShowToolRunning] = useState(false);

  useEffect(() => {
    const found = manuscripts.find(m => m.id === id);
    if (!found) {
      navigate("/dashboard");
      return;
    }
    setManuscript(found);
  }, [id, navigate, manuscripts]);

  if (!manuscript) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header id="header" className="border-b border-border bg-white">
        {/* Header Row 1 - Navigation & Actions */}
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left: Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button 
              onClick={() => navigate("/dashboard")}
              className="hover:text-foreground transition-colors"
            >
              Manuscripts
            </button>
            <span>&gt;</span>
            <span className="text-foreground font-medium">{manuscript.title}</span>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-dashed">
              Switch
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowStyleRules(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Style Rules
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowRunAIModal(true)}>
              <Play className="mr-2 h-4 w-4" />
              Run AI Pass
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Send className="mr-2 h-4 w-4" />
              Send to Author
            </Button>
          </div>
        </div>

        {/* Header Row 2 - Status Information */}
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Large manuscript title */}
          <h1 className="text-3xl font-semibold text-foreground">{manuscript.title}</h1>

          {/* Right: Status badges and metadata */}
          <div className="flex items-center gap-4">
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Round {manuscript.round}
            </Badge>
            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
              With Editor
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{manuscript.owner}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SettingsIcon className="h-4 w-4" />
              <span>Current turn</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="h-[calc(100vh-81px)] flex">
        {/* Document Canvas - Left Column */}
        <div id="document-canvas" className="flex-1 overflow-hidden">
          <DocumentCanvas manuscript={manuscript} />
        </div>

        {/* Right Sidebar */}
        <div id="right-sidebar" className="w-80 bg-muted border-l border-border overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab List */}
            <TabsList className="grid w-full grid-cols-4 rounded-none bg-muted">
              <TabsTrigger value="changes" className="text-xs">Changes</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
              <TabsTrigger value="checks" className="text-xs">Checks</TabsTrigger>
              <TabsTrigger value="new-content" className="text-xs">New Content</TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="changes" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Filter controls */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        All actors
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        All types
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    {/* Change cards */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">Insertion</Badge>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Line {10 + i}, paragraph {i}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs">Accept</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="comments" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-sm font-medium">Editor</span>
                          <span className="text-xs text-muted-foreground">2h ago</span>
                        </div>
                        <p className="text-sm mb-2">This section needs clarification.</p>
                        <p className="text-xs text-muted-foreground mb-3">Line {5 + i}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs">Reply</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Resolve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="checks" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Potential issue detected</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Line {8 + i}: Consider revising for clarity
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="new-content" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Plus className="h-4 w-4 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">New paragraph added</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              After line {12 + i}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Run AI Settings Modal */}
      <Dialog open={showRunAIModal} onOpenChange={setShowRunAIModal}>
        <DialogContent id="run-ai-modal" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Run AI Pass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Scope Selection</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="scope" defaultChecked />
                  <span className="text-sm">Entire document</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="scope" />
                  <span className="text-sm">Selected text only</span>
                </label>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Active Rules</h4>
              <p className="text-xs text-muted-foreground">Grammar, spelling, style consistency</p>
            </div>
            <Button 
              onClick={() => {
                setShowRunAIModal(false);
                setShowToolRunning(true);
              }}
              className="w-full"
            >
              Start AI Pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Style Rules Sheet */}
      <Sheet open={showStyleRules} onOpenChange={setShowStyleRules}>
        <SheetContent id="style-rules-sheet" className="w-96">
          <SheetHeader>
            <SheetTitle>Style Rules</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-6">
            <div className="space-y-6">
              {['Grammar', 'Style', 'Formatting', 'Citations'].map((category) => (
                <div key={category}>
                  <h4 className="font-medium mb-3">{category}</h4>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <label key={i} className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked={i <= 2} />
                        <span className="text-sm">{category} rule {i}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Tool Running Progress Modal */}
      <Dialog open={showToolRunning} onOpenChange={setShowToolRunning}>
        <DialogContent id="tool-running-modal" className="max-w-md">
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">AI Pass in Progress</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing manuscript for improvements...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManuscriptWorkspace;