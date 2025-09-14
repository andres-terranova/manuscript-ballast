import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import mammoth from 'https://esm.sh/mammoth@1.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { manuscriptId, filePath } = await req.json()
    
    if (!manuscriptId || !filePath) {
      throw new Error('Missing manuscriptId or filePath')
    }

    console.log(`Processing DOCX for manuscript ${manuscriptId} from ${filePath}`)

    // Update status to processing
    await supabase
      .from('manuscripts')
      .update({ 
        processing_status: 'processing',
        processing_error: null
      })
      .eq('id', manuscriptId)

    try {
      // Download the DOCX file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('manuscripts')
        .download(filePath)

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`)
      }

      // Convert file to ArrayBuffer for processing
      const arrayBuffer = await fileData.arrayBuffer()
      
      // Process the DOCX content using improved extraction
      const { plainText, html, wordCount, characterCount } = await processDocxContent(arrayBuffer)

      // Create excerpt from plain text
      const excerpt = createExcerpt(plainText, 200)

      // Update manuscript with processed content
      const { error: updateError } = await supabase
        .from('manuscripts')
        .update({
          content_text: plainText,
          content_html: html,
          word_count: wordCount,
          character_count: characterCount,
          excerpt: excerpt,
          processing_status: 'completed',
          processing_error: null
        })
        .eq('id', manuscriptId)

      if (updateError) {
        throw new Error(`Failed to update manuscript: ${updateError.message}`)
      }

      console.log(`Successfully processed DOCX for manuscript ${manuscriptId}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'DOCX processed successfully',
          wordCount,
          characterCount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (processingError) {
      console.error('DOCX processing error:', processingError)
      
      // Update status to failed with error message
      await supabase
        .from('manuscripts')
        .update({ 
          processing_status: 'failed',
          processing_error: processingError.message
        })
        .eq('id', manuscriptId)

      throw processingError
    }

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

/**
 * Process DOCX content using mammoth.js
 */
async function processDocxContent(arrayBuffer: ArrayBuffer): Promise<{ 
  plainText: string; 
  html: string; 
  wordCount: number; 
  characterCount: number; 
}> {
  try {
    console.log('Processing DOCX with mammoth.js...');
    
    // Convert DOCX to HTML using mammoth
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;
    
    // Extract plain text using mammoth
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const plainText = textResult.value;
    
    // Log any conversion messages/warnings
    if (htmlResult.messages.length > 0) {
      console.log('Mammoth conversion messages:', htmlResult.messages);
    }
    
    // Calculate statistics
    const wordCount = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = plainText.length;

    console.log(`Processed DOCX: ${wordCount} words, ${characterCount} characters`);

    return { 
      plainText, 
      html,
      wordCount,
      characterCount
    };
  } catch (error) {
    console.error('Mammoth processing error:', error);
    throw new Error(`Failed to process DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create excerpt from plain text
 */
function createExcerpt(plainText: string, maxLength: number = 200): string {
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