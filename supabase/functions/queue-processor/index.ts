import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'
import mammoth from 'https://esm.sh/mammoth@1.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueJob {
  id: string;
  manuscript_id: string;
  job_type: string;
  progress_data: any;
  attempts: number;
  max_attempts: number;
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
    );

    console.log('Queue processor started...');

    // Get next job from queue (including stuck jobs)
    const { data: jobs, error: queueError } = await supabase
      .from('processing_queue')
      .select('*')
      .or('status.eq.pending,and(status.eq.processing,started_at.lt.' + new Date(Date.now() - 120000).toISOString() + ')') // Include jobs stuck for >2 minutes
      .lt('attempts', 3) // max_attempts
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (queueError) {
      throw new Error(`Failed to fetch queue jobs: ${queueError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs in queue' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = jobs[0] as QueueJob;
    console.log(`Processing job ${job.id} for manuscript ${job.manuscript_id}`);

    // Mark job as processing
    await supabase
      .from('processing_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
        progress_data: { ...job.progress_data, step: 'processing', progress: 10 }
      })
      .eq('id', job.id);

    // Update manuscript status
    await supabase
      .from('manuscripts')
      .update({ processing_status: 'processing' })
      .eq('id', job.manuscript_id);

    try {
      // Process the job based on type
      if (job.job_type === 'process_docx') {
        await processDocxJob(supabase, job);
      }

      // Mark job as completed
      await supabase
        .from('processing_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_data: { ...job.progress_data, step: 'completed', progress: 100 }
        })
        .eq('id', job.id);

      console.log(`Successfully completed job ${job.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Job ${job.id} completed successfully`,
          job_id: job.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error(`Job ${job.id} processing error:`, processingError);

      const isMaxAttempts = job.attempts + 1 >= job.max_attempts;
      
      // Mark job as failed or retry
      await supabase
        .from('processing_queue')
        .update({
          status: isMaxAttempts ? 'failed' : 'pending',
          error_message: processingError.message,
          progress_data: { 
            ...job.progress_data, 
            step: 'error', 
            error: processingError.message 
          }
        })
        .eq('id', job.id);

      // Update manuscript status
      if (isMaxAttempts) {
        await supabase
          .from('manuscripts')
          .update({
            processing_status: 'failed',
            processing_error: processingError.message
          })
          .eq('id', job.manuscript_id);
      }

      throw processingError;
    }

  } catch (error) {
    console.error('Queue processor error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Queue processor error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

/**
 * Process DOCX job from queue
 */
async function processDocxJob(supabase: any, job: QueueJob) {
  console.log(`Processing DOCX for manuscript ${job.manuscript_id}`);

  // Get manuscript details
  const { data: manuscript, error: manuscriptError } = await supabase
    .from('manuscripts')
    .select('*')
    .eq('id', job.manuscript_id)
    .single();

  if (manuscriptError || !manuscript) {
    throw new Error(`Failed to fetch manuscript: ${manuscriptError?.message}`);
  }

  if (!manuscript.docx_file_path) {
    throw new Error('No DOCX file path found for manuscript');
  }

  // Update progress - downloading file
  await supabase
    .from('processing_queue')
    .update({
      progress_data: { ...job.progress_data, step: 'downloading', progress: 20 }
    })
    .eq('id', job.id);

  // Download the DOCX file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('manuscripts')
    .download(manuscript.docx_file_path);

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }

  // Update progress - processing content
  await supabase
    .from('processing_queue')
    .update({
      progress_data: { ...job.progress_data, step: 'extracting_text', progress: 50 }
    })
    .eq('id', job.id);

  // Convert file to ArrayBuffer for processing
  const arrayBuffer = await fileData.arrayBuffer();
  
  // Process the DOCX content
  const { plainText, html, wordCount, characterCount } = await processDocxContent(arrayBuffer);

  // Update progress - saving results
  await supabase
    .from('processing_queue')
    .update({
      progress_data: { ...job.progress_data, step: 'saving_results', progress: 80 }
    })
    .eq('id', job.id);

  // Create excerpt from plain text
  const excerpt = createExcerpt(plainText, 200);

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
    .eq('id', job.manuscript_id);

  if (updateError) {
    throw new Error(`Failed to update manuscript: ${updateError.message}`);
  }

  console.log(`Successfully processed DOCX for manuscript ${job.manuscript_id}: ${wordCount} words, ${characterCount} characters`);
}

/**
 * Process DOCX content with CPU timeout protection
 */
async function processDocxContent(arrayBuffer: ArrayBuffer): Promise<{ 
  plainText: string; 
  html: string; 
  wordCount: number; 
  characterCount: number; 
}> {
  const startTime = Date.now();
  const CPU_TIMEOUT_MS = 1800; // 1.8 seconds (leave buffer before 2.3s limit)
  
  try {
    console.log(`Processing DOCX buffer size: ${arrayBuffer.byteLength} bytes`);
    
    // CPU timeout wrapper
    const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };

    // Calculate remaining CPU time
    const getRemainingTime = () => CPU_TIMEOUT_MS - (Date.now() - startTime);

    // Extract plain text with timeout protection
    console.log('Starting text extraction...');
    const textResult = await withTimeout(
      mammoth.extractRawText({ arrayBuffer }),
      Math.min(getRemainingTime(), 1200), // Max 1.2s for text extraction
      'Text extraction'
    );
    const plainText = textResult.value;
    
    // Calculate statistics early
    const wordCount = plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = plainText.length;

    console.log(`Text extracted in ${Date.now() - startTime}ms: ${wordCount} words, ${characterCount} characters`);

    // Check if we have time for HTML conversion
    const remainingTime = getRemainingTime();
    let html = '';
    
    if (remainingTime > 300) { // Need at least 300ms for HTML conversion
      try {
        // Adaptive HTML conversion based on size and remaining time
        if (plainText.length < 500000 && remainingTime > 800) { // 500KB text and 800ms remaining
          console.log(`Converting to HTML with ${remainingTime}ms remaining...`);
          const htmlResult = await withTimeout(
            mammoth.convertToHtml({ arrayBuffer }),
            Math.min(remainingTime - 100, 800), // Leave 100ms buffer
            'HTML conversion'
          );
          html = htmlResult.value;
          
          if (htmlResult.messages.length > 0) {
            console.log('Mammoth conversion messages:', htmlResult.messages);
          }
        } else {
          // Fast HTML fallback for large texts or limited time
          console.log('Using fast HTML fallback due to size/time constraints');
          html = createFastHtml(plainText);
        }
      } catch (htmlError) {
        console.warn('HTML conversion failed, using fallback:', htmlError.message);
        html = createFastHtml(plainText);
      }
    } else {
      console.log(`Skipping HTML conversion, only ${remainingTime}ms remaining`);
      html = createFastHtml(plainText);
    }

    const totalTime = Date.now() - startTime;
    console.log(`DOCX processing completed in ${totalTime}ms`);

    return { 
      plainText, 
      html,
      wordCount,
      characterCount
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Mammoth processing failed after ${totalTime}ms:`, error);
    throw new Error(`Failed to process DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create fast HTML fallback for large documents or time constraints
 */
function createFastHtml(plainText: string): string {
  // Simple paragraph splitting - much faster than mammoth HTML conversion
  const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const limitedParagraphs = paragraphs.slice(0, 1000); // Limit to 1000 paragraphs for performance
  
  return `<div class="manuscript-content">${
    limitedParagraphs.map(p => 
      `<p>${p.replace(/\n/g, '<br>').substring(0, 2000)}</p>` // Limit paragraph length
    ).join('')
  }</div>`;
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


