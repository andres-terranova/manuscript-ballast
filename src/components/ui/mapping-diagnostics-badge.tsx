// Phase 1: UI component for mapping diagnostics
// Shows unmappable count and provides detailed hover tooltip

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { mappingDiagnostics, type MappingStats } from "@/lib/mappingDiagnostics";
import { useState, useEffect } from "react";

interface MappingDiagnosticsBadgeProps {
  className?: string;
}

export const MappingDiagnosticsBadge = ({ className }: MappingDiagnosticsBadgeProps) => {
  const [stats, setStats] = useState<MappingStats | null>(null);
  
  useEffect(() => {
    // Update stats every 5 seconds
    const updateStats = () => {
      setStats(mappingDiagnostics.getStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);
  
  if (!stats || stats.failureCount === 0) {
    return null; // Only show when there are failures
  }
  
  const recentFailures = stats.recentFailures.slice(0, 5); // Show max 5 recent failures
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className={`flex items-center gap-1 cursor-help ${className}`}
          >
            <AlertTriangle className="h-3 w-3" />
            Unmappable: {stats.failureCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div className="font-semibold">Mapping Statistics</div>
            <div>
              <div>Total attempts: {stats.totalAttempts}</div>
              <div>Success rate: {stats.totalAttempts > 0 ? Math.round((stats.successCount / stats.totalAttempts) * 100) : 0}%</div>
              <div>Avg timing: {stats.avgTimingMs}ms</div>
            </div>
            {recentFailures.length > 0 && (
              <div>
                <div className="font-semibold mb-1">Recent failures:</div>
                {recentFailures.map((failure, idx) => (
                  <div key={idx} className="text-xs opacity-80">
                    • {failure.reason}
                  </div>
                ))}
                {stats.recentFailures.length > 5 && (
                  <div className="text-xs opacity-60">
                    ...and {stats.recentFailures.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};