import type { ServerSuggestion, UISuggestion } from "./types";
import { SegmentMapper, type MappingDiagnostics } from "./segmentMapper";
import { mappingDiagnostics, withTiming } from "./mappingDiagnostics";

// Re-export for backwards compatibility
export type { UISuggestion } from "./types";

// Feature flag for Phase 1 - will be removed after validation
const USE_NEW_SEGMENT_MAPPER = true;

/**
 * Maps plain text indices to ProseMirror positions for server-originated suggestions
 * Phase 1: Uses unified segment mapper with diagnostics and validation
 */
export function mapPlainTextToPM(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  if (USE_NEW_SEGMENT_MAPPER) {
    return mapWithSegmentMapper(editor, plain, items);
  } else {
    return mapWithLegacyMapper(editor, plain, items);
  }
}

/**
 * Phase 1: New unified segment mapper with diagnostics and validation
 * Now enhanced for DOCX-aware processing consistency
 */
function mapWithSegmentMapper(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  console.log('[Enhanced DOCX-aware] Using new segment mapper for', items.length, 'suggestions');
  
  if (!editor?.state?.doc) return [];
  
  const editorText = editor.getText();
  console.log('Plain text length:', plain.length, 'Editor text length:', editorText.length);
  
  // Content verification
  if (plain !== editorText) {
    console.warn('[Segment Mapper] Text mismatch detected');
    console.log('Plain preview:', plain.substring(0, 100));
    console.log('Editor preview:', editorText.substring(0, 100));
    
    mappingDiagnostics.logEvent({
      type: 'validation',
      success: false,
      itemCount: items.length,
      timingMs: 0,
      details: { reason: 'text_mismatch', plainLength: plain.length, editorLength: editorText.length }
    });
  }
  
  const { result: out, timingMs } = withTiming(() => {
    const mapper = new SegmentMapper(editor, plain);
    const results: UISuggestion[] = [];
    const unmappedItems: Array<{ id: string; reason: string }> = [];
    
    for (const suggestion of items) {
      try {
        // Validate mapping with content verification
        const validation = mapper.validateMapping(suggestion.start, suggestion.end, suggestion.before);
        
        if (!validation.valid) {
          unmappedItems.push({ 
            id: suggestion.id, 
            reason: validation.reason || 'unknown' 
          });
          continue;
        }
        
        const pmFrom = mapper.textToPM(suggestion.start);
        const pmTo = mapper.textToPM(suggestion.end);
        
        if (pmFrom >= pmTo) {
          unmappedItems.push({ 
            id: suggestion.id, 
            reason: 'invalid_range' 
          });
          continue;
        }
        
        results.push({ 
          ...suggestion, 
          pmFrom, 
          pmTo 
        });
        
      } catch (error) {
        unmappedItems.push({ 
          id: suggestion.id, 
          reason: `error: ${error.message || 'unknown'}` 
        });
      }
    }
    
    // Log diagnostics
    mappingDiagnostics.logEvent({
      type: 'mapping',
      success: unmappedItems.length === 0,
      itemCount: items.length,
      timingMs: 0, // Will be filled by withTiming
      details: {
        mapped: results.length,
        unmapped: unmappedItems.length,
        unmappedReasons: unmappedItems.map(item => item.reason)
      }
    });
    
    console.log(`[Segment Mapper] Mapped ${results.length}/${items.length} suggestions`);
    if (unmappedItems.length > 0) {
      console.warn(`[Segment Mapper] Failed to map ${unmappedItems.length} suggestions:`, unmappedItems);
    }
    
    return results.sort((a, b) => a.pmFrom - b.pmFrom || a.pmTo - b.pmTo);
  }, 'Segment Mapping');
  
  // Update diagnostics with actual timing
  const lastEvent = mappingDiagnostics.getRecentEvents(1)[0];
  if (lastEvent) {
    lastEvent.timingMs = timingMs;
  }
  
  return out;
}

/**
 * Legacy mapper for comparison during Phase 1 validation
 * Will be removed after canary period
 */
function mapWithLegacyMapper(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  console.log('Using legacy mapper for', items.length, 'suggestions');
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