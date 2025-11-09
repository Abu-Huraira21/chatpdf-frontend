/**
 * Documents State Store
 * 
 * Manages document list, upload, delete, and processing states.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DocumentService, Document, DocumentUpload, DocumentListResponse } from '../services/documents';

export interface DocumentsState {
  // State
  documents: Document[];
  selectedDocument: Document | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  
  // Actions
  fetchDocuments: (page?: number, pageSize?: number) => Promise<void>;
  uploadDocument: (upload: DocumentUpload, onProgress?: (progress: number) => void) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
  selectDocument: (document: Document | null) => void;
  clearError: () => void;
  refreshDocument: (documentId: string) => Promise<void>;
  reset: () => void; // Reset store on logout
}

export const useDocumentsStore = create<DocumentsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      documents: [],
      selectedDocument: null,
      isLoading: false,
      isUploading: false,
      uploadProgress: 0,
      error: null,
      totalCount: 0,
      hasMore: false,

      // Fetch documents with pagination
      fetchDocuments: async (page = 1, pageSize = 20) => {
        console.log('📥 DocumentsStore: Fetching documents...');
        set({ isLoading: true, error: null });
        try {
          const response: DocumentListResponse = await DocumentService.getDocuments(page, pageSize);
          
          console.log('✅ DocumentsStore: Documents fetched:', response.results.length);
          console.log('📋 DocumentsStore: First document has file_url?', !!response.results[0]?.file_url);
          console.log('🔗 DocumentsStore: Sample file_url:', response.results[0]?.file_url);
          
          set({
            documents: page === 1 ? response.results : [...get().documents, ...response.results],
            totalCount: response.count,
            hasMore: !!response.next,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('❌ DocumentsStore: Fetch failed:', error);
          set({
            error: error.message || 'Failed to fetch documents',
            isLoading: false,
          });
        }
      },

      // Upload document
      uploadDocument: async (upload: DocumentUpload, onProgress?: (progress: number) => void) => {
        console.log('📤 DocumentsStore: Starting upload...', upload.name);
        set({ isUploading: true, uploadProgress: 0, error: null });
        
        try {
          const document = await DocumentService.uploadDocument(upload);
          console.log('✅ DocumentsStore: Upload successful!', document);
          
          // Add to documents list
          set((state) => ({
            documents: [document, ...state.documents],
            totalCount: state.totalCount + 1,
            isUploading: false,
            uploadProgress: 100,
          }));
          
          console.log('📋 DocumentsStore: Documents list updated, total:', get().documents.length);
          
          return document;
        } catch (error: any) {
          console.error('❌ DocumentsStore: Upload failed:', error);
          set({
            error: error.message || 'Upload failed',
            isUploading: false,
            uploadProgress: 0,
          });
          throw error;
        }
      },

      // Delete document
      deleteDocument: async (documentId: string) => {
        set({ isLoading: true, error: null });
        try {
          await DocumentService.deleteDocument(documentId);
          
          set((state) => ({
            documents: state.documents.filter(doc => doc.id !== documentId),
            selectedDocument: state.selectedDocument?.id === documentId ? null : state.selectedDocument,
            totalCount: Math.max(0, state.totalCount - 1),
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || 'Failed to delete document',
            isLoading: false,
          });
          throw error;
        }
      },

      // Select document
      selectDocument: (document: Document | null) => {
        set({ selectedDocument: document });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Refresh single document
      refreshDocument: async (documentId: string) => {
        try {
          const document = await DocumentService.getDocument(documentId);
          
          set((state) => ({
            documents: state.documents.map(doc => 
              doc.id === documentId ? document : doc
            ),
            selectedDocument: state.selectedDocument?.id === documentId ? document : state.selectedDocument,
          }));
        } catch (error: any) {
          set({
            error: error.message || 'Failed to refresh document',
          });
        }
      },

      // Reset store (call on logout)
      reset: () => {
        console.log('🔄 DocumentsStore: Resetting store');
        set({
          documents: [],
          selectedDocument: null,
          isLoading: false,
          isUploading: false,
          uploadProgress: 0,
          error: null,
          totalCount: 0,
          hasMore: false,
        });
      },
    }),
    { name: 'DocumentsStore' }
  )
);