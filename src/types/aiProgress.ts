/**
 * AI Processing Progress Types
 *
 * Lightweight progress tracking for AI suggestion generation.
 */

export interface AIProgressState {
  // Batch processing (not chunks)
  totalBatches: number;
  processedBatches: number;

  // Results
  suggestionsFound: number;

  // Status
  status: 'idle' | 'initializing' | 'processing' | 'converting' | 'complete' | 'error';
  statusMessage: string;
}

export type AIProgressCallback = (progress: AIProgressState) => void;

export const createInitialProgressState = (): AIProgressState => ({
  totalBatches: 0,
  processedBatches: 0,
  suggestionsFound: 0,
  status: 'idle',
  statusMessage: 'Initializing...',
});
