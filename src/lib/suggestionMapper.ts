type SuggestionType = "insert" | "delete" | "replace";
type SuggestionCategory = "grammar" | "spelling" | "style";

type ServerSuggestion = {
  id: string;
  type: SuggestionType;
  start: number; // UTF-16 index on editor.getText()
  end: number;   // exclusive; start===end for insert
  before: string;
  after: string;
  category: SuggestionCategory;
  note: string;
  location?: string;
};

export type UISuggestion = ServerSuggestion & { pmFrom: number; pmTo: number };

/**
 * Maps plain text indices to ProseMirror positions
 */
export function mapPlainTextToPM(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  console.log('mapPlainTextToPM called with', items.length, 'suggestions');
  console.log('Plain text length:', plain.length);
  
  if (!editor?.state?.doc) return [];
  
  const { state } = editor;
  const doc = state.doc;
  
  // Get the actual text that ProseMirror sees using the same method
  const editorText = editor.getText();
  console.log('Editor text length:', editorText.length);
  console.log('Text comparison - Plain vs Editor match:', plain === editorText);
  
  if (plain !== editorText) {
    console.warn('Text mismatch between plain and editor text');
    console.log('Plain text preview:', plain.substring(0, 200));
    console.log('Editor text preview:', editorText.substring(0, 200));
  }
  
  // Build character-by-character mapping from plain text to ProseMirror positions
  const charToPosMap: number[] = [];
  let textIndex = 0;
  
  // Traverse the document and build position mapping
  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      const text = node.text;
      for (let i = 0; i < text.length; i++) {
        if (textIndex < plain.length) {
          charToPosMap[textIndex] = pos + i;
          textIndex++;
        }
      }
    } else if (node.isBlock && node.childCount === 0) {
      // Handle empty blocks - they might contribute newlines in getText()
      if (textIndex < plain.length && plain[textIndex] === '\n') {
        charToPosMap[textIndex] = pos;
        textIndex++;
      }
    }
    return true;
  });
  
  console.log('Built character mapping, mapped', textIndex, 'characters out of', plain.length);

  function toPM(textIdx: number): number {
    // Clamp to valid range
    if (textIdx < 0) return 1; // Start of document content
    if (textIdx >= charToPosMap.length) return doc.content.size; // End of document
    
    const pmPos = charToPosMap[textIdx];
    if (pmPos !== undefined) {
      return pmPos;
    }
    
    // Fallback: find closest mapped position
    let closestIdx = textIdx;
    while (closestIdx >= 0 && charToPosMap[closestIdx] === undefined) {
      closestIdx--;
    }
    
    if (closestIdx >= 0 && charToPosMap[closestIdx] !== undefined) {
      return charToPosMap[closestIdx] + (textIdx - closestIdx);
    }
    
    return 1; // Fallback to start of content
  }

  const out: UISuggestion[] = [];
  for (const s of items) {
    try {
      const pmFrom = toPM(s.start);
      const pmTo = toPM(Math.max(s.start, s.end));
      if (pmTo < pmFrom) continue;
      out.push({ ...s, pmFrom, pmTo });
    } catch {
      // skip unmappable suggestions
    }
  }
  
  console.log('Mapped suggestions:', out);
  return out.sort((a, b) => a.pmFrom - b.pmFrom || a.pmTo - b.pmTo);
}