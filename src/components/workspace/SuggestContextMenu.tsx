import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit3 } from "lucide-react";

interface SuggestContextMenuProps {
  children: React.ReactNode;
  onSuggest: () => void;
}

export function SuggestContextMenu({ children, onSuggest }: SuggestContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onSuggest} className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Suggest...
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}