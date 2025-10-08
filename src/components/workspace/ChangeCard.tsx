import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Plus, Minus, ArrowRightLeft } from "lucide-react";
import type { UISuggestion, SuggestionType } from "@/lib/types";
import { isAISuggestion } from "@/lib/types";

interface ChangeCardProps {
  suggestion: UISuggestion;
  index: number;
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
  isBusy?: boolean;
  onSuggestionClick: (suggestionId: string) => void;
  getNextFocusableCard: (index: number) => string;
  onTriggerPopover?: (suggestionId: string) => void;
}

const getSuggestionIcon = (type: SuggestionType) => {
  switch (type) {
    case 'insert':
      return <Plus className="h-3 w-3" />;
    case 'delete':
      return <Minus className="h-3 w-3" />;
    case 'replace':
      return <ArrowRightLeft className="h-3 w-3" />;
    default:
      return null;
  }
};

const getSuggestionIconColor = (type: SuggestionType) => {
  switch (type) {
    case 'insert':
      return 'text-green-600';
    case 'delete':
      return 'text-red-600';
    case 'replace':
      return 'text-amber-600';
    default:
      return 'text-muted-foreground';
  }
};

const getSuggestionRuleColor = (ruleId: string | undefined): string => {
  const ruleColorMap: { [key: string]: string } = {
    'copy-editor': '#DC143C',
    'line-editor': '#FF8C00',
    'proofreader': '#8A2BE2',
    'cmos-formatter': '#4682B4',
    'manuscript-evaluator': '#059669',
    'developmental-editor': '#7C3AED',
    // Fallback colors for legacy or custom rules
    'grammar': '#DC143C',
    'clarity': '#0066CC',
    'tone': '#009900',
    'style': '#9333EA',
  };
  return ruleColorMap[ruleId || ''] || '#6B7280';
};

export const ChangeCard = memo<ChangeCardProps>(({
  suggestion,
  index,
  onAccept,
  onReject,
  isBusy = false,
  onSuggestionClick,
  getNextFocusableCard,
  onTriggerPopover
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
    <div
      key={`${suggestion.id}-${index}`}
      data-testid={`change-card-${suggestion.id}`}
      className="group py-3 px-4 cursor-pointer rounded-lg border border-border/40 bg-background hover:bg-accent/30 hover:border-border/70 hover:shadow-sm transition-all focus-within:bg-accent/35 focus-within:border-border/80 focus-within:outline-none"
      onClick={() => onSuggestionClick(suggestion.id)}
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      {/* Header: Icon + Badge */}
      <div className="flex items-center gap-2.5">
        <div className={`shrink-0 ${getSuggestionIconColor(suggestion.type)}`}>
          {getSuggestionIcon(suggestion.type)}
        </div>
        {isAISuggestion(suggestion) && suggestion.ruleTitle ? (
          <Badge
            variant="outline"
            className="text-[10px] font-normal gap-1 px-1.5 py-0.5 border-0 bg-background/50"
            style={{
              color: getSuggestionRuleColor(suggestion.ruleId),
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: getSuggestionRuleColor(suggestion.ruleId) }}
            />
            {suggestion.ruleTitle}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0.5">
            {suggestion.actor === 'Tool' ? 'AI Tool' : 'Manual'}
          </Badge>
        )}
      </div>

      {/* Note */}
      <div className="text-sm font-medium leading-relaxed text-foreground mt-2">{suggestion.note}</div>

      {/* Content Changes */}
      <div className="mt-2">
        {suggestion.type === 'replace' && (
          <div className="text-xs space-y-1 pl-0.5">
            <div className="flex gap-2">
              <span className="text-muted-foreground/60 shrink-0 font-normal">From:</span>
              <span className="text-red-500/80 line-through break-words">"{suggestion.before}"</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground/60 shrink-0 font-normal">To:</span>
              <span className="text-green-600/80 font-normal break-words">"{suggestion.after}"</span>
            </div>
          </div>
        )}
        
        {suggestion.type === 'insert' && (
          <div className="text-xs pl-0.5">
            <span className="text-muted-foreground/60 font-normal">Insert:</span>{' '}
            <span className="text-green-600/80 font-normal break-words">"{suggestion.after}"</span>
          </div>
        )}
        
        {suggestion.type === 'delete' && (
          <div className="text-xs pl-0.5">
            <span className="text-muted-foreground/60 font-normal">Remove:</span>{' '}
            <span className="text-red-500/80 line-through break-words">"{suggestion.before}"</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          data-testid={`change-card-accept-${suggestion.id}`}
          size="sm"
          variant="ghost"
          className="flex-1 text-xs h-7 font-normal border border-border/40 bg-background hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400 dark:hover:border-green-900"
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
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Accept
        </Button>
        <Button
          data-testid={`change-card-reject-${suggestion.id}`}
          size="sm"
          variant="ghost"
          className="flex-1 text-xs h-7 font-normal border border-border/40 bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900"
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
          <X className="mr-1.5 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>
    </div>
  );
});

ChangeCard.displayName = "ChangeCard";