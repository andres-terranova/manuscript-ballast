import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertTriangle 
} from "lucide-react";
import type { Manuscript } from "@/contexts/ManuscriptsContext";
import { ManuscriptService } from "@/services/manuscriptService";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ProcessingStatusProps {
  manuscript: Manuscript;
  onRetryProcessing?: () => void;
}

export const ProcessingStatus = ({ 
  manuscript, 
  onRetryProcessing 
}: ProcessingStatusProps) => {
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);

  // Only show if this is a DOCX manuscript
  if (!manuscript.docxFilePath && !manuscript.processingStatus) {
    return null;
  }

  const handleRetryProcessing = async () => {
    if (!manuscript.docxFilePath) return;
    
    setIsRetrying(true);
    try {
      await ManuscriptService.processDocx(manuscript.id, manuscript.docxFilePath);
      toast({
        title: "Processing Restarted",
        description: "DOCX processing has been restarted."
      });
      if (onRetryProcessing) {
        onRetryProcessing();
      }
    } catch (error) {
      console.error('Failed to retry processing:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to restart processing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusDisplay = () => {
    switch (manuscript.processingStatus) {
      case 'pending':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Processing Queued",
          color: "bg-amber-100 text-amber-800 border-amber-200",
          showRetry: false
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Processing DOCX...",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          showRetry: false
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Processing Complete",
          color: "bg-green-100 text-green-800 border-green-200",
          showRetry: false
        };
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4" />,
          text: "Processing Failed",
          color: "bg-red-100 text-red-800 border-red-200",
          showRetry: true
        };
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          text: "DOCX Document",
          color: "bg-gray-100 text-gray-800 border-gray-200",
          showRetry: false
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={`${status.color} flex items-center gap-1`}
      >
        {status.icon}
        {status.text}
      </Badge>
      
      {status.showRetry && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRetryProcessing}
          disabled={isRetrying}
          className="h-6 text-xs"
        >
          {isRetrying ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Retry
        </Button>
      )}
      
      {manuscript.processingError && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span className="max-w-48 truncate" title={manuscript.processingError}>
            {manuscript.processingError}
          </span>
        </div>
      )}
    </div>
  );
};

export const ProcessingStatusCard = ({ manuscript }: { manuscript: Manuscript }) => {
  // Only show if DOCX and not completed
  if (!manuscript.docxFilePath || manuscript.processingStatus === 'completed') {
    return null;
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {manuscript.processingStatus === 'processing' ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            ) : manuscript.processingStatus === 'failed' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <FileText className="h-5 w-5 text-amber-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-900">
              {manuscript.processingStatus === 'processing' ? 'Processing DOCX Document' :
               manuscript.processingStatus === 'failed' ? 'Document Processing Failed' :
               'DOCX Document Processing'}
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              {manuscript.processingStatus === 'processing' 
                ? 'Your Word document is being converted to editable text. This may take a few minutes.'
                : manuscript.processingStatus === 'failed'
                ? `Processing failed: ${manuscript.processingError || 'Unknown error'}`
                : 'Your Word document is queued for processing.'
              }
            </p>
            
            {manuscript.originalFilename && (
              <p className="text-xs text-amber-600 mt-1">
                File: {manuscript.originalFilename}
                {manuscript.fileSize && ` (${(manuscript.fileSize / 1024 / 1024).toFixed(2)} MB)`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};