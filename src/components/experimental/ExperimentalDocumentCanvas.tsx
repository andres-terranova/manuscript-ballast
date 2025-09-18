import { useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExperimentalEditor } from '@/hooks/useExperimentalEditor';
import { applyUISuggestion } from '@/lib/suggestionUtils';
import type { Manuscript } from '@/contexts/ManuscriptsContext';
import type { UISuggestion } from '@/lib/types';

interface ExperimentalDocumentCanvasProps {
  manuscript: Manuscript;
  suggestions: UISuggestion[];
  onUpdate: (html: string, text: string) => void;
  getSuggestions?: () => UISuggestion[];
  onSuggestionApplied?: (suggestionId: string) => void;
  onSuggestionRejected?: (suggestionId: string) => void;
  editorRef: React.MutableRefObject<any>;
}

export const ExperimentalDocumentCanvas = ({
  manuscript,
  suggestions,
  onUpdate,
  getSuggestions,
  onSuggestionApplied,
  onSuggestionRejected,
  editorRef
}: ExperimentalDocumentCanvasProps) => {
  const editor = useExperimentalEditor({
    contentHtml: manuscript.contentHtml || '',
    readOnly: manuscript.status === 'Reviewed',
    onUpdate,
    getSuggestions,
    onSuggestionApplied,
    onSuggestionRejected,
  });

  // Set editor ref for parent component access
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

  // Update suggestions when they change
  useEffect(() => {
    if (editor && suggestions.length > 0) {
      // Apply suggestion marks using the prosemirror-suggestion-mode plugin
      suggestions.forEach(suggestion => {
        applyUISuggestion(editor, suggestion);
      });
    }
  }, [editor, suggestions]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">{manuscript.title}</CardTitle>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Content loaded</span>
            {suggestions.length > 0 && (
              <span className="text-primary">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100%-120px)]">
          <ScrollArea className="h-full">
            <div className="prose prose-sm max-w-none">
              <EditorContent 
                editor={editor}
                className="min-h-full focus:outline-none"
              />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};