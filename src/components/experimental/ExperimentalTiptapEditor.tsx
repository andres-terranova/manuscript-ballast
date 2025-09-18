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
  onEditorReady?: (editor: any) => void;
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
  onEditorReady 
}: ExperimentalTiptapEditorProps) {
  const lastContentRef = useRef<string>("");

  // Debug function to check editor state
  const debugEditorState = (editor: any, context: string) => {
    console.log(`=== DEBUG ${context} ===`);
    
    // Check if marks are registered in schema
    const schema = editor.view.state.schema;
    console.log("Schema marks:", Object.keys(schema.marks));
    console.log("Has suggestion_insert:", 'suggestion_insert' in schema.marks);
    console.log("Has suggestion_delete:", 'suggestion_delete' in schema.marks);
    
    // Check plugins
    const plugins = editor.view.state.plugins;
    console.log("Number of plugins:", plugins.length);
    console.log("Plugin names:", plugins.map((p: any) => p.key || p.constructor.name));
    
    // Check prosemirror-suggestion-mode plugin specifically
    const suggestionPlugin = plugins.find((p: any) => 
      p.key && (p.key.includes('suggestion') || p.key.includes('prosemirror'))
    );
    console.log("Suggestion plugin found:", !!suggestionPlugin);
    
    // Check current HTML content
    const html = editor.getHTML();
    console.log("Current HTML length:", html.length);
    console.log("HTML contains suggestion marks:", 
      html.includes('suggestion-insert') || html.includes('suggestion-delete') ||
      html.includes('data-suggestion')
    );
    
    // Sample a bit of HTML to see structure
    console.log("HTML sample (first 200 chars):", html.substring(0, 200));
    
    console.log(`=== END DEBUG ${context} ===`);
  };

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
        // Add the prosemirror-suggestion-mode plugin using GPT's recommended approach
        const pmPlugins = editor.view.state.plugins.slice();
        pmPlugins.push(suggestionModePlugin({ 
          username: "Current User", 
          data: { source: "user" } 
        }));
        
        editor.view.updateState(
          editor.view.state.reconfigure({ plugins: pmPlugins })
        );
        
        console.log("prosemirror-suggestion-mode plugin attached successfully");
        
        // Debug editor state after plugin attachment
        debugEditorState(editor, "AFTER_PLUGIN_ATTACHMENT");
        
        // Notify parent that editor is ready
        if (onEditorReady) {
          onEditorReady(editor);
        }
      } catch (error) {
        console.error("Failed to attach prosemirror-suggestion-mode plugin:", error);
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
        setSuggestionMode((editor as any).view, suggestionMode);
        console.log("Suggestion mode set to:", suggestionMode);
        
        // Debug state after toggling suggestion mode
        if (suggestionMode) {
          debugEditorState(editor, "SUGGESTION_MODE_ON");
        }
      } catch (error) {
        console.error("Failed to set suggestion mode:", error);
      }
    }
  }, [editor, suggestionMode]);

  const handleAcceptAll = () => {
    if (!editor) return;
    try {
      acceptAllSuggestions((editor as any).view.state, (editor as any).view.dispatch);
      console.log("All suggestions accepted");
    } catch (error) {
      console.error("Failed to accept all suggestions:", error);
    }
  };

  const handleRejectAll = () => {
    if (!editor) return;
    try {
      rejectAllSuggestions((editor as any).view.state, (editor as any).view.dispatch);
      console.log("All suggestions rejected");
    } catch (error) {
      console.error("Failed to reject all suggestions:", error);
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