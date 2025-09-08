import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { EditorContent } from '@tiptap/react';
import { MessageSquare } from "lucide-react";
import { useTiptapEditor } from "@/hooks/useTiptapEditor";
import { useManuscripts } from "@/contexts/ManuscriptsContext";
import { setGlobalEditor, textToHtml } from "@/lib/editorUtils";

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

interface DocumentCanvasProps {
  manuscript: any;
  suggestions?: Suggestion[];
  isReadOnly?: boolean;
}

export const DocumentCanvas = ({ manuscript, suggestions = [], isReadOnly = false }: DocumentCanvasProps) => {
  const { updateManuscript } = useManuscripts();

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

  const editor = useTiptapEditor({
    contentHtml,
    readOnly: isReadOnly,
    onUpdate: handleEditorUpdate,
  });

  // Set global editor reference for utility functions
  useEffect(() => {
    setGlobalEditor(editor);
    return () => setGlobalEditor(null);
  }, [editor]);

  if (!editor) {
    return (
      <ScrollArea className="h-full">
        <div className="flex justify-center p-8">
          <Card className="w-full max-w-4xl bg-document border border-card-border shadow-sm">
            <div className="p-12">
              <div className="animate-pulse">Loading editor...</div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex justify-center p-8">
        <Card 
          id="document-canvas" 
          className="w-full max-w-4xl bg-document border border-card-border shadow-sm"
        >
          <div className="p-12">
            <div className="manuscript-content">
              <h1 className="text-3xl font-bold mb-8 text-center">{manuscript.title}</h1>
              
              <div className="prose max-w-none">
                <EditorContent 
                  editor={editor} 
                  className="min-h-[500px] focus:outline-none"
                />
              </div>

              {/* Comment indicator - keep as static placeholder for now */}
              {!isReadOnly && (
                <div className="relative inline-block mt-6">
                  <span className="bg-yellow-100 px-1 rounded">
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
    </ScrollArea>
  );
};