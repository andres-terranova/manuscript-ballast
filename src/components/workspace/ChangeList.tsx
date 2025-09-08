import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, Plus, Minus, Edit3 } from "lucide-react";
import { useState, useMemo } from "react";

type SuggestionType = "insert" | "delete" | "replace";
type SuggestionActor = "Tool" | "Editor" | "Author";
type Suggestion = {
  id: string;
  type: SuggestionType;
  actor: SuggestionActor;
  start: number;
  end: number;
  before: string;
  after: string;
  summary: string;
  location: string;
};

interface ChangeListProps {
  suggestions: Suggestion[];
  onAcceptSuggestion?: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  busySuggestions?: Set<string>;
}

export const ChangeList = ({ suggestions, onAcceptSuggestion, onRejectSuggestion, busySuggestions = new Set() }: ChangeListProps) => {
  const [typeFilter, setTypeFilter] = useState<"all" | "insert" | "delete" | "replace">("all");

  const visibleSuggestions = useMemo(() => {
    if (typeFilter === "all") return suggestions;
    return suggestions.filter(s => s.type === typeFilter);
  }, [suggestions, typeFilter]);
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

  const handleSuggestionClick = (suggestionId: string) => {
    const element = document.getElementById(`suggestion-span-${suggestionId}`);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      // Brief highlight
      element.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary');
      }, 800);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, suggestionId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAcceptSuggestion?.(suggestionId);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      onRejectSuggestion?.(suggestionId);
    }
  };

  const getNextFocusableCard = (currentIndex: number) => {
    if (currentIndex < visibleSuggestions.length - 1) {
      return `change-card-${visibleSuggestions[currentIndex + 1].id}`;
    }
    return 'changes-list';
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div data-testid="changes-list" className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Change List</h3>
        <p className="text-sm text-muted-foreground">
          {visibleSuggestions.length} of {suggestions.length} suggestions
        </p>
      </div>

      {/* Filter Controls */}
      <div className="p-4 border-b border-border" data-testid="changes-filter-group">
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          <Button
            data-testid="changes-filter-all"
            size="sm"
            variant={typeFilter === "all" ? "default" : "ghost"}
            className="flex-1 text-xs h-7"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          <Button
            data-testid="changes-filter-insert"
            size="sm"
            variant={typeFilter === "insert" ? "default" : "ghost"}
            className="flex-1 text-xs h-7"
            onClick={() => setTypeFilter("insert")}
          >
            Insert
          </Button>
          <Button
            data-testid="changes-filter-delete"
            size="sm"
            variant={typeFilter === "delete" ? "default" : "ghost"}
            className="flex-1 text-xs h-7"
            onClick={() => setTypeFilter("delete")}
          >
            Delete
          </Button>
          <Button
            data-testid="changes-filter-replace"
            size="sm"
            variant={typeFilter === "replace" ? "default" : "ghost"}
            className="flex-1 text-xs h-7"
            onClick={() => setTypeFilter("replace")}
          >
            Replace
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleSuggestions.length > 0 ? (
          visibleSuggestions.map((suggestion, index) => {
            const isBusy = busySuggestions.has(suggestion.id);
            return (
            <Card 
              key={suggestion.id} 
              data-testid={`change-card-${suggestion.id}`}
              className="border-card-border cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary"
              onClick={() => handleSuggestionClick(suggestion.id)}
              tabIndex={0}
              onKeyDown={(e) => handleCardKeyDown(e, suggestion.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded border ${getSuggestionColor(suggestion.type)}`}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.actor}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{suggestion.summary}</div>
                  <div className="text-xs text-muted-foreground">{suggestion.location}</div>
                  
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
                        onAcceptSuggestion?.(suggestion.id);
                        // Focus next card after action
                        setTimeout(() => {
                          const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
                          nextCard?.focus();
                        }, 100);
                      }}
                      disabled={!onAcceptSuggestion || isBusy}
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
                        onRejectSuggestion?.(suggestion.id);
                        // Focus next card after action
                        setTimeout(() => {
                          const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
                          nextCard?.focus();
                        }, 100);
                      }}
                      disabled={!onRejectSuggestion || isBusy}
                      aria-keyshortcuts="Shift+Enter"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {suggestions.length === 0 ? "No pending suggestions." : "No suggestions match this filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};