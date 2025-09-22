import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { mapPlainTextToPM, type UISuggestion } from "@/lib/suggestionMapper";
import type { ServerSuggestion, SuggestionType, SuggestionCategory, SuggestionActor } from "@/lib/types";
import { createSuggestionId } from "@/lib/types";
import { suggestionsPluginKey } from "@/lib/suggestionsPlugin";
import { checksPluginKey } from "@/lib/checksPlugin";
import { getGlobalEditor, getEditorPlainText } from "@/lib/editorUtils";
import { useToast } from "@/hooks/use-toast";
import { STYLE_RULES, type StyleRuleKey } from "@/lib/styleRuleConstants";
import { useActiveStyleRules } from "@/hooks/useActiveStyleRules";
import { type CheckItem, runDeterministicChecks } from "@/lib/styleValidator";
import { testTiptapAuth, validateJWTFormat } from "@/utils/testTiptapAuth";
import { SuggestionPopover } from "./SuggestionPopover";

import { 
  RotateCcw, 
  Settings2, 
  Play, 
  Download, 
  Send,
  User,
  SettingsIcon,
  Plus,
  Loader2
} from "lucide-react";
import { DocumentCanvas } from "./DocumentCanvas";
import { ChangeList } from "./ChangeList";
import { ChecksList } from "./ChecksList";
import { ProcessingStatus } from "./ProcessingStatus";
import AIEditorRuleSelector from "./AIEditorRuleSelector";
import { AI_EDITOR_RULES, type AIEditorRule } from "./AIEditorRules";

const ExperimentalEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getManuscriptById, updateManuscript, refreshManuscripts } = useManuscripts();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [activeTab, setActiveTab] = useState("changes");
  const [showRunAIModal, setShowRunAIModal] = useState(false);
  const [showStyleRules, setShowStyleRules] = useState(false);
  const [showToolRunning, setShowToolRunning] = useState(false);
  const [tempStyleRules, setTempStyleRules] = useState<StyleRuleKey[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  
  // Run AI Settings state
  const [aiScope, setAiScope] = useState<"Entire Document" | "Current Section" | "Selected Text">("Entire Document");
  const [aiChecks, setAiChecks] = useState({ contradictions: true, repetitions: true });
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [contentText, setContentText] = useState<string>("");
  const [busySuggestions, setBusySuggestions] = useState<Set<string>>(new Set());
  const [busyChecks, setBusyChecks] = useState<Set<string>>(new Set());
  
  // AI Suggestion Popover state
  const [popoverElement, setPopoverElement] = useState<HTMLElement | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [processingAction, setProcessingAction] = useState(false);
  
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

  // AI Suggestion extension state
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(false);
  
  // AI Editor Rules state
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(['copy-editor', 'line-editor']);
  const [availableRules, setAvailableRules] = useState<AIEditorRule[]>(AI_EDITOR_RULES);
  
  const handleOpenStyleRules = () => {
    setTempStyleRules(activeStyleRules);
    setShowStyleRules(true);
  };

  const handleSaveStyleRules = () => {
    if (!manuscript) return;
    
    updateManuscript(manuscript.id, {
      style_rules: tempStyleRules
    });
    
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
    
    checksRef.current = newChecks;
    setChecks(newChecks);
    
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
  }, [showSuggestions]);

  // Callback that returns current checks from ref (with toggle respect)
  const getChecks = useCallback(() => {
    console.log('getChecks called, returning', checksRef.current.length, 'checks from ref, showChecks:', showChecks);
    return showChecks ? checksRef.current : [];
  }, [showChecks]);

  // Helper functions for TipTap operations
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

  // Helper to get rule title by ID
  const getRuleTitle = (ruleId: string | undefined): string | undefined => {
    if (!ruleId) return undefined;
    const rule = availableRules.find(r => r.id === ruleId);
    return rule?.title;
  };

  // Convert AI suggestions to UISuggestion format for ChangeList
  const convertAiSuggestionsToUI = (editor: any): UISuggestion[] => {
    try {
      // Use extensionStorage as documented in TipTap docs
      const aiStorage = editor.extensionStorage?.aiSuggestion;
      if (!aiStorage) {
        console.log('No AI suggestion extension storage found');
        return [];
      }
      
      // Use the getSuggestions function to get current suggestions
      const aiSuggestions = typeof aiStorage.getSuggestions === 'function' 
        ? aiStorage.getSuggestions() 
        : [];
        
      console.log(`📝 Converting ${aiSuggestions.length} AI suggestions to UI format`);
      
      return aiSuggestions.map((suggestion: any, index: number) => {
        // Extract rule information from the TipTap suggestion
        const ruleId = suggestion.rule?.id || suggestion.ruleId;
        const ruleTitle = suggestion.rule?.title || getRuleTitle(ruleId);
        
        console.log('Processing AI suggestion:', {
          id: suggestion.id,
          ruleId,
          ruleTitle,
          suggestion: suggestion
        });
        
        return {
          id: suggestion.id || `ai-suggestion-${index}`,
          type: suggestion.replacementOptions && suggestion.replacementOptions.length > 0 ? 'replace' : 'delete' as SuggestionType,
          origin: 'server' as const,
          pmFrom: suggestion.deleteRange?.from || 0,
          pmTo: suggestion.deleteRange?.to || 0,
          before: suggestion.deleteText || '',
          after: suggestion.replacementOptions?.[0]?.addText || '',
          category: 'ai-suggestion' as SuggestionCategory,
          note: `${ruleTitle || 'AI'}: ${suggestion.replacementOptions?.[0]?.note || suggestion.note || 'Improvement suggestion'}`,
          actor: 'AI' as SuggestionActor,
          ruleId: ruleId,
          ruleTitle: ruleTitle
        };
      });
    } catch (error) {
      console.error('Error converting AI suggestions:', error);
      return [];
    }
  };

  // Simple async waiting using TipTap's official loading state
  const waitForAiSuggestions = async (editor: any): Promise<UISuggestion[]> => {
    console.log('🔄 Waiting for AI suggestions using extension loading state...');
    
    const startTime = Date.now();
    
    // Use extensionStorage as documented in TipTap docs
    const storage = editor.extensionStorage?.aiSuggestion;
    if (!storage) {
      console.error('❌ AI Suggestion extension storage not found');
      return [];
    }
    
    // Simple polling while loading - no timeout, let it take as long as needed
    while (storage.isLoading) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`⏳ AI suggestions loading... (${elapsed}s elapsed)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const finalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Check for errors
    if (storage.error) {
      console.error(`❌ AI loading error after ${finalElapsed}s:`, storage.error);
      return [];
    }
    
    // Get suggestions using the documented method
    const suggestions = storage.getSuggestions();
    console.log(`🎉 AI suggestions loaded after ${finalElapsed}s - found ${suggestions.length} suggestions`);
    
    return convertAiSuggestionsToUI(editor);
  };


  // Popover handlers for AI suggestions
  const handlePopoverAccept = (suggestionId: string, replacementOptionId: string) => {
    if (processingAction) return; // Prevent double-clicks
    
    console.log('🎯 Popover Accept clicked:', suggestionId);
    setProcessingAction(true);
    
    // Clear popover immediately
    setPopoverElement(null);
    setSelectedSuggestion(null);
    
    // Execute action and reset state
    handleAcceptSuggestion(suggestionId);
    setTimeout(() => setProcessingAction(false), 500);
  };

  const handlePopoverReject = (suggestionId: string) => {
    if (processingAction) return; // Prevent double-clicks
    
    console.log('🎯 Popover Reject clicked:', suggestionId);
    setProcessingAction(true);
    
    // Clear popover immediately
    setPopoverElement(null);
    setSelectedSuggestion(null);
    
    // Execute action and reset state
    handleRejectSuggestion(suggestionId);
    setTimeout(() => setProcessingAction(false), 500);
  };

  // Accept/Reject handlers for AI suggestions
  const handleAcceptSuggestion = async (suggestionId: string) => {
    const editor = getGlobalEditor();
    if (!editor) return;

    // Check if this is an AI suggestion
    const aiStorage = editor.storage?.aiSuggestion;
    const aiSuggestions = typeof aiStorage?.getSuggestions === 'function' ? aiStorage.getSuggestions() : [];
    const aiSuggestion = aiSuggestions.find((s: any) => s.id === suggestionId);
    
    if (aiSuggestion) {
      console.log('Applying AI suggestion:', aiSuggestion);
      
      try {
        // Apply AI suggestion using the correct TipTap API
        const result = editor.chain().applyAiSuggestion({ 
          suggestionId: suggestionId,
          replacementOptionId: aiSuggestion.replacementOptions?.[0]?.id,
          format: 'plain-text'
        }).run();
        
        console.log('Apply AI suggestion result:', result);
        
        // Remove from our UI suggestions list
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        
        toast({
          title: "AI suggestion applied."
        });
        return;
      } catch (error) {
        console.error('Error applying AI suggestion:', error);
        toast({
          title: "Failed to apply AI suggestion",
          description: error.message || "Unknown error",
          variant: "destructive"
        });
        return;
      }
    }

    // Fallback to original logic for non-AI suggestions
    const uiSuggestion = suggestions.find(s => s.id === suggestionId);
    if (!uiSuggestion || busySuggestions.has(suggestionId)) return;

    setActionBusy(suggestionId, true);

    try {
      if (uiSuggestion.type !== "insert") {
        const current = getPMText(editor, uiSuggestion.pmFrom, uiSuggestion.pmTo);
        if (current !== uiSuggestion.before) {
          toast({
            title: "Suggestion no longer matches the text; skipped.",
            variant: "destructive"
          });
          handleRejectSuggestion(suggestionId);
          return;
        }
      }

      if (uiSuggestion.type === "insert") {
        editor.commands.insertContentAt(uiSuggestion.pmFrom, uiSuggestion.after);
      } else if (uiSuggestion.type === "delete") {
        editor.commands.deleteRange({ from: uiSuggestion.pmFrom, to: uiSuggestion.pmTo });
      } else {
        editor.commands.deleteRange({ from: uiSuggestion.pmFrom, to: uiSuggestion.pmTo });
        editor.commands.insertContentAt(uiSuggestion.pmFrom, uiSuggestion.after);
      }

      console.log('Accepting suggestion:', suggestionId, 'at positions', uiSuggestion.pmFrom, uiSuggestion.pmTo);
      
      setSuggestions(prev => {
        const filtered = prev.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
        console.log('Filtered suggestions from', prev.length, 'to', filtered.length);
        return filtered;
      });

      const remaining = suggestions.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
      console.log('Remapping', remaining.length, 'remaining suggestions');
      
      const serverSuggestions = remaining.filter((s): s is ServerSuggestion & { pmFrom: number; pmTo: number } => s.origin === 'server');
      if (serverSuggestions.length > 0) {
        const plainText = editor.getText();
        const remapped = mapPlainTextToPM(editor, plainText, serverSuggestions);
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

    // Check if this is an AI suggestion
    const aiStorage = editor.storage?.aiSuggestion;
    const aiSuggestions = typeof aiStorage?.getSuggestions === 'function' ? aiStorage.getSuggestions() : [];
    const aiSuggestion = aiSuggestions.find((s: any) => s.id === suggestionId);
    
    if (aiSuggestion) {
      console.log('Rejecting AI suggestion:', aiSuggestion);
      
      try {
        // Reject AI suggestion using the correct TipTap API
        const result = editor.chain().rejectAiSuggestion(suggestionId).run();
        console.log('Reject AI suggestion result:', result);
        
        // Remove from our UI suggestions list
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        
        toast({
          title: "AI suggestion dismissed."
        });
        return;
      } catch (error) {
        console.error('Error rejecting AI suggestion:', error);
        toast({
          title: "Failed to reject AI suggestion",
          description: error.message || "Unknown error",
          variant: "destructive"
        });
        return;
      }
    }

    // Fallback to original logic for non-AI suggestions
    const uiSuggestion = suggestions.find(s => s.id === suggestionId);
    if (!uiSuggestion) return;

    setActionBusy(suggestionId, true);
    try {
      console.log('Rejecting suggestion:', suggestionId, 'at positions', uiSuggestion.pmFrom, uiSuggestion.pmTo);
      
      setSuggestions(prev => {
        const filtered = prev.filter(x => !(x.id === suggestionId && x.pmFrom === uiSuggestion.pmFrom && x.pmTo === uiSuggestion.pmTo));
        console.log('Filtered suggestions from', prev.length, 'to', filtered.length);
        return filtered;
      });

      editor.view.dispatch(editor.state.tr.setMeta(suggestionsPluginKey, "refresh"));

      toast({
        title: "Change dismissed."
      });
    } finally {
      setActionBusy(suggestionId, false);
    }
  };

  // Handle Apply All AI Suggestions
  const handleApplyAllSuggestions = async () => {
    const editor = getGlobalEditor();
    if (!editor) {
      toast({
        title: "Editor not available",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Applying all AI suggestions...');
      
      // Use Tiptap's built-in applyAllAiSuggestions command
      const result = editor.commands.applyAllAiSuggestions();
      console.log('Apply all suggestions result:', result);
      
      if (result) {
        // Wait a moment for the changes to be processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refresh suggestions to get the updated state
        const updatedSuggestions = await waitForAiSuggestions(editor);
        setSuggestions(updatedSuggestions);
        
        toast({
          title: "All suggestions applied successfully",
          description: "Your document has been updated with all AI suggestions.",
        });
      } else {
        throw new Error('Failed to apply suggestions');
      }
      
    } catch (error) {
      console.error('Error applying all suggestions:', error);
      toast({
        title: "Failed to apply all suggestions",
        description: error.message || "An error occurred while applying suggestions.",
        variant: "destructive"
      });
    }
  };

  // Check handlers
  const handleAcceptCheck = (checkId: string) => {
    console.log('Accepting check:', checkId);
    setBusyChecks(prev => new Set(prev).add(checkId));
    
    try {
      setChecks(prev => prev.filter(check => check.id !== checkId));
      
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

  const handleRejectCheck = (checkId: string) => {
    console.log('Rejecting check:', checkId);
    setBusyChecks(prev => new Set(prev).add(checkId));
    
    try {
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

    setSuggestions(prev => [...prev, suggestion]);
    
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
      
      if (tr.docChanged && suggestions.length > 0) {
        setSuggestions(prev => prev.map(s => {
          const from = tr.mapping.map(s.pmFrom);
          const to = tr.mapping.map(s.pmTo);
          return { ...s, pmFrom: from, pmTo: Math.max(from, to) };
        }));
        
        setTimeout(() => {
          const refreshTr = editor.state.tr.setMeta(suggestionsPluginKey, "refresh");
          editor.view.dispatch(refreshTr);
        }, 0);
      }
    };

    return () => {
      if (editor?.view) {
        editor.view.dispatch = originalDispatch;
      }
    };
  }, [suggestions.length]);

  // Handle Run AI Pass - EXPERIMENTAL VERSION using AI Suggestion extension
  const handleRunAIPass = async () => {
    if (selectedRuleIds.length === 0) {
      toast({
        title: "No editor roles selected",
        description: "Please select at least one AI editor role to run.",
        variant: "destructive",
      });
      return;
    }

    setShowRunAIModal(false);
    setShowToolRunning(true);
    
    try {
      const editor = getGlobalEditor();
      if (!editor) {
        throw new Error('Editor not available');
      }

      console.log('Starting AI Pass...');
      console.log('Editor:', editor);
      console.log('Editor storage:', editor.storage);
      console.log('AI Storage:', editor.storage?.aiSuggestion);
      console.log('Available commands:', Object.keys(editor.commands));
      console.log('Extensions:', editor.extensionManager.extensions.map(ext => ext.name));
      console.log('Document content:', editor.getText());
      console.log('Document length:', editor.getText().length);

      // Test authentication before proceeding
      const appId = 'pkry1n5m'; // Your TipTap App ID
      // Using TipTap's provided test JWT (temporary for testing)
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTg1NTI0ODgsIm5iZiI6MTc1ODU1MjQ4OCwiZXhwIjoxNzU4NjM4ODg4LCJpc3MiOiJodHRwczovL2Nsb3VkLnRpcHRhcC5kZXYiLCJhdWQiOiJjMWIzMmE5Mi0zYzFmLTRiNDktYWI2Yi1mYjVhN2E2MTc4YTgifQ.Yy4UdTVF-FGOfM28-gVHnP8AYt2Uf-Vgr2yMbWv98KE';
      
      console.log('🧪 Testing with TipTap provided JWT...');
      console.log('Token format check:', {
        appId,
        tokenLength: token.length,
        tokenParts: token.split('.').length,
        isValidJWT: token.split('.').length === 3,
        tokenStart: token.substring(0, 50) + '...'
      });
      
      const authTest = await testTiptapAuth(appId, token);
      console.log('Auth test result:', authTest);
      
      if (!authTest.success) {
        console.error('Authentication test failed:', authTest);
        throw new Error(`Authentication failed: ${authTest.error}. Please check your credentials and allowed origins in TipTap dashboard.`);
      }

      // Update AI suggestion rules with selected editor roles
      const selectedRules = availableRules
        .filter(rule => selectedRuleIds.includes(rule.id))
        .map(rule => ({
          id: rule.id,
          title: rule.title,
          prompt: rule.prompt,
          color: rule.color,
          backgroundColor: rule.backgroundColor,
        }));

      console.log('Setting AI suggestion rules:', selectedRules);
      
      // Update the rules in the editor
      if (editor.commands.setAiSuggestionRules) {
        editor.chain().setAiSuggestionRules(selectedRules).run();
      }

      // Clear existing suggestions
      setSuggestions([]);

      // Check if AI extension is available
      if (!editor.storage?.aiSuggestion) {
        throw new Error('AI Suggestion extension not loaded. Check your TipTap Pro credentials.');
      }

      // Check if loadAiSuggestions command is available
      if (!editor.commands.loadAiSuggestions) {
        throw new Error('loadAiSuggestions command not available. Check extension configuration.');
      }

      console.log('Triggering AI suggestions...');
      
      // Load AI suggestions using the correct TipTap API
      const result = editor.chain().loadAiSuggestions().run();
      console.log('Load AI suggestions result:', result);
      
      // Wait for AI suggestions to be generated with proper async monitoring
      const uiSuggestions = await waitForAiSuggestions(editor);
      
      console.log('🎯 Final result: Generated', uiSuggestions.length, 'AI suggestions');
      setSuggestions(uiSuggestions);
      
      if (uiSuggestions.length > 0) {
        toast({
          title: `Generated ${uiSuggestions.length} AI suggestion${uiSuggestions.length === 1 ? "" : "s"}.`,
          description: "Review suggestions in the editor and change list."
        });
      } else {
        toast({
          title: "No suggestions generated",
          description: "The AI didn't find any improvements to suggest for this content.",
          variant: "default"
        });
      }
    } catch (e: any) {
      console.error('AI suggestions failed:', e);
      
      let title = "AI suggestions failed";
      let msg = "Please try again.";
      
      if (e.message?.includes('Authentication failed')) {
        title = "Authentication Error";
        msg = `${e.message}\n\nTroubleshooting steps:\n1. Verify your .env file has correct VITE_TIPTAP_APP_ID and VITE_TIPTAP_TOKEN\n2. Add ${window.location.origin} to Allowed Origins in TipTap dashboard\n3. Restart your dev server`;
      } else if (e.message?.includes('AI Suggestion extension not loaded')) {
        title = "Extension not loaded";
        msg = "Check your TipTap Pro credentials and ensure the extension is properly configured.";
      } else if (e.message?.includes('loadAiSuggestions command not available')) {
        title = "Command not available";
        msg = "The AI suggestion commands are not available. Check your extension setup.";
      } else if (e.message?.includes('Editor not available')) {
        title = "Editor error";
        msg = "Editor is not ready. Please try again.";
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

    setManuscript(prev => prev ? {
      ...prev,
      status: "Reviewed",
      ballInCourt: "None",
      updatedAt: new Date().toISOString()
    } : null);

    setSuggestions([]);

    toast({
      title: "Marked as Reviewed — document is now read-only."
    });
  };

  useEffect(() => {
    const loadManuscript = async () => {
      console.log('[ExperimentalEditor] Loading manuscript with ID:', id);
      
      if (!id) {
        console.log('[ExperimentalEditor] No ID provided, redirecting to dashboard');
        navigate("/dashboard");
        return;
      }
      
      setIsLoading(true);
      console.log('[ExperimentalEditor] Set loading to true');
      
      let found = getManuscriptById(id);
      console.log('[ExperimentalEditor] Found manuscript:', found);
      
      if (!found && retryCount < maxRetries) {
        try {
          await refreshManuscripts();
          await new Promise(resolve => setTimeout(resolve, 200));
          found = getManuscriptById(id);
          
          if (!found) {
            setRetryCount(prev => prev + 1);
            return;
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
      setRetryCount(0);
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

  console.log('[ExperimentalEditor] Render state:', { isLoading, notFound, manuscript: !!manuscript });

  if (isLoading) {
    console.log('[ExperimentalEditor] Rendering loading state');
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
            // Enable AI suggestions for experimental editor
            aiSuggestionConfig={(() => {
              // Get selected rules from available rules
              const selectedRules = availableRules
                .filter(rule => selectedRuleIds.includes(rule.id))
                .map(rule => ({
                  id: rule.id,
                  title: rule.title,
                  prompt: rule.prompt,
                  color: rule.color,
                  backgroundColor: rule.backgroundColor,
                }));

              const config: any = {
                enabled: true,
                // Using TipTap's provided test JWT (temporary for testing)
                appId: 'pkry1n5m',
                token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTg1NTI0ODgsIm5iZiI6MTc1ODU1MjQ4OCwiZXhwIjoxNzU4NjM4ODg4LCJpc3MiOiJodHRwczovL2Nsb3VkLnRpcHRhcC5kZXYiLCJhdWQiOiJjMWIzMmE5Mi0zYzFmLTRiNDktYWI2Yi1mYjVhN2E2MTc4YTgifQ.Yy4UdTVF-FGOfM28-gVHnP8AYt2Uf-Vgr2yMbWv98KE',
                rules: selectedRules,
                loadOnStart: false, // Disable automatic loading as requested
                reloadOnUpdate: false, // Don't reload on every edit
                debounceTimeout: 1000,
                // Popover configuration
                onPopoverElementCreate: setPopoverElement,
                onSelectedSuggestionChange: setSelectedSuggestion,
              };
              return config;
            })()}
          />
        </div>

        {/* Right Sidebar */}
        <div id="right-sidebar" className="w-full lg:w-80 bg-muted border-t lg:border-t-0 lg:border-l border-border overflow-hidden flex-shrink-0">

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
                  showSuggestions={showSuggestions}
                  onToggleSuggestions={setShowSuggestions}
                  onApplyAllSuggestions={handleApplyAllSuggestions}
                />
              </TabsContent>

              <TabsContent value="comments" className="h-full mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <div className="bg-card border border-card-border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium">System</span>
                        <span className="text-xs text-muted-foreground">Now</span>
                      </div>
                      <p className="text-sm mb-2">This is the AI suggestions editor. AI suggestions will appear directly in the text as you type or when you run AI Pass.</p>
                      <p className="text-xs text-muted-foreground mb-3">AI Mode</p>
                    </div>
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
                    <div className="bg-card border border-card-border rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Plus className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Advanced AI Features</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This editor uses TipTap Pro AI suggestions for enhanced editing capabilities.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Run AI Settings Modal */}
      <Dialog open={showRunAIModal} onOpenChange={setShowRunAIModal}>
        <DialogContent id="run-ai-modal" className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Run AI Editing Pass</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select which AI editor roles to apply to your manuscript. Each role focuses on specific aspects of editing.
            </p>
          </DialogHeader>
          
          <div className="py-4">
            <AIEditorRuleSelector
              selectedRuleIds={selectedRuleIds}
              onRuleSelectionChange={setSelectedRuleIds}
              onRulesUpdate={setAvailableRules}
            />
          </div>

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
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleRunAIPass}
              disabled={selectedRuleIds.length === 0}
            >
              Run AI Pass ({selectedRuleIds.length} {selectedRuleIds.length === 1 ? 'role' : 'roles'})
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
            <h3 className="text-lg font-medium mb-2">AI Suggestions Loading</h3>
            <p className="text-sm text-muted-foreground">
              Generating AI-powered suggestions for your manuscript...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestion Popover Portal */}
      {popoverElement && selectedSuggestion && createPortal(
        <SuggestionPopover
          suggestion={selectedSuggestion}
          onAccept={handlePopoverAccept}
          onReject={handlePopoverReject}
        />,
        popoverElement
      )}
    </div>
  );
};

export default ExperimentalEditor;
