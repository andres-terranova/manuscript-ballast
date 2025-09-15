import { Editor } from '@tiptap/core';
import { suggestionsPluginKey } from './suggestionsPlugin';
import { checksPluginKey } from './checksPlugin';
import { mapPlainTextToPM, type UISuggestion } from './suggestionMapper';

let globalEditor: Editor | null = null;

export const setGlobalEditor = (editor: Editor | null) => {
  globalEditor = editor;
};

export function getEditorHTML(): string {
  return globalEditor?.getHTML() || '';
}

export function getEditorPlainText(): string {
  return globalEditor?.getText() || '';
}

export function getGlobalEditor(): Editor | null {
  return globalEditor;
}

export function refreshSuggestions(): void {
  if (globalEditor?.view) {
    globalEditor.view.dispatch(
      globalEditor.state.tr.setMeta(suggestionsPluginKey, "refresh")
    );
  }
}

export function refreshChecks(): void {
  if (globalEditor?.view) {
    globalEditor.view.dispatch(
      globalEditor.state.tr.setMeta(checksPluginKey, "refresh")
    );
  }
}

export function mapAndRefreshSuggestions(serverSuggestions: any[], setUISuggestions: (suggestions: UISuggestion[]) => void): void {
  console.log('mapAndRefreshSuggestions called with', serverSuggestions.length, 'server suggestions');
  if (!globalEditor) return;
  
  const currentText = getEditorPlainText();
  console.log('Current editor text length:', currentText.length);
  const mapped = mapPlainTextToPM(globalEditor, currentText, serverSuggestions);
  setUISuggestions(mapped);
  console.log('About to refresh suggestions in editor');
  refreshSuggestions();
}

// Helper to convert plain text to basic HTML paragraphs
export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => `<p>${paragraph}</p>`)
    .join('');
}

// Helper to update editor content (for imports)
export function updateEditorContent(html: string): boolean {
  if (!globalEditor) {
    console.warn('No editor instance available');
    return false;
  }
  
  try {
    globalEditor.commands.setContent(html);
    return true;
  } catch (error) {
    console.error('Failed to update editor content:', error);
    return false;
  }
}