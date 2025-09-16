import { useState, useEffect, useCallback, useRef } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { mapPlainTextToPM, type UISuggestion } from "@/lib/suggestionMapper";
import type { ServerSuggestion, SuggestionType, SuggestionCategory, SuggestionActor } from "@/lib/types";
import { createSuggestionId, sanitizeNote } from "@/lib/types";
import { suggestionsPluginKey } from "@/lib/suggestionsPlugin";
import { checksPluginKey } from "@/lib/checksPlugin";
import { getGlobalEditor, getEditorPlainText, mapAndRefreshSuggestions } from "@/lib/editorUtils";
import { useToast } from "@/hooks/use-toast";
import { STYLE_RULES, DEFAULT_STYLE_RULES, type StyleRuleKey } from "@/lib/styleRuleConstants";
import { useActiveStyleRules } from "@/hooks/useActiveStyleRules";
import { type CheckItem, runDeterministicChecks } from "@/lib/styleValidator";

// Remove old type definitions - now using unified types from types.ts
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
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  PanelRightOpen
} from "lucide-react";
import { DocumentCanvas } from "./DocumentCanvas";
import { ChangeList } from "./ChangeList";
import { ChecksList } from "./ChecksList";
import { ProcessingStatus } from "./ProcessingStatus";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

const ManuscriptWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getManuscriptById, updateManuscript, refreshManuscripts } = useManuscripts();
  const isMobile = useIsMobile();
  
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [activeTab, setActiveTab] = useState("changes");
  const [showRunAIModal, setShowRunAIModal] = useState(false);
  const [showStyleRules, setShowStyleRules] = useState(false);
  const [showToolRunning, setShowToolRunning] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [tempStyleRules, setTempStyleRules] = useState<StyleRuleKey[]>([]); // For the sheet
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  
  // Run AI Settings state
  const [aiScope, setAiScope] = useState<"Entire Document" | "Current Section" | "Selected Text">("Entire Document");
  const [aiChecks, setAiChecks] = useState({ contradictions: true, repetitions: true });
  
  // Suggestions state - now using unified types
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [contentText, setContentText] = useState<string>("");
  const [busySuggestions, setBusySuggestions] = useState<Set<string>>(new Set());
  const [busyChecks, setBusyChecks] = useState<Set<string>>(new Set());
  
  // Style checks state
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const checksRef = useRef<CheckItem[]>([]);

  // Highlight toggles state
  const [showChecks, setShowChecks] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Decoration caps state
  const [maxVisibleChecks, setMaxVisibleChecks] = useState(200);
  const [maxVisibleAI, setMaxVisibleAI] = useState(200);

  // Style Rules Management
  const activeStyleRules = useActiveStyleRules(manuscript?.id || "");
  
  // Read-only state derived from manuscript status
  const isReviewed = manuscript?.status === "Reviewed";
  
  const handleOpenStyleRules = () => {
    setTempStyleRules(activeStyleRules);
    setShowStyleRules(true);
  };

  const handleSaveStyleRules = () => {
    if (!manuscript) return;
    
    updateManuscript(manuscript.id, {
      style_rules: tempStyleRules
    });
    
    // Update local state
    setManuscript(prev => prev ? {
      ...prev,
      styleRules: tempStyleRules,
      updatedAt: new Date().toISOString()
    } : null);
    
    setShowStyleRules(false);
    toast({
      title: "Style rules updated."
    });
  };

  const refreshChecksWithResults = (newChecks: CheckItem[]) => {
    console.log('Refreshing checks with results:', newChecks);
    const editor = getGlobalEditor();
    if (!editor) return;
    
    // Update ref immediately for plugin access
    checksRef.current = newChecks;
    
    // Update state for UI
    setChecks(newChecks);
    
    // Refresh decorations with fresh data
    editor.view?.dispatch(editor.state.tr.setMeta(checksPluginKey, "refresh"));
    console.log('Decorations refreshed with', newChecks.length, 'checks');
  };

  const handleRunChecks = () => {
    console.log('handleRunChecks called');
    const editor = getGlobalEditor();
    if (!editor) {
      console.log('No editor found');
      return;
    }
    
    console.log('Running checks with rules:', activeStyleRules);
    const results = runDeterministicChecks(editor, activeStyleRules);
    console.log('Check results:', results);
    refreshChecksWithResults(results);
  };

  const handleJumpToCheck = (check: CheckItem) => {
    const el = document.getElementById(`check-span-${check.id}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("ring-2", "ring-yellow-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400"), 800);
    } else if (check.pmFrom !== undefined) {
      const editor = getGlobalEditor();
      if (editor) {
        editor.commands.focus();
        editor.commands.setTextSelection(check.pmFrom);
        editor.view.focus();
      }
    }
  };

  const handleCancelStyleRules = () => {
    setShowStyleRules(false);
  };

  const toggleStyleRule = (ruleKey: StyleRuleKey) => {
    setTempStyleRules(prev => 
      prev.includes(ruleKey) 
        ? prev.filter(r => r !== ruleKey)
        : [...prev, ruleKey]
    );
  };

  // Use ref to hold current suggestions so plugin can always access them
  const suggestionsRef = useRef<UISuggestion[]>([]);
  
  // Update ref when suggestions change
  useEffect(() => {
    suggestionsRef.current = suggestions;
    console.log('Updated suggestionsRef with', suggestions.length, 'suggestions');
    
    // Refresh plugin when suggestions change
    if (suggestions.length > 0) {
      const editor = getGlobalEditor();
      if (editor) {
        console.log('Force refreshing plugin with', suggestions.length, 'suggestions');
        editor.view.dispatch(
          editor.state.tr.setMeta(suggestionsPluginKey, "refresh")
        );
      }
    }
  }, [suggestions]);

  // Callback that always returns current suggestions from ref (with toggle respect)
  const getUISuggestions = useCallback(() => {
    console.log('getUISuggestions called, returning', suggestionsRef.current.length, 'suggestions from ref, showSuggestions:', showSuggestions);
    return showSuggestions ? suggestionsRef.current : [];
  }, [showSuggestions]); // Dependencies include toggle state

  // Callback that returns current checks from ref (with toggle respect)
  const getChecks = useCallback(() => {
    console.log('getChecks called, returning', checksRef.current.length, 'checks from ref, showChecks:', showChecks);
    return showChecks ? checksRef.current : [];
  }, [showChecks]); // Dependencies include toggle state

  // TipTap Transaction Helper Functions
  const withEditorTransaction = (editor: any, fn: (tr: any) => void) => {
    const { state, view } = editor;
    let tr = state.tr;
    fn(tr);
    view.dispatch(tr);
  };

  const getPMText = (editor: any, from: number, to: number): string => {
    const { state } = editor;
    return state.doc.textBetween(from, to, "\n", "\n");
  };

  // Helper to set busy state for individual suggestions
  const setActionBusy = (suggestionId: string, busy: boolean) => {
    setBusySuggestions(prev => {
      const newSet = new Set(prev);
      if (busy) {
        newSet.add(suggestionId);
      } else {
        newSet.delete(suggestionId);
      }
      return newSet;
    });
  };

  // Accept/Reject handlers using TipTap transactions
  const handleAcceptSuggestion = async (suggestionId: string) => {
    const editor = getGlobalEditor();
    if (!editor) return;

    const uiSuggestion = suggestions.find(s => s.id === suggestionId);
    if (!uiSuggestion || busySuggestions.has(suggestionId)) return;

    // Disable buttons for this card while processing
    setActionBusy(suggestionId, true);

    try {
      // Optional integrity check (delete/replace): current text matches 'before'
      if (uiSuggestion.type !== "insert") {
        const current = getPMText(editor, uiSuggestion.pmFrom, uiSuggestion.pmTo);
        if (current !== uiSuggestion.before) {
          toast({
            title: "Suggestion no longer matches the text; skipped.",
            variant: "destructive"
          });
          // Treat as reject & bail
          handleRejectSuggestion(suggestionId);
          return;
        }
      }

      // Apply the patch via TipTap commands (more reliable than direct transactions)
      if (uiSuggestion.type === "insert") {
        editor.commands.insertContentAt(uiSuggestion.pmFrom, uiSuggestion.after);
      } else if (uiSuggestion.type === "delete") {
        editor.commands.deleteRange({ from: uiSuggestion.pmFrom, to: uiSuggestion.pmTo });
      } else {
        // Replace: delete range then insert new content
        editor.commands.deleteRange({ from: uiSuggestion.pmFrom, to: uiSuggestion.pmTo });
        editor.commands.insertContentAt(uiSuggestion.pmFrom, uiSuggestion.after);
      }

      console.log('Accepting suggestion:', suggestionId, 'at positions', uiSuggestion.pmFrom, uiSuggestion.pmTo);
      
      // Remove only the specific suggestion (find by ID + position for uniqueness)
      setSuggestions(prev => {
        const filtered = prev.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
        console.log('Filtered suggestions from', prev.length, 'to', filtered.length);
        return filtered;
      });

      // Re-map remaining server suggestions' positions against the UPDATED doc
      const remaining = suggestions.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
      console.log('Remapping', remaining.length, 'remaining suggestions');
      
      // Only remap server-originated suggestions  
      const serverSuggestions = remaining.filter((s): s is ServerSuggestion & { pmFrom: number; pmTo: number } => s.origin === 'server');
      if (serverSuggestions.length > 0) {
        const plainText = editor.getText();
        const remapped = mapPlainTextToPM(editor, plainText, serverSuggestions);
        // Merge with manual suggestions that don't need remapping
        const manualSuggestions = remaining.filter(s => s.origin === 'manual');
        setSuggestions([...remapped, ...manualSuggestions]);
      }

      toast({
        title: "Change applied."
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Failed to apply change.",
        variant: "destructive"
      });
    } finally {
      setActionBusy(suggestionId, false);
    }
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    const editor = getGlobalEditor();
    if (!editor) return;

    const uiSuggestion = suggestions.find(s => s.id === suggestionId);
    if (!uiSuggestion) return;

    setActionBusy(suggestionId, true);
    try {
      console.log('Rejecting suggestion:', suggestionId, 'at positions', uiSuggestion.pmFrom, uiSuggestion.pmTo);
      
      // Remove only the specific suggestion (find by ID + position for uniqueness)
      setSuggestions(prev => {
        const filtered = prev.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
        console.log('Filtered suggestions from', prev.length, 'to', filtered.length);
        return filtered;
      });

      // Refresh decorations
      editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));

      toast({
        title: "Change dismissed."
      });
    } finally {
      setActionBusy(suggestionId, false);
    }
  };

  // Handler for accepting a check (remove it from the list)
  const handleAcceptCheck = (checkId: string) => {
    console.log('Accepting check:', checkId);
    setBusyChecks(prev => new Set(prev).add(checkId));
    
    try {
      // Remove check from the list
      setChecks(prev => prev.filter(check => check.id !== checkId));
      
      // You could also apply the suggested fix here if checks had fix suggestions
      // For now, we just remove the check
      
      console.log('Check accepted successfully:', checkId);
      toast({
        title: "Check accepted."
      });
    } catch (error) {
      console.error('Error accepting check:', error);
      toast({
        title: "Failed to accept check.",
        variant: "destructive"
      });
    } finally {
      setBusyChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(checkId);
        return newSet;
      });
    }
  };

  // Handler for rejecting a check (remove it from the list)
  const handleRejectCheck = (checkId: string) => {
    console.log('Rejecting check:', checkId);
    setBusyChecks(prev => new Set(prev).add(checkId));
    
    try {
      // Remove check from the list (rejecting means ignoring the issue)
      setChecks(prev => prev.filter(check => check.id !== checkId));
      
      console.log('Check rejected successfully:', checkId);
      toast({
        title: "Check dismissed."
      });
    } catch (error) {
      console.error('Error rejecting check:', error);
      toast({
        title: "Failed to reject check.",
        variant: "destructive"
      });
    } finally {
      setBusyChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(checkId);
        return newSet;
      });
    }
  };

  // Manual suggestion creation
  const createManualSuggestion = useCallback((data: { mode: SuggestionType; after: string; note: string }) => {
    const editor = getGlobalEditor();
    if (!editor) return;

    const { state } = editor;
    const { from, to } = state.selection;
    const before = state.doc.textBetween(from, to, "\n", "\n");
    const id = createSuggestionId("manual");

    // Validate payload
    if (data.mode !== "insert" && from === to) {
      toast({
        title: "Select text to replace/delete.",
        variant: "destructive"
      });
      return;
    }
    
    if ((data.mode === "insert" || data.mode === "replace") && !data.after?.length) {
      toast({
        title: "Enter replacement text.",
        variant: "destructive"
      });
      return;
    }

    const suggestion: UISuggestion = {
      id,
      type: data.mode,
      origin: "manual",
      pmFrom: from,
      pmTo: to,
      before,
      after: data.mode === "delete" ? "" : data.after,
      category: "manual",
      note: data.note || (data.mode === "insert" ? "Insert text" : data.mode === "delete" ? "Delete text" : "Replace text"),
      actor: "Editor"
    };

    // Add to suggestions list
    setSuggestions(prev => [...prev, suggestion]);
    
    // Refresh decorations
    const tr = editor.state.tr.setMeta(suggestionsPluginKey, "refresh");
    editor.view.dispatch(tr);
    
    toast({
      title: "Suggestion added."
    });
  }, [toast]);

  // Position remapping for document changes
  useEffect(() => {
    const editor = getGlobalEditor();
    if (!editor) return;

    const originalDispatch = editor.view.dispatch;
    
    editor.view.dispatch = (tr: any) => {
      originalDispatch(tr);
      
      // If document changed, remap suggestion positions
      if (tr.docChanged && suggestions.length > 0) {
        setSuggestions(prev => prev.map(s => {
          const from = tr.mapping.map(s.pmFrom);
          const to = tr.mapping.map(s.pmTo);
          return { ...s, pmFrom: from, pmTo: Math.max(from, to) };
        }));
        
        // Refresh decorations after remapping
        setTimeout(() => {
          const refreshTr = editor.state.tr.setMeta(suggestionsPluginKey, "refresh");
          editor.view.dispatch(refreshTr);
        }, 0);
      }
    };

    // Cleanup
    return () => {
      if (editor?.view) {
        editor.view.dispatch = originalDispatch;
      }
    };
  }, [suggestions.length]); // Re-run when suggestions count changes

  // Handle Run AI Pass
  const handleRunAIPass = async () => {
    setShowRunAIModal(false);
    setShowToolRunning(true);
    
    try {
      const text = getEditorPlainText();
      
      // Warn for very large documents
      if (text.length > 100000) {
        toast({
          title: "Large document detected",
          description: "This may take several minutes to process. Consider selecting a smaller section.",
          variant: "default"
        });
      }
      
      const scope = 
        aiScope === "Entire Document" ? "entire" :
        aiScope === "Current Section" ? "section" : "selection";
      const rules = activeStyleRules;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      const { data, error } = await supabase.functions.invoke('suggest', {
        body: { text, scope, rules }
      });
      
      clearTimeout(timeout);
      
      if (controller.signal.aborted) {
        throw new Error('Request timeout - document too large');
      }

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
        } else if (error.message?.includes('422') || error.message?.includes('invalid_response') || error.message?.includes('AI service temporarily unavailable')) {
          title = "AI processing error";
          msg = "The AI service encountered an error processing your text. Please try again or try a smaller section.";
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('timeout') || error.message?.includes('aborted')) {
          title = "Request timeout";
          msg = "The document is too large to process completely. Try selecting a smaller section or current section instead.";
        }
        
        toast({
          title,
          description: msg,
          variant: "destructive"
        });
        return;
      }

      // Map to server suggestions with origin field for AI suggestions
      const serverSuggestions = (data?.suggestions || []).map((s: any) => ({
        ...s,
        origin: 'server' as const,
        actor: 'Tool' as const
      }));
      
      // Map suggestions to UI suggestions using the SAME text that was sent to AI
      const editor = getGlobalEditor();
      const mapped = mapPlainTextToPM(editor, text, serverSuggestions);
      console.log('About to set UI suggestions:', mapped.length);
      setSuggestions(mapped);
      
      toast({
        title: `Found ${serverSuggestions.length} suggestion${serverSuggestions.length === 1 ? "" : "s"}.`
      });
    } catch (e: any) {
      console.error('AI request failed:', e);
      
      let title = "AI request failed";
      let msg = "Please try again.";
      
      if (e.message?.includes('aborted') || e.name === 'AbortError' || e.message?.includes('timeout')) {
        title = "Request timeout";
        msg = "The document is too large to process. Try selecting a smaller section.";
      } else if (e.message?.includes('Failed to fetch')) {
        title = "Network error";
        msg = "Unable to connect to AI service. Please check your connection and try again.";
      }
      
      toast({
        title,
        description: msg,
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
      status: "reviewed",
      ball_in_court: "editor"
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
    const loadManuscript = async () => {
      if (!id) {
        navigate("/dashboard");
        return;
      }
      
      setIsLoading(true);
      
      // Try to find manuscript in context first
      let found = getManuscriptById(id);
      
      // If not found and we haven't exceeded retry limit, refresh manuscripts context
      if (!found && retryCount < maxRetries) {
        try {
          // Force refresh manuscripts from database
          await refreshManuscripts();
          await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for context to update
          found = getManuscriptById(id);
          
          if (!found) {
            setRetryCount(prev => prev + 1);
            return; // This will re-trigger the effect
          }
        } catch (error) {
          console.error('Error refreshing manuscripts:', error);
          setRetryCount(prev => prev + 1);
          return;
        }
      }
      
      if (!found) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      setManuscript(found);
      setContentText(found.contentText);
      setNotFound(false);
      setIsLoading(false);
      setRetryCount(0); // Reset retry count on success
    };
    
    loadManuscript();
  }, [id, navigate, getManuscriptById, retryCount, refreshManuscripts]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {retryCount > 0 ? `Loading manuscript... (${retryCount}/${maxRetries})` : 'Loading manuscript...'}
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Manuscript not found</h1>
          <p className="text-muted-foreground mb-4">
            The manuscript you're looking for doesn't exist or couldn't be loaded.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparing manuscript...</p>
        </div>
      </div>
    );
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
                <Button variant="outline" size="sm" onClick={handleOpenStyleRules} className="hidden lg:flex">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span className="hidden xl:inline">Style Rules</span>
                </Button>
                 <Button variant="outline" size="sm" onClick={() => setShowRunAIModal(true)}>
                  <Play className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Run AI Pass</span>
                </Button>
              </>
            )}
            {isMobile && (
              <Button variant="outline" size="sm" onClick={() => setShowRightPanel(true)}>
                <PanelRightOpen className="mr-2 h-4 w-4" />
                Panel
              </Button>
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
            <ProcessingStatus manuscript={manuscript} />
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
            onCreateSuggestion={createManualSuggestion}
                    getUISuggestions={getUISuggestions}
                    getChecks={getChecks}
                    maxVisibleSuggestions={maxVisibleAI}
                    maxVisibleChecks={maxVisibleChecks}
          />
        </div>

        {/* Right Sidebar - Desktop */}
        {!isMobile && (
          <div id="right-sidebar" className="w-80 bg-muted border-l border-border overflow-hidden flex-shrink-0">
            {/* Highlight Legend */}
            <div className="p-3 border-b bg-background">
              <div className="flex items-center gap-4 text-sm" data-testid="highlight-legend">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showChecks}
                    onChange={(e) => {
                      setShowChecks(e.target.checked);
                      const editor = getGlobalEditor();
                      if (editor) {
                        editor.view.dispatch(editor.state.tr.setMeta(checksPluginKey, "refresh"));
                      }
                    }}
                    data-testid="toggle-checks"
                    className="rounded"
                  />
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-yellow-300 border border-yellow-600 rounded-sm"></span>
                    Checks
                  </span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSuggestions}
                    onChange={(e) => {
                      setShowSuggestions(e.target.checked);
                      const editor = getGlobalEditor();
                      if (editor) {
                        editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));
                      }
                    }}
                    data-testid="toggle-suggestions"
                    className="rounded"
                  />
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 bg-blue-300 border border-blue-600 rounded-sm"></span>
                    AI Suggestions
                  </span>
                </label>
              </div>
              
              {/* Show More Controls */}
              {(suggestions.length > maxVisibleAI || checks.length > maxVisibleChecks) && (
                <div className="flex flex-col gap-1 mt-2 text-xs">
                  {suggestions.length > maxVisibleAI && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 justify-start"
                      onClick={() => {
                        setMaxVisibleAI(prev => prev + 200);
                        const editor = getGlobalEditor();
                        if (editor) {
                          editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));
                        }
                      }}
                    >
                      + Show {Math.min(200, suggestions.length - maxVisibleAI)} more AI suggestions ({maxVisibleAI}/{suggestions.length})
                    </Button>
                  )}
                  {checks.length > maxVisibleChecks && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 justify-start"
                      onClick={() => {
                        setMaxVisibleChecks(prev => prev + 200);
                        const editor = getGlobalEditor();
                        if (editor) {
                          editor.view.dispatch(editor.state.tr.setMeta(checksPluginKey, "refresh"));
                        }
                      }}
                    >
                      + Show {Math.min(200, checks.length - maxVisibleChecks)} more checks ({maxVisibleChecks}/{checks.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              {/* Tab List */}
              <TabsList className="grid w-full grid-cols-4 rounded-none bg-muted">
                <TabsTrigger value="changes" className="text-xs px-2">
                  Changes {suggestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 text-xs">
                      {suggestions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="comments" className="text-xs px-2">Comments</TabsTrigger>
                <TabsTrigger value="checks" className="text-xs px-2">
                  Checks {checks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 text-xs">
                      {checks.length}
                    </Badge>
                  )}
                </TabsTrigger>
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
                  <ChecksList 
                    checks={isReviewed ? [] : checks}
                    onAcceptCheck={handleAcceptCheck}
                    onRejectCheck={handleRejectCheck}
                    busyChecks={busyChecks}
                    isReviewed={isReviewed}
                    onRunChecks={handleRunChecks}
                  />
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
        )}

        {/* Right Sidebar - Mobile Sheet */}
        {isMobile && (
          <Sheet open={showRightPanel} onOpenChange={setShowRightPanel}>
            <SheetContent side="right" className="w-full sm:w-96">
              <SheetHeader>
                <SheetTitle>Editor Panel</SheetTitle>
              </SheetHeader>
              
              {/* Highlight Legend */}
              <div className="p-3 border-b bg-background mt-4">
                <div className="flex flex-col gap-3 text-sm" data-testid="highlight-legend">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showChecks}
                      onChange={(e) => {
                        setShowChecks(e.target.checked);
                        const editor = getGlobalEditor();
                        if (editor) {
                          editor.view.dispatch(editor.state.tr.setMeta(checksPluginKey, "refresh"));
                        }
                      }}
                      data-testid="toggle-checks"
                      className="rounded"
                    />
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 bg-yellow-300 border border-yellow-600 rounded-sm"></span>
                      Checks
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSuggestions}
                      onChange={(e) => {
                        setShowSuggestions(e.target.checked);
                        const editor = getGlobalEditor();
                        if (editor) {
                          editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));
                        }
                      }}
                      data-testid="toggle-suggestions"
                      className="rounded"
                    />
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 bg-blue-300 border border-blue-600 rounded-sm"></span>
                      AI Suggestions
                    </span>
                  </label>
                </div>
                
                {/* Show More Controls */}
                {(suggestions.length > maxVisibleAI || checks.length > maxVisibleChecks) && (
                  <div className="flex flex-col gap-2 mt-3 text-xs">
                    {suggestions.length > maxVisibleAI && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 justify-start"
                        onClick={() => {
                          setMaxVisibleAI(prev => prev + 200);
                          const editor = getGlobalEditor();
                          if (editor) {
                            editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));
                          }
                        }}
                      >
                        + Show {Math.min(200, suggestions.length - maxVisibleAI)} more AI suggestions ({maxVisibleAI}/{suggestions.length})
                      </Button>
                    )}
                    {checks.length > maxVisibleChecks && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 justify-start"
                        onClick={() => {
                          setMaxVisibleChecks(prev => prev + 200);
                          const editor = getGlobalEditor();
                          if (editor) {
                            editor.view.dispatch(editor.state.tr.setMeta(checksPluginKey, "refresh"));
                          }
                        }}
                      >
                        + Show {Math.min(200, checks.length - maxVisibleChecks)} more checks ({maxVisibleChecks}/{checks.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
                {/* Tab List */}
                <TabsList className="grid w-full grid-cols-4 rounded-none bg-muted">
                  <TabsTrigger value="changes" className="text-xs px-1">
                    Changes {suggestions.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 text-xs">
                        {suggestions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs px-1">Comments</TabsTrigger>
                  <TabsTrigger value="checks" className="text-xs px-1">
                    Checks {checks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1 text-xs">
                        {checks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
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
                    <ChecksList 
                      checks={isReviewed ? [] : checks}
                      onAcceptCheck={handleAcceptCheck}
                      onRejectCheck={handleRejectCheck}
                      busyChecks={busyChecks}
                      isReviewed={isReviewed}
                      onRunChecks={handleRunChecks}
                    />
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
            </SheetContent>
          </Sheet>
        )}
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
                {activeStyleRules.length > 0 ? (
                  activeStyleRules.map((ruleKey) => (
                    <Badge key={ruleKey} variant="secondary" className="text-xs">
                      {STYLE_RULES[ruleKey]}
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
        <SheetContent data-testid="style-presets" className="w-96">
          <SheetHeader>
            <SheetTitle>Style Rules</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Select which CMOS style rules to apply during AI editing passes.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              {Object.entries(STYLE_RULES).map(([ruleKey, ruleName]) => (
                <div key={ruleKey} className="flex items-start space-x-3">
                  <Checkbox
                    id={`rule-${ruleKey}`}
                    data-testid={`rule-${ruleKey}`}
                    checked={tempStyleRules.includes(ruleKey as StyleRuleKey)}
                    onCheckedChange={() => toggleStyleRule(ruleKey as StyleRuleKey)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label 
                      htmlFor={`rule-${ruleKey}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {ruleName}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={handleCancelStyleRules}
                data-testid="style-cancel"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveStyleRules}
                data-testid="style-save"
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
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