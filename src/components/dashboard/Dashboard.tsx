import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Upload, Bell, MoreHorizontal, User, Monitor, FileText, ChevronLeft, Settings, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useManuscripts, type Manuscript } from "@/contexts/ManuscriptsContext";
import { markdownToHtml, htmlToPlainText, validateMarkdownFile, readFileAsText } from "@/lib/markdownUtils";
import { updateEditorContent } from "@/lib/editorUtils";
import { ManuscriptService } from "@/services/manuscriptService";
import { dbToFrontend } from "@/types/manuscript";
import { useQueueProcessor } from "@/hooks/useQueueProcessor";

const Dashboard = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadWarning, setUploadWarning] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'markdown' | 'docx' | null>(null);
  const [deleteConfirmManuscript, setDeleteConfirmManuscript] = useState<Manuscript | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loggedIn, logout } = useAuth();
  const { manuscripts, updateManuscript, addManuscript, deleteManuscript } = useManuscripts();
  const { getManuscriptStatus, processingStatuses, isProcessing, processQueue } = useQueueProcessor();

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

  const handleDeleteManuscript = async () => {
    if (!deleteConfirmManuscript) return;

    try {
      await deleteManuscript(deleteConfirmManuscript.id);
      setDeleteConfirmManuscript(null);
    } catch (error) {
      console.error('Failed to delete manuscript:', error);
      // Error toast is already shown by the context
    }
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

  const getBallInCourtIcon = (ballInCourt: Manuscript['ballInCourt'], round: number) => {
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-gray-600">{ballInCourt}</span>
              </div>
              <span className="text-xs text-gray-400 ml-6">Round {round}</span>
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const validateFile = (file: File): { valid: boolean; error?: string; type?: 'markdown' | 'docx' } => {
    const fileName = file.name.toLowerCase();
    const fileSize = file.size;
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    if (fileSize > maxSize) {
      return { valid: false, error: "File size must be less than 20MB" };
    }
    
    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      return { valid: true, type: 'markdown' };
    } else if (fileName.endsWith('.docx')) {
      return { valid: true, type: 'docx' };
    } else {
      return { valid: false, error: "Only Markdown (.md) and Word (.docx) files are supported" };
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError("");
    setUploadWarning("");
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid file");
      return;
    }
    
    setSelectedFile(file);
    setFileType(validation.type!);
    
    if (validation.type === 'markdown') {
      await processMarkdownFile(file);
    } else if (validation.type === 'docx') {
      await processDocxFile(file);
    }
  };

  const processMarkdownFile = async (file: File) => {
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
      
      // Create new manuscript using ManuscriptService with placeholder DOCX fields
      const manuscriptData = {
        title: file.name.replace(/\.(md|markdown)$/i, ''),
        docx_file_path: `imported/${file.name}.docx`, // Placeholder for imported markdown
        original_filename: `${file.name}.docx`,
        file_size: file.size,
        content_text: plainText,
        content_html: htmlContent,
        source_markdown: markdownContent,
        style_rules: []
      };

      // Create manuscript through context
      const frontendManuscript = await addManuscript(manuscriptData);
      
      toast({
        title: "Imported from Markdown",
        description: `Successfully imported "${frontendManuscript.title}". You can now click it in the table to open the editor.`,
      });

      setShowUploadModal(false);
      setUploadStep(1);
      setSelectedFile(null);
      setFileType(null);

      // Keep user in dashboard - they can click the manuscript to open it when ready
      
    } catch (error) {
      console.error('Error processing markdown:', error);
      setUploadError("Failed to process markdown file. Please check the file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const processDocxFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Upload DOCX file to storage
      const filePath = await ManuscriptService.uploadDocxFile(file);
      
      // Create manuscript with DOCX metadata
      const manuscriptData = {
        title: file.name.replace(/\.docx$/i, ''),
        docx_file_path: filePath,
        original_filename: file.name,
        file_size: file.size,
        style_rules: []
      };

      // Create manuscript through context (which handles database creation)
      const frontendManuscript = await addManuscript(manuscriptData);
      
      // Start DOCX processing in the background
      try {
        await ManuscriptService.queueDocxProcessing(frontendManuscript.id, filePath);
        toast({
          title: "DOCX Processing Started",
          description: `"${frontendManuscript.title}" is being processed. Watch the status in the table below - you can open it when processing completes.`,
        });
      } catch (processingError) {
        console.error('Failed to start DOCX processing:', processingError);
        toast({
          title: "Upload Complete",
          description: `"${frontendManuscript.title}" uploaded successfully, but processing failed. You can retry from the workspace.`,
          variant: "destructive"
        });
      }
      
      setShowUploadModal(false);
      setUploadStep(1);
      setSelectedFile(null);
      setFileType(null);

      // Keep user in dashboard to see processing status
      // They can click the manuscript to open it when processing completes
      
    } catch (error) {
      console.error('Error processing DOCX:', error);
      setUploadError("Failed to upload DOCX file. Please try again.");
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
                    <div>
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
                          Drop your manuscript file here
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Supports Word (.docx) files
                        </p>
                        <input
                          id="file-upload-input"
                          type="file"
                          accept=".md,.markdown,.docx"
                          className="hidden"
                          onChange={handleFileInputChange}
                          disabled={isUploading}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => document.getElementById('file-upload-input')?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            fileType === 'docx' ? "Uploading DOCX..." : "Processing Markdown..."
                          ) : "Choose File"}
                        </Button>
                      </div>
                      
                      {uploadError && (
                        <div id="upload-error" className="text-red-600 text-sm bg-red-50 p-3 rounded">
                          {uploadError}
                        </div>
                      )}
                      
                      {uploadWarning && (
                        <div id="upload-warning" className="text-amber-600 text-sm bg-amber-50 p-3 rounded">
                          {uploadWarning}
                        </div>
                      )}

                      {selectedFile && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">{selectedFile.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            {fileType && (
                              <Badge variant="secondary" className="text-xs">
                                {fileType.toUpperCase()}
                              </Badge>
                            )}
                          </div>
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
            
            {/* Queue Status & Manual Trigger */}
            <div className="flex items-center gap-2">
              {/* Auto-processing status */}
              {isProcessing && (
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-xs">Auto-processing...</span>
                </div>
              )}
              
              {/* Queue count indicator */}
              {Object.keys(processingStatuses).length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(processingStatuses).length} in queue
                </Badge>
              )}
              
              {/* Manual trigger (backup for when auto-processing fails) */}
              {Object.keys(processingStatuses).length > 0 && !isProcessing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => processQueue()}
                  className="text-xs"
                  title="Manual trigger if auto-processing isn't working"
                >
                  ⚡ Process Now
                </Button>
              )}
            </div>
            
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
                  <TableHead className="font-medium text-gray-700">Status</TableHead>
                  <TableHead className="font-medium text-gray-700">Ball-in-Court</TableHead>
                  <TableHead className="font-medium text-gray-700">Word Count</TableHead>
                  <TableHead className="font-medium text-gray-700">Character Count</TableHead>
                  <TableHead className="font-medium text-gray-700">Last Modified</TableHead>
                  <TableHead className="font-medium text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManuscripts.map((manuscript) => {
                  const queueStatus = getManuscriptStatus(manuscript.id);
                  const isProcessing = queueStatus?.status === 'pending' || queueStatus?.status === 'processing';
                  const isReady = !isProcessing && manuscript.processingStatus !== 'failed';

                  return (
                    <TableRow
                      key={manuscript.id}
                      className={isReady ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed opacity-60"}
                      onClick={isReady ? () => navigate(`/manuscript/${manuscript.id}`) : undefined}
                    >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{manuscript.title}</span>
                        {(() => {
                          const queueStatus = getManuscriptStatus(manuscript.id);
                          
                          // Show queue processing status
                          if (queueStatus?.status === 'pending') {
                            return <Badge variant="secondary" className="text-xs animate-pulse">⏳ Queued</Badge>;
                          }
                          if (queueStatus?.status === 'processing') {
                            const progress = (queueStatus.progress?.progress as number) || 0;
                            const step = (queueStatus.progress?.step as string) || 'processing';
                            return (
                              <Badge variant="outline" className="text-xs animate-pulse">
                                ⚡ {step} ({progress}%)
                              </Badge>
                            );
                          }
                          
                          // Show manuscript processing status for completed/failed
                          if (manuscript.processingStatus === 'completed' && queueStatus?.status === 'completed') {
                            return <Badge variant="default" className="text-xs bg-green-100 text-green-800">✅ Ready</Badge>;
                          }
                          if (manuscript.processingStatus === 'failed' || queueStatus?.status === 'failed') {
                            return <Badge variant="destructive" className="text-xs">❌ Failed</Badge>;
                          }
                          
                          // Show initial processing status
                          if (manuscript.processingStatus === 'pending') {
                            return <Badge variant="secondary" className="text-xs">📝 Uploaded</Badge>;
                          }
                          
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{manuscript.owner}</TableCell>
                    <TableCell>{getStatusBadge(manuscript.status)}</TableCell>
                    <TableCell>
                      {getBallInCourtIcon(manuscript.ballInCourt, manuscript.round)}
                    </TableCell>
                    <TableCell className="text-gray-600">{formatNumber(manuscript.wordCount)}</TableCell>
                    <TableCell className="text-gray-600">{formatNumber(manuscript.characterCount)}</TableCell>
                    <TableCell className="text-gray-600">{formatDate(manuscript.updatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/manuscript/${manuscript.id}/legacy`);
                            }}
                          >
                            Open in Legacy Editor
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmManuscript(manuscript);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Manuscript
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmManuscript} onOpenChange={(open) => !open && setDeleteConfirmManuscript(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manuscript</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<strong>{deleteConfirmManuscript?.title}</strong>"?
              {deleteConfirmManuscript?.docxFilePath && (
                <span className="block mt-2 text-sm">
                  This will also delete the associated DOCX file from storage.
                </span>
              )}
              <span className="block mt-2 text-sm font-semibold">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteManuscript}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;