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
  console.log('Editor text length:', editor.getText().length);
  console.log('Plain text preview:', plain.substring(0, 100) + '...');
  console.log('Editor text preview:', editor.getText().substring(0, 100) + '...');
  
  if (!editor?.state?.doc) return [];
  
  const { state } = editor;
  const doc = state.doc;
  
  // Build segments of text nodes with cumulative lengths
  // ProseMirror positions include block boundaries, so we need to track them
  const segs: Array<{ t0: number; t1: number; p0: number; p1: number }> = [];
  let textOffset = 0;
  
  // Debug: log document structure
  console.log('Document structure:');
  doc.descendants((node: any, pos: number) => {
    console.log(`Node at pos ${pos}: type=${node.type.name}, text="${node.textContent}", isText=${node.isText}, isBlock=${node.isBlock}`);
    
    if (node.isText && node.text) {
      const len = node.text.length;
      if (len > 0) {
        segs.push({ 
          t0: textOffset, 
          t1: textOffset + len, 
          p0: pos, 
          p1: pos + len 
        });
        console.log(`Text segment: t0=${textOffset}, t1=${textOffset + len}, p0=${pos}, p1=${pos + len}, text="${node.text}"`);
        textOffset += len;
      }
    }
    return true;
  });

  console.log('Built segments:', segs);

  function toPM(textIdx: number): number {
    console.log(`Mapping text index ${textIdx} to PM position`);
    
    // Find the segment containing this text index
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (textIdx >= seg.t0 && textIdx <= seg.t1) {
        const pmPos = seg.p0 + (textIdx - seg.t0);
        console.log(`Found in segment ${i}: textIdx ${textIdx} -> pmPos ${pmPos}`);
        return pmPos;
      }
    }
    
    // If not found in any segment, clamp to document bounds
    if (textIdx <= 0) {
      console.log(`Text index ${textIdx} clamped to start: 0`);
      return 0;
    }
    
    const lastSeg = segs[segs.length - 1];
    if (lastSeg) {
      const endPos = lastSeg.p1;
      console.log(`Text index ${textIdx} clamped to end: ${endPos}`);
      return endPos;
    }
    
    console.log(`Text index ${textIdx} defaulted to: 0`);
    return 0;
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