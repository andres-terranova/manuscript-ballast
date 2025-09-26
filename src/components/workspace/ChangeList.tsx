import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { UISuggestion, SuggestionType } from "@/lib/types";
import { isAISuggestion } from "@/lib/types";
import { ChangeCard } from "./ChangeCard";
import { MappingDiagnosticsBadge } from "@/components/ui/mapping-diagnostics-badge";
import { AI_EDITOR_RULES } from "./AIEditorRules";

interface ChangeListProps {
  suggestions: UISuggestion[];
  onAcceptSuggestion?: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  busySuggestions?: Set<string>;
  isReviewed?: boolean;
  showSuggestions?: boolean;
  onToggleSuggestions?: (show: boolean) => void;
  onApplyAllSuggestions?: () => void;
  onTriggerPopover?: (suggestionId: string) => void;
}

export const ChangeList = ({ suggestions, onAcceptSuggestion, onRejectSuggestion, busySuggestions = new Set(), isReviewed = false, showSuggestions = true, onToggleSuggestions, onApplyAllSuggestions, onTriggerPopover }: ChangeListProps) => {
  const [ruleFilter, setRuleFilter] = useState<"all" | string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Phase 1: reduce from 50 to 25 for better performance

  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;
    
    // Filter by rule (AI editor role)
    if (ruleFilter !== "all") {
      filtered = filtered.filter(s => {
        if (ruleFilter === "non-ai") {
          return !isAISuggestion(s);
        }
        return s.ruleId === ruleFilter;
      });
    }
    
    return filtered;
  }, [suggestions, ruleFilter]);

  const totalPages = Math.ceil(filteredSuggestions.length / itemsPerPage);
  
  const visibleSuggestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSuggestions.slice(start, end);
  }, [filteredSuggestions, currentPage, itemsPerPage]);

  // Get available AI rules from suggestions
  const availableRules = useMemo(() => {
    const rulesInUse = new Set<string>();
    suggestions.forEach(s => {
      if (isAISuggestion(s) && s.ruleId) {
        rulesInUse.add(s.ruleId);
      }
    });
    return Array.from(rulesInUse).map(ruleId => 
      AI_EDITOR_RULES.find(r => r.id === ruleId)
    ).filter(Boolean);
  }, [suggestions]);

  const hasNonAISuggestions = useMemo(() => 
    suggestions.some(s => !isAISuggestion(s)), 
    [suggestions]
  );

  // Reset to page 1 when filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [ruleFilter]);


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

    // Trigger popover for AI suggestions
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion && isAISuggestion(suggestion) && onTriggerPopover) {
      onTriggerPopover(suggestionId);
    }
  };

  const getNextFocusableCard = (currentIndex: number) => {
    if (currentIndex < visibleSuggestions.length - 1) {
      return `change-card-${visibleSuggestions[currentIndex + 1].id}`;
    }
    return 'changes-list';
  };

  return (
    <div data-testid="changes-list" className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Change List</h3>
            {onToggleSuggestions && (
              <Button
                size="sm"
                variant={showSuggestions ? "default" : "outline"}
                className="h-6 px-2 text-xs"
                onClick={() => onToggleSuggestions(!showSuggestions)}
              >
                {showSuggestions ? "Hide" : "Show"}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Apply All Button */}
            {onApplyAllSuggestions && filteredSuggestions.length > 0 && !isReviewed && (
              <Button
                size="sm"
                variant="default"
                className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                onClick={onApplyAllSuggestions}
                disabled={busySuggestions.size > 0}
              >
                Apply All ({filteredSuggestions.length})
              </Button>
            )}
            <MappingDiagnosticsBadge />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {visibleSuggestions.length} of {filteredSuggestions.length} filtered ({suggestions.length} total)
        </p>
        
      </div>

      {/* Rule Filter (AI Editor Roles) */}
      {(availableRules.length > 0 || hasNonAISuggestions) && (
        <div className="p-3 border-b border-border" data-testid="changes-filter-group">
          <div className="flex gap-1 flex-wrap">
            <Button
              size="sm"
              variant={ruleFilter === "all" ? "default" : "ghost"}
              className="text-xs h-7"
              onClick={() => setRuleFilter("all")}
            >
              All Roles
            </Button>
            {hasNonAISuggestions && (
              <Button
                size="sm"
                variant={ruleFilter === "non-ai" ? "default" : "ghost"}
                className="text-xs h-7"
                onClick={() => setRuleFilter("non-ai")}
              >
                Manual
              </Button>
            )}
            {availableRules.map((rule) => (
              <Button
                key={rule.id}
                size="sm"
                variant={ruleFilter === rule.id ? "default" : "ghost"}
                className="text-xs h-7 gap-2"
                onClick={() => setRuleFilter(rule.id)}
              >
                <div
                  className="w-2 h-2 rounded-sm border"
                  style={{
                    backgroundColor: rule.backgroundColor,
                    borderColor: rule.color,
                  }}
                />
                {rule.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {visibleSuggestions.length > 0 ? (
            visibleSuggestions.map((suggestion, index) => {
              const isBusy = busySuggestions.has(suggestion.id);
              return (
                <ChangeCard
                  key={`${suggestion.id}-${index}`}
                  suggestion={suggestion}
                  index={index}
                  onAccept={onAcceptSuggestion}
                  onReject={onRejectSuggestion}
                  isBusy={isBusy}
                  onSuggestionClick={handleSuggestionClick}
                  getNextFocusableCard={getNextFocusableCard}
                  onTriggerPopover={onTriggerPopover}
                />
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {isReviewed 
                  ? "Document is reviewed — no changes available."
                  : suggestions.length === 0 
                    ? "No pending suggestions." 
                    : "No suggestions match this filter."
                }
              </p>
            </div>
          )}
        </div>

        {/* Subtle pagination at bottom */}
        {totalPages > 1 && visibleSuggestions.length > 0 && (
          <div className="sticky bottom-0 bg-background border-t border-border p-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-6 px-2 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-6 px-2 text-xs"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};