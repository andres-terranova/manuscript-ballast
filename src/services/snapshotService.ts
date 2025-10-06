import { Editor } from '@tiptap/core';
import { supabase } from '@/integrations/supabase/client';

// Snapshot event types matching workflow milestones
export type SnapshotEvent = 'upload' | 'send_to_author' | 'return_to_editor' | 'manual';

// Snapshot structure stored in JSONB array
export interface Snapshot {
  id: string;                    // UUID
  version: number;               // Sequential: 1, 2, 3...
  event: SnapshotEvent;         // Event that triggered snapshot
  label?: string;               // Optional user-provided label
  content: any;                 // TipTap document JSON from editor.getJSON()
  metadata: {
    wordCount: number;
    characterCount: number;
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
 * @returns Promise<void>
 * @throws Error if database operations fail
 */
export async function createSnapshot(
  editor: Editor,
  manuscriptId: string,
  event: SnapshotEvent,
  userId: string,
  label?: string
): Promise<void> {
  try {
    // Step 1: Capture current document state from editor
    const content = editor.getJSON();
    const text = editor.getText();

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
      metadata: {
        wordCount,
        characterCount
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
      characterCount
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
 * @returns Promise<void>
 * @throws Error if snapshot not found or restoration fails
 */
export async function restoreSnapshot(
  editor: Editor,
  manuscriptId: string,
  version: number
): Promise<void> {
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
      wordCount: snapshot.metadata.wordCount
    });

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
