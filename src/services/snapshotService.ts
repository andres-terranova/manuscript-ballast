import { Editor } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';
import { JSONContent } from '@tiptap/core';
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';
import type { UISuggestion } from '@/lib/types';

// Snapshot event types matching workflow milestones
export type SnapshotEvent = 'upload' | 'send_to_author' | 'return_to_editor' | 'manual' | 'ai_pass_complete' | 'apply_all' | 'ai_pass_start';

// Snapshot structure stored in JSONB array
export interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential: 1, 2, 3...
  event: SnapshotEvent;         // Event that triggered snapshot
  label?: string;               // Optional user-provided label
  content: JSONContent;         // TipTap document JSON from editor.getJSON()
  aiSuggestions?: Suggestion[];  // AI suggestions from editor.extensionStorage.aiSuggestion.getSuggestions()
  manualSuggestions?: UISuggestion[]; // Manual suggestions from React state
  metadata: {
    wordCount: number;
    characterCount: number;
    suggestionCount?: number;   // Total: AI + manual
    aiSuggestionCount?: number; // Breakdown for AI
    manualSuggestionCount?: number; // Breakdown for manual
  };
  createdAt: string;            // ISO 8601 timestamp
  createdBy: string;            // User ID (auth.uid())
}

/**
 * Create a snapshot of the current document state
 *
 * @param editor - TipTap editor instance
 * @param manuscriptId - Manuscript UUID
 * @param event - Event type triggering snapshot
 * @param userId - User ID creating snapshot
 * @param label - Optional custom label for snapshot
 * @param manualSuggestions - Optional manual suggestions from React state
 * @returns Promise<void>
 * @throws Error if database operations fail
 */
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string,
  manualSuggestions?: UISuggestion[]
): Promise<void> {
  try {
    // Step 1: Capture current document state from editor
    const content = editor.getJSON();
    const text = editor.getText();

    // Step 1b: Capture AI suggestions if available
    let aiSuggestions: Suggestion[] = [];
    try {
      const aiStorage = editor.extensionStorage?.aiSuggestion;
      if (aiStorage && typeof aiStorage.getSuggestions === 'function') {
        const suggestions = aiStorage.getSuggestions();
        // Filter out rejected suggestions (optional - keep if you want full state)
        aiSuggestions = suggestions.filter((s: Suggestion) => !s.isRejected);
        console.log(`📸 Capturing ${aiSuggestions.length} AI suggestions with snapshot`);
      } else {
        console.log('📸 No AI suggestions found (extension not loaded or no suggestions)');
      }
    } catch (error) {
      console.error('Error capturing AI suggestions:', error);
      // Continue without suggestions - don't fail snapshot creation
    }

    // Step 1c: Capture manual suggestions if provided
    const manualSuggestionsToSave = manualSuggestions || [];
    console.log(`📸 Capturing ${manualSuggestionsToSave.length} manual suggestions with snapshot`);

    // Step 2: Calculate metadata
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const characterCount = text.length;

    // Step 3: Fetch existing snapshots from database
    const { data: manuscript, error: fetchError } = await supabase
      .from('manuscripts')
      .select('snapshots')
      .eq('id', manuscriptId)
      .single();

    if (fetchError) {
      console.error('Error fetching snapshots:', fetchError);
      throw new Error(`Failed to fetch snapshots: ${fetchError.message}`);
    }

    // Step 4: Determine next version number
    const existingSnapshots = (manuscript?.snapshots as Snapshot[]) || [];
    const version = existingSnapshots.length + 1;

    // Step 5: Create new snapshot object
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),  // Browser native UUID (used elsewhere in codebase)
      version,
      event,
      label,
      content,
      aiSuggestions: aiSuggestions.length > 0 ? aiSuggestions : undefined,
      manualSuggestions: manualSuggestionsToSave.length > 0 ? manualSuggestionsToSave : undefined,
      metadata: {
        wordCount,
        characterCount,
        suggestionCount: aiSuggestions.length + manualSuggestionsToSave.length,
        aiSuggestionCount: aiSuggestions.length,
        manualSuggestionCount: manualSuggestionsToSave.length
      },
      createdAt: new Date().toISOString(),
      createdBy: userId
    };

    // Step 6: Append to snapshots array and update database
    const { error: updateError } = await supabase
      .from('manuscripts')
      .update({ snapshots: [...existingSnapshots, snapshot] })
      .eq('id', manuscriptId);

    if (updateError) {
      console.error('Error creating snapshot:', updateError);
      throw new Error(`Failed to create snapshot: ${updateError.message}`);
    }

    console.log(`✅ Snapshot created: v${version} (${event})`, {
      manuscriptId,
      version,
      event,
      wordCount,
      characterCount,
      aiSuggestionCount: aiSuggestions.length,
      manualSuggestionCount: manualSuggestionsToSave.length,
      totalSuggestionCount: aiSuggestions.length + manualSuggestionsToSave.length
    });

  } catch (error) {
    console.error('Snapshot creation failed:', error);
    throw error;
  }
}

