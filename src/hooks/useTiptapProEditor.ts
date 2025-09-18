import { useEditor } from '@tiptap/react';
import { useCallback, useRef, useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useTiptapProAI } from './useTiptapProAI';

// Dynamic import for Tiptap Pro extension to handle potential loading issues
let AiSuggestion: any = null;

interface UseTiptapProEditorOptions {
  contentHtml: string;
  readOnly: boolean;
  onUpdate: (html: string, text: string) => void;
  enableAISuggestions?: boolean;
}

export const useTiptapProEditor = ({ 
  contentHtml, 
  readOnly, 
  onUpdate,
  enableAISuggestions = true
}: UseTiptapProEditorOptions) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const { jwtToken, appId, isReady, error } = useTiptapProAI();
  
  const debouncedUpdate = useCallback((html: string, text: string) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(html, text);
    }, 500);
  }, [onUpdate]);

  // Load AI Suggestion extension dynamically
  useEffect(() => {
    if (enableAISuggestions && !AiSuggestion) {
      // Try to load the extension, but handle gracefully if it fails
      const loadExtension = async () => {
        try {
          // Use dynamic import with type assertion to avoid compilation errors
          const extensionModule = await import('@tiptap-pro/extension-ai-suggestion' as any);
          AiSuggestion = extensionModule.default || extensionModule.AiSuggestion;
          console.log('AI Suggestion extension loaded successfully');
        } catch (err: any) {
          console.warn('AI Suggestion extension not available:', err.message);
          console.log('Please ensure @tiptap-pro/extension-ai-suggestion is properly installed');
          console.log('Continuing with standard editor functionality...');
        }
      };
      
      loadExtension();
    }
  }, [enableAISuggestions]);

  const getExtensions = useCallback(() => {
    const baseExtensions = [
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
    ];

    // Add AI Suggestion extension if available and configured
    if (enableAISuggestions && AiSuggestion && isReady && jwtToken) {
      console.log('Adding AI Suggestion extension with token');
      try {
        baseExtensions.push(
          AiSuggestion.configure({
            appId: appId,
            token: jwtToken,
            rules: [
              {
                id: 'spell-check',
                title: 'Spell Check',
                prompt: 'Identify and correct any spelling mistakes',
                color: '#DC143C',
                backgroundColor: '#FFE6E6',
              },
              {
                id: 'grammar',
                title: 'Grammar Check',
                prompt: 'Identify and correct grammatical errors',
                color: '#FF8C00',
                backgroundColor: '#FFF5E6',
              },
              {
                id: 'clarity',
                title: 'Improve Clarity',
                prompt: 'Suggest improvements for clarity and readability',
                color: '#4169E1',
                backgroundColor: '#E6F0FF',
              },
              {
                id: 'tone',
                title: 'Tone Adjustment',
                prompt: 'Suggest tone improvements for professional communication',
                color: '#32CD32',
                backgroundColor: '#E6FFE6',
              },
            ],
            debounce: 1500,
            autoTrigger: true,
          })
        );
      } catch (configError) {
        console.error('Failed to configure AI Suggestion extension:', configError);
      }
    } else if (enableAISuggestions && error) {
      console.warn('AI Suggestions disabled due to error:', error);
    }

    return baseExtensions;
  }, [enableAISuggestions, isReady, jwtToken, appId, error]);

  const editor = useEditor({
    extensions: getExtensions(),
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      debouncedUpdate(html, text);
    },
    immediatelyRender: false,
  });

  // Update editor extensions when AI becomes ready
  useEffect(() => {
    if (editor && enableAISuggestions && isReady && AiSuggestion) {
      console.log('Reconfiguring editor with AI suggestions');
      // Force extension update by recreating editor with new extensions
      const currentContent = editor.getHTML();
      editor.commands.setContent(currentContent);
    }
  }, [editor, enableAISuggestions, isReady, AiSuggestion]);

  // Update editor editable state when readOnly changes
  if (editor && editor.isEditable === readOnly) {
    editor.setEditable(!readOnly);
  }

  return {
    editor,
    aiStatus: {
      isReady,
      error,
      hasAI: !!AiSuggestion && isReady
    }
  };
};