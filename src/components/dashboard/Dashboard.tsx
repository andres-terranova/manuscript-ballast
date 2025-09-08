import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleManuscripts, Manuscript } from "@/data/sampleManuscripts";
import { LogOut, FileText, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("ballast_authenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Load manuscripts
    setManuscripts(sampleManuscripts);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("ballast_authenticated");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'draft': 'secondary',
      'in-review': 'default',
      'reviewed': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-document">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Ballast</h1>
              <p className="text-sm text-muted-foreground">Manuscript Editor</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Manuscripts</h2>
          <p className="text-muted-foreground">
            Select a manuscript to begin editing and reviewing changes.
          </p>
        </div>

        <div className="grid gap-4">
          {manuscripts.map((manuscript) => (
            <Card 
              key={manuscript.id}
              className="cursor-pointer transition-all hover:shadow-md border-card-border"
              onClick={() => navigate(`/manuscript/${manuscript.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {manuscript.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {manuscript.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(manuscript.lastModified)}
                      </span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(manuscript.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{manuscript.wordCount.toLocaleString()} words</span>
                  <span>
                    {manuscript.changes.filter(c => c.status === 'pending').length} pending changes
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;