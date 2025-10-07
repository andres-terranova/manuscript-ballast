import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
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
import { useTiptapJWT } from "@/hooks/useTiptapJWT";

import {
  RotateCcw,
  Settings2,
  Play,
  Download,
  Send,
  User,
  SettingsIcon,
  Plus,
  Loader2,
  History,
  Save
} from "lucide-react";
import { DocumentCanvas } from "./DocumentCanvas";
import { ChangeList } from "./ChangeList";
import { ChecksList } from "./ChecksList";
import { ProcessingStatus } from "./ProcessingStatus";
import AIEditorRuleSelector from "./AIEditorRuleSelector";
import type { AIEditorRule } from "@/types/aiEditorRules";
import { supabase } from "@/integrations/supabase/client";
import { ManuscriptService } from "@/services/manuscriptService";
import { AIProgressIndicator } from "./AIProgressIndicator";
import type { AIProgressState } from "@/types/aiProgress";
import { createInitialProgressState } from "@/types/aiProgress";
import { createSnapshot, getLatestSnapshot } from '@/services/snapshotService';
import { VersionHistory } from './VersionHistory';

const Editor = () => {
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
  const aiCancelledRef = useRef(false);
  const [aiProgress, setAiProgress] = useState<AIProgressState>(createInitialProgressState());
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | undefined>(undefined);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  // Handle AI progress updates
  const handleProgressUpdate = useCallback((progress: AIProgressState) => {
    setAiProgress(progress);
  }, []);

  // Handle cancelling AI suggestions
  const handleCancelAI = useCallback(() => {
    const editor = getGlobalEditor();
    if (!editor) return;

    try {
      // Set cancellation flag
      aiCancelledRef.current = true;

      // Abort the ongoing AI suggestion request
      editor.storage.aiSuggestion.abortController.abort();

      // Close the modal
      setShowToolRunning(false);

      toast({
        title: "AI Pass Cancelled",
        description: "AI suggestion generation has been stopped.",
      });
    } catch (error) {
      console.error('Error cancelling AI suggestions:', error);
      toast({
        title: "Cancel Failed",
        description: "Unable to cancel AI suggestions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Helper to create snapshot with error handling
  const createSnapshotSafe = useCallback(async (
    event: 'upload' | 'send_to_author' | 'return_to_editor' | 'manual',
    label?: string
  ) => {
    const editor = getGlobalEditor();
    if (!editor || !manuscript) return;

    // Show loading overlay for manual snapshots
    if (event === 'manual') {
      setIsSavingSnapshot(true);
    }

    try {
      // Get current user (in MVP, we can use a placeholder)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'system';

      await createSnapshot(editor, manuscript.id, event, userId, label);
      console.log(`✅ Snapshot created: ${event}`);

      // Update current version to the newly created snapshot
      const latestSnapshot = await getLatestSnapshot(manuscript.id);
      if (latestSnapshot) {
        setCurrentVersion(latestSnapshot.version);
        console.log(`✅ Current version updated to ${latestSnapshot.version}`);
      }

      // Show success toast for manual snapshots (after overlay closes)
      if (event === 'manual') {
        toast({
          title: "Snapshot created",
          description: "Version saved successfully"
        });
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      // Show error for manual snapshots
      if (event === 'manual') {
        toast({
          title: "Failed to create snapshot",
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      }
    } finally {
      // Hide loading overlay
      if (event === 'manual') {
        setIsSavingSnapshot(false);
      }
    }
  }, [manuscript, toast]);

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
  const [selectedSuggestion, setSelectedSuggestion] = useState<UISuggestion | null>(null);
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


  // TipTap Authentication using production JWT system
  const { token: tiptapToken, appId: tiptapAppId, isLoading: jwtLoading, error: jwtError, refreshToken } = useTiptapJWT();

  // Debug authentication state
  useEffect(() => {
    console.log('🔑 TipTap Auth:', {
      hasAppId: !!tiptapAppId,
      hasToken: !!tiptapToken,
      jwtLoading,
      jwtError,
      appId: tiptapAppId,
      tokenLength: tiptapToken?.length || 0,
      status: tiptapToken ? '🟢 Server JWT Active' : '⚠️ No Token'
    });
  }, [tiptapAppId, tiptapToken, jwtLoading, jwtError]);

  // Read-only state derived from manuscript status
  const isReviewed = manuscript?.status === "Reviewed";

  // AI Suggestion extension state
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(false);
  
  // AI Editor Rules state
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [availableRules, setAvailableRules] = useState<AIEditorRule[]>([]);
  const [rulesInitialized, setRulesInitialized] = useState(false);
  
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

  const updateEditorRules = useCallback((rules: AIEditorRule[]) => {
    const editor = getGlobalEditor();
    if (!editor) {
      console.warn('Editor not available for rule update');
      return;
    }

    try {
      // Get only enabled rules
      const enabledRules = rules
        .filter(r => r.enabled)
        .map(rule => ({
          id: rule.id,
          title: rule.title,
          prompt: rule.prompt,
          color: rule.color,
          backgroundColor: rule.backgroundColor,
        }));

      // Update editor with new rules
      editor.chain()
        .setAiSuggestionRules(enabledRules)
        .run();

      console.log('✅ Editor rules updated:', enabledRules.length, 'enabled rules');
    } catch (error) {
      console.error('Failed to update editor rules:', error);
      toast({
        title: "Editor Update Failed",
        description: "Rules were saved but editor needs refresh.",
        variant: "destructive",
      });
    }
  }, [toast]);

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
  const withEditorTransaction = (editor: TiptapEditor, fn: (tr: Transaction) => void) => {
    const { state, view } = editor;
    const tr = state.tr;
    fn(tr);
    view.dispatch(tr);
  };

  const getPMText = (editor: TiptapEditor, from: number, to: number): string => {
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
  const getRuleTitle = useCallback((ruleId: string | undefined): string | undefined => {
    if (!ruleId) return undefined;
    const rule = availableRules.find(r => r.id === ruleId);
    return rule?.title;
  }, [availableRules]);

  // Convert AI suggestions to UISuggestion format for ChangeList
  const convertAiSuggestionsToUI = useCallback((editor: TiptapEditor): UISuggestion[] => {
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

      return aiSuggestions.map((suggestion: unknown, index: number) => {
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
      }).sort((a, b) => {
        // Primary sort: by start position (pmFrom)
        if (a.pmFrom !== b.pmFrom) {
          return a.pmFrom - b.pmFrom;
        }
        // Secondary sort: by end position (pmTo) if start positions are equal
        return a.pmTo - b.pmTo;
      });
    } catch (error) {
      console.error('Error converting AI suggestions:', error);
      return [];
    }
  }, [getRuleTitle]);

  // Event-based waiting using TipTap's transaction events (no polling)
  const waitForAiSuggestions = async (editor: TiptapEditor): Promise<UISuggestion[]> => {
    console.log('🔄 Waiting for AI suggestions using transaction events...');

    const storage = editor.extensionStorage?.aiSuggestion;
    if (!storage) {
      console.error('❌ AI Suggestion extension storage not found');
      return [];
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      let intervalId: NodeJS.Timeout | null = null;

      const checkCompletion = ({ editor }: { editor: TiptapEditor }) => {
        // Check if cancelled
        if (aiCancelledRef.current) {
          console.log('🚫 AI suggestions cancelled by user');
          cleanup();
          resolve([]); // Resolve with empty array
          return;
        }

        const storage = editor.extensionStorage?.aiSuggestion;

        if (!storage) {
          cleanup();
          reject(new Error('Extension storage not available'));
          return;
        }

        // Check if loading completed
        if (!storage.isLoading) {
          cleanup();

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (storage.error) {
            console.error(`❌ AI loading error after ${elapsed}s:`, storage.error);
            resolve([]);
          } else {
            const suggestions = storage.getSuggestions();
            console.log(`🎉 AI suggestions loaded after ${elapsed}s - found ${suggestions.length} suggestions`);
            resolve(convertAiSuggestionsToUI(editor));
          }
        }
      };

      const cleanup = () => {
        editor.off('transaction', checkCompletion);
        if (intervalId) clearInterval(intervalId);
      };

      // Listen for transaction events (fires when storage.isLoading changes)
      editor.on('transaction', checkCompletion);

      // Also log progress every 5s for visibility
      intervalId = setInterval(() => {
        // Check if cancelled
        if (aiCancelledRef.current) {
          cleanup();
          resolve([]);
          return;
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`⏳ AI suggestions loading... (${elapsed}s elapsed)`);
      }, 5000);

      // Check immediately in case already loaded
      checkCompletion({ editor });
    });
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

  // Handle triggering popover from change list clicks
  const handleTriggerPopover = useCallback((suggestionId: string) => {
    const editor = getGlobalEditor();
    if (!editor) {
      console.warn('Editor not available for popover trigger');
      return;
    }

    console.log('🎯 Triggering popover for suggestion:', suggestionId);

    // Use TipTap's native command to select the AI suggestion
    // This will trigger the existing popover system automatically
    if (editor.commands.selectAiSuggestion) {
      const result = editor.commands.selectAiSuggestion(suggestionId);
      console.log('TipTap selectAiSuggestion result:', result);
    } else {
      console.warn('selectAiSuggestion command not available');
    }
  }, []);

  // Accept/Reject handlers for AI suggestions
  const handleAcceptSuggestion = async (suggestionId: string) => {
    const editor = getGlobalEditor();
    if (!editor) return;

    // Check if this is an AI suggestion
    const aiStorage = editor.storage?.aiSuggestion;
    const aiSuggestions = typeof aiStorage?.getSuggestions === 'function' ? aiStorage.getSuggestions() : [];
    const aiSuggestion = aiSuggestions.find((s: { id: string }) => s.id === suggestionId);
    
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
    const aiSuggestion = aiSuggestions.find((s: { id: string }) => s.id === suggestionId);
    
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

    // Track how many suggestions exist before applying
    const suggestionCountBefore = suggestions.length;

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

        // Create snapshot after applying all suggestions
        if (manuscript?.id && suggestionCountBefore > 0) {
          try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || 'system';

            const label = suggestionCountBefore === 1
              ? 'Applied 1 suggestion'
              : `Applied ${suggestionCountBefore} suggestions`;
            await createSnapshot(editor, manuscript.id, 'apply_all', userId, label);
            console.log(`✅ Snapshot created after Apply All: ${label}`);

            // Update current version to the newly created snapshot
            const latestSnapshot = await getLatestSnapshot(manuscript.id);
            if (latestSnapshot) {
              setCurrentVersion(latestSnapshot.version);
            }
          } catch (error) {
            console.error('Failed to create snapshot after Apply All:', error);
            // Don't show error to user - snapshot failure shouldn't block workflow
          }
        }

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

    editor.view.dispatch = (tr: Transaction) => {
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

  // Handle Run AI Pass - Enhanced version with large document support
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

    // Reset progress state
    setAiProgress(createInitialProgressState());

    try {
      const editor = getGlobalEditor();
      if (!editor) {
        throw new Error('Editor not available');
      }

      const documentText = editor.getText();
      const documentLength = documentText.length;
      const isLargeDocument = documentLength > 100000; // 100K chars threshold

      console.log('Starting AI Pass...');
      console.log('Document length:', documentLength);
      console.log('Is large document:', isLargeDocument);

      // Reset cancellation flag for new AI Pass
      aiCancelledRef.current = false;

      // Check token availability
      if (!tiptapToken || !tiptapAppId) {
        await refreshToken();
        if (!tiptapToken || !tiptapAppId) {
          throw new Error('TipTap credentials not available. Please check environment variables and Supabase function.');
        }
      }

      // Test authentication before proceeding
      const authTest = await testTiptapAuth(tiptapAppId, tiptapToken);
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

      // Use TipTap's built-in AI suggestion loading with native chunking
      console.log(`Processing document with ${documentLength} characters...`);

      if (isLargeDocument) {
        toast({
          title: "Processing large document",
          description: `Document is ${Math.round(documentLength/1000)}K characters. TipTap will process in chunks with native caching.`,
          duration: 5000
        });
      }

      if (!editor.commands.loadAiSuggestions) {
        throw new Error('loadAiSuggestions command not available. Check extension configuration.');
      }

      // Trigger AI suggestions (TipTap's native chunking will handle large documents)
      const result = editor.chain().loadAiSuggestions().run();
      console.log('Load AI suggestions result:', result);

      // Wait for suggestions (timeout handled internally by function)
      const uiSuggestions = await waitForAiSuggestions(editor);

      console.log('Generated', uiSuggestions.length, 'AI suggestions');
      setSuggestions(uiSuggestions);

      // Create snapshot after AI Pass completes (only if suggestions were generated)
      if (uiSuggestions.length > 0 && manuscript?.id) {
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || 'system';

          const roleLabel = selectedRuleIds.length === 1
            ? '1 role applied'
            : `${selectedRuleIds.length} roles applied`;
          await createSnapshot(editor, manuscript.id, 'ai_pass_complete', userId, roleLabel);
          console.log(`✅ Snapshot created after AI Pass: ${uiSuggestions.length} suggestions, ${roleLabel}`);

          // Update current version to the newly created snapshot
          const latestSnapshot = await getLatestSnapshot(manuscript.id);
          if (latestSnapshot) {
            setCurrentVersion(latestSnapshot.version);
          }
        } catch (error) {
          console.error('Failed to create snapshot after AI Pass:', error);
          // Don't show error to user - snapshot failure shouldn't block workflow
        }
      }

      if (uiSuggestions.length > 0) {
        toast({
          title: `Generated ${uiSuggestions.length} AI suggestions`,
          description: isLargeDocument
            ? `Processed ${Math.round(documentLength/1000)}K characters successfully. Review suggestions in the editor and change list.`
            : "Review suggestions in the editor and change list."
        });
      } else if (!aiCancelledRef.current) {
        // Only show "no suggestions" toast if not cancelled (cancelled toast already shown)
        toast({
          title: "No suggestions generated",
          description: "The AI didn't find any improvements to suggest for this content.",
          variant: "default"
        });
      }
    } catch (e: unknown) {
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
      console.log('[Editor] Loading manuscript with ID:', id);

      if (!id) {
        console.log('[Editor] No ID provided, redirecting to dashboard');
        navigate("/dashboard");
        return;
      }

      setIsLoading(true);
      console.log('[Editor] Set loading to true');
      
      let found = getManuscriptById(id);
      console.log('[Editor] Found manuscript:', found);
      
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

  // Restore AI suggestions from latest snapshot on page load
  useEffect(() => {
    const restoreAiSuggestionsOnLoad = async () => {
      // Only run after manuscript is loaded and editor is ready
      if (!manuscript?.id) return;

      const editor = getGlobalEditor();
      if (!editor) {
        console.log('⏳ Editor not ready yet for AI restoration');
        return;
      }

      // Check if AI extension is available
      const aiStorage = editor.extensionStorage?.aiSuggestion;
      if (!aiStorage) {
        console.log('ℹ️ AI Suggestion extension not available - skipping restoration');
        return;
      }

      // Only restore if editor doesn't already have suggestions
      const existingSuggestions = aiStorage.getSuggestions?.() || [];
      if (existingSuggestions.length > 0) {
        console.log(`✅ Editor already has ${existingSuggestions.length} suggestions loaded`);
        // Convert existing suggestions to UI format
        const uiSuggestions = convertAiSuggestionsToUI(editor);
        setSuggestions(uiSuggestions);
        return;
      }

      try {
        console.log('🔄 Attempting to restore AI suggestions from latest snapshot...');

        // Fetch latest snapshot
        const snapshot = await getLatestSnapshot(manuscript.id);

        if (!snapshot) {
          console.log('ℹ️ No snapshots found for manuscript');
          return;
        }

        if (!snapshot.aiSuggestions || snapshot.aiSuggestions.length === 0) {
          console.log('ℹ️ Latest snapshot has no AI suggestions to restore');
          return;
        }

        console.log(`📥 Restoring ${snapshot.aiSuggestions.length} AI suggestions from snapshot v${snapshot.version}...`);

        // Restore AI suggestions to editor
        const success = editor.commands.setAiSuggestions(snapshot.aiSuggestions);

        if (success) {
          console.log(`✅ Restored ${snapshot.aiSuggestions.length} AI suggestions to editor`);

          // Convert to UI format and update state
          const uiSuggestions = convertAiSuggestionsToUI(editor);
          setSuggestions(uiSuggestions);
          setCurrentVersion(snapshot.version); // Track current version
          console.log(`✅ Updated UI with ${uiSuggestions.length} suggestions from version ${snapshot.version}`);
        } else {
          console.warn('⚠️ setAiSuggestions returned false - restoration may have failed');
        }

      } catch (error) {
        console.error('❌ Failed to restore AI suggestions on page load:', error);
        // Don't show error toast - this is a silent background operation
      }
    };

    // Run restoration after a short delay to ensure editor is fully initialized
    const timer = setTimeout(() => {
      restoreAiSuggestionsOnLoad();
    }, 300);

    return () => clearTimeout(timer);
  }, [manuscript?.id, convertAiSuggestionsToUI]); // Re-run when manuscript changes

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

  console.log('[Editor] Render state:', { isLoading, notFound, manuscript: !!manuscript });

  if (isLoading) {
    console.log('[Editor] Rendering loading state');
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => createSnapshotSafe('manual')}
              className="hidden lg:flex"
              title="Create a snapshot of the current version"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Version
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVersionHistory(true)}
              className="hidden lg:flex"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            {!isReviewed && (
              <>
                <Button variant="outline" size="sm" onClick={handleOpenStyleRules} className="hidden lg:flex">
                  <Settings2 className="mr-2 h-4 w-4" />
                  <span className="hidden xl:inline">Style Rules</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRunAIModal(true)}
                  disabled={!tiptapToken || !tiptapAppId || jwtLoading}
                  title={jwtError ? `JWT Error: ${jwtError}` : undefined}
                >
                  {jwtLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Loading JWT...</span></>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Run AI Pass</span></>
                  )}
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
      <div className="h-[calc(100vh-129px)] flex flex-col lg:flex-row">
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
          {/* Wait for JWT before rendering editor to ensure AiSuggestion extension is loaded */}
          {jwtLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Initializing editor...</p>
              </div>
            </div>
          ) : jwtError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold mb-2">JWT Authentication Error</h3>
                <p className="text-muted-foreground mb-4">{jwtError}</p>
                <Button onClick={refreshToken} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          ) : (
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
              // Only enable if credentials are available
              if (!tiptapToken || !tiptapAppId) {
                return {
                  enabled: false,
                  appId: undefined,
                  token: undefined,
                  rules: [],
                };
              }

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

              const config: Record<string, unknown> = {
                enabled: true,
                // Using fresh JWT token directly
                appId: tiptapAppId,
                token: tiptapToken,
                rules: selectedRules,
                loadOnStart: false, // Disable automatic loading as requested
                reloadOnUpdate: false, // Don't reload on every edit
                // Popover configuration
                onPopoverElementCreate: setPopoverElement,
                onSelectedSuggestionChange: setSelectedSuggestion,
                // Progress tracking
                onProgressUpdate: handleProgressUpdate,
              };
              return config;
            })()}
          />
          )}
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
                  onTriggerPopover={handleTriggerPopover}
                  availableRules={availableRules}
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
              onRulesUpdate={(rules) => {
                setAvailableRules(rules);
                updateEditorRules(rules);

                // Initialize selectedRuleIds from database-enabled rules on first load
                if (!rulesInitialized && rules.length > 0) {
                  const enabledRuleIds = rules.filter(r => r.enabled).map(r => r.id);
                  // Only select first 2 enabled rules by default
                  const defaultSelectedIds = enabledRuleIds.slice(0, 2);
                  setSelectedRuleIds(defaultSelectedIds);
                  setRulesInitialized(true);
                  console.log('✅ Initialized selectedRuleIds from database (first 2):', defaultSelectedIds);
                }
              }}
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
              disabled={selectedRuleIds.length === 0 || !tiptapToken || !tiptapAppId || jwtLoading}
            >
              {jwtLoading ? 'Loading JWT...' : `Run AI Pass (${selectedRuleIds.length} ${selectedRuleIds.length === 1 ? 'role' : 'roles'})`}
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

      {/* Version History Sheet */}
      <Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
          </SheetHeader>
          <VersionHistory
            manuscriptId={manuscript.id}
            currentVersion={currentVersion}
            onRestore={(restoredVersion) => {
              // Refresh editor state after restore
              setShowVersionHistory(false);

              // Convert restored AI suggestions to UI format
              const editor = getGlobalEditor();
              if (editor) {
                try {
                  const uiSuggestions = convertAiSuggestionsToUI(editor);
                  setSuggestions(uiSuggestions);
                  console.log(`✅ Refreshed UI with ${uiSuggestions.length} restored suggestions`);

                  // Update current version to the restored version
                  setCurrentVersion(restoredVersion);
                  console.log(`✅ Current version set to ${restoredVersion}`);
                } catch (error) {
                  console.error('Failed to convert restored suggestions to UI:', error);
                }
              }

              toast({
                title: "Document restored",
                description: "The document has been restored from the selected version"
              });
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Tool Running Progress Modal */}
      <Dialog open={showToolRunning}>
        <DialogContent
          id="tool-running-modal"
          className="sm:max-w-md [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>AI Pass Progress</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AIProgressIndicator progress={aiProgress} />
          </div>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={handleCancelAI}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Version Loading Overlay */}
      <Dialog open={isSavingSnapshot}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Saving Version</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Creating snapshot of your document...
              </p>
            </div>
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

export default Editor;
