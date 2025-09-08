import { Editor } from '@tiptap/core';

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

// Helper to convert plain text to basic HTML paragraphs
export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => `<p>${paragraph}</p>`)
    .join('');
}