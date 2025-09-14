import { supabase } from '@/integrations/supabase/client';
import { ManuscriptDB, ManuscriptCreateInput, ManuscriptUpdateInput, SuggestionData } from '@/types/manuscript';
import type { Database } from '@/integrations/supabase/types';

export class ManuscriptService {
  
  // Get all manuscripts for the current user
  static async getAllManuscripts(): Promise<ManuscriptDB[]> {
    const { data, error } = await supabase
      .from('manuscripts')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching manuscripts:', error);
      throw new Error(`Failed to fetch manuscripts: ${error.message}`);
    }
    
    return (data || []) as unknown as ManuscriptDB[];
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
      style_rules: (input.style_rules || []) as any,
      suggestions: [] as any,
      comments: [] as any,
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
    const updateData = { ...updates } as any;
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

  // Trigger DOCX processing for a manuscript
  static async processDocx(manuscriptId: string, filePath: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('process-docx', {
        body: { 
          manuscriptId, 
          filePath 
        }
      });

      if (error) {
        console.error('DOCX processing error:', error);
        throw new Error(`Failed to process DOCX: ${error.message}`);
      }

      console.log('DOCX processing initiated:', data);
    } catch (error) {
      console.error('Error invoking DOCX processing:', error);
      throw error;
    }
  }
}