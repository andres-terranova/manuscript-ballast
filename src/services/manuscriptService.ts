import { supabase } from '@/integrations/supabase/client';
import { ManuscriptDB, ManuscriptCreateInput, ManuscriptUpdateInput, SuggestionData } from '@/types/manuscript';
import type { Database } from '@/integrations/supabase/types';

export class ManuscriptService {
  
  // Get all manuscripts for the current user (lightweight for dashboard)
  static async getAllManuscripts(): Promise<ManuscriptDB[]> {
    const { data, error } = await supabase
      .from('manuscripts')
      .select(`
        id,
        title,
        owner_id,
        status,
        ball_in_court,
        word_count,
        character_count,
        excerpt,
        processing_status,
        processing_error,
        docx_file_path,
        original_filename,
        file_size,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching manuscripts:', error);
      throw new Error(`Failed to fetch manuscripts: ${error.message}`);
    }

    // Cast to ManuscriptDB and fill in empty arrays for excluded fields
    return (data || []).map(manuscript => ({
      ...manuscript,
      content_text: null,
      content_html: null,
      source_markdown: null,
      style_rules: [],
      suggestions: [],
      comments: [],
      snapshots: null
    })) as unknown as ManuscriptDB[];
  }
  
  // Get a single manuscript by ID
  static async getManuscriptById(id: string): Promise<ManuscriptDB | null> {
    const { data, error } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching manuscript:', error);
      throw new Error(`Failed to fetch manuscript: ${error.message}`);
    }
    
    return data as unknown as ManuscriptDB | null;
  }
  
  // Create a new manuscript
  static async createManuscript(input: ManuscriptCreateInput): Promise<ManuscriptDB> {
    // Calculate word count and excerpt if content provided
    const wordCount = input.content_text ? this.calculateWordCount(input.content_text) : 0;
    const characterCount = input.content_text ? input.content_text.length : 0;
    const excerpt = input.excerpt || this.generateExcerpt(input.content_text || '');
    
    const manuscriptData = {
      title: input.title,
      owner_id: null, // MVP doesn't need user association
      status: 'in_progress' as const,
      ball_in_court: 'editor' as const,
      content_text: input.content_text || null,
      content_html: input.content_html || null,
      source_markdown: input.source_markdown || null,
      docx_file_path: input.docx_file_path || null,
      original_filename: input.original_filename || null,
      file_size: input.file_size || null,
      processing_status: input.docx_file_path ? 'pending' as const : 'completed' as const,
      style_rules: (input.style_rules || []) as unknown,
      suggestions: [] as unknown,
      comments: [] as unknown,
      excerpt,
      word_count: wordCount,
      character_count: characterCount
    };
    
    const { data, error } = await supabase
      .from('manuscripts')
      .insert(manuscriptData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating manuscript:', error);
      throw new Error(`Failed to create manuscript: ${error.message}`);
    }
    
    return data as unknown as ManuscriptDB;
  }
  
  // Update an existing manuscript
  static async updateManuscript(id: string, updates: ManuscriptUpdateInput): Promise<ManuscriptDB> {
    // Calculate derived fields if content is being updated
    const updateData = { ...updates } as Record<string, unknown>;
    if (updates.content_text !== undefined) {
      updateData.word_count = this.calculateWordCount(updates.content_text);
      updateData.character_count = updates.content_text.length;
      if (!updateData.excerpt) {
        updateData.excerpt = this.generateExcerpt(updates.content_text);
      }
    }
    
    const { data, error } = await supabase
      .from('manuscripts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating manuscript:', error);
      throw new Error(`Failed to update manuscript: ${error.message}`);
    }
    
    return data as unknown as ManuscriptDB;
  }
  
  // Delete a manuscript
  static async deleteManuscript(id: string): Promise<void> {
    // First, get manuscript details to check for storage file
    const { data: manuscript, error: fetchError } = await supabase
      .from('manuscripts')
      .select('docx_file_path')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching manuscript for deletion:', fetchError);
      throw new Error(`Failed to fetch manuscript: ${fetchError.message}`);
    }

    // Delete storage file if it exists
    if (manuscript?.docx_file_path) {
      try {
        await this.deleteDocxFile(manuscript.docx_file_path);
      } catch (storageError) {
        // Log storage deletion failure but don't fail the operation
        // This prevents orphaned DB records if storage deletion fails
        console.error('Failed to delete storage file:', storageError);
        // Continue with manuscript deletion anyway
      }
    }

    // Delete the manuscript record (CASCADE will handle related tables)
    const { error } = await supabase
      .from('manuscripts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting manuscript:', error);
      throw new Error(`Failed to delete manuscript: ${error.message}`);
    }
  }
  
  // Upload DOCX file to storage
  static async uploadDocxFile(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `mvp-uploads/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('manuscripts')
      .upload(fileName, file);
    
    if (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    return data.path;
  }
  
  // Get download URL for DOCX file
  static async getDocxFileUrl(filePath: string): Promise<string> {
    const { data } = supabase.storage
      .from('manuscripts')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }
  
  // Delete DOCX file from storage
  static async deleteDocxFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('manuscripts')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  // Utility methods
  private static calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  private static generateExcerpt(text: string, maxLength: number = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
  
  // Real-time subscription for manuscript changes
  static subscribeToManuscriptChanges(
    manuscriptId: string,
    callback: (manuscript: ManuscriptDB) => void
  ) {
    return supabase
      .channel('manuscript-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'manuscripts',
          filter: `id=eq.${manuscriptId}`
        },
        (payload) => {
          callback(payload.new as ManuscriptDB);
        }
      )
      .subscribe();
  }
  
  // Batch update suggestions (for accepting/rejecting changes)
  static async updateSuggestions(id: string, suggestions: SuggestionData[]): Promise<ManuscriptDB> {
    return this.updateManuscript(id, { suggestions });
  }

  // Queue DOCX processing for a manuscript (replaces direct Edge Function call)
  static async queueDocxProcessing(manuscriptId: string, filePath: string): Promise<void> {
    try {
      // Add job to processing queue instead of calling Edge Function directly
      const { error } = await supabase
        .from('processing_queue')
        .insert({
          manuscript_id: manuscriptId,
          job_type: 'process_docx',
          priority: 5,
          progress_data: { file_path: filePath, step: 'queued' }
        });

      if (error) {
        console.error('Queue insertion error:', error);
        throw new Error(`Failed to queue DOCX processing: ${error.message}`);
      }

      console.log(`DOCX processing queued for manuscript ${manuscriptId}`);
    } catch (error) {
      console.error('Error queueing DOCX processing:', error);
      throw error;
    }
  }

  // Get processing status for a manuscript
  static async getProcessingStatus(manuscriptId: string): Promise<{
    status: string;
    progress?: Record<string, unknown>;
    error?: string;
  }> {
    const { data, error } = await supabase
      .from('processing_queue')
      .select('status, progress_data, error_message')
      .eq('manuscript_id', manuscriptId)
      .eq('job_type', 'process_docx')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get processing status: ${error.message}`);
    }

    if (!data) {
      return { status: 'not_found' };
    }

    return {
      status: data.status,
      progress: data.progress_data,
      error: data.error_message
    };
  }

  // Get AI suggestion results for a manuscript
  static async getAISuggestionResults(manuscriptId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('ai_suggestion_results')
      .select('suggestions, total_suggestions, created_at')
      .eq('manuscript_id', manuscriptId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get AI suggestion results: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.suggestions || [];
  }

  // Load suggestions from completed queue job
  static async loadSuggestionsFromQueue(manuscriptId: string): Promise<{
    suggestions: unknown[];
    jobStatus: string;
    totalSuggestions: number;
  }> {
    // Check if AI suggestion job has completed
    const { data: jobData, error: jobError } = await supabase
      .from('processing_queue')
      .select('status, progress_data')
      .eq('manuscript_id', manuscriptId)
      .eq('job_type', 'generate_ai_suggestions')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (jobError && jobError.code !== 'PGRST116') {
      throw new Error(`Failed to check AI job status: ${jobError.message}`);
    }

    if (!jobData) {
      return {
        suggestions: [],
        jobStatus: 'not_found',
        totalSuggestions: 0
      };
    }

    const jobStatus = jobData.status;

    // If job is not completed, return current status
    if (jobStatus !== 'completed') {
      return {
        suggestions: [],
        jobStatus,
        totalSuggestions: 0
      };
    }

    // Load suggestions from results table
    try {
      const suggestions = await this.getAISuggestionResults(manuscriptId);
      return {
        suggestions,
        jobStatus: 'completed',
        totalSuggestions: suggestions.length
      };
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
      return {
        suggestions: [],
        jobStatus: 'error',
        totalSuggestions: 0
      };
    }
  }

  // Check if AI suggestion job is available for a manuscript
  static async hasAISuggestionJob(manuscriptId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('processing_queue')
      .select('id')
      .eq('manuscript_id', manuscriptId)
      .eq('job_type', 'generate_ai_suggestions')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking AI suggestion job:', error);
      return false;
    }

    return !!data;
  }
}