import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Change } from "@/data/sampleManuscripts";
import { Check, X, Plus, Minus, Edit3 } from "lucide-react";

interface ChangeListProps {
  changes: Change[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
  isReviewed: boolean;
}

export const ChangeList = ({ changes, onAcceptChange, onRejectChange, isReviewed }: ChangeListProps) => {
  const pendingChanges = changes.filter(c => c.status === 'pending');
  const reviewedChanges = changes.filter(c => c.status !== 'pending');

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'insertion':
        return <Plus className="h-3 w-3" />;
      case 'deletion':
        return <Minus className="h-3 w-3" />;
      case 'modification':
        return <Edit3 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'insertion':
        return 'text-insertion bg-insertion-light border-insertion';
      case 'deletion':
        return 'text-deletion bg-deletion-light border-deletion';
      case 'modification':
        return 'text-modification-foreground bg-modification-light border-modification';
      default:
        return 'text-muted-foreground bg-muted border-border';
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Change List</h3>
        <p className="text-sm text-muted-foreground">
          {pendingChanges.length} pending • {reviewedChanges.length} reviewed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pending Changes */}
        {pendingChanges.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Pending Changes</h4>
            {pendingChanges.map((change) => (
              <Card key={change.id} className="border-card-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded border ${getChangeColor(change.type)}`}>
                        {getChangeIcon(change.type)}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {change.type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(change.timestamp)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2">
                    {change.originalText && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Original:</span> "{change.originalText}"
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">
                        {change.type === 'deletion' ? 'Remove:' : 'Change to:'}
                      </span>{' '}
                      "{change.text}"
                    </div>
                    
                    {!isReviewed && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7"
                          onClick={() => onAcceptChange(change.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7"
                          onClick={() => onRejectChange(change.id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reviewed Changes */}
        {reviewedChanges.length > 0 && (
          <>
            {pendingChanges.length > 0 && <Separator />}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Reviewed Changes</h4>
              {reviewedChanges.map((change) => (
                <Card key={change.id} className="border-card-border opacity-75">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded border ${getChangeColor(change.type)}`}>
                          {getChangeIcon(change.type)}
                        </div>
                        <span className="text-sm">"{change.text}"</span>
                      </div>
                      <Badge 
                        variant={change.status === 'accepted' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {change.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {changes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No changes to review</p>
          </div>
        )}
      </div>
    </div>
  );
};