import { useState, useEffect } from 'react';
import { FileText, Upload, MoreVertical, ChevronLeft, ChevronRight, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import { FileValidator, ErrorUtils } from '../services';
import { useDocumentsStore } from '../stores';
import type { Document } from '../App';
import { ProcessingProgress } from './ProcessingProgress';

const formatDocumentName = (name: string, maxLength = 36) => {
  if (!name) {
    return '';
  }

  if (name.length <= maxLength) {
    return name;
  }

  const extensionMatch = name.match(/\.[^./\\]+$/);
  const extension = extensionMatch ? extensionMatch[0] : '';
  const baseName = extension ? name.slice(0, -extension.length) : name;

  const availableLength = maxLength - extension.length - 3; // reserve for ellipsis
  if (availableLength <= 0) {
    return `${baseName.slice(0, maxLength - 3)}...`;
  }

  const startLength = Math.max(1, Math.ceil(availableLength * 0.6));
  const endLength = Math.max(1, availableLength - startLength);

  const start = baseName.slice(0, startLength);
  const end = baseName.slice(-endLength);

  return `${start}...${end}${extension}`;
};

interface DocumentSidebarProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (document: Document) => void;
  isOpen: boolean;
  onToggle: () => void;
  onUploadClick: () => void;
  onDeleteDocument: (documentId: string) => void;
  onDocumentsChange?: (documents: Document[]) => void;
}

export function DocumentSidebar({
  documents,
  selectedDocument,
  onSelectDocument,
  isOpen,
  onToggle,
  onUploadClick,
  onDeleteDocument,
  onDocumentsChange,
}: DocumentSidebarProps) {
  const [dragActive, setDragActive] = useState(false);
  
  // Use documents store
  const { 
    documents: storeDocuments,
    fetchDocuments, 
    uploadDocument, 
    deleteDocument: deleteFromStore,
    isLoading: loading,
    isUploading: uploading,
  } = useDocumentsStore();

  // Load documents from API on component mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Sync when store documents change
  useEffect(() => {
    console.log('🔄 DocumentSidebar: Store documents changed, count:', storeDocuments.length);
    
    const formattedDocs: Document[] = storeDocuments.map((doc) => ({
      id: doc.id,
      name: doc.name,
      pages: doc.pages || 0,
      size: doc.file_size_formatted || `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`,
      uploadDate: new Date(doc.upload_date),
      file_url: doc.file_url,  // Include file_url for PDF preview
      processing_status: doc.processing_status,
      can_be_queried: doc.can_be_queried,
    }));
    
    console.log('📋 DocumentSidebar: Syncing to App.tsx, formatted docs:', formattedDocs.length);
    console.log('🔗 DocumentSidebar: First doc file_url:', formattedDocs[0]?.file_url);
    
    if (onDocumentsChange) {
      onDocumentsChange(formattedDocs);
    }
  }, [storeDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file
    const validation = FileValidator.isValidFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const uploadedDoc = await uploadDocument({
        file,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      });

      // Convert to local Document format for App.tsx
      const newDoc: Document = {
        id: uploadedDoc.id,
        name: uploadedDoc.name,
        pages: uploadedDoc.pages || 0,
        size: uploadedDoc.file_size_formatted || `${(uploadedDoc.file_size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: new Date(uploadedDoc.upload_date),
      };
      
      // Select the newly uploaded document
      onSelectDocument(newDoc);
      
      toast.success('Document uploaded successfully!');
      // Note: No need to manually update documents list - the useEffect will sync from store
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(ErrorUtils.getErrorMessage(error));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteFromStore(documentId);
      
      // If deleted document was selected, select the first remaining document
      const remainingDocs = documents.filter(doc => doc.id !== documentId);
      if (selectedDocument.id === documentId && remainingDocs.length > 0) {
        onSelectDocument(remainingDocs[0]);
      }
      
      toast.success('Document deleted successfully');
      onDeleteDocument(documentId);
      // Note: No need to manually update documents list - the useEffect will sync from store
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(ErrorUtils.getErrorMessage(error));
    }
  };

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center w-12 bg-gray-900 border-r border-gray-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-80 bg-gray-900 border-r border-gray-800">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <h2 className="text-white">Documents</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4">
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-500 bg-opacity-10'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400 mb-2">
            Drag & drop PDF files here
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700"
            onClick={onUploadClick}
          >
            Browse Files
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          {/* Show processing documents */}
          {documents
            .filter((doc) => {
              // Only show documents that are actively being processed (not completed/failed/undefined)
              const status = doc.processing_status;
              return status && status !== 'completed' && status !== 'failed' && status !== 'error';
            })
            .map((doc) => (
              <ProcessingProgress
                key={doc.id}
                documentId={doc.id}
                documentName={doc.name}
                onComplete={() => {
                  fetchDocuments();
                  toast.success(`${doc.name} is ready!`);
                }}
                onError={(error) => {
                  toast.error(`Failed to process ${doc.name}: ${error}`);
                  fetchDocuments();
                }}
              />
            ))}
          
          {/* Show completed documents */}
          {documents.filter((doc) => {
            // Show completed documents or documents without a processing_status (legacy)
            return !doc.processing_status || doc.processing_status === 'completed';
          }).map((doc) => (
            <div
              key={doc.id}
              className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedDocument?.id === doc.id
                  ? 'bg-blue-600 bg-opacity-20 border border-blue-500'
                  : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
              }`}
              onClick={() => {
                if (doc.can_be_queried !== false) {
                  onSelectDocument(doc);
                } else {
                  toast.info('This document is still being processed');
                }
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                <FileText
                  className={`h-5 w-5 ${
                    selectedDocument?.id === doc.id ? 'text-blue-400' : 'text-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  title={doc.name}
                  className={`text-sm whitespace-nowrap overflow-hidden ${
                    selectedDocument?.id === doc.id ? 'text-white' : 'text-gray-200'
                  }`}
                >
                  {formatDocumentName(doc.name)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {doc.pages} pages · {doc.size}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {doc.uploadDate.toLocaleDateString()}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-400 hover:text-white"
                    onClick={(e : any) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Download</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
