import { Button } from "@/components/ui/button";
import { Manuscript, Change } from "@/data/sampleManuscripts";
import { Check, X } from "lucide-react";

interface DocumentViewerProps {
  manuscript: Manuscript;
  changes: Change[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
  isReviewed: boolean;
}

export const DocumentViewer = ({ 
  manuscript, 
  changes, 
  onAcceptChange, 
  onRejectChange, 
  isReviewed 
}: DocumentViewerProps) => {
  
  // Process content to show track changes inline
  const renderContentWithChanges = () => {
    const pendingChanges = changes.filter(c => c.status === 'pending');
    
    // For the MVP, we'll show the original content with visual indicators
    // In a full implementation, this would process the text and insert change markers
    const contentLines = manuscript.content.split('\n');
    
    return contentLines.map((line, lineIndex) => {
      // Check if this line has any changes (simplified logic for MVP)
      const lineChanges = pendingChanges.filter(change => {
        // Simple heuristic: if the change text appears in this line
        return line.includes(change.text) || 
               (change.originalText && line.includes(change.originalText));
      });

      if (lineChanges.length === 0) {
        return (
          <div key={lineIndex} className="mb-4">
            {line.startsWith('#') ? (
              <div className="font-semibold text-lg mb-2 text-foreground">
                {line.replace(/^#+\s/, '')}
              </div>
            ) : line.trim() === '' ? (
              <div className="h-4" />
            ) : (
              <p className="leading-relaxed text-document-foreground">{line}</p>
            )}
          </div>
        );
      }

      // Render line with changes highlighted
      return (
        <div key={lineIndex} className="mb-4">
          {lineChanges.map((change) => (
            <div key={change.id} className="relative group">
              {line.startsWith('#') ? (
                <div className="font-semibold text-lg mb-2 text-foreground">
                  {renderLineWithChange(line.replace(/^#+\s/, ''), change)}
                </div>
              ) : (
                <p className="leading-relaxed text-document-foreground">
                  {renderLineWithChange(line, change)}
                </p>
              )}
              
              {/* Inline change controls */}
              {!isReviewed && change.status === 'pending' && (
                <div className="absolute -right-16 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => onAcceptChange(change.id)}
                    >
                      <Check className="h-3 w-3 text-insertion" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => onRejectChange(change.id)}
                    >
                      <X className="h-3 w-3 text-deletion" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    });
  };

  const renderLineWithChange = (line: string, change: Change) => {
    if (change.type === 'insertion') {
      // Highlight inserted text
      return line.replace(change.text, `<span class="insertion">${change.text}</span>`);
    } else if (change.type === 'deletion') {
      // Show deleted text with strikethrough
      return line.replace(change.text, `<span class="deletion">${change.text}</span>`);
    } else if (change.type === 'modification' && change.originalText) {
      // Show original text as deleted, new text as inserted
      return line
        .replace(change.originalText, `<span class="deletion">${change.originalText}</span>`)
        .replace(change.text, `<span class="insertion">${change.text}</span>`);
    }
    return line;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Manuscript metadata */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {manuscript.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              by {manuscript.author}
            </p>
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span>{manuscript.wordCount.toLocaleString()} words</span>
              <span>
                {changes.filter(c => c.status === 'pending').length} pending changes
              </span>
              <span>Last modified: {manuscript.lastModified.toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Manuscript content with changes */}
        <div 
          className="manuscript-content"
          dangerouslySetInnerHTML={{ 
            __html: renderContentWithChanges()
              .map(element => {
                if (typeof element === 'object' && element.props) {
                  return element.props.children;
                }
                return element;
              })
              .join('') 
          }}
        />
      </div>
    </div>
  );
};