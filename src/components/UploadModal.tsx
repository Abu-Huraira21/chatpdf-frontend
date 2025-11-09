import React, { useState } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { useDocumentsStore } from '../stores';
import { FileValidator, ErrorUtils } from '../services';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (fileName: string) => void;
}

const formatFileNameWithEllipsis = (name: string, prefixLength = 40, suffixLength = 6) => {
  if (!name) return '';
  if (name.length <= prefixLength + suffixLength + 3) {
    return name;
  }
  const prefix = name.slice(0, prefixLength);
  const suffix = name.slice(-suffixLength);
  return `${prefix}…${suffix}`;
};

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Use documents store for actual upload
  const { uploadDocument, isUploading, uploadProgress } = useDocumentsStore();

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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file using FileValidator
      const validation = FileValidator.isValidFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    console.log('📤 UploadModal: Starting upload...', {
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
    });

    try {
      // Upload using the documents store
      const document = await uploadDocument({
        file: selectedFile,
        name: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
      });

      console.log('✅ UploadModal: Upload successful!', document);

      setUploadComplete(true);
      toast.success('Document uploaded successfully!');
      
      if (onUploadComplete) {
        onUploadComplete(selectedFile.name);
      }
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('❌ UploadModal: Upload failed:', error);
      toast.error(ErrorUtils.getErrorMessage(error));
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadComplete(false);
    onOpenChange(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[28rem]">
        <DialogHeader>
          <DialogTitle>Upload a New Document</DialogTitle>
          <DialogDescription>
            Upload a PDF file to start chatting with your document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedFile ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-gray-700">
                <span className="text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 mb-4">PDF files only (MAX. 50MB)</p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 w-full overflow-hidden">
                <div className="flex-shrink-0 mt-1">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-sm text-gray-900"
                    title={selectedFile.name}
                  >
                    {formatFileNameWithEllipsis(selectedFile.name)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                {!isUploading && !uploadComplete && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {uploadComplete && (
                  <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="text-gray-900">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {uploadComplete && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <Check className="h-4 w-4" />
                  <span>Upload complete! Processing document...</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadComplete}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
