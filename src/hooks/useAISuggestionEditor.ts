import { useEditor } from '@tiptap/react';
import { useCallback, useRef, useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { supabase } from '@/integrations/supabase/client';

interface UseAISuggestionEditorOptions {
  contentHtml: string;
  readOnly: boolean;
  onUpdate: (html: string, text: string) => void;
  openAIKey?: string;
  onSuggestionsGenerated?: (suggestions: any[]) => void;
}

export const useAISuggestionEditor = ({ 
  contentHtml, 
  readOnly, 
  onUpdate,
  openAIKey,
  onSuggestionsGenerated 
}: UseAISuggestionEditorOptions) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedUpdate = useCallback((html: string, text: string) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(html, text);
    }, 500);
  }, [onUpdate]);

  const debouncedGenerateSuggestions = useCallback((text: string) => {
    if (!openAIKey || !onSuggestionsGenerated || text.length < 10) return;
    
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    
    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Generating AI suggestions for text:', text.substring(0, 100) + '...');
        
        const { data, error } = await supabase.functions.invoke('ai-suggestions', {
          body: { text }
        });
        
        if (error) {
          console.error('Error generating AI suggestions:', error);
          return;
        }
        
        if (data?.suggestions) {
          console.log('Generated', data.suggestions.length, 'AI suggestions');
          onSuggestionsGenerated(data.suggestions);
        }
      } catch (error) {
        console.error('Failed to generate AI suggestions:', error);
      }
    }, 2000); // Wait 2 seconds after user stops typing
  }, [openAIKey, onSuggestionsGenerated]);

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
      
      // Generate AI suggestions if enabled
      if (!readOnly) {
        debouncedGenerateSuggestions(text);
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