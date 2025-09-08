import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, Plus, Minus, Edit3 } from "lucide-react";

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
}

export const ChangeList = ({ suggestions, onAcceptSuggestion, onRejectSuggestion }: ChangeListProps) => {
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
    }
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
          {suggestions.length} pending suggestions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <Card 
              key={suggestion.id} 
              data-testid={`change-card-${suggestion.id}`}
              className="border-card-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSuggestionClick(suggestion.id)}
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
                      }}
                      disabled={!onAcceptSuggestion}
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
                      }}
                      disabled={!onRejectSuggestion}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No pending suggestions.</p>
          </div>
        )}
      </div>
    </div>
  );
};