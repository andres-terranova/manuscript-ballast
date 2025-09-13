// Unified segment-based mapper for Phase 1
// This replaces dual mapping algorithms with a single, deterministic approach

export type TextSegment = {
  textStart: number;
  textEnd: number;
  pmStart: number;
  pmEnd: number;
};

export type MappingDiagnostics = {
  textLength: number;
  segmentCount: number;
  mappedItems: number;
  unmappedItems: number;
  timingMs: number;
  unmappedDetails: Array<{ id: string; reason: string; textSpan: string }>;
};

/**
 * Unified segment mapper with binary search for O(log n) lookups
 * Features: deterministic mapping, comprehensive diagnostics, position validation
 */
export class SegmentMapper {
  private segments: TextSegment[] = [];
  private analysisHash: string = '';
  
  constructor(
    private editor: any,
    private plainText: string
  ) {
    this.analysisHash = this.computeHash(plainText);
    this.buildSegments();
  }

  private computeHash(text: string): string {
    // Simple hash for content verification - could use crypto.subtle for production
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private buildSegments(): void {
    if (!this.editor?.state?.doc) return;

    const { doc } = this.editor.state;
    const segments: TextSegment[] = [];
    let textIndex = 0;

    doc.descendants((node: any, pos: number) => {
      if (node.isText && node.text) {
        const textLength = node.text.length;
        if (textLength > 0) {
          segments.push({
            textStart: textIndex,
            textEnd: textIndex + textLength,
            pmStart: pos,
            pmEnd: pos + textLength
          });
          textIndex += textLength;
        }
      }
      return true;
    });

    this.segments = segments;
    console.log(`Built ${segments.length} segments for ${textIndex} characters`);
  }

  /**
   * Map text index to ProseMirror position using binary search
   */
  textToPM(textIndex: number): number {
    if (textIndex < 0) return 0;
    
    // Binary search for the segment containing this text index
    let left = 0;
    let right = this.segments.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = this.segments[mid];
      
      if (textIndex < segment.textStart) {
        right = mid - 1;
      } else if (textIndex >= segment.textEnd) {
        left = mid + 1;
      } else {
        // Found the containing segment
        return segment.pmStart + (textIndex - segment.textStart);
      }
    }
    
    // Fallback: use the closest segment
    if (this.segments.length === 0) return 0;
    
    if (textIndex >= this.segments[this.segments.length - 1].textEnd) {
      const lastSegment = this.segments[this.segments.length - 1];
      return lastSegment.pmEnd;
    }
    
    return this.segments[0].pmStart;
  }

  /**
   * Map ProseMirror position to text index
   */
  pmToText(pmPosition: number): number {
    for (const segment of this.segments) {
      if (pmPosition >= segment.pmStart && pmPosition < segment.pmEnd) {
        return segment.textStart + (pmPosition - segment.pmStart);
      }
    }
    
    // Fallback: find closest segment
    if (this.segments.length === 0) return 0;
    
    if (pmPosition >= this.segments[this.segments.length - 1].pmEnd) {
      return this.segments[this.segments.length - 1].textEnd;
    }
    
    return this.segments[0].textStart;
  }

  /**
   * Validate that mapped position contains expected content
   */
  validateMapping(textStart: number, textEnd: number, expectedBefore?: string, expectedAfter?: string): { valid: boolean; reason?: string } {
    const pmFrom = this.textToPM(textStart);
    const pmTo = this.textToPM(textEnd);
    
    if (pmFrom >= pmTo) {
      return { valid: false, reason: 'Invalid position range' };
    }
    
    // Get actual text at mapped position
    const actualText = this.editor.state.doc.textBetween(pmFrom, pmTo, '\n', '\n');
    const plainTextSpan = this.plainText.substring(textStart, textEnd);
    
    if (actualText !== plainTextSpan) {
      return { 
        valid: false, 
        reason: `Text mismatch: expected "${plainTextSpan}", got "${actualText}"` 
      };
    }
    
    // Optional: validate before/after context if provided
    if (expectedBefore) {
      const contextStart = Math.max(0, textStart - expectedBefore.length);
      const actualBefore = this.plainText.substring(contextStart, textStart);
      if (actualBefore !== expectedBefore) {
        return { valid: false, reason: 'Before context mismatch' };
      }
    }
    
    if (expectedAfter) {
      const contextEnd = Math.min(this.plainText.length, textEnd + expectedAfter.length);
      const actualAfter = this.plainText.substring(textEnd, contextEnd);
      if (actualAfter !== expectedAfter) {
        return { valid: false, reason: 'After context mismatch' };
      }
    }
    
    return { valid: true };
  }

  /**
   * Get current analysis hash for content verification
   */
  getAnalysisHash(): string {
    return this.analysisHash;
  }

  /**
   * Check if current editor content matches the analyzed text
   */
  isContentStale(): boolean {
    const currentText = this.editor.getText();
    const currentHash = this.computeHash(currentText);
    return currentHash !== this.analysisHash;
  }

  /**
   * Get diagnostic information about segments and mapping
   */
  getDiagnostics(): { segmentCount: number; textLength: number; pmLength: number } {
    const pmLength = this.segments.length > 0 
      ? this.segments[this.segments.length - 1].pmEnd 
      : 0;
    
    return {
      segmentCount: this.segments.length,
      textLength: this.plainText.length,
      pmLength
    };
  }
}