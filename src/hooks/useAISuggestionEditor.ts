import { useEditor } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
// import { AiSuggestion } from '@tiptap-pro/extension-ai-suggestion';

interface UseAISuggestionEditorOptions {
  contentHtml: string;
  readOnly: boolean;
  onUpdate: (html: string, text: string) => void;
  openAIKey?: string;
}

export const useAISuggestionEditor = ({ 
  contentHtml, 
  readOnly, 
  onUpdate,
  openAIKey 
}: UseAISuggestionEditorOptions) => {
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
      // Add AI Suggestion extension with OpenAI configuration (commented until package installs)
      // ...(openAIKey ? [AiSuggestion.configure({
      //   openai: {
      //     apiKey: openAIKey,
      //   },
      // })] : []),
    ],
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      debouncedUpdate(html, text);
    },
    immediatelyRender: false,
  });

  // Update editor editable state when readOnly changes
  if (editor && editor.isEditable === readOnly) {
    editor.setEditable(!readOnly);
  }

  return editor;
};