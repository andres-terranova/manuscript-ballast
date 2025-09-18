import { applySuggestion, acceptAllSuggestions, rejectAllSuggestions } from 'prosemirror-suggestion-mode';
import type { UISuggestion } from '@/lib/types';

export type SimpleSuggestion = {
  textToReplace: string;
  textReplacement: string;
  reason?: string;
};

export function convertToSimpleSuggestion(suggestion: UISuggestion): SimpleSuggestion {
  return {
    textToReplace: suggestion.before,
    textReplacement: suggestion.after,
    reason: suggestion.note,
  };
}

export function applyUISuggestion(editor: any, suggestion: UISuggestion, username: string = "Editor"): boolean {
  if (!editor?.view) return false;
  
  try {
    const simpleSuggestion = convertToSimpleSuggestion(suggestion);
    applySuggestion(editor.view, simpleSuggestion, username);
    return true;
  } catch (error) {
    console.error('Error applying suggestion:', error);
    return false;
  }
}

export function acceptAllEditorSuggestions(editor: any): boolean {
  if (!editor?.view) return false;
  
  try {
    acceptAllSuggestions(editor.view.state, editor.view.dispatch);
    return true;
  } catch (error) {
    console.error('Error accepting all suggestions:', error);
    return false;
  }
}

export function rejectAllEditorSuggestions(editor: any): boolean {
  if (!editor?.view) return false;
  
  try {
    rejectAllSuggestions(editor.view.state, editor.view.dispatch);
    return true;
  } catch (error) {
    console.error('Error rejecting all suggestions:', error);
    return false;
  }
}

export function applyContextBasedSuggestion(editor: any, suggestion: UISuggestion, username: string = "Editor"): boolean {
  if (!editor?.view) return false;
  
  try {
    // Use context-based approach like the working prototype
    const contextSuggestion = {
      textToReplace: suggestion.before,
      textReplacement: suggestion.after,
      reason: suggestion.note,
      textBefore: (suggestion as any).textBefore || '',
      textAfter: (suggestion as any).textAfter || ''
    };
    
    applySuggestion(editor.view, contextSuggestion, username);
    return true;
  } catch (error) {
    console.error('Error applying context-based suggestion:', error);
    return false;
  }
}