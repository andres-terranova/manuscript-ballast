/**
 * AI Processing Progress Types
 *
 * Lightweight progress tracking for AI suggestion generation.
 */

export interface AIProgressState {
  // Chunk-based progress tracking
  totalChunks: number;
  processedChunks: number;

  // Results
  suggestionsFound: number;

  // Status
  status: 'idle' | 'initializing' | 'processing' | 'converting' | 'complete' | 'error';
  statusMessage: string;
}

export type AIProgressCallback = (progress: AIProgressState) => void;

export const createInitialProgressState = (): AIProgressState => ({
  totalChunks: 0,
  processedChunks: 0,
  suggestionsFound: 0,
  status: 'idle',
  statusMessage: 'Initializing...',
});
