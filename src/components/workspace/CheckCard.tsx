import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle } from "lucide-react";
import type { CheckItem } from "@/lib/styleValidator";

interface CheckCardProps {
  check: CheckItem;
  index: number;
  onAccept?: (checkId: string) => void;
  onReject?: (checkId: string) => void;
  isBusy?: boolean;
  onCheckClick: (checkId: string) => void;
  getNextFocusableCard: (index: number) => string;
}

export const CheckCard = memo<CheckCardProps>(({ 
  check, 
  index, 
  onAccept, 
  onReject, 
  isBusy = false, 
  onCheckClick, 
  getNextFocusableCard 
}) => {
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAccept?.(check.id);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onReject?.(check.id);
    }
  };

  return (
    <Card 
      key={`${check.id}-${index}`} 
      data-testid={`check-card-${check.id}`}
      className="border-card-border cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary"
      onClick={() => onCheckClick(check.id)}
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded border text-amber-700 bg-amber-50 border-amber-200">
              <AlertTriangle className="h-3 w-3" />
            </div>
            <Badge variant="outline" className="text-xs">
              {check.rule}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="text-sm font-medium">{check.message}</div>
          
          <div className="flex gap-2 pt-2">
            <Button
              data-testid={`check-card-accept-${check.id}`}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.(check.id);
                // Focus next card after action
                setTimeout(() => {
                  const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
                  nextCard?.focus();
                }, 100);
              }}
              disabled={!onAccept || isBusy}
              aria-keyshortcuts="Enter"
            >
              <Check className="mr-1 h-3 w-3" />
              Accept
            </Button>
            <Button
              data-testid={`check-card-reject-${check.id}`}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(check.id);
                // Focus next card after action
                setTimeout(() => {
                  const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
                  nextCard?.focus();
                }, 100);
              }}
              disabled={!onReject || isBusy}
              aria-keyshortcuts="Shift+Enter"
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CheckCard.displayName = "CheckCard";