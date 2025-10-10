import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useManuscripts } from '../contexts/ManuscriptsContext';

interface ProcessingStatus {
  manuscriptId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: Record<string, unknown>;
  error?: string;
}

export function useQueueProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, ProcessingStatus>>({});
  const { refreshManuscripts } = useManuscripts();

  // Use ref to hold latest refreshManuscripts without triggering effect re-runs
  const refreshManuscriptsRef = useRef(refreshManuscripts);
  useEffect(() => {
    refreshManuscriptsRef.current = refreshManuscripts;
  }, [refreshManuscripts]);

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

  // Realtime subscription for processing queue updates
  useEffect(() => {
    console.log('Setting up Realtime subscription for processing queue');

    // Initial fetch of processing statuses
    refreshProcessingStatuses();

    // Subscribe to processing_queue changes
    const channel = supabase
      .channel('processing_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'processing_queue'
        },
        async (payload) => {
          console.log('Realtime: processing_queue changed', payload);

          // Refresh all processing statuses to get current state
          const statusMap = await refreshProcessingStatuses();

          // Check if we have pending jobs that need processing
          const hasPendingJobs = Object.values(statusMap || {}).some(
            status => status.status === 'pending' || status.status === 'processing'
          );

          if (hasPendingJobs) {
            console.log('Realtime: Found pending jobs, triggering queue processor');
            setIsProcessing(true);
            try {
              await processQueue();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await refreshProcessingStatuses();

              // Only refresh manuscripts when job COMPLETES (not during progress updates)
              if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
                console.log('Realtime: Job completed, refreshing manuscripts');
                await refreshManuscriptsRef.current();
              }
            } finally {
              setIsProcessing(false);
            }
          } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'completed') {
            // Job just completed but no longer in pending/processing state
            console.log('Realtime: Job completed, refreshing manuscripts');
            await refreshManuscriptsRef.current();
          }
        }
      )
      .on('system', { event: 'CHANNEL_ERROR' }, (payload) => {
        // Only log actual errors (status !== 'ok')
        if (payload.status !== 'ok') {
          console.error('Realtime channel error:', payload);
        }
      })
      .on('system', { event: 'CHANNEL_READY' }, () => {
        console.log('Realtime channel connected and ready');
      })
      .subscribe();

    return () => {
      console.log('Cleaning up Realtime subscription');
      channel.unsubscribe();
    };
  }, [processQueue, refreshProcessingStatuses]);

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


