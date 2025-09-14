import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

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
      
      // For MVP, we'll use a simple text extraction approach
      // In production, you'd want to use a proper DOCX parsing library
      const processedContent = await processDocxContent(arrayBuffer)
      
      // Calculate word count and character count
      const wordCount = processedContent.plainText.trim().split(/\s+/).filter(word => word.length > 0).length
      const characterCount = processedContent.plainText.length
      const excerpt = processedContent.plainText.length > 150 
        ? processedContent.plainText.substring(0, 150) + '...'
        : processedContent.plainText

      // Update manuscript with processed content
      const { error: updateError } = await supabase
        .from('manuscripts')
        .update({
          content_text: processedContent.plainText,
          content_html: processedContent.html,
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

// Simple DOCX content extraction
// For MVP: basic text extraction. In production, use proper DOCX parsing library
async function processDocxContent(arrayBuffer: ArrayBuffer): Promise<{ plainText: string; html: string }> {
  try {
    // For MVP, we'll simulate document processing
    // In production, you'd use a library like mammoth.js or similar
    
    // This is a simplified approach - real DOCX processing would be more complex
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // For now, we'll return a placeholder that indicates the file was received
    // In a real implementation, you'd extract the actual content from the DOCX
    const fileName = `document-${Date.now()}`
    const placeholderText = `Document content extracted from DOCX file (${uint8Array.length} bytes). 

This is a placeholder for the MVP version. The actual document content would be extracted here using a proper DOCX parsing library.

To implement full DOCX processing:
1. Use a library like mammoth.js for proper DOCX to HTML conversion
2. Extract images and handle embedded media
3. Preserve formatting and styles
4. Handle tables, lists, and complex document structures

File size: ${(uint8Array.length / 1024).toFixed(2)} KB`

    const placeholderHtml = `<div class="docx-content">
      <h2>Document Content</h2>
      <p>Document content extracted from DOCX file (${uint8Array.length} bytes).</p>
      
      <p><strong>This is a placeholder for the MVP version.</strong> The actual document content would be extracted here using a proper DOCX parsing library.</p>
      
      <h3>To implement full DOCX processing:</h3>
      <ol>
        <li>Use a library like mammoth.js for proper DOCX to HTML conversion</li>
        <li>Extract images and handle embedded media</li>
        <li>Preserve formatting and styles</li>
        <li>Handle tables, lists, and complex document structures</li>
      </ol>
      
      <p><em>File size: ${(uint8Array.length / 1024).toFixed(2)} KB</em></p>
    </div>`

    return {
      plainText: placeholderText,
      html: placeholderHtml
    }

  } catch (error) {
    console.error('Content processing error:', error)
    throw new Error(`Failed to process DOCX content: ${error.message}`)
  }
}