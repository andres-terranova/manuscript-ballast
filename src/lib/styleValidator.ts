import type { StyleRuleKey } from './styleRuleConstants';

export type CheckItem = {
  id: string;                      // uuid
  rule: StyleRuleKey;              // which rule fired
  message: string;                 // user-friendly text
  start: number;                   // plain-text index (UTF-16) start
  end: number;                     // plain-text index (exclusive)
  pmFrom?: number;                 // ProseMirror position (computed)
  pmTo?: number;
};

// Minimal plaintext→PM mapper
function mapPlainRangeToPM(editor: any, start: number, end: number): { pmFrom: number; pmTo: number } {
  const { state } = editor;
  const doc = state.doc;
  const segs: Array<{ t0: number; t1: number; p0: number }> = [];
  let t = 0;

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const len = node.text?.length ?? 0;
      if (len) segs.push({ t0: t, t1: t + len, p0: pos });
      t += len;
    }
    return true;
  });

  function toPM(idx: number) {
    let lo = 0, hi = segs.length - 1, k = -1;
    while (lo <= hi) { 
      const m = (lo + hi) >> 1, s = segs[m];
      if (idx < s.t0) hi = m - 1; 
      else if (idx >= s.t1) lo = m + 1; 
      else { k = m; break; } 
    }
    if (k === -1) {
      const last = segs[segs.length - 1];
      return last ? last.p0 + (last.t1 - last.t0) : 0;
    }
    const s = segs[k];
    return s.p0 + (idx - s.t0);
  }

  return { pmFrom: toPM(start), pmTo: toPM(end) };
}

export function runDeterministicChecks(editor: any, enabled: StyleRuleKey[]): CheckItem[] {
  const text = editor?.getText?.() ?? "";
  const out: CheckItem[] = [];
  const push = (rule: StyleRuleKey, start: number, end: number, message: string) => {
    out.push({ id: `${Date.now()}-${out.length}`, rule, start, end, message });
  };

  // Helper to scan regex matches and push items
  function scanRegex(rule: StyleRuleKey, re: RegExp, msg: string) {
    if (!enabled.includes(rule)) return;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const s = m.index, e = s + m[0].length;
      push(rule, s, e, msg);
      if (!re.global) break;
    }
  }

  // 1) singleSpaceAfterPeriod: two or more spaces after .?! 
  scanRegex(
    "singleSpaceAfterPeriod",
    /([.!?]) {2,}/g,
    "Use a single space after sentence-ending punctuation."
  );

  // 2) smartQuotes: straight quotes (simple heuristic)
  if (enabled.includes("smartQuotes")) {
    scanRegex("smartQuotes", /["']/g, "Convert straight quotes/apostrophes to smart quotes.");
  }

  // 3) emDashNoSpaces: spaces around em dash
  scanRegex(
    "emDashNoSpaces",
    /\s—\s| — |— /g,
    "Remove spaces around em dashes (use \"word—word\")."
  );

  // 4) numericRangeEnDash: number-number (simple)
  scanRegex(
    "numericRangeEnDash",
    /(\b\d{1,4})-(\d{1,4}\b)/g,
    "Use an en dash for numeric ranges (e.g., 1999–2001)."
  );

  // 5) punctInsideQuotes (sentence end): ". ? !
  if (enabled.includes("punctInsideQuotes")) {
    // Find cases like ".", "?" , "!"
    scanRegex(
      "punctInsideQuotes",
      /"[.?!](?=\s|$)/g,
      "Keep sentence-ending punctuation inside the closing quote."
    );
  }

  // 6) serialComma (simple lists like A, B and C)
  if (enabled.includes("serialComma")) {
    // naive: token, token and token   (avoid when items have spaces)
    const re = /\b([A-Za-z]+), ([A-Za-z]+) and ([A-Za-z]+)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const s = m.index, e = s + m[0].length;
      push("serialComma", s, e, "Consider an Oxford comma before \"and\" in a simple list.");
    }
  }

  // 7) spellOutOneToNine: numerals 1–9 (skip obvious years/units heuristically later)
  if (enabled.includes("spellOutOneToNine")) {
    scanRegex(
      "spellOutOneToNine",
      /\b[1-9]\b/g,
      "Spell out numbers one through nine in running text."
    );
  }

  // 8) ordinalStyle: 1st/2nd/3rd consistency (flag presence)
  if (enabled.includes("ordinalStyle")) {
    scanRegex(
      "ordinalStyle",
      /\b\d+(st|nd|rd|th)\b/g,
      "Ensure ordinal style is consistent in prose."
    );
  }

  // 9) titleCaseHeadings: detect headings that are all lower (Tip: best-effort)
  if (enabled.includes("titleCaseHeadings")) {
    // Very light heuristic: lines that look like a heading but are mostly lowercase words
    const lines = text.split(/\n/);
    let offset = 0;
    for (const line of lines) {
      const isHeadingLike = /^[A-Za-z].{0,100}$/.test(line) && line.split(" ").length <= 12;
      const isMostlyLower = line === line.toLowerCase() && /[a-z]/.test(line);
      if (isHeadingLike && isMostlyLower) {
        push("titleCaseHeadings", offset, offset + line.length, "Use title case for headings.");
      }
      offset += line.length + 1; // account for newline
    }
  }

  // Map plain-text indices to PM positions for each check
  for (const c of out) {
    try {
      const { pmFrom, pmTo } = mapPlainRangeToPM(editor, c.start, c.end);
      c.pmFrom = pmFrom; 
      c.pmTo = pmTo;
    } catch {}
  }

  return out;
}