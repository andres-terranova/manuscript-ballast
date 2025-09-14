import { Editor } from '@tiptap/core';
import { suggestionsPluginKey } from './suggestionsPlugin';
import { checksPluginKey } from './checksPlugin';
import { mapPlainTextToPM, type UISuggestion } from './suggestionMapper';
import { extractTextFromDocx } from './unifiedTextExtraction';

let globalEditor: Editor | null = null;
let currentDocxFilePath: string | null = null;

export const setGlobalEditor = (editor: Editor | null) => {
  globalEditor = editor;
};

export const setCurrentDocxFilePath = (filePath: string | null) => {
  currentDocxFilePath = filePath;
};

export function getEditorHTML(): string {
  return globalEditor?.getHTML() || '';
}

export async function getEditorPlainText(): Promise<string> {
  // Use DOCX-based text extraction for consistency with AI
  if (currentDocxFilePath) {
    try {
      return await extractTextFromDocx(currentDocxFilePath);
    } catch (error) {
      console.error('Failed to extract text from DOCX, falling back to editor text:', error);
    }
  }
  
  // Fallback to editor text if no DOCX path or extraction fails
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

export async function mapAndRefreshSuggestions(serverSuggestions: any[], setUISuggestions: (suggestions: UISuggestion[]) => void): Promise<void> {
  console.log('mapAndRefreshSuggestions called with', serverSuggestions.length, 'server suggestions');
  if (!globalEditor) return;
  
  const currentText = await getEditorPlainText();
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