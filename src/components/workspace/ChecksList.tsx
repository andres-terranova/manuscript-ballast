import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings2, Play } from "lucide-react";
import { useState, useMemo } from "react";
import type { CheckItem } from "@/lib/styleValidator";
import { CheckCard } from "./CheckCard";

interface ChecksListProps {
  checks: CheckItem[];
  onAcceptCheck?: (checkId: string) => void;
  onRejectCheck?: (checkId: string) => void;
  busyChecks?: Set<string>;
  isReviewed?: boolean;
  onRunChecks?: () => void;
  onOpenStyleRules?: () => void;
}

export const ChecksList = ({
  checks,
  onAcceptCheck,
  onRejectCheck,
  busyChecks = new Set(),
  isReviewed = false,
  onRunChecks,
  onOpenStyleRules
}: ChecksListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const totalPages = Math.ceil(checks.length / itemsPerPage);
  
  const visibleChecks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return checks.slice(start, end);
  }, [checks, currentPage, itemsPerPage]);

  const handleCheckClick = (checkId: string) => {
    const element = document.getElementById(`check-span-${checkId}`);
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
    if (currentIndex < visibleChecks.length - 1) {
      return `check-card-${visibleChecks[currentIndex + 1].id}`;
    }
    return 'checks-list';
  };

  return (
    <div data-testid="checks-list" className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Style Checks</h3>
          <ButtonGroup>
            <ButtonGroupItem
              position="first"
              onClick={onOpenStyleRules}
              title="Configure style rules"
              disabled={isReviewed}
              className="h-8 px-2.5"
            >
              <Settings2 className="h-4 w-4" />
            </ButtonGroupItem>
            <ButtonGroupItem
              position="last"
              onClick={onRunChecks}
              data-testid="checks-run"
              disabled={isReviewed}
              title="Run style checks"
              className="h-8 px-2.5"
            >
              <Play className="mr-1.5 h-4 w-4" />
              Run Checks
            </ButtonGroupItem>
          </ButtonGroup>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {visibleChecks.length} of {checks.length} total
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleChecks.length > 0 ? (
          visibleChecks.map((check, index) => {
            const isBusy = busyChecks.has(check.id);
            return (
              <CheckCard
                key={`${check.id}-${index}`}
                check={check}
                index={index}
                onAccept={onAcceptCheck}
                onReject={onRejectCheck}
                isBusy={isBusy}
                onCheckClick={handleCheckClick}
                getNextFocusableCard={getNextFocusableCard}
              />
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {isReviewed 
                ? "Document is reviewed — no checks available."
                : "No checks found. Run style checks to see issues."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};