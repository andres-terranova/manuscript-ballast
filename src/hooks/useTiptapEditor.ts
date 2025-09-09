import { useEditor } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { SuggestionsExtension } from '@/lib/suggestionsPlugin';
import { ChecksExtension } from '@/lib/checksPlugin';
import type { UISuggestion } from '@/lib/suggestionMapper';
import type { CheckItem } from '@/lib/styleValidator';

interface UseTiptapEditorOptions {
  contentHtml: string;
  readOnly: boolean;
  onUpdate: (html: string, text: string) => void;
  getUISuggestions?: () => UISuggestion[];
  getChecks?: () => CheckItem[];
}

export const useTiptapEditor = ({ contentHtml, readOnly, onUpdate, getUISuggestions, getChecks }: UseTiptapEditorOptions) => {
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
      // Add suggestions extension if getter is provided
      ...(getUISuggestions ? [SuggestionsExtension.configure({ getUISuggestions })] : []),
      // Add checks extension if getter is provided
      ...(getChecks ? [ChecksExtension.configure({ getChecks })] : []),
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