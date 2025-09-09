import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { mapPlainTextToPM, type UISuggestion } from "@/lib/suggestionMapper";
import { suggestionsPluginKey } from "@/lib/suggestionsPlugin";

// Suggestion types
type SuggestionType = "insert" | "delete" | "replace";
type SuggestionCategory = "grammar" | "spelling" | "style";
type SuggestionActor = "Tool" | "Editor" | "Author";

type ServerSuggestion = {
  id: string;
  type: SuggestionType;
  start: number;
  end: number;
  before: string;
  after: string;
  category: SuggestionCategory;
  note: string;
  location?: string;
};

type Suggestion = {
  id: string;
  type: SuggestionType;
  actor: SuggestionActor;
  start: number;
  end: number;
  before: string;
  after: string;
  summary: string;
  location: string;
};
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
import { ChangeList } from "./ChangeList";
import { getEditorPlainText, mapAndRefreshSuggestions } from "@/lib/editorUtils";
import { supabase } from "@/integrations/supabase/client";

const ManuscriptWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getManuscriptById, updateManuscript } = useManuscripts();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("changes");
  const [showRunAIModal, setShowRunAIModal] = useState(false);
  const [showStyleRules, setShowStyleRules] = useState(false);
  const [showToolRunning, setShowToolRunning] = useState(false);
  
  // Run AI Settings state
  const [aiScope, setAiScope] = useState<"Entire Document" | "Current Section" | "Selected Text">("Entire Document");
  const [aiChecks, setAiChecks] = useState({ contradictions: true, repetitions: true });
  const [styleRules, setStyleRules] = useState<string[]>(["Serial Comma", "Punctuation Inside Quotes", "Capitalize Proper Nouns"]);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<ServerSuggestion[]>([]);
  const [uiSuggestions, setUISuggestions] = useState<UISuggestion[]>([]);
  const [contentText, setContentText] = useState<string>("");
  const [busySuggestions, setBusySuggestions] = useState<Set<string>>(new Set());

  // Read-only state derived from manuscript status
  const isReviewed = manuscript?.status === "Reviewed";

  // Memoized function to get current UI suggestions
  const getUISuggestions = useCallback(() => {
    console.log('getUISuggestions called, returning', uiSuggestions.length, 'suggestions');
    return uiSuggestions;
  }, [uiSuggestions]);

  // Helper functions for suggestion processing
  const isOverlapping = (a: {start: number; end: number}, b: {start: number; end: number}) => {
    return !(a.end <= b.start || a.start >= b.end);
  };

  const byStartAsc = (a: {start: number}, b: {start: number}) => a.start - b.start;

  const applySuggestionPatch = (src: string, s: ServerSuggestion): string => {
    // Integrity check: for delete/replace, ensure src.slice(s.start, s.end) === s.before
    if ((s.type === "delete" || s.type === "replace") && src.slice(s.start, s.end) !== s.before) {
      return null; // Signal integrity failure
    }
    
    if (s.type === "insert") {
      return src.slice(0, s.start) + s.after + src.slice(s.start);
    }
    if (s.type === "delete") {
      return src.slice(0, s.start) + src.slice(s.end);
    }
    // replace
    return src.slice(0, s.start) + s.after + src.slice(s.end);
  };

  const recalcOffsetsAfterPatch = (suggestions: ServerSuggestion[], applied: ServerSuggestion): ServerSuggestion[] => {
    const delta =
      applied.type === "insert"
        ? applied.after.length
        : applied.type === "delete"
        ? -applied.before.length
        : applied.after.length - applied.before.length;

    return suggestions
      .filter(s => s.id !== applied.id)
      .map(s => {
        // Drop overlapping suggestions
        const overlaps = isOverlapping(s, applied);
        if (overlaps) {
          console.info('Dropped overlapping suggestion', { id: s.id });
          return null;
        }

        // Shift suggestions that occur after the applied change
        if (s.start >= applied.end) {
          return { ...s, start: s.start + delta, end: s.end + delta };
        }
        return s;
      })
      .filter(Boolean)
      .sort(byStartAsc) as ServerSuggestion[];
  };

  // Accept/Reject handlers
  const handleAcceptSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || busySuggestions.has(suggestionId)) return;

    // Set busy state
    setBusySuggestions(prev => new Set(prev).add(suggestionId));

    try {
      // Apply the suggestion patch to contentText with integrity check
      const newContentText = applySuggestionPatch(contentText, suggestion);
      
      if (newContentText === null) {
        // Integrity check failed
        const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId).sort(byStartAsc);
        setSuggestions(updatedSuggestions);
        
        toast({
          title: "Suggestion no longer matches the text; skipped.",
          variant: "destructive"
        });
        return;
      }

      setContentText(newContentText);

      // Recalculate offsets for remaining suggestions
      const updatedSuggestions = recalcOffsetsAfterPatch(suggestions, suggestion);
      setSuggestions(updatedSuggestions);

      // Scroll and highlight the applied change
      setTimeout(() => {
        const element = document.getElementById(`suggestion-span-${suggestionId}`);
        if (element) {
          element.scrollIntoView({ block: 'center', behavior: 'smooth' });
          element.classList.add('ring-2', 'ring-primary');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary');
          }, 800);
        }
      }, 100);

      toast({
        title: "Change applied."
      });
    } finally {
      setBusySuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || busySuggestions.has(suggestionId)) return;

    // Set busy state
    setBusySuggestions(prev => new Set(prev).add(suggestionId));

    try {
      // Remove the suggestion without changing contentText
      const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId).sort(byStartAsc);
      setSuggestions(updatedSuggestions);

      toast({
        title: "Change dismissed."
      });
    } finally {
      setBusySuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  };

  // Create basic suggestions function (removed - now using real API)
  // This function has been removed since we're using the real /api/suggest endpoint

  // Stub completion callback (now unused since we call API directly)
  const onAIPassComplete = () => {
    // This function is no longer used since handleRunAIPass calls the API directly
  };

  // Handle Run AI Pass
  const handleRunAIPass = async () => {
    setShowRunAIModal(false);
    setShowToolRunning(true);
    
    try {
      const text = getEditorPlainText();
      const scope = 
        aiScope === "Entire Document" ? "entire" :
        aiScope === "Current Section" ? "section" : "selection";
      const rules = Array.isArray(styleRules) ? styleRules : [];

      const { data, error } = await supabase.functions.invoke('suggest', {
        body: { text, scope, rules }
      });

      if (error) {
        let msg = error.message || "Server error";
        let title = "AI request failed";
        
        // Handle specific error types
        if (error.message?.includes('timeout') || error.message?.includes('504')) {
          title = "Request timed out";
          msg = "The text is too long to process. Try selecting a smaller section or current section instead.";
        } else if (error.message?.includes('429')) {
          title = "Rate limit exceeded";
          msg = "Please wait a moment before trying again.";
        }
        
        toast({
          title,
          description: msg,
          variant: "destructive"
        });
        return;
      }

      const serverSuggestions = data?.suggestions || [];
      setSuggestions(Array.isArray(serverSuggestions) ? serverSuggestions : []);
      
      // Map suggestions to UI suggestions and trigger plugin refresh
      mapAndRefreshSuggestions(serverSuggestions, setUISuggestions);
      
      toast({
        title: `Found ${serverSuggestions.length} suggestion${serverSuggestions.length === 1 ? "" : "s"}.`
      });
    } catch (e) {
      console.error('AI request failed:', e);
      toast({
        title: "AI request failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setShowToolRunning(false);
    }
  };

  // Handle Mark Reviewed
  const handleMarkReviewed = () => {
    if (!manuscript || manuscript.status === "Reviewed") return;

    updateManuscript(manuscript.id, {
      status: "Reviewed",
      ballInCourt: "None",
      updatedAt: new Date().toISOString()
    });

    // Update local state
    setManuscript(prev => prev ? {
      ...prev,
      status: "Reviewed",
      ballInCourt: "None",
      updatedAt: new Date().toISOString()
    } : null);

    // Clear pending suggestions
    setSuggestions([]);

    toast({
      title: "Marked as Reviewed — document is now read-only."
    });
  };

  useEffect(() => {
    if (!id) {
      navigate("/dashboard");
      return;
    }
    
    const found = getManuscriptById(id);
    if (!found) {
      setNotFound(true);
      return;
    }
    
    setManuscript(found);
    setContentText(found.contentText);
    setNotFound(false);
  }, [id, navigate, getManuscriptById]);

  const getStatusBadgeVariant = (status: Manuscript["status"]) => {
    switch (status) {
      case "In Review":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "With Author":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case "Tool Pending":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "Reviewed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Manuscript not found</h1>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!manuscript) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header id="header" className="border-b border-border bg-white">
        {/* Header Row 1 - Navigation & Actions */}
        <div className="px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <button 
              onClick={() => navigate("/dashboard")}
              className="hover:text-foreground transition-colors flex-shrink-0"
            >
              Manuscripts
            </button>
            <span className="flex-shrink-0">&gt;</span>
            <span className="text-foreground font-medium truncate">{manuscript.title}</span>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="border-dashed hidden sm:flex">
              Switch
            </Button>
            <Button variant="outline" size="sm" className="hidden lg:flex">
              <RotateCcw className="mr-2 h-4 w-4" />
              History
            </Button>
            {!isReviewed && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowStyleRules(true)} className="hidden lg:flex">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span className="hidden xl:inline">Style Rules</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowRunAIModal(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Run AI Pass</span>
                </Button>
              </>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleMarkReviewed}
              disabled={isReviewed || busySuggestions.size > 0}
              data-testid="mark-reviewed-btn"
            >
              {isReviewed ? "Reviewed" : "Mark Reviewed"}
            </Button>
            <Button variant="outline" size="sm" className="hidden lg:flex">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden xl:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" className="hidden lg:flex">
              <Send className="mr-2 h-4 w-4" />
              <span className="hidden xl:inline">Send to Author</span>
            </Button>
          </div>
        </div>

        {/* Header Row 2 - Status Information */}
        <div className="px-4 lg:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Large manuscript title */}
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground truncate flex-1 min-w-0">{manuscript.title}</h1>

          {/* Right: Status badges and metadata */}
          <div className="flex items-center gap-2 lg:gap-4 flex-wrap lg:flex-nowrap flex-shrink-0">
            <Badge className={getStatusBadgeVariant(manuscript.status)}>
              Round {manuscript.round}
            </Badge>
            <Badge className={getStatusBadgeVariant(manuscript.status)}>
              {manuscript.status}
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
      <div className="h-[calc(100vh-160px)] flex flex-col lg:flex-row">
        {/* Document Canvas - Left Column */}
        <div id="document-canvas" className="flex-1 min-h-0 overflow-hidden">
          {isReviewed && (
            <div 
              data-testid="reviewed-banner" 
              className="bg-green-50 border-b border-green-200 px-4 lg:px-6 py-2 text-sm text-green-800"
            >
              Reviewed — read-only
            </div>
          )}
          <DocumentCanvas 
            manuscript={{...manuscript, contentText}} 
            suggestions={isReviewed ? [] : suggestions}
            isReadOnly={isReviewed}
            getUISuggestions={getUISuggestions}
          />
        </div>

        {/* Right Sidebar */}
        <div id="right-sidebar" className="w-full lg:w-80 bg-muted border-t lg:border-t-0 lg:border-l border-border overflow-hidden flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tab List */}
            <TabsList className="grid w-full grid-cols-4 rounded-none bg-muted">
              <TabsTrigger value="changes" className="text-xs px-2">Changes</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs px-2">Comments</TabsTrigger>
              <TabsTrigger value="checks" className="text-xs px-2">Checks</TabsTrigger>
              <TabsTrigger value="new-content" className="text-xs px-1">New</TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <TabsContent value="changes" className="h-full mt-0">
                <ChangeList 
                  suggestions={isReviewed ? [] : suggestions}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  busySuggestions={busySuggestions}
                  isReviewed={isReviewed}
                />
              </TabsContent>

              <TabsContent value="comments" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {manuscript.comments?.map((comment) => (
                      <div key={comment.id} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">2h ago</span>
                        </div>
                        <p className="text-sm mb-2">{comment.text}</p>
                        <p className="text-xs text-muted-foreground mb-3">{comment.location}</p>
                        {comment.replies?.map((reply) => (
                          <div key={reply.id} className="ml-4 mt-2 p-2 bg-muted rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{reply.author}</span>
                            </div>
                            <p className="text-xs">{reply.text}</p>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs">Reply</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Resolve</Button>
                        </div>
                      </div>
                    )) || [1, 2].map((i) => (
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
                    {manuscript.checks?.map((check) => (
                      <div key={check.id} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                            check.severity === "warn" ? "text-amber-500" : "text-blue-500"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {check.severity === "warn" ? "Warning" : "Information"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {check.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) || [1, 2, 3].map((i) => (
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
                    {manuscript.newContent?.map((content) => (
                      <div key={content.id} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Plus className="h-4 w-4 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{content.snippet}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {content.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) || [1, 2].map((i) => (
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
        <DialogContent id="run-ai-modal" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Run AI Editing Pass</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Configure the scope and checks for the AI editing pass.
            </p>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Scope Selection Section */}
            <div id="run-ai-scope">
              <h4 className="text-sm font-medium mb-3">Scope</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="scope" 
                    checked={aiScope === "Entire Document"}
                    onChange={() => setAiScope("Entire Document")}
                  />
                  <span className="text-sm">Entire Document</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="scope" 
                    checked={aiScope === "Current Section"}
                    onChange={() => setAiScope("Current Section")}
                  />
                  <span className="text-sm">Current Section</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="scope" 
                    checked={aiScope === "Selected Text"}
                    onChange={() => setAiScope("Selected Text")}
                  />
                  <span className="text-sm">Selected Text</span>
                </label>
              </div>
            </div>

            {/* Assistive Checks Section */}
            <div id="run-ai-checks">
              <h4 className="text-sm font-medium mb-3">Checks to Perform</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={aiChecks.contradictions}
                    onChange={() => setAiChecks(prev => ({ ...prev, contradictions: !prev.contradictions }))}
                  />
                  <span className="text-sm">Flag potential contradictions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={aiChecks.repetitions}
                    onChange={() => setAiChecks(prev => ({ ...prev, repetitions: !prev.repetitions }))}
                  />
                  <span className="text-sm">Flag repetitions</span>
                </label>
              </div>
            </div>

            {/* Active Style Rules Section */}
            <div id="run-ai-style-rules">
              <h4 className="text-sm font-medium mb-3">Active Style Rules</h4>
              <div className="flex flex-wrap gap-1">
                {styleRules.length > 0 ? (
                  styleRules.map((rule, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {rule}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No active rules</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <Button 
              id="run-ai-cancel"
              variant="outline" 
              onClick={() => setShowRunAIModal(false)}
            >
              Cancel
            </Button>
            <Button 
              id="run-ai-run"
              className="bg-black text-white hover:bg-black/90"
              onClick={handleRunAIPass}
            >
              Run
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