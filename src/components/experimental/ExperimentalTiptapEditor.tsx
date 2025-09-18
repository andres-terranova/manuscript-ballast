import React, { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { SuggestionInsert } from "./marks/SuggestionInsert";
import { SuggestionDelete } from "./marks/SuggestionDelete";
import "prosemirror-suggestion-mode/style/suggestion-mode.css";
import {
  suggestionModePlugin,
  setSuggestionMode,
  acceptAllSuggestions,
  rejectAllSuggestions,
  applySuggestion,
} from "prosemirror-suggestion-mode";

interface ExperimentalTiptapEditorProps {
  content: string;
  suggestionMode: boolean;
  onContentChange: (html: string) => void;
  onRunAI?: () => Promise<any>;
}

type AISuggestion = {
  textToReplace: string;
  textReplacement: string;
  reason?: string;
  textBefore?: string;
  textAfter?: string;
};

export function ExperimentalTiptapEditor({ 
  content, 
  suggestionMode, 
  onContentChange,
  onRunAI 
}: ExperimentalTiptapEditorProps) {
  const lastContentRef = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      SuggestionInsert,
      SuggestionDelete,
    ],
    content: content,
    editable: true,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== lastContentRef.current) {
        lastContentRef.current = html;
        onContentChange(html);
      }
    },
    onCreate: ({ editor }) => {
      try {
        // Add the prosemirror-suggestion-mode plugin
        const currentPlugins = editor.view.state.plugins.slice();
        const suggestionPlugin = suggestionModePlugin({ 
          username: "Current User", 
          data: { source: "user" } 
        });
        currentPlugins.push(suggestionPlugin);
        
        const newState = editor.view.state.reconfigure({ plugins: currentPlugins });
        editor.view.updateState(newState);
        
        console.log("prosemirror-suggestion-mode plugin attached successfully");
      } catch (error) {
        console.warn("Failed to attach prosemirror-suggestion-mode plugin:", error);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[400px] focus:outline-none p-4",
      },
    },
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);

  // Update suggestion mode
  useEffect(() => {
    if (editor) {
      try {
        setSuggestionMode(editor.view, suggestionMode);
        console.log("Suggestion mode set to:", suggestionMode);
      } catch (error) {
        console.warn("Failed to set suggestion mode:", error);
      }
    }
  }, [editor, suggestionMode]);

  const handleAcceptAll = () => {
    if (!editor) return;
    try {
      acceptAllSuggestions(editor.view.state, editor.view.dispatch);
      console.log("All suggestions accepted");
    } catch (error) {
      console.warn("Failed to accept all suggestions:", error);
    }
  };

  const handleRejectAll = () => {
    if (!editor) return;
    try {
      rejectAllSuggestions(editor.view.state, editor.view.dispatch);
      console.log("All suggestions rejected");
    } catch (error) {
      console.warn("Failed to reject all suggestions:", error);
    }
  };

  // Apply AI suggestions using prosemirror-suggestion-mode
  const applyAISuggestions = async () => {
    if (!editor || !onRunAI) return;
    
    try {
      const suggestions = await onRunAI();
      if (!suggestions || !Array.isArray(suggestions)) return;

      console.log("Applying suggestions:", suggestions);

      // Apply each suggestion using the prosemirror-suggestion-mode library
      suggestions.forEach((suggestion: AISuggestion) => {
        try {
          applySuggestion(editor.view, suggestion, "AI Assistant");
        } catch (error) {
          console.warn("Failed to apply suggestion:", suggestion, error);
        }
      });

    } catch (error) {
      console.error("Failed to apply AI suggestions:", error);
    }
  };

  const getSuggestionsList = () => {
    if (!editor) return [];
    
    const div = document.createElement("div");
    div.innerHTML = editor.getHTML();
    
    return Array.from(div.querySelectorAll("span.suggestion-insert, span.suggestion-delete, mark[data-suggestion]"))
      .map((element, index) => ({
        id: String(index),
        excerpt: element.textContent || "",
        type: element.classList.contains("suggestion-delete") ? "delete" : "insert",
        reason: element.getAttribute("title") || undefined,
      }));
  };

  const suggestions = getSuggestionsList();

  return (
    <div className="space-y-4">
      {/* Suggestion controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {suggestions.length} suggestions found
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAcceptAll}>
            <Check className="h-4 w-4 mr-2" />
            Accept All
          </Button>
          <Button variant="outline" size="sm" onClick={handleRejectAll}>
            <X className="h-4 w-4 mr-2" />
            Reject All
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="border rounded-lg">
        <EditorContent editor={editor} />
      </div>

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="text-sm font-medium">Active Suggestions</h4>
          </div>
          <div className="max-h-48 overflow-auto divide-y">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-3 text-sm">
                <div className="font-mono text-xs mb-1">
                  <span className={`px-1 rounded ${
                    suggestion.type === "insert" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {suggestion.type}
                  </span>
                </div>
                <div className="text-foreground line-clamp-2">
                  {suggestion.excerpt || "(no text)"}
                </div>
                {suggestion.reason && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}