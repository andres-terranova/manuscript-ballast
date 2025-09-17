import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";
import { ExperimentalDocumentCanvas } from "./ExperimentalDocumentCanvas";
import { ExperimentalSuggestionsList } from "./ExperimentalSuggestionsList";
import type { UISuggestion, ServerSuggestion } from "@/lib/types";
import { mapPlainTextToPM } from "@/lib/suggestionMapper";

const ExperimentalEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getManuscriptById, updateManuscript } = useManuscripts();
  
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<UISuggestion[]>([]);
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  
  // Editor reference
  const editorRef = useRef<any>(null);

  // Load manuscript
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const loadManuscript = () => {
      const found = getManuscriptById(id);
      if (found) {
        setManuscript(found);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    loadManuscript();
  }, [id, getManuscriptById]);

  // Get suggestions callback for editor
  const getSuggestions = useCallback(() => {
    return suggestions;
  }, [suggestions]);

  // Handle content updates
  const handleContentUpdate = useCallback((html: string, text: string) => {
    if (!manuscript) return;
    
    updateManuscript(manuscript.id, {
      content_html: html,
      content_text: text,
    });
    
    setManuscript(prev => prev ? {
      ...prev,
      contentHtml: html,
      contentText: text,
      updatedAt: new Date().toISOString()
    } : null);
  }, [manuscript, updateManuscript]);

  // Handle suggestion applied
  const handleSuggestionApplied = useCallback((suggestionId: string) => {
    console.log('Suggestion applied:', suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    toast({
      title: "Change applied."
    });
  }, [toast]);

  // Handle suggestion rejected
  const handleSuggestionRejected = useCallback((suggestionId: string) => {
    console.log('Suggestion rejected:', suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    toast({
      title: "Change dismissed."
    });
  }, [toast]);

  // Run AI suggestions
  const handleRunAI = async () => {
    if (!manuscript || !editorRef.current) return;
    
    setIsRunningAI(true);
    try {
      const editorText = editorRef.current.getText();
      
      const { data, error } = await supabase.functions.invoke('suggest', {
        body: {
          text: editorText,
          categories: ['grammar', 'spelling', 'style']
        }
      });

      if (error) {
        console.error('AI suggestion error:', error);
        toast({
          title: "Failed to generate suggestions",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Map server suggestions to UI suggestions
      const serverSuggestions: ServerSuggestion[] = data.suggestions || [];
      const mapped = mapPlainTextToPM(editorRef.current, editorText, serverSuggestions);
      
      setSuggestions(mapped);
      
      // Apply suggestion marks to editor
      if (mapped.length > 0) {
        editorRef.current.commands.addSuggestionMarks(mapped);
      }
      
      toast({
        title: `Generated ${mapped.length} suggestions`,
      });
    } catch (error) {
      console.error('Error running AI:', error);
      toast({
        title: "Failed to generate suggestions",
        variant: "destructive"
      });
    } finally {
      setIsRunningAI(false);
    }
  };

  // Accept all suggestions
  const handleAcceptAll = () => {
    if (!editorRef.current) return;
    
    editorRef.current.commands.acceptAllSuggestions();
    setSuggestions([]);
    toast({
      title: "All changes applied."
    });
  };

  // Clear all suggestions
  const handleClearAll = () => {
    if (!editorRef.current) return;
    
    editorRef.current.commands.clearAllSuggestions();
    setSuggestions([]);
    toast({
      title: "All suggestions cleared."
    });
  };

  // Navigate suggestions
  const handleNavigateToSuggestion = (index: number) => {
    if (index < 0 || index >= suggestions.length) return;
    
    const suggestion = suggestions[index];
    setCurrentSuggestionIndex(index);
    
    // Focus editor and scroll to suggestion
    if (editorRef.current) {
      editorRef.current.commands.focus();
      editorRef.current.commands.setTextSelection(suggestion.pmFrom);
    }
  };

  const navigateNext = () => {
    const nextIndex = (currentSuggestionIndex + 1) % suggestions.length;
    handleNavigateToSuggestion(nextIndex);
  };

  const navigatePrevious = () => {
    const prevIndex = currentSuggestionIndex === 0 ? suggestions.length - 1 : currentSuggestionIndex - 1;
    handleNavigateToSuggestion(prevIndex);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading manuscript...</span>
        </div>
      </div>
    );
  }

  if (notFound || !manuscript) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Manuscript not found</h1>
          <p className="text-muted-foreground mb-4">The manuscript you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">{manuscript.title}</h1>
                <Badge variant="outline" className="mt-1">
                  Experimental Editor
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {suggestions.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigatePrevious}
                    disabled={suggestions.length === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateNext}
                    disabled={suggestions.length === 0}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {suggestions.length > 0 ? `${currentSuggestionIndex + 1} of ${suggestions.length}` : '0 suggestions'}
                  </span>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptAll}
                    disabled={suggestions.length === 0}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={suggestions.length === 0}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </>
              )}
              <Button
                onClick={handleRunAI}
                disabled={isRunningAI}
                size="sm"
              >
                {isRunningAI ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run AI
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Document Canvas */}
        <div className="flex-1 flex flex-col">
          <ExperimentalDocumentCanvas
            manuscript={manuscript}
            suggestions={suggestions}
            onUpdate={handleContentUpdate}
            getSuggestions={getSuggestions}
            onSuggestionApplied={handleSuggestionApplied}
            onSuggestionRejected={handleSuggestionRejected}
            editorRef={editorRef}
          />
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Suggestions</h2>
            <p className="text-sm text-muted-foreground">
              {suggestions.length} suggestions found
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4">
              <ExperimentalSuggestionsList
                suggestions={suggestions}
                currentIndex={currentSuggestionIndex}
                onNavigate={handleNavigateToSuggestion}
                onApply={handleSuggestionApplied}
                onReject={handleSuggestionRejected}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ExperimentalEditor;