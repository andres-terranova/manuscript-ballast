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

// Phase 1: PM-native validator - emit PM ranges directly, no text mapping needed
// This walks the PM doc and outputs PM positions natively

export function runDeterministicChecks(editor: any, enabled: StyleRuleKey[]): CheckItem[] {
  if (!editor?.state?.doc) return [];
  
  const { state } = editor;
  const doc = state.doc;
  const out: CheckItem[] = [];
  
  // Phase 1: PM-native validator - walk the PM document directly
  // This eliminates the text→PM mapping step entirely
  
  let globalTextOffset = 0;
  
  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return true;
    
    const text = node.text;
    const nodeStart = pos;
    
    // Apply rules to this text node
    applyRulesToTextNode(text, globalTextOffset, nodeStart, enabled, out);
    
    globalTextOffset += text.length;
    return true;
  });
  
  return out;
}

function applyRulesToTextNode(
  text: string, 
  globalTextOffset: number, 
  pmNodeStart: number, 
  enabled: StyleRuleKey[], 
  out: CheckItem[]
): void {
  
  const push = (rule: StyleRuleKey, localStart: number, localEnd: number, message: string) => {
    // Convert local node offsets to global PM positions
    const pmFrom = pmNodeStart + localStart;
    const pmTo = pmNodeStart + localEnd;
    
    out.push({ 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      rule, 
      start: globalTextOffset + localStart,  // Keep for backward compatibility
      end: globalTextOffset + localEnd,      // Keep for backward compatibility  
      pmFrom,
      pmTo,
      message 
    });
  };

  // Helper to scan regex matches within this text node
  function scanRegex(rule: StyleRuleKey, re: RegExp, msg: string) {
    if (!enabled.includes(rule)) return;
    
    // Reset regex state for this text node
    re.lastIndex = 0;
    
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      push(rule, start, end, msg);
      
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
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      push("serialComma", start, end, "Consider an Oxford comma before \"and\" in a simple list.");
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

  // Note: titleCaseHeadings is more complex as it needs to analyze across nodes
  // For Phase 1, we'll keep it simple and only check within individual text nodes
  if (enabled.includes("titleCaseHeadings")) {
    // Only flag if this entire node looks like a heading
    if (text.length < 100 && text.split(" ").length <= 12 && /^[A-Za-z]/.test(text)) {
      const isMostlyLower = text === text.toLowerCase() && /[a-z]/.test(text);
      if (isMostlyLower) {
        push("titleCaseHeadings", 0, text.length, "Use title case for headings.");
      }
    }
  }
}