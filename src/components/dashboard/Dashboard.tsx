import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Upload, Bell, MoreHorizontal, User, Monitor, FileText, ChevronLeft, X, Settings, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { markdownToHtml, htmlToPlainText, validateMarkdownFile, readFileAsText } from "@/lib/markdownUtils";
import { updateEditorContent } from "@/lib/editorUtils";

const Dashboard = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadWarning, setUploadWarning] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loggedIn, logout } = useAuth();
  const { manuscripts, updateManuscript, addManuscript } = useManuscripts();

  useEffect(() => {
    // Check authentication
    if (!loggedIn) {
      navigate("/login");
      return;
    }
  }, [navigate, loggedIn]);

  // Debounced search filtering
  const filteredManuscripts = useMemo(() => {
    if (!searchTerm.trim()) {
      return manuscripts;
    }
    return manuscripts.filter(manuscript => 
      manuscript.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [manuscripts, searchTerm]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  const getStatusBadge = (status: Manuscript['status']) => {
    const statusConfig = {
      'In Review': { color: 'bg-blue-100 text-blue-800' },
      'Reviewed': { color: 'bg-green-100 text-green-800' },
      'Tool Pending': { color: 'bg-gray-100 text-gray-800' },
      'With Author': { color: 'bg-purple-100 text-purple-800' }
    };
    
    const config = statusConfig[status] || statusConfig['In Review'];
    
    return (
      <Badge className={`${config.color} border-0`}>
        {status}
      </Badge>
    );
  };

  const getBallInCourtIcon = (ballInCourt: Manuscript['ballInCourt']) => {
    const config = {
      'Editor': { icon: Monitor, tooltip: 'Editor', color: 'text-purple-600' },
      'Author': { icon: User, tooltip: 'Author', color: 'text-blue-600' },
      'Tool': { icon: Settings, tooltip: 'Tool', color: 'text-gray-600' },
      'None': { icon: Clock, tooltip: 'None', color: 'text-gray-400' }
    };
    
    const { icon: Icon, tooltip, color } = config[ballInCourt] || config.None;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm text-gray-600">{ballInCourt}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const formatDate = (isoDate: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(isoDate));
  };

  const handleFileSelect = async (file: File) => {
    setUploadError("");
    setUploadWarning("");
    
    // Validate file
    const validation = validateMarkdownFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Read markdown content
      const markdownContent = await readFileAsText(file);
      
      // Convert to HTML
      const htmlContent = await markdownToHtml(markdownContent);
      
      // Convert to plain text for excerpts/search
      const plainText = htmlToPlainText(htmlContent);
      
      // Check for local images and warn
      if (markdownContent.includes('![') && markdownContent.match(/!\[.*?\]\([^http]/)) {
        setUploadWarning("Local image paths aren't supported yet; images may not display correctly.");
      }
      
      // Create new manuscript
      const newManuscript: Manuscript = {
        id: `m${Date.now()}`,
        title: file.name.replace('.md', ''),
        owner: "A. Editor",
        round: 1,
        status: "In Review",
        ballInCourt: "Editor",
        updatedAt: new Date().toISOString(),
        excerpt: plainText.substring(0, 100) + "...",
        contentText: plainText,
        contentHtml: htmlContent,
        sourceMarkdown: markdownContent,
        changes: [],
        comments: [],
        checks: [],
        newContent: []
      };
      
      // Add manuscript to store
      addManuscript(newManuscript);
      
      // Update TipTap editor content if we're currently editing this manuscript
      updateEditorContent(htmlContent);
      toast({
        title: "Imported from Markdown",
        description: `Successfully imported "${newManuscript.title}".`,
      });
      
      setShowUploadModal(false);
      setUploadStep(1);
      
      // Navigate to the new manuscript
      navigate(`/manuscript/${newManuscript.id}`);
      
    } catch (error) {
      console.error('Error processing markdown:', error);
      setUploadError("Failed to process markdown file. Please check the file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                      <DialogDescription>
                        {uploadStep === 1 
                          ? "Select a manuscript file to upload and process" 
                          : "Configure editing rules for your manuscript"
                        }
                      </DialogDescription>
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
                    <div className="space-y-4">
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={(e) => e.preventDefault()}
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Drop your Markdown file here
                        </h3>
                        <p className="text-gray-600 mb-4">
                          or click to browse .md files
                        </p>
                        <input
                          id="md-upload-input"
                          type="file"
                          accept=".md"
                          className="hidden"
                          onChange={handleFileInputChange}
                          disabled={isUploading}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => document.getElementById('md-upload-input')?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? "Processing..." : "Choose File"}
                        </Button>
                      </div>
                      
                      {uploadError && (
                        <div id="md-upload-error" className="text-red-600 text-sm bg-red-50 p-3 rounded">
                          {uploadError}
                        </div>
                      )}
                      
                      {uploadWarning && (
                        <div id="md-upload-warning" className="text-amber-600 text-sm bg-amber-50 p-3 rounded">
                          {uploadWarning}
                        </div>
                      )}
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
                        <Button 
                          id="md-upload-submit"
                          className="w-full bg-black text-white hover:bg-gray-800"
                          disabled
                        >
                          Start Processing (Coming Soon)
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

        {filteredManuscripts.length === 0 ? (
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
                {filteredManuscripts.map((manuscript) => (
                  <TableRow 
                    key={manuscript.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/manuscript/${manuscript.id}`)}
                  >
                    <TableCell className="font-medium">{manuscript.title}</TableCell>
                    <TableCell>{manuscript.owner}</TableCell>
                    <TableCell>Round {manuscript.round}</TableCell>
                    <TableCell>{getStatusBadge(manuscript.status)}</TableCell>
                    <TableCell>
                      {getBallInCourtIcon(manuscript.ballInCourt)}
                    </TableCell>
                    <TableCell className="text-gray-600">{formatDate(manuscript.updatedAt)}</TableCell>
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