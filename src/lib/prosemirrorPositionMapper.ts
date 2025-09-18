// ProseMirror-native position mapper following implementation best practices
// Uses ProseMirror's built-in APIs instead of manual segment building

export type PositionMappingResult = {
  pmFrom: number;
  pmTo: number;
  valid: boolean;
  reason?: string;
};

/**
 * Converts plain text indices to ProseMirror positions using native APIs
 * Follows ProseMirror best practices by using doc.resolve() and proper traversal
 */
export class ProseMirrorPositionMapper {
  constructor(
    private editor: any,
    private plainText: string
  ) {}

  /**
   * Map plain text range to ProseMirror positions
   * Uses ProseMirror's native document traversal and position resolution
   */
  mapTextRange(start: number, end: number): PositionMappingResult {
    if (!this.editor?.state?.doc) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'No editor document' };
    }

    const { doc } = this.editor.state;
    
    // Validate text indices
    if (start < 0 || end < 0 || start > this.plainText.length || end > this.plainText.length) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'Text indices out of bounds' };
    }

    if (start >= end) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'Invalid range: start >= end' };
    }

    // Convert text indices to ProseMirror positions
    const pmFrom = this.textIndexToPosition(start);
    const pmTo = this.textIndexToPosition(end);

    // Validate ProseMirror positions
    if (pmFrom === null || pmTo === null) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'Failed to map text indices' };
    }

    if (pmFrom >= pmTo) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'Invalid PM range: pmFrom >= pmTo' };
    }

    // Ensure positions are within document bounds
    if (pmFrom < 1 || pmTo > doc.content.size || pmFrom >= doc.content.size) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: 'PM positions out of document bounds' };
    }

    // Validate positions resolve to valid locations
    try {
      const resolvedFrom = doc.resolve(pmFrom);
      const resolvedTo = doc.resolve(pmTo);
      
      // Ensure we're in text content, not structure
      if (!this.isValidTextPosition(resolvedFrom) || !this.isValidTextPosition(resolvedTo)) {
        return { pmFrom: 0, pmTo: 0, valid: false, reason: 'Positions not in text content' };
      }

    } catch (error) {
      return { pmFrom: 0, pmTo: 0, valid: false, reason: `Position resolution failed: ${error.message}` };
    }

    return { pmFrom, pmTo, valid: true };
  }

  /**
   * Convert text index to ProseMirror position using native document traversal
   * Walks through the document accumulating character counts until target index
   */
  private textIndexToPosition(textIndex: number): number | null {
    if (textIndex === 0) return 1; // Start of document content
    
    const { doc } = this.editor.state;
    let currentTextIndex = 0;
    let foundPosition: number | null = null;

    // Walk through document using ProseMirror's native traversal
    doc.descendants((node: any, pos: number) => {
      if (foundPosition !== null) return false; // Stop traversal when found

      if (node.isText && node.text) {
        const textLength = node.text.length;
        
        if (currentTextIndex <= textIndex && textIndex < currentTextIndex + textLength) {
          // Target index is within this text node
          const offsetInNode = textIndex - currentTextIndex;
          foundPosition = pos + offsetInNode;
          return false; // Stop traversal
        }
        
        currentTextIndex += textLength;
      } else if (node.isBlock && currentTextIndex > 0) {
        // Add newline for block boundaries (matching editor.getText() behavior)
        if (currentTextIndex === textIndex) {
          foundPosition = pos;
          return false;
        }
        currentTextIndex += 1; // Account for newline between blocks
      }

      return true; // Continue traversal
    });

    return foundPosition;
  }

  /**
   * Check if a resolved position is valid for text content
   * Uses ProseMirror's position resolution to validate location
   */
  private isValidTextPosition(resolved: any): boolean {
    // Position should be within text content, not at structural boundaries
    const parent = resolved.parent;
    
    // Must be in a text-containing node
    if (!parent.isTextblock && !parent.isText) {
      return false;
    }

    // Position should not be at the very edges of structural elements
    const indexInParent = resolved.index();
    const offsetInParent = resolved.parentOffset;
    
    // Allow positions within text nodes or at text boundaries
    return offsetInParent >= 0 && offsetInParent <= parent.content.size;
  }

  /**
   * Verify that the editor's current text matches our reference text
   * Used to detect if document has changed since mapping was calculated
   */
  isTextStale(): boolean {
    const currentText = this.editor.getText();
    return currentText !== this.plainText;
  }
}