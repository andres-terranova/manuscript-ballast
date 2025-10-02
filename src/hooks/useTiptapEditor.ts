import { useEditor } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import AiSuggestion, { getNextWord, getPreviousWord } from '@tiptap-pro/extension-ai-suggestion';
import { Decoration } from '@tiptap/pm/view';
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
  maxVisibleSuggestions?: number;
  maxVisibleChecks?: number;
  aiSuggestionConfig?: {
    enabled: boolean;
    appId?: string;
    token?: string;
    rules?: Array<{
      id: string;
      title: string;
      prompt: string;
      color: string;
      backgroundColor: string;
    }>;
    loadOnStart?: boolean;
    reloadOnUpdate?: boolean;
    debounceTimeout?: number;
    onPopoverElementCreate?: (element: HTMLElement | null) => void;
    onSelectedSuggestionChange?: (suggestion: any) => void;
  };
}

export const useTiptapEditor = ({ 
  contentHtml, 
  readOnly, 
  onUpdate, 
  getUISuggestions, 
  getChecks,
  maxVisibleSuggestions = 200,
  maxVisibleChecks = 200,
  aiSuggestionConfig
}: UseTiptapEditorOptions) => {
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const editorRef = useRef<any>(null);
  
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
      // Add AI suggestion extension if configured and available
      ...(aiSuggestionConfig?.enabled && AiSuggestion ? (() => {
        try {
          // Validate JWT token format (should have 3 parts separated by dots)
          const isValidJWT = aiSuggestionConfig.token?.split('.').length === 3;
          
          console.log('Configuring AI Suggestion extension with:', {
            appId: aiSuggestionConfig.appId,
            hasToken: !!aiSuggestionConfig.token,
            tokenLength: aiSuggestionConfig.token?.length || 0,
            tokenStart: aiSuggestionConfig.token?.substring(0, 20) + '...',
            isValidJWT: isValidJWT,
            tokenParts: aiSuggestionConfig.token?.split('.').length || 0,
            rules: aiSuggestionConfig.rules?.length || 0,
            currentOrigin: window.location.origin
          });
          
          if (!isValidJWT) {
            console.warn('Token does not appear to be a valid JWT format (should have 3 parts separated by dots)');
          }
          
          const config = {
            rules: aiSuggestionConfig.rules || [
              {
                id: '1',
                title: 'Grammar & Style',
                prompt: 'Identify and correct any grammar, spelling, or style issues',
                color: '#DC143C',
                backgroundColor: '#FFE6E6',
              },
            ],
            appId: aiSuggestionConfig.appId,
            token: aiSuggestionConfig.token,
            loadOnStart: aiSuggestionConfig.loadOnStart ?? false,
            reloadOnUpdate: aiSuggestionConfig.reloadOnUpdate ?? false,
            debounceTimeout: aiSuggestionConfig.debounceTimeout ?? 2000,
            // Fix: Use a valid model name instead of "gpt-5-mini"
            modelName: 'gpt-4o-mini' as const,
            model: 'gpt-4o-mini' as const,
            // Use TipTap's native chunking system for large documents
            enableCache: true,      // Enable caching to avoid redundant API calls (default: true)
            chunkSize: 5,          // TEST: Using 5 nodes per chunk for rate limit testing
            // Add error handler for better debugging
            onLoadSuggestionsError: (error: Error, context: unknown) => {
              console.error('AI Suggestions loading error:', {
                error: error,
                message: error.message,
                status: (error as any).status,
                context: context,
                timestamp: new Date().toISOString()
              });
            },
            // Add custom suggestion decoration for popover
            getCustomSuggestionDecoration: ({ suggestion, isSelected, getDefaultDecorations }: { suggestion: any; isSelected: boolean; getDefaultDecorations: () => any[] }) => {
              const decorations = getDefaultDecorations();
              
              // Add popover element when suggestion is selected
              if (isSelected && aiSuggestionConfig.onPopoverElementCreate && aiSuggestionConfig.onSelectedSuggestionChange) {
                decorations.push(
                  Decoration.widget(suggestion.deleteRange.to, () => {
                    const element = document.createElement('div');
                    element.style.position = 'relative';
                    element.style.display = 'inline-block';
                    element.style.zIndex = '1000';
                    
                    // Set the popover element for React Portal
                    aiSuggestionConfig.onPopoverElementCreate?.(element);
                    
                    // Get context words for the popover
                    try {
                      const editor = editorRef.current;
                      if (editor) {
                        const { previousWord } = getPreviousWord(editor, suggestion.deleteRange.from);
                        const { nextWord, punctuationMark } = getNextWord(editor, suggestion.deleteRange.to);
                        
                        // Update selected suggestion with context
                        aiSuggestionConfig.onSelectedSuggestionChange?.({
                          ...suggestion,
                          context: { previousWord, nextWord, punctuationMark }
                        });
                      } else {
                        aiSuggestionConfig.onSelectedSuggestionChange?.(suggestion);
                      }
                    } catch (error) {
                      console.warn('Error getting suggestion context:', error);
                      aiSuggestionConfig.onSelectedSuggestionChange?.(suggestion);
                    }
                    
                    return element;
                  })
                );
              } else if (!isSelected && aiSuggestionConfig.onPopoverElementCreate) {
                // Clear popover when suggestion is not selected
                aiSuggestionConfig.onPopoverElementCreate(null);
                aiSuggestionConfig.onSelectedSuggestionChange?.(null);
              }
              
              return decorations;
            },
          };
          
          console.log('Final AI Suggestion config:', config);
          return [AiSuggestion.configure(config)];
        } catch (error) {
          console.error('AI Suggestion extension configuration failed:', error);
          return [];
        }
      })() : []),
      // Add suggestions extension if getter is provided
      ...(getUISuggestions ? [SuggestionsExtension.configure({ 
        getUISuggestions,
        maxVisibleSuggestions
      })] : []),
      // Add checks extension if getter is provided
      ...(getChecks ? [ChecksExtension.configure({ 
        getChecks,
        maxVisibleChecks
      })] : []),
    ],
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      debouncedUpdate(html, text);
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    immediatelyRender: false,
  });

  // Update editor editable state when readOnly changes
  if (editor && editor.isEditable === readOnly) {
    editor.setEditable(!readOnly);
  }

  return editor;
};