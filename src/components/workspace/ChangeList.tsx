import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { UISuggestion, SuggestionType } from "@/lib/types";
import { isAISuggestion } from "@/lib/types";
import { ChangeCard } from "./ChangeCard";
import { MappingDiagnosticsBadge } from "@/components/ui/mapping-diagnostics-badge";
import type { AIEditorRule } from "@/types/aiEditorRules";

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
  availableRules?: AIEditorRule[];
}

export const ChangeList = ({
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  busySuggestions = new Set(),
  isReviewed = false,
  showSuggestions = true,
  onToggleSuggestions,
  onApplyAllSuggestions,
  onTriggerPopover,
  availableRules: allAvailableRules = []
}: ChangeListProps) => {
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

  // Get available AI rules from suggestions (filter to only rules that are in use)
  const rulesInUse = useMemo(() => {
    const ruleIdsInUse = new Set<string>();
    suggestions.forEach(s => {
      if (isAISuggestion(s) && s.ruleId) {
        ruleIdsInUse.add(s.ruleId);
      }
    });
    return allAvailableRules.filter(r => ruleIdsInUse.has(r.id));
  }, [suggestions, allAvailableRules]);

  const hasNonAISuggestions = useMemo(() => 
    suggestions.some(s => !isAISuggestion(s)), 
    [suggestions]
  );

  // Reset to page 1 when filter changes
  useEffect(() => {
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">Change List</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Apply All Button */}
            {onApplyAllSuggestions && filteredSuggestions.length > 0 && !isReviewed && (
              <Button
                size="sm"
                variant="default"
                className="h-6 px-2.5 text-xs bg-emerald-600/90 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors duration-200"
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

      {/* Rule Filter */}
      {(rulesInUse.length > 0 || hasNonAISuggestions) && (
        <div className="px-4 py-2.5 border-b border-border/30" data-testid="changes-filter-group">
          <div className="flex gap-0.5 flex-wrap">
            <Button
              size="sm"
              variant={ruleFilter === "all" ? "secondary" : "ghost"}
              className="text-xs h-7 px-3 font-normal rounded-md"
              onClick={() => setRuleFilter("all")}
            >
              All
            </Button>
            {hasNonAISuggestions && (
              <Button
                size="sm"
                variant={ruleFilter === "non-ai" ? "secondary" : "ghost"}
                className="text-xs h-7 px-3 font-normal rounded-md"
                onClick={() => setRuleFilter("non-ai")}
              >
                Manual
              </Button>
            )}
            {rulesInUse.map((rule) => (
              <Button
                key={rule.id}
                size="sm"
                variant={ruleFilter === rule.id ? "secondary" : "ghost"}
                className="text-xs h-7 px-3 gap-1.5 font-normal rounded-md"
                onClick={() => setRuleFilter(rule.id)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: rule.color,
                  }}
                />
                {rule.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Card List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
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

        {/* Pagination */}
        {totalPages > 1 && visibleSuggestions.length > 0 && (
          <div className="sticky bottom-0 bg-background border-t border-border/30 py-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-6 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground/80 px-2 font-medium min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-6 px-2 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};