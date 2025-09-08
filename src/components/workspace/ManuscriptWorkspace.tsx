import { useState, useEffect } from "react";
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

// Suggestion types
type SuggestionType = "insert" | "delete" | "replace";
type SuggestionActor = "Tool" | "Editor" | "Author";
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [contentText, setContentText] = useState<string>("");
  const [busySuggestions, setBusySuggestions] = useState<Set<string>>(new Set());

  // Read-only state derived from manuscript status
  const isReviewed = manuscript?.status === "Reviewed";

  // Helper functions for suggestion processing
  const isOverlapping = (a: {start: number; end: number}, b: {start: number; end: number}) => {
    return !(a.end <= b.start || a.start >= b.end);
  };

  const byStartAsc = (a: {start: number}, b: {start: number}) => a.start - b.start;

  const applySuggestionPatch = (src: string, s: Suggestion): string => {
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

  const recalcOffsetsAfterPatch = (suggestions: Suggestion[], applied: Suggestion): Suggestion[] => {
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
      .sort(byStartAsc) as Suggestion[];
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

  // Create basic suggestions function
  const createBasicSuggestions = (contentText: string, opts: { 
    aiScope: "Entire Document" | "Current Section" | "Selected Text"; 
    aiChecks: { contradictions: boolean; repetitions: boolean } 
  }): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    let workingText = contentText;
    
    // Limit scope based on selection
    if (opts.aiScope === "Selected Text") {
      workingText = contentText.slice(0, 400); // First ~400 chars as fallback
    } else if (opts.aiScope === "Current Section") {
      workingText = contentText.slice(0, 800); // First ~800 chars
    } else {
      workingText = contentText.slice(0, 1500); // First ~1500 chars for performance
    }

    console.log("Working text length:", workingText.length);
    console.log("Working text sample:", workingText.slice(0, 200));

    let suggestionId = 1;
    
    // Add a simple test suggestion to ensure the function works
    suggestions.push({
      id: `suggestion-${suggestionId++}`,
      type: "replace",
      actor: "Tool",
      start: 0,
      end: 3,
      before: "But",
      after: "However",
      summary: "Use more formal transition",
      location: "Line 1"
    });
    
    // Add an insertion suggestion
    const periodIndex = workingText.indexOf('.');
    if (periodIndex > 0) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: "insert",
        actor: "Tool",
        start: periodIndex + 1,
        end: periodIndex + 1,
        before: "",
        after: " Additionally,",
        summary: "Add transitional phrase",
        location: `Line ${Math.floor(periodIndex / 50) + 1}`
      });
    }
    
    // Add a deletion suggestion for redundant words
    const redundantMatch = workingText.match(/\bthat are\b/i);
    if (redundantMatch && redundantMatch.index !== undefined) {
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: "delete",
        actor: "Tool",
        start: redundantMatch.index,
        end: redundantMatch.index + redundantMatch[0].length,
        before: redundantMatch[0],
        after: "",
        summary: "Remove redundant words",
        location: `Line ${Math.floor(redundantMatch.index / 50) + 1}`
      });
    }
    
    // Replace verbose words
    const utilizeMatches = [...workingText.matchAll(/\butilize\b/gi)];
    utilizeMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      suggestions.push({
        id: `suggestion-${suggestionId++}`,
        type: "replace",
        actor: "Tool",
        start,
        end,
        before: match[0],
        after: "use",
        summary: "Use simpler word",
        location: `Line ${Math.floor(start / 50) + 1}`
      });
    });

    // Replace "in order to"
    const inOrderMatches = [...workingText.matchAll(/\bin order to\b/gi)];
    inOrderMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      const overlapping = suggestions.some(s => 
        (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );
      if (!overlapping) {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: "replace",
          actor: "Tool",
          start,
          end,
          before: match[0],
          after: "to",
          summary: "Remove redundant phrase",
          location: `Line ${Math.floor(start / 50) + 1}`
        });
      }
    });

    // Fix double spaces
    const doubleSpaceMatches = [...workingText.matchAll(/  +/g)];
    doubleSpaceMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      const overlapping = suggestions.some(s => 
        (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );
      if (!overlapping) {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: "replace",
          actor: "Tool",
          start,
          end,
          before: match[0],
          after: " ",
          summary: "Remove extra spaces",
          location: `Line ${Math.floor(start / 50) + 1}`
        });
      }
    });

    // Fix space before punctuation
    const spacePuncMatches = [...workingText.matchAll(/ ([,.!?;:])/g)];
    spacePuncMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      const overlapping = suggestions.some(s => 
        (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );
      if (!overlapping) {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: "replace",
          actor: "Tool",
          start,
          end,
          before: match[0],
          after: match[1],
          summary: "Remove space before punctuation",
          location: `Line ${Math.floor(start / 50) + 1}`
        });
      }
    });

    // Capitalize after period
    const capitalizeMatches = [...workingText.matchAll(/\. ([a-z])/g)];
    capitalizeMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      const overlapping = suggestions.some(s => 
        (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );
      if (!overlapping) {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: "replace",
          actor: "Tool",
          start,
          end,
          before: match[0],
          after: ". " + match[1].toUpperCase(),
          summary: "Capitalize after period",
          location: `Line ${Math.floor(start / 50) + 1}`
        });
      }
    });

    // Replace straight quotes with typographic quotes
    const quoteMatches = [...workingText.matchAll(/"([^"]+)"/g)];
    quoteMatches.forEach(match => {
      if (suggestions.length >= 8) return;
      const start = match.index || 0;
      const end = start + match[0].length;
      const overlapping = suggestions.some(s => 
        (start >= s.start && start < s.end) || (end > s.start && end <= s.end)
      );
      if (!overlapping) {
        suggestions.push({
          id: `suggestion-${suggestionId++}`,
          type: "replace",
          actor: "Tool",
          start,
          end,
          before: match[0],
          after: `"${match[1]}"`,
          summary: "Use typographic quotes",
          location: `Line ${Math.floor(start / 50) + 1}`
        });
      }
    });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  };

  // Stub completion callback
  const onAIPassComplete = () => {
    if (!manuscript) return;
    
    console.log("AI Pass - Manuscript content:", contentText);
    const newSuggestions = createBasicSuggestions(contentText, {
      aiScope,
      aiChecks
    });
    
    console.log("AI Pass - Generated suggestions:", newSuggestions);
    setSuggestions(newSuggestions);
    
    if (newSuggestions.length === 0) {
      toast({
        title: "No issues found (stub)",
        description: "The AI pass completed without finding any issues to address."
      });
    }
  };

  // Handle Run AI Pass
  const handleRunAIPass = () => {
    setShowRunAIModal(false);
    setShowToolRunning(true);
    
    setTimeout(() => {
      setShowToolRunning(false);
      onAIPassComplete();
    }, 1500);
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