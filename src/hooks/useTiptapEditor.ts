import { useEditor } from '@tiptap/react';
import { useCallback, useRef } from 'react';
import * as React from 'react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import AiSuggestion, { getNextWord, getPreviousWord } from '@tiptap-pro/extension-ai-suggestion';
import { Decoration } from '@tiptap/pm/view';
import { SuggestionsExtension } from '@/lib/suggestionsPlugin';
import { ChecksExtension } from '@/lib/checksPlugin';
import type { UISuggestion } from '@/lib/suggestionMapper';
import type { CheckItem } from '@/lib/styleValidator';
import type { AIProgressCallback } from '@/types/aiProgress';

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
    onPopoverElementCreate?: (element: HTMLElement | null) => void;
    onSelectedSuggestionChange?: (suggestion: unknown) => void;
    onProgressUpdate?: AIProgressCallback;
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
  const editorRef = useRef<Editor | null>(null);
  const progressCallbackRef = useRef<AIProgressCallback | undefined>(aiSuggestionConfig?.onProgressUpdate);

  // Update progress callback ref when it changes
  React.useEffect(() => {
    progressCallbackRef.current = aiSuggestionConfig?.onProgressUpdate;
  }, [aiSuggestionConfig?.onProgressUpdate]);

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
            // Fix: Use a valid model name instead of "gpt-5-mini"
            modelName: 'gpt-4o-mini' as const,
            model: 'gpt-4o-mini' as const,
            // Use TipTap's native chunking system for large documents
            enableCache: true,      // Enable caching to avoid redundant API calls (default: true)
            chunkSize: 20,          // UAT Winner: 19% faster than chunkSize 10 (5.7min vs 7.1min)

            // 🆕 CUSTOM RESOLVER FOR LARGE DOCUMENTS
            async resolver({ defaultResolver, rules, ...options }: { defaultResolver: (opts: unknown) => Promise<unknown>; rules: unknown; [key: string]: unknown }) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

              return await defaultResolver({
                ...options,
                rules,

                apiResolver: async ({ html, htmlChunks, rules }: { html: string; htmlChunks: Array<{ html: string; id: string }>; rules: Array<{ id: string; prompt: string; title: string }> }) => {
                  const allSuggestions = [];
                  const startTime = Date.now();

                  // 🆕 PARALLEL BATCH PROCESSING
                  const BATCH_SIZE = 5; // Process 5 chunks simultaneously
                  const totalBatches = Math.ceil(htmlChunks.length / BATCH_SIZE);
                  let processedBatchCount = 0;
                  let processedChunkCount = 0;
                  let failedCount = 0;

                  // Emit initial progress
                  progressCallbackRef.current?.({
                    totalChunks: htmlChunks.length,
                    processedChunks: 0,
                    suggestionsFound: 0,
                    status: 'initializing',
                    statusMessage: 'Analyzing manuscript...',
                  });

                  // Process chunks in batches
                  for (let i = 0; i < htmlChunks.length; i += BATCH_SIZE) {
                    const batch = htmlChunks.slice(i, i + BATCH_SIZE);
                    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                    const totalBatches = Math.ceil(htmlChunks.length / BATCH_SIZE);

                    // Create promises for all chunks in this batch
                    const batchPromises = batch.map((chunk, batchIndex) => {
                      const chunkIndex = i + batchIndex;
                      return fetch(`${supabaseUrl}/functions/v1/ai-suggestions-html`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${supabaseAnonKey}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          html: chunk.html,
                          chunkId: chunk.id,
                          rules: rules.map((r) => ({
                            id: r.id,
                            prompt: r.prompt,
                            title: r.title
                          }))
                        })
                      })
                      .then(async (response) => {
                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(`HTTP ${response.status}: ${error.message || error.error}`);
                        }
                        const { items } = await response.json();

                        // Emit progress as each chunk completes
                        processedChunkCount++;
                        const percentComplete = Math.round((processedChunkCount / htmlChunks.length) * 100);
                        progressCallbackRef.current?.({
                          totalChunks: htmlChunks.length,
                          processedChunks: processedChunkCount,
                          suggestionsFound: allSuggestions.length + items.length,
                          status: 'processing',
                          statusMessage: `${percentComplete}% of manuscript analyzed`,
                        });

                        return { chunkIndex, suggestions: items, success: true };
                      })
                      .catch((error) => {
                        console.error(`❌ Chunk ${chunkIndex + 1} failed:`, error.message);
                        failedCount++;
                        return { chunkIndex, error: error.message, success: false };
                      });
                    });

                    // Wait for all chunks in this batch to complete (or fail)
                    const batchResults = await Promise.allSettled(batchPromises);

                    // Collect suggestions from completed chunks
                    batchResults.forEach((result) => {
                      if (result.status === 'fulfilled' && result.value?.success && Array.isArray(result.value.suggestions)) {
                        allSuggestions.push(...result.value.suggestions);
                      }
                    });

                    processedBatchCount++;

                    // Small delay between batches for rate limiting
                    if (i + BATCH_SIZE < htmlChunks.length) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }

                  const totalTime = Date.now() - startTime;
                  console.log(`✅ Complete: ${allSuggestions.length} suggestions in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

                  // Emit completion progress
                  progressCallbackRef.current?.({
                    totalChunks: htmlChunks.length,
                    processedChunks: htmlChunks.length,
                    suggestionsFound: allSuggestions.length,
                    status: 'converting',
                    statusMessage: 'Finalizing suggestions...',
                  });

                  // Return in TipTap's expected format
                  return {
                    format: 'replacements',
                    content: {
                      htmlChunks,
                      items: allSuggestions
                    }
                  };
                }
              });
            },

            // Add error handler for better debugging
            onLoadSuggestionsError: (error: Error, context: unknown) => {
              console.error('AI Suggestions loading error:', {
                error: error,
                message: error.message,
                status: (error as { status?: number }).status,
                context: context,
                timestamp: new Date().toISOString()
              });
            },
            // Add custom suggestion decoration for popover
            getCustomSuggestionDecoration: ({ suggestion, isSelected, getDefaultDecorations }: { suggestion: unknown; isSelected: boolean; getDefaultDecorations: () => unknown[] }) => {
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