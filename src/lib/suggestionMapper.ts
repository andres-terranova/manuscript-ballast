import type { ServerSuggestion, UISuggestion } from "./types";
import { ProseMirrorPositionMapper, type PositionMappingResult } from "./prosemirrorPositionMapper";
import { mappingDiagnostics, withTiming } from "./mappingDiagnostics";

// Re-export for backwards compatibility
export type { UISuggestion } from "./types";

/**
 * Maps plain text indices to ProseMirror positions for server-originated suggestions
 * Uses ProseMirror's native APIs following implementation best practices
 */
export function mapPlainTextToPM(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  return mapWithProseMirrorNative(editor, plain, items);
}

/**
 * ProseMirror-native position mapping using built-in APIs
 * Follows implementation best practices from the ProseMirror guide
 */
function mapWithProseMirrorNative(editor: any, plain: string, items: ServerSuggestion[]): UISuggestion[] {
  console.log('Using ProseMirror native mapper for', items.length, 'suggestions');
  
  if (!editor?.state?.doc) return [];
  
  // Verify text consistency
  const editorText = editor.getText();
  if (plain !== editorText) {
    console.warn('[PM Native Mapper] Text mismatch - document may have changed');
    console.log('Expected length:', plain.length, 'Actual length:', editorText.length);
    
    mappingDiagnostics.logEvent({
      type: 'validation',
      success: false,
      itemCount: items.length,
      timingMs: 0,
      details: { reason: 'text_mismatch', plainLength: plain.length, editorLength: editorText.length }
    });
    
    // Use current editor text for mapping instead of stale plain text
    plain = editorText;
  }
  
  const { result: mappedSuggestions, timingMs } = withTiming(() => {
    const mapper = new ProseMirrorPositionMapper(editor, plain);
    const results: UISuggestion[] = [];
    const unmappedItems: Array<{ id: string; reason: string }> = [];
    
    for (const suggestion of items) {
      const mappingResult = mapper.mapTextRange(suggestion.start, suggestion.end);
      
      if (!mappingResult.valid) {
        unmappedItems.push({ 
          id: suggestion.id, 
          reason: mappingResult.reason || 'unknown mapping error'
        });
        continue;
      }
      
      results.push({ 
        ...suggestion, 
        pmFrom: mappingResult.pmFrom, 
        pmTo: mappingResult.pmTo 
      });
    }
    
    // Log mapping results
    console.log(`[PM Native Mapper] Mapped ${results.length}/${items.length} suggestions`);
    if (unmappedItems.length > 0) {
      console.warn(`[PM Native Mapper] Failed to map ${unmappedItems.length} suggestions:`, unmappedItems);
    }
    
    // Record diagnostics
    mappingDiagnostics.logEvent({
      type: 'mapping',
      success: unmappedItems.length === 0,
      itemCount: items.length,
      timingMs: 0, // Will be updated below
      details: {
        mapped: results.length,
        unmapped: unmappedItems.length,
        unmappedReasons: unmappedItems.map(item => item.reason)
      }
    });
    
    return results.sort((a, b) => a.pmFrom - b.pmFrom || a.pmTo - b.pmTo);
  }, 'ProseMirror Native Mapping');
  
  // Update diagnostics with actual timing
  const lastEvent = mappingDiagnostics.getRecentEvents(1)[0];
  if (lastEvent) {
    lastEvent.timingMs = timingMs;
  }
  
  return mappedSuggestions;
}

// Legacy mapper removed - now using ProseMirror native APIs exclusively