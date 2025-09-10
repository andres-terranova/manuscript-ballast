import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { EditorContent } from '@tiptap/react';
import { MessageSquare } from "lucide-react";
import { useTiptapEditor } from "@/hooks/useTiptapEditor";
import { useManuscripts } from "@/contexts/ManuscriptsContext";
import { setGlobalEditor, textToHtml, getGlobalEditor } from "@/lib/editorUtils";
import { SuggestContextMenu } from "./SuggestContextMenu";
import { SuggestDialog } from "@/components/ui/suggest-dialog";
import type { UISuggestion } from "@/lib/suggestionMapper";
import type { CheckItem } from "@/lib/styleValidator";
import type { SuggestionType } from "@/lib/types";

interface DocumentCanvasProps {
  manuscript: any;
  suggestions?: UISuggestion[];
  isReadOnly?: boolean;
  onCreateSuggestion?: (data: { mode: SuggestionType; after: string; note: string }) => void;
  getUISuggestions?: () => UISuggestion[];
  getChecks?: () => CheckItem[];
}

export const DocumentCanvas = ({ 
  manuscript, 
  suggestions = [], 
  isReadOnly = false, 
  onCreateSuggestion,
  getUISuggestions, 
  getChecks 
}: DocumentCanvasProps) => {
  const { updateManuscript } = useManuscripts();
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Initialize contentHtml from contentText if not present
  const contentHtml = manuscript.contentHtml || textToHtml(manuscript.contentText);
  
  // Update manuscript with contentHtml if it wasn't present
  useEffect(() => {
    if (!manuscript.contentHtml) {
      updateManuscript(manuscript.id, { 
        contentHtml: textToHtml(manuscript.contentText) 
      });
    }
  }, [manuscript.id, manuscript.contentHtml, manuscript.contentText, updateManuscript]);

  const handleEditorUpdate = (html: string, text: string) => {
    updateManuscript(manuscript.id, {
      contentHtml: html,
      contentText: text,
      updatedAt: new Date().toISOString()
    });
  };

  // Track selection state for context menu
  useEffect(() => {
    const editor = getGlobalEditor();
    if (!editor) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      setHasSelection(from !== to);
    };

    editor.on('selectionUpdate', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, []);

  const handleSuggest = () => {
    if (isReadOnly) return;
    setShowSuggestDialog(true);
  };

  const handleSuggestConfirm = (data: { mode: SuggestionType; after: string; note: string }) => {
    if (onCreateSuggestion) {
      onCreateSuggestion(data);
    }
    setShowSuggestDialog(false);
  };

  const editor = useTiptapEditor({
    contentHtml,
    readOnly: isReadOnly,
    onUpdate: handleEditorUpdate,
    getUISuggestions,
    getChecks,
  });

  // Set global editor reference for utility functions
  useEffect(() => {
    setGlobalEditor(editor);
    return () => setGlobalEditor(null);
  }, [editor]);

  if (!editor) {
    return (
      <ScrollArea className="h-full">
        <div className="flex justify-center p-4 lg:p-8">
          <Card className="w-full max-w-4xl bg-document border border-card-border shadow-sm">
            <div className="p-6 lg:p-12">
              <div className="animate-pulse text-center">Loading editor...</div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex justify-center p-4 lg:p-8">
        <Card 
          id="document-canvas" 
          className="w-full max-w-4xl bg-document border border-card-border shadow-sm"
        >
          <div className="p-6 lg:p-12">
            <div className="manuscript-content">
              <h1 className="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8 text-center">{manuscript.title}</h1>
              
              <div className="prose max-w-none">
                <SuggestContextMenu onSuggest={handleSuggest}>
                  <EditorContent 
                    editor={editor} 
                    className="min-h-[300px] lg:min-h-[500px] focus:outline-none"
                  />
                </SuggestContextMenu>
              </div>

              {/* Comment indicator - keep as static placeholder for now */}
              {!isReadOnly && (
                <div className="relative inline-block mt-4 lg:mt-6">
                  <span className="bg-yellow-100 px-1 rounded text-sm">
                    The conclusion would need to tie these themes together
                  </span>
                  <button className="absolute -right-2 -top-2 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-2 w-2 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Suggest Dialog */}
      <SuggestDialog
        open={showSuggestDialog}
        onOpenChange={setShowSuggestDialog}
        hasSelection={hasSelection}
        onConfirm={handleSuggestConfirm}
      />
    </ScrollArea>
  );
};