/**
 * Restore a specific snapshot version to the editor
 *
 * @param editor - TipTap editor instance
 * @param manuscriptId - Manuscript UUID
 * @param version - Snapshot version number to restore
 * @returns Promise<{ manualSuggestions: UISuggestion[] }> - Manual suggestions from snapshot
 * @throws Error if snapshot not found or restoration fails
 */
export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<{ manualSuggestions: UISuggestion[] }> {
  try {
    // Step 1: Fetch snapshots from database
    const { data: manuscript, error: fetchError } = await supabase
      .from('manuscripts')
      .select('snapshots')
      .eq('id', manuscriptId)
      .single();

    if (fetchError) {
      console.error('Error fetching snapshots:', fetchError);
      throw new Error(`Failed to fetch snapshots: ${fetchError.message}`);
    }

    // Step 2: Find requested version
    const snapshots = (manuscript?.snapshots as Snapshot[]) || [];
    const snapshot = snapshots.find((s) => s.version === version);

    if (!snapshot) {
      throw new Error(`Snapshot version ${version} not found`);
    }

    // Step 3: Restore content to editor (TipTap setContent command)
    editor.commands.setContent(snapshot.content);

    // Step 3b: Restore AI suggestions using setAiSuggestions
    // NOTE: setAiSuggestions REPLACES all suggestions (pass empty array to clear)
    try {
      const suggestionsToRestore = snapshot.aiSuggestions || [];

      // CRITICAL: Suggestions must be restored AFTER content to ensure positions are valid
      const success = editor.commands.setAiSuggestions(suggestionsToRestore);

      if (success) {
        console.log(`✅ Restored ${suggestionsToRestore.length} AI suggestions from snapshot`);
      } else {
        console.warn('⚠️ setAiSuggestions returned false - suggestions may not be restored');
      }
    } catch (error) {
      console.error('Error restoring AI suggestions:', error);
      // Don't fail the entire restore - document is already restored
      // User can run AI pass again if needed
    }

    // Step 3c: Return manual suggestions to caller
    // (Can't restore directly to React state - must be done in component)
    const manualSuggestionsToRestore = snapshot.manualSuggestions || [];
    console.log(`ℹ️ ${manualSuggestionsToRestore.length} manual suggestions available for restore`);

    // Step 4: Update database with restored content
    // This ensures database stays in sync with editor
    const { error: updateError } = await supabase
      .from('manuscripts')
      .update({
        content_html: editor.getHTML(),
        word_count: snapshot.metadata.wordCount,
        character_count: snapshot.metadata.characterCount
      })
      .eq('id', manuscriptId);

    if (updateError) {
      console.error('Error updating manuscript after restore:', updateError);
      // Don't throw - editor content is already restored
      // Database update is secondary
    }

    console.log(`✅ Restored to version ${version}`, {
      manuscriptId,
      version,
      event: snapshot.event,
      wordCount: snapshot.metadata.wordCount,
      aiSuggestionsRestored: snapshot.aiSuggestions?.length || 0,
      manualSuggestionsRestored: manualSuggestionsToRestore.length
    });

    return { manualSuggestions: manualSuggestionsToRestore };

  } catch (error) {
    console.error('Snapshot restoration failed:', error);
    throw error;
  }
}

/**
 * Get all snapshots for a manuscript
 *
 * @param manuscriptId - Manuscript UUID
 * @returns Promise<Snapshot[]> - Array of snapshots (may be empty)
 */
export async function getSnapshots(manuscriptId: string): Promise<Snapshot[]> {
  try {
    const { data: manuscript, error } = await supabase
      .from('manuscripts')
      .select('snapshots')
      .eq('id', manuscriptId)
      .single();

    if (error) {
      console.error('Error fetching snapshots:', error);
      return [];
    }

    return (manuscript?.snapshots as Snapshot[]) || [];
  } catch (error) {
    console.error('Error getting snapshots:', error);
    return [];
  }
}

/**
 * Get the latest snapshot for a manuscript
 *
 * @param manuscriptId - Manuscript UUID
 * @returns Promise<Snapshot | null> - Latest snapshot or null if none exist
 */
export async function getLatestSnapshot(manuscriptId: string): Promise<Snapshot | null> {
  const snapshots = await getSnapshots(manuscriptId);
  if (snapshots.length === 0) return null;

  // Snapshots are ordered by version, latest is last
  return snapshots[snapshots.length - 1];
}
