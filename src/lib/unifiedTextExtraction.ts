import { supabase } from '@/integrations/supabase/client';
import { extractPlainText } from './docxUtils';

/**
 * Unified text extraction utility that ensures both AI and editor 
 * analyze the same text content from DOCX files
 */

let cachedText: { filePath: string; text: string; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds cache

/**
 * Extract plain text from DOCX file in Supabase storage
 * This method ensures both AI suggestions and position mapping use identical text
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
  console.log('extractTextFromDocx called with filePath:', filePath);
  
  // Check cache first
  if (cachedText && 
      cachedText.filePath === filePath && 
      Date.now() - cachedText.timestamp < CACHE_TTL) {
    console.log('Using cached text for', filePath);
    return cachedText.text;
  }

  try {
    // Download DOCX file from Supabase storage
    const { data, error } = await supabase.storage
      .from('manuscripts')
      .download(filePath);

    if (error) {
      console.error('Error downloading DOCX file:', error);
      throw new Error(`Failed to download DOCX file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data received from storage');
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    
    // Extract plain text using mammoth (same as AI function)
    const text = await extractPlainText(arrayBuffer);
    
    // Cache the result
    cachedText = {
      filePath,
      text,
      timestamp: Date.now()
    };
    
    console.log('Extracted text length:', text.length);
    return text;
    
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear the text cache (call when manuscript content changes)
 */
export function clearTextCache(): void {
  cachedText = null;
  console.log('Text extraction cache cleared');
}

/**
 * Check if text is cached for a given file path
 */
export function isTextCached(filePath: string): boolean {
  return cachedText !== null && 
         cachedText.filePath === filePath && 
         Date.now() - cachedText.timestamp < CACHE_TTL;
}