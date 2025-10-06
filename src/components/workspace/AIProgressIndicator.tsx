import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { AIProgressState } from '@/types/aiProgress';

interface AIProgressIndicatorProps {
  progress: AIProgressState;
}

export const AIProgressIndicator = ({ progress }: AIProgressIndicatorProps) => {
  const progressPercentage = progress.totalChunks > 0
    ? Math.round((progress.processedChunks / progress.totalChunks) * 100)
    : 0;

  return (
    <div className="space-y-4 py-2">
      {/* Status Message */}
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            {progress.statusMessage}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-end text-sm">
          <span className="font-semibold text-primary">
            {progressPercentage}%
          </span>
        </div>
        <Progress
          value={progressPercentage}
          className="h-2"
        />
      </div>
    </div>
  );
};
