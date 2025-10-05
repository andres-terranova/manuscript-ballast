// Diagnostics and observability for position mapping
// Phase 1: Track mapping success/failure rates and performance

export type DiagnosticEvent = {
  timestamp: number;
  type: 'mapping' | 'remap' | 'validation';
  success: boolean;
  itemCount: number;
  timingMs: number;
  details?: unknown;
};

export type MappingStats = {
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  avgTimingMs: number;
  recentFailures: Array<{ id: string; reason: string; timestamp: number }>;
};

class MappingDiagnostics {
  private events: DiagnosticEvent[] = [];
  private readonly maxEvents = 100; // Keep last 100 events
  
  logEvent(event: Omit<DiagnosticEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });

    // Trim to max events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Only log significant events in development (failures or heavy operations)
    if (process.env.NODE_ENV === 'development') {
      const isSignificant = !event.success || event.itemCount > 100 || event.timingMs > 10;
      if (isSignificant) {
        console.log('[Mapping Diagnostics]', event);
      }
    }
  }

  getStats(): MappingStats {
    const recent = this.events.filter(e => Date.now() - e.timestamp < 5 * 60 * 1000); // Last 5 minutes
    
    const totalAttempts = recent.length;
    const successCount = recent.filter(e => e.success).length;
    const failureCount = totalAttempts - successCount;
    
    const avgTimingMs = totalAttempts > 0 
      ? recent.reduce((sum, e) => sum + e.timingMs, 0) / totalAttempts 
      : 0;

    const recentFailures = recent
      .filter(e => !e.success && e.details?.reason)
      .slice(-10) // Last 10 failures
      .map(e => ({
        id: e.details?.id || 'unknown',
        reason: e.details?.reason || 'unknown',
        timestamp: e.timestamp
      }));

    return {
      totalAttempts,
      successCount,
      failureCount,
      avgTimingMs: Math.round(avgTimingMs * 100) / 100,
      recentFailures
    };
  }

  getRecentEvents(limit: number = 10): DiagnosticEvent[] {
    return this.events.slice(-limit);
  }

  reset(): void {
    this.events = [];
  }
}

// Global instance
export const mappingDiagnostics = new MappingDiagnostics();

// Helper for timing operations
export function withTiming<T>(operation: () => T, label: string): { result: T; timingMs: number } {
  const start = performance.now();
  const result = operation();
  const timingMs = performance.now() - start;
  
  console.log(`[${label}] completed in ${timingMs.toFixed(2)}ms`);
  
  return { result, timingMs };
}