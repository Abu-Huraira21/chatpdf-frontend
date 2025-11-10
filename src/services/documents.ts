/**
 * Documents Service
 * 
 * Handles document upload, management, and processing operations.
 */

import { apiClient, API_CONFIG, ApiException } from './api';

// Utility: resolve relative URLs against the configured API base
const resolveFileUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }

  // Treat already-absolute URLs as-is
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

// Type definitions matching backend models
export interface Document {
  id: string;
  name: string;  // Changed from 'title' to match backend
  original_filename: string;
  file_url?: string;  // URL to access the PDF file
  file_size: number;
  file_size_formatted?: string;  // Backend provides formatted size
  pages: number;  // Changed from 'page_count' to match backend
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  processing_error?: string;
  processed_at?: string;
  is_processed: boolean;
  can_be_queried: boolean;
  vector_store_id?: string;
  chunk_count: number;
  upload_date: string;  // Mapped from created_at in backend
  created_at: string;
  updated_at: string;
}

export interface DocumentUpload {
  file: File;
  name?: string;  // Changed from 'title' to match backend
}

export interface DocumentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  page_number: number;
  chunk_index: number;
  word_count: number;
  char_count: number;
  metadata: Record<string, any>;
  created_at: string;
}

export class DocumentService {
  /**
   * Get list of user's documents
   */
  static async getDocuments(page: number = 1, pageSize: number = 20): Promise<DocumentListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    const response = await apiClient.get<DocumentListResponse>(
      `${API_CONFIG.ENDPOINTS.DOCUMENTS.LIST}?${params}`
    );

    return {
      ...response,
      results: response.results.map((doc) => ({
        ...doc,
        file_url: resolveFileUrl(doc.file_url),
      })),
    };
  }

  /**
   * Get document by ID
   */
  static async getDocument(id: string): Promise<Document> {
    const doc = await apiClient.get<Document>(API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(id));
    return {
      ...doc,
      file_url: resolveFileUrl(doc.file_url),
    };
  }

  /**
   * Upload new document
   */
  static async uploadDocument(data: DocumentUpload): Promise<Document> {
    try {
      const formData = new FormData();
      formData.append('file', data.file);
      
      if (data.name) {
        formData.append('name', data.name);
      }

      const response = await apiClient.upload<Document>(
        API_CONFIG.ENDPOINTS.DOCUMENTS.UPLOAD,
        formData
      );

      return {
        ...response,
        file_url: resolveFileUrl(response.file_url),
      };
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException('Failed to upload document. Please try again.');
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(id: string): Promise<void> {
    return apiClient.delete(API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE(id));
  }

  /**
   * Get document chunks for debugging/inspection
   */
  static async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return apiClient.get<DocumentChunk[]>(
      `${API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(documentId)}/chunks/`
    );
  }

  /**
   * Reprocess document (trigger re-chunking and embedding)
   */
  static async reprocessDocument(id: string): Promise<Document> {
    const doc = await apiClient.post<Document>(
      `${API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(id)}/reprocess/`
    );

    return {
      ...doc,
      file_url: resolveFileUrl(doc.file_url),
    };
  }

  /**
   * Check if document processing is complete
   */
  static async checkProcessingStatus(id: string): Promise<Document> {
    const doc = await apiClient.get<Document>(
      `${API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(id)}/status/`
    );

    return {
      ...doc,
      file_url: resolveFileUrl(doc.file_url),
    };
  }

  /**
   * Get document download URL
   */
  static getDocumentDownloadUrl(id: string): string {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCUMENTS.DETAIL(id)}/download/`;
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.includes('pdf')) {
      return {
        isValid: false,
        error: 'Only PDF files are supported',
      };
    }

    // Check file size (10MB limit matching backend)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be less than 10MB',
      };
    }

    return { isValid: true };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format upload date for display
   */
  static formatUploadDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get processing status display text
   */
  static getProcessingStatusText(status: Document['processing_status']): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if document is ready for chat
   */
  static isDocumentReady(document: Document): boolean {
    return document.processing_status === 'completed' && document.is_processed;
  }
}

export default DocumentService;