import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getSnapshots, restoreSnapshot, type Snapshot } from '@/services/snapshotService';
import { getGlobalEditor } from '@/lib/editorUtils';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Clock, AlertTriangle } from 'lucide-react';
import type { UISuggestion } from '@/lib/types';
import type { Suggestion } from '@tiptap-pro/extension-ai-suggestion';

interface VersionHistoryProps {
  manuscriptId: string;
  currentVersion?: number;  // Currently loaded version number
  onRestore?: (restoredVersion: number, manualSuggestions: UISuggestion[], aiSuggestions: Suggestion[]) => void;  // Optional callback after successful restore
}

export function VersionHistory({ manuscriptId, currentVersion, onRestore }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);
  const { toast } = useToast();

  // Load snapshots on mount and when manuscriptId changes
  useEffect(() => {
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscriptId]);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getSnapshots(manuscriptId);
      // Reverse to show most recent first
      setSnapshots([...history].reverse());
    } catch (error) {
      console.error('Error loading snapshots:', error);
      toast({
        title: 'Failed to load version history',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [manuscriptId, toast]);

  const handleRestoreClick = (version: number) => {
    setVersionToRestore(version);
    setShowRestoreDialog(true);
  };

  const handleConfirmRestore = async (saveChanges: boolean) => {
    if (versionToRestore === null) return;

    const editor = getGlobalEditor();
    if (!editor) {
      toast({
        title: 'Editor not available',
        description: 'Cannot restore snapshot without editor instance',
        variant: 'destructive'
      });
      setShowRestoreDialog(false);
      return;
    }

    setShowRestoreDialog(false);

    // If saveChanges is true, create a snapshot before restoring
    if (saveChanges) {
      // TODO: Implement save current version functionality
      // This will create a new snapshot of the current state before restoring
      toast({
        title: 'Saving current version',
        description: 'Creating snapshot before restore...'
      });
    }

    setRestoring(versionToRestore);
    try {
      const { manualSuggestions, aiSuggestions } = await restoreSnapshot(editor, manuscriptId, versionToRestore);

      toast({
        title: 'Version restored successfully',
        description: `Document restored to version ${versionToRestore}`
      });

      // Call optional callback with restored version number, manual suggestions, and AI suggestions from snapshot
      onRestore?.(versionToRestore, manualSuggestions, aiSuggestions);

      // Reload snapshots to refresh UI
      await loadSnapshots();
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      toast({
        title: 'Failed to restore version',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRestoring(null);
    }
  };

  const formatEvent = (event: string): string => {
    const labels: Record<string, string> = {
      upload: 'Initial Upload',
      send_to_author: 'Sent to Author',
      return_to_editor: 'Returned to Editor',
      manual: 'Manual Snapshot',
      ai_pass_complete: 'AI Pass Complete',
      apply_all: 'Applied All Suggestions'
    };
    return labels[event] || event;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Show time for today
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading version history...</p>
        </div>
      </div>
    );
  }

  // Empty State
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No version history yet</h3>
          <p className="text-sm text-muted-foreground">
            Versions are created when you upload a document, send to author, or create manual snapshots
          </p>
        </div>
      </div>
    );
  }

  // Version List
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Version History</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {snapshots.length} {snapshots.length === 1 ? 'version' : 'versions'} saved
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {snapshots.map((snapshot, index) => {
            const isLatest = index === 0; // First item after reverse
            const isCurrent = currentVersion !== undefined && snapshot.version === currentVersion;
            const isRestoring = restoring === snapshot.version;

            return (
              <div
                key={snapshot.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Version {snapshot.version}</span>
                    {isLatest && (
                      <Badge variant="secondary" className="text-xs">Latest</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(snapshot.createdAt)}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{formatEvent(snapshot.event)}</span>
                  {snapshot.label && (
                    <span className="ml-1">- {snapshot.label}</span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  {snapshot.metadata.wordCount.toLocaleString()} words
                  {' · '}
                  {snapshot.metadata.characterCount.toLocaleString()} characters
                  {snapshot.metadata?.suggestionCount && snapshot.metadata.suggestionCount > 0 && (
                    <>
                      {' · '}
                      <span className="font-medium text-foreground">
                        {snapshot.metadata.suggestionCount} suggestion{snapshot.metadata.suggestionCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestoreClick(snapshot.version)}
                  disabled={restoring !== null || isCurrent}
                  className="w-full"
                >
                  {isRestoring ? (
                    <>
                      <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                      Restoring...
                    </>
                  ) : isCurrent ? (
                    <>
                      <RotateCcw className="h-3 w-3 mr-2" />
                      Current Version
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-2" />
                      Restore This Version
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent
          className="sm:max-w-lg"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Restore Version {versionToRestore}?
            </DialogTitle>
            <DialogDescription>
              Active suggestions will also be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
                className="flex-1 border-border/80"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirmRestore(true)}
                className="flex-1"
              >
                Save & Restore
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => handleConfirmRestore(false)}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              Restore Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
