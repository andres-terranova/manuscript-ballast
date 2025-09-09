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
  if (!editor?.state?.doc) return [];
  
  const { state } = editor;
  const doc = state.doc;
  
  // Build segments of text nodes with cumulative lengths
  const segs: Array<{ t0: number; t1: number; p0: number }> = [];
  let t = 0;
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const len = node.text?.length ?? 0;
      if (len) {
        segs.push({ t0: t, t1: t + len, p0: pos });
        t += len;
      }
    } else if (node.isBlock && node.textContent === "" && node.childCount === 0) {
      // no-op for empty blocks
    }
    return true;
  });

  function toPM(idx: number): number {
    // binary search segment containing text index
    let lo = 0, hi = segs.length - 1, k = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      const s = segs[m];
      if (idx < s.t0) {
        hi = m - 1;
      } else if (idx >= s.t1) {
        lo = m + 1;
      } else {
        k = m;
        break;
      }
    }
    
    if (k === -1) {
      // clamp to end of doc if past last char
      const last = segs[segs.length - 1];
      return last ? last.p0 + (last.t1 - last.t0) : 0;
    }
    
    const s = segs[k];
    return s.p0 + (idx - s.t0);
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
  
  return out.sort((a, b) => a.pmFrom - b.pmFrom || a.pmTo - b.pmTo);
}