import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useManuscripts } from '../contexts/ManuscriptsContext';

interface ProcessingStatus {
  manuscriptId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: any;
  error?: string;
}

export function useQueueProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, ProcessingStatus>>({});
  const { refreshManuscripts } = useManuscripts();

  // Function to trigger queue processing
  const processQueue = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('queue-processor', {
        body: {}
      });

      if (error) {
        console.error('Queue processing error:', error);
        return false;
      }

      console.log('Queue processing result:', data);
      return true;
    } catch (error) {
      console.error('Error invoking queue processor:', error);
      return false;
    }
  }, []); // No dependencies - stable reference

  // Function to get processing status for multiple manuscripts
  const refreshProcessingStatuses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('processing_queue')
        .select(`
          manuscript_id,
          status,
          progress_data,
          error_message,
          created_at
        `)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching processing statuses:', error);
        return {};
      }

      const statusMap: Record<string, ProcessingStatus> = {};

      for (const job of data || []) {
        statusMap[job.manuscript_id] = {
          manuscriptId: job.manuscript_id,
          status: job.status as ProcessingStatus['status'],
          progress: job.progress_data,
          error: job.error_message
        };
      }

      setProcessingStatuses(statusMap);
      return statusMap; // Return fresh data for immediate use
    } catch (error) {
      console.error('Error refreshing processing statuses:', error);
      return {};
    }
  }, []); // No dependencies - stable reference

  // Simplified polling with no state dependencies to fix stale closure issues
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isCurrentlyProcessing = false;

    const poll = async () => {
      // Prevent overlapping polls
      if (isCurrentlyProcessing) {
        console.log('Skipping poll cycle - already processing');
        return;
      }

      try {
        isCurrentlyProcessing = true;

        // Get fresh processing statuses
        const statusMap = await refreshProcessingStatuses();

        // Check if processing is needed using fresh data (not stale state)
        const hasPendingJobs = Object.values(statusMap || {}).some(
          status => status.status === 'pending' || status.status === 'processing'
        );

        if (hasPendingJobs) {
          console.log('Found pending jobs, triggering queue processor');
          setIsProcessing(true);
          try {
            await processQueue();
            // Wait for job completion, then refresh statuses and manuscripts data
            setTimeout(async () => {
              await refreshProcessingStatuses();
              await refreshManuscripts();
            }, 2000);
          } finally {
            setIsProcessing(false);
          }
        } else {
          // Check if any jobs just completed and refresh manuscripts if so
          const previousStatusMap = processingStatuses;
          const hasNewlyCompletedJobs = Object.values(statusMap || {}).some(status => {
            const previousStatus = previousStatusMap[status.manuscriptId];
            return status.status === 'completed' &&
                   previousStatus &&
                   previousStatus.status !== 'completed';
          });

          if (hasNewlyCompletedJobs) {
            console.log('Found newly completed jobs, refreshing manuscripts data');
            await refreshManuscripts();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        isCurrentlyProcessing = false;
      }
    };

    // Start immediate poll
    console.log('Starting queue processor polling');
    poll();

    // Set up stable 10-second interval
    intervalId = setInterval(poll, 10000);

    return () => {
      console.log('Cleaning up queue processor polling');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // No dependencies - creates stable, persistent interval

  // Function to get status for a specific manuscript
  const getManuscriptStatus = useCallback((manuscriptId: string): ProcessingStatus | null => {
    return processingStatuses[manuscriptId] || null;
  }, [processingStatuses]);

  return {
    processQueue,
    refreshProcessingStatuses,
    getManuscriptStatus,
    processingStatuses,
    isProcessing
  };
}


