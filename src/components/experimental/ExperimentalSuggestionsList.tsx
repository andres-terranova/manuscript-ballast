import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, MessageSquare } from 'lucide-react';
import type { UISuggestion } from '@/lib/types';

interface ExperimentalSuggestionsListProps {
  suggestions: UISuggestion[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onApply: (suggestionId: string) => void;
  onReject: (suggestionId: string) => void;
}

export const ExperimentalSuggestionsList = ({
  suggestions,
  currentIndex,
  onNavigate,
  onApply,
  onReject
}: ExperimentalSuggestionsListProps) => {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No suggestions</h3>
        <p className="text-muted-foreground">
          Run AI analysis to generate suggestions for improvements.
        </p>
      </div>
    );
  }

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'insert':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'replace':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grammar':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'spelling':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'style':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'manual':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, index) => (
        <Card
          key={`${suggestion.id}-${suggestion.pmFrom}-${suggestion.pmTo}`}
          className={`cursor-pointer transition-all ${
            index === currentIndex
              ? 'ring-2 ring-primary shadow-md'
              : 'hover:shadow-sm'
          }`}
          onClick={() => onNavigate(index)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Badge
                  variant="secondary"
                  className={getSuggestionTypeColor(suggestion.type)}
                >
                  {suggestion.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={getCategoryColor(suggestion.category)}
                >
                  {suggestion.category}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{index + 1}</span>
            </div>
            <CardTitle className="text-sm font-medium">
              {suggestion.note}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Text Changes */}
            {suggestion.type !== 'insert' && suggestion.before && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Original:
                </p>
                <p className="text-sm bg-red-50 dark:bg-red-950 p-2 rounded line-through">
                  {suggestion.before}
                </p>
              </div>
            )}
            
            {(suggestion.type === 'insert' || suggestion.type === 'replace') && suggestion.after && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {suggestion.type === 'insert' ? 'Insert:' : 'Replace with:'}
                </p>
                <p className="text-sm bg-green-50 dark:bg-green-950 p-2 rounded">
                  {suggestion.after}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(suggestion.id);
                }}
                className="flex-1"
              >
                <Check className="h-3 w-3 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(suggestion.id);
                }}
                className="flex-1"
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </div>

            {/* Position Info */}
            <div className="text-xs text-muted-foreground">
              Position: {suggestion.pmFrom}-{suggestion.pmTo}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};