import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface SuggestionPopoverProps {
  suggestion: {
    id: string;
    deleteText: string;
    replacementOptions: Array<{
      id: string;
      addText: string;
      note?: string;
    }>;
    rule: {
      id: string;
      title: string;
      color: string;
      backgroundColor: string;
    };
  };
  context?: {
    previousWord?: string;
    nextWord?: string;
    punctuationMark?: string;
  };
  onAccept: (suggestionId: string, replacementOptionId: string) => void;
  onReject: (suggestionId: string) => void;
}

export const SuggestionPopover = ({ 
  suggestion, 
  context, 
  onAccept, 
  onReject 
}: SuggestionPopoverProps) => {
  const primaryReplacement = suggestion.replacementOptions?.[0];

  if (!primaryReplacement) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: '-10px',
      left: '0',
      transform: 'translateY(-100%)',
      zIndex: 1000
    }}>
      <Card 
        className="w-80 shadow-lg border-2" 
        style={{ borderColor: suggestion.rule.color }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
      <CardContent className="p-4 space-y-3">
        {/* Rule Badge */}
        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ 
            color: suggestion.rule.color,
            backgroundColor: suggestion.rule.backgroundColor 
          }}
        >
          {suggestion.rule.title}
        </Badge>

        {/* Context and Suggestion */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Suggestion:
          </div>
          
          <div className="bg-muted p-2 rounded text-sm leading-relaxed">
            {/* Show context if available */}
            {context?.previousWord && (
              <span className="text-muted-foreground">...{context.previousWord} </span>
            )}
            
            {/* Original text with strikethrough */}
            <span className="line-through text-destructive bg-destructive/10 px-1 rounded">
              {suggestion.deleteText}
            </span>
            
            {/* Arrow */}
            <span className="mx-2 text-muted-foreground">→</span>
            
            {/* Replacement text */}
            <span className="text-green-700 bg-green-100 px-1 rounded font-medium">
              {primaryReplacement.addText}
            </span>
            
            {/* Next word context */}
            {context?.nextWord && (
              <span className="text-muted-foreground"> {context.nextWord}</span>
            )}
            {context?.punctuationMark && (
              <span className="text-muted-foreground">{context.punctuationMark}</span>
            )}
          </div>
          
          {/* Note if available */}
          {primaryReplacement.note && (
            <div className="text-xs text-muted-foreground italic">
              {primaryReplacement.note}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAccept(suggestion.id, primaryReplacement.id);
            }}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1" />
            Accept
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReject(suggestion.id);
            }}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
