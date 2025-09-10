import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Minus, Edit3 } from "lucide-react";
import type { UISuggestion, SuggestionType } from "@/lib/types";

interface ChangeCardProps {
  suggestion: UISuggestion;
  index: number;
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
  isBusy?: boolean;
  onSuggestionClick: (suggestionId: string) => void;
  getNextFocusableCard: (index: number) => string;
}

const getSuggestionIcon = (type: SuggestionType) => {
  switch (type) {
    case 'insert':
      return <Plus className="h-3 w-3" />;
    case 'delete':
      return <Minus className="h-3 w-3" />;
    case 'replace':
      return <Edit3 className="h-3 w-3" />;
    default:
      return null;
  }
};

const getSuggestionColor = (type: SuggestionType) => {
  switch (type) {
    case 'insert':
      return 'text-green-700 bg-green-50 border-green-200';
    case 'delete':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'replace':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
};

export const ChangeCard = memo<ChangeCardProps>(({ 
  suggestion, 
  index, 
  onAccept, 
  onReject, 
  isBusy = false, 
  onSuggestionClick, 
  getNextFocusableCard 
}) => {
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAccept?.(suggestion.id);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onReject?.(suggestion.id);
    }
  };

  return (
    <Card 
      key={`${suggestion.id}-${index}`} 
      data-testid={`change-card-${suggestion.id}`}
      className="border-card-border cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary"
      onClick={() => onSuggestionClick(suggestion.id)}
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded border ${getSuggestionColor(suggestion.type)}`}>
              {getSuggestionIcon(suggestion.type)}
            </div>
            <Badge variant="secondary" className="text-xs">
              {suggestion.actor === 'Tool' ? 'AI Tool' : 'Manual'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {suggestion.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="text-sm font-medium">{suggestion.note}</div>
          <div className="text-xs text-muted-foreground">
            {suggestion.origin === 'server' ? suggestion.location || 'Unknown location' : 'Manual edit'}
          </div>
          
          {suggestion.type === 'replace' && (
            <div className="text-xs">
              <span className="text-muted-foreground">From:</span> "{suggestion.before}" →{' '}
              <span className="text-muted-foreground">To:</span> "{suggestion.after}"
            </div>
          )}
          
          {suggestion.type === 'insert' && (
            <div className="text-xs">
              <span className="text-muted-foreground">Insert:</span> "{suggestion.after}"
            </div>
          )}
          
          {suggestion.type === 'delete' && (
            <div className="text-xs">
              <span className="text-muted-foreground">Remove:</span> "{suggestion.before}"
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button
              data-testid={`change-card-accept-${suggestion.id}`}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.(suggestion.id);
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
              data-testid={`change-card-reject-${suggestion.id}`}
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={(e) => {
                e.stopPropagation();
                onReject?.(suggestion.id);
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

ChangeCard.displayName = "ChangeCard";