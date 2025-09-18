import { useEditor } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { SuggestionInsert, SuggestionDelete } from '@/lib/tiptapMarks';
import { suggestionModePlugin } from 'prosemirror-suggestion-mode';
import type { UISuggestion } from '@/lib/types';

interface UseExperimentalEditorOptions {
  contentHtml: string;
  readOnly: boolean;
  onUpdate: (html: string, text: string) => void;
  getSuggestions?: () => UISuggestion[];
  onSuggestionApplied?: (suggestionId: string) => void;
  onSuggestionRejected?: (suggestionId: string) => void;
}

export const useExperimentalEditor = ({ 
  contentHtml, 
  readOnly, 
  onUpdate, 
  getSuggestions,
  onSuggestionApplied,
  onSuggestionRejected
}: UseExperimentalEditorOptions) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedUpdate = useCallback((html: string, text: string) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(html, text);
    }, 500);
  }, [onUpdate]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start editing…',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      SuggestionInsert,
      SuggestionDelete,
    ],
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      debouncedUpdate(html, text);
    },
    onCreate: ({ editor }) => {
      try {
        const pmPlugins = editor.view.state.plugins.slice();
        pmPlugins.push(suggestionModePlugin({ 
          username: "Editor", 
          data: { source: "ai" } 
        }));
        editor.view.updateState(editor.view.state.reconfigure({ plugins: pmPlugins }));
      } catch (e) {
        console.warn("Failed to attach suggestion-mode plugin", e);
      }
    },
    immediatelyRender: false,
  });

  // Update editor editable state when readOnly changes
  if (editor && editor.isEditable === readOnly) {
    editor.setEditable(!readOnly);
  }

  return editor;
};