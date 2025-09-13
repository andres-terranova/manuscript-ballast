import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { UISuggestion, SuggestionType } from "@/lib/types";
import { ChangeCard } from "./ChangeCard";
import { MappingDiagnosticsBadge } from "@/components/ui/mapping-diagnostics-badge";

interface ChangeListProps {
  suggestions: UISuggestion[];
  onAcceptSuggestion?: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  busySuggestions?: Set<string>;
  isReviewed?: boolean;
}

export const ChangeList = ({ suggestions, onAcceptSuggestion, onRejectSuggestion, busySuggestions = new Set(), isReviewed = false }: ChangeListProps) => {
  const [typeFilter, setTypeFilter] = useState<"all" | "insert" | "delete" | "replace">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Phase 1: reduce from 50 to 25 for better performance

  const filteredSuggestions = useMemo(() => {
    if (typeFilter === "all") return suggestions;
    return suggestions.filter(s => s.type === typeFilter);
  }, [suggestions, typeFilter]);

  const totalPages = Math.ceil(filteredSuggestions.length / itemsPerPage);
  
  const visibleSuggestions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSuggestions.slice(start, end);
  }, [filteredSuggestions, currentPage, itemsPerPage]);

  // Reset to page 1 when filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [typeFilter]);


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
          <h3 className="font-semibold text-foreground">Change List</h3>
          <MappingDiagnosticsBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {visibleSuggestions.length} of {filteredSuggestions.length} filtered ({suggestions.length} total)
        </p>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
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
              <ChangeCard
                key={`${suggestion.id}-${index}`}
                suggestion={suggestion}
                index={index}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                isBusy={isBusy}
                onSuggestionClick={handleSuggestionClick}
                getNextFocusableCard={getNextFocusableCard}
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
    </div>
  );
};