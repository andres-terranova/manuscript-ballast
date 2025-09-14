import mammoth from 'mammoth';

export interface DocxParseResult {
  html: string;
  plainText: string;
  wordCount: number;
  characterCount: number;
}

export interface DocxValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Parse DOCX file to HTML for editor display
 */
export async function parseDocxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }
    
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX to HTML:', error);
    throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract plain text from DOCX file for AI processing
 */
export async function extractPlainText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX text extraction warnings:', result.messages);
    }
    
    return result.value;
  } catch (error) {
    console.error('Error extracting plain text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse DOCX file and return both HTML and plain text
 */
export async function parseDocxFile(arrayBuffer: ArrayBuffer): Promise<DocxParseResult> {
  try {
    // Parse both HTML and plain text in parallel
    const [html, plainText] = await Promise.all([
      parseDocxToHtml(arrayBuffer),
      extractPlainText(arrayBuffer)
    ]);

    // Calculate word and character counts from plain text
    const wordCount = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = plainText.length;

    return {
      html,
      plainText,
      wordCount,
      characterCount
    };
  } catch (error) {
    console.error('Error parsing DOCX file:', error);
    throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate DOCX file before processing
 */
export function validateDocxFile(file: File): DocxValidationResult {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return {
      valid: false,
      error: 'File must be a .docx document'
    };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }

  // Check minimum file size (empty DOCX files are typically at least 5KB)
  if (file.size < 1024) {
    return {
      valid: false,
      error: 'File appears to be empty or corrupted'
    };
  }

  return { valid: true };
}

/**
 * Create excerpt from plain text
 */
export function createExcerpt(plainText: string, maxLength: number = 200): string {
  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Find the last complete sentence within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentenceEnd > maxLength * 0.6) {
    // If we found a sentence ending in the latter part, use it
    return truncated.substring(0, lastSentenceEnd + 1);
  } else {
    // Otherwise, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}
