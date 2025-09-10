import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { SuggestionType } from "@/lib/types";

interface SuggestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasSelection: boolean;
  onConfirm: (data: { mode: SuggestionType; after: string; note: string }) => void;
}

export function SuggestDialog({ open, onOpenChange, hasSelection, onConfirm }: SuggestDialogProps) {
  const [mode, setMode] = useState<SuggestionType>(hasSelection ? "replace" : "insert");
  const [after, setAfter] = useState("");
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    onConfirm({ mode, after, note });
    // Reset form
    setAfter("");
    setNote("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setAfter("");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Suggestion</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Suggestion Type</Label>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as SuggestionType)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="insert" id="insert" />
                <Label htmlFor="insert">Insert text</Label>
              </div>
              {hasSelection && (
                <>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace">Replace selection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="delete" id="delete" />
                    <Label htmlFor="delete">Delete selection</Label>
                  </div>
                </>
              )}
            </RadioGroup>
          </div>

          {(mode === "insert" || mode === "replace") && (
            <div>
              <Label htmlFor="after" className="text-sm font-medium">
                {mode === "insert" ? "Text to insert" : "Replacement text"}
              </Label>
              <Textarea
                id="after"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                placeholder={mode === "insert" ? "Enter text to insert..." : "Enter replacement text..."}
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label htmlFor="note" className="text-sm font-medium">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this suggestion..."
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add Suggestion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}