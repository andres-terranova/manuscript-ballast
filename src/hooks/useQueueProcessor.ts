import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

interface ProcessingStatus {
  manuscriptId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: any;
  error?: string;
}

export function useQueueProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, ProcessingStatus>>({});

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
  }, []);

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
        return;
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
    } catch (error) {
      console.error('Error refreshing processing statuses:', error);
    }
  }, []);

  // Auto-process queue every 10 seconds when there are pending jobs
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const runQueueProcessor = async () => {
      if (isProcessing) return;

      // Check if there are any pending jobs
      const hasPendingJobs = Object.values(processingStatuses).some(
        status => status.status === 'pending' || status.status === 'processing'
      );

      if (hasPendingJobs) {
        setIsProcessing(true);
        try {
          await processQueue();
          // Wait a bit for the job to complete, then refresh statuses
          setTimeout(refreshProcessingStatuses, 2000);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    // Start polling with proper async sequencing
    intervalId = setInterval(async () => {
      await refreshProcessingStatuses(); // Wait for status refresh to complete
      await runQueueProcessor();         // Then check for jobs with updated state
    }, 10000); // Every 10 seconds

    // Initial load with proper sequencing
    const initialize = async () => {
      await refreshProcessingStatuses();
      await runQueueProcessor();
    };
    initialize();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [processQueue, refreshProcessingStatuses, isProcessing, processingStatuses]);

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


