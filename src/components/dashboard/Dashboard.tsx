import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sampleManuscripts, Manuscript } from "@/data/sampleManuscripts";
import { Search, Upload, Bell, MoreHorizontal, User, Monitor, FileText, ChevronLeft, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loggedIn, logout } = useAuth();

  useEffect(() => {
    // Check authentication
    if (!loggedIn) {
      navigate("/login");
      return;
    }

    // Load manuscripts - using empty array for now to show both states
    setManuscripts([]);
  }, [navigate, loggedIn]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      'in-review': { label: 'In Review', color: 'bg-blue-100 text-blue-800' },
      'reviewed': { label: 'Reviewed', color: 'bg-green-100 text-green-800' },
      'revision': { label: 'Revision', color: 'bg-purple-100 text-purple-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const mockTableData = [
    {
      id: 1,
      title: "Neural Pathways in Cognitive Processing",
      owner: "Dr. Sarah Chen",
      round: "Round 2",
      status: "in-review",
      ballInCourt: "editor",
      lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      title: "Field Notes from the Amazon Basin",
      owner: "Prof. Michael Torres",
      round: "Round 1",
      status: "reviewed",
      ballInCourt: "author",
      lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <header id="header" className="h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <span className="text-xl font-semibold text-black">Tinkso</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search manuscripts..."
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
              <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-gray-800">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {uploadStep > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setUploadStep(1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <DialogTitle>
                        {uploadStep === 1 ? "Upload Manuscript" : "Configure Style Rules"}
                      </DialogTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowUploadModal(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>
                
                <div id="upload-modal" className="py-6">
                  {uploadStep === 1 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Drop your manuscript here
                      </h3>
                      <p className="text-gray-600 mb-4">
                        or click to browse files
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setUploadStep(2)}
                      >
                        Choose File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-96 overflow-y-auto">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Grammar & Style</h4>
                        <div className="space-y-2">
                          <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Check spelling</span>
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                          <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Grammar corrections</span>
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                          <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Style improvements</span>
                            <input type="checkbox" className="rounded" />
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Formatting</h4>
                        <div className="space-y-2">
                          <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Consistent punctuation</span>
                            <input type="checkbox" className="rounded" defaultChecked />
                          </label>
                          <label className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Citation style</span>
                            <input type="checkbox" className="rounded" />
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <Button className="w-full bg-black text-white hover:bg-gray-800">
                          Start Processing
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">U</span>
              </div>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-16 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black">Manuscripts</h1>
        </div>

        {manuscripts.length === 0 ? (
          /* Empty State */
          <div id="empty-state" className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No manuscripts yet</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Upload your first manuscript to get started with AI-powered editing and track changes.
            </p>
            <Button 
              className="bg-black text-white hover:bg-gray-800"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Manuscript
            </Button>
          </div>
        ) : (
          /* Table View */
          <div id="manuscripts-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium text-gray-700">Title</TableHead>
                  <TableHead className="font-medium text-gray-700">Owner</TableHead>
                  <TableHead className="font-medium text-gray-700">Round</TableHead>
                  <TableHead className="font-medium text-gray-700">Status</TableHead>
                  <TableHead className="font-medium text-gray-700">Ball-in-Court</TableHead>
                  <TableHead className="font-medium text-gray-700">Last Modified</TableHead>
                  <TableHead className="font-medium text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTableData.map((row) => (
                  <TableRow 
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/manuscript/${row.id}`)}
                  >
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.round}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.ballInCourt === 'author' ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Monitor className="h-4 w-4 text-purple-600" />
                        )}
                        <span className="text-sm text-gray-600 capitalize">{row.ballInCourt}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{formatDate(row.lastModified)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Dropdown logic would go here
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;