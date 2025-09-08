import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { sampleManuscripts, Manuscript, Change } from "@/data/sampleManuscripts";
import { ArrowLeft, Check, X, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChangeList } from "./ChangeList";
import { DocumentViewer } from "./DocumentViewer";

const ManuscriptWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("ballast_authenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Load manuscript
    const found = sampleManuscripts.find(m => m.id === id);
    if (!found) {
      navigate("/dashboard");
      return;
    }
    setManuscript(found);
  }, [id, navigate]);

  const handleAcceptChange = (changeId: string) => {
    if (!manuscript) return;

    const updatedChanges = manuscript.changes.map(change =>
      change.id === changeId
        ? { ...change, status: 'accepted' as const }
        : change
    );

    setManuscript({
      ...manuscript,
      changes: updatedChanges
    });

    toast({
      title: "Change accepted",
      description: "The change has been incorporated into the manuscript.",
    });
  };

  const handleRejectChange = (changeId: string) => {
    if (!manuscript) return;

    const updatedChanges = manuscript.changes.map(change =>
      change.id === changeId
        ? { ...change, status: 'rejected' as const }
        : change
    );

    setManuscript({
      ...manuscript,
      changes: updatedChanges
    });

    toast({
      title: "Change rejected",
      description: "The change has been removed from the manuscript.",
    });
  };

  const handleMarkReviewed = () => {
    if (!manuscript) return;

    const pendingChanges = manuscript.changes.filter(c => c.status === 'pending').length;
    
    if (pendingChanges > 0) {
      toast({
        title: "Cannot mark as reviewed",
        description: `Please review all ${pendingChanges} pending changes first.`,
        variant: "destructive",
      });
      return;
    }

    setManuscript({
      ...manuscript,
      status: 'reviewed'
    });

    toast({
      title: "Manuscript marked as reviewed",
      description: "This manuscript is now read-only and complete.",
    });
  };

  if (!manuscript) {
    return <div>Loading...</div>;
  }

  const pendingChanges = manuscript.changes.filter(c => c.status === 'pending');
  const isReviewed = manuscript.status === 'reviewed';

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-document px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold">{manuscript.title}</h1>
              <p className="text-sm text-muted-foreground">
                by {manuscript.author}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={isReviewed ? "outline" : "default"}>
              {manuscript.status}
            </Badge>
            {!isReviewed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkReviewed}
                disabled={pendingChanges.length > 0}
                className="text-sm"
              >
                <FileCheck className="mr-2 h-4 w-4" />
                Mark as Reviewed
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace - Two Column Layout */}
      <div className="flex-1 flex">
        {/* Document Canvas - Left Side */}
        <div className="flex-1 bg-document border-r border-border">
          <DocumentViewer 
            manuscript={manuscript}
            changes={manuscript.changes}
            onAcceptChange={handleAcceptChange}
            onRejectChange={handleRejectChange}
            isReviewed={isReviewed}
          />
        </div>

        {/* Change List - Right Rail */}
        <div className="w-80 bg-background">
          <ChangeList 
            changes={manuscript.changes}
            onAcceptChange={handleAcceptChange}
            onRejectChange={handleRejectChange}
            isReviewed={isReviewed}
          />
        </div>
      </div>
    </div>
  );
};

export default ManuscriptWorkspace;