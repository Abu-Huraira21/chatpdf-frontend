/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Handles document search, retrieval, and AI model interactions.
 */

import { apiClient, API_CONFIG } from './api';

// Type definitions matching backend models
export interface DocumentChunk {
  text: string;
  page_number: number;
  similarity_score?: number;
  metadata?: any;
}

export interface SearchResult {
  chunks: DocumentChunk[];
  query: string;
  document_id: string;
  total_chunks: number;
  search_time_ms: number;
}

export interface QueryRequest {
  query: string;
  document_id: string;
  n_results?: number;
  similarity_threshold?: number;
  include_metadata?: boolean;
}

export interface ContextualQuery extends QueryRequest {
  ai_model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  answer: string;
  chunks_used: DocumentChunk[];
  ai_model_used: string;
  response_time_ms: number;
  token_count?: number;
  query_id?: string;
  context_quality_score?: number;
}

export interface QueryHistory {
  id: string;
  query: string;
  response: string;
  document_id: string;
  ai_model_used: string;
  response_time_ms: number;
  chunks_used_count: number;
  created_at: string;
}

export interface QueryHistoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: QueryHistory[];
}

export interface DocumentStats {
  total_chunks: number;
  total_queries: number;
  average_response_time: number;
  most_common_topics: string[];
  query_patterns: {
    topic: string;
    count: number;
    percentage: number;
  }[];
}

export interface AIModel {
  name: string;
  display_name: string;
  description: string;
  max_tokens: number;
  supports_streaming: boolean;
  cost_per_token?: number;
}

export interface SearchFilters {
  page_numbers?: number[];
  similarity_threshold?: number;
  max_chunks?: number;
  include_metadata?: boolean;
}

export class RAGService {
  /**
   * Search document chunks by query
   */
  static async searchDocument(request: QueryRequest): Promise<SearchResult> {
    return apiClient.post<SearchResult>(API_CONFIG.ENDPOINTS.RAG.SEARCH, request);
  }

  /**
   * Get AI response with document context
   */
  static async queryWithContext(request: ContextualQuery): Promise<AIResponse> {
    return apiClient.post<AIResponse>(API_CONFIG.ENDPOINTS.RAG.QUERY, request);
  }

  /**
   * Stream AI response with document context
   * Returns a ReadableStream for streaming responses
   * Note: Uses fetch instead of axios for streaming support
   */
  static async queryWithContextStream(request: ContextualQuery): Promise<ReadableStream> {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RAG.QUERY_STREAM}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiClient.getAccessToken()}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is not available');
    }

    return response.body;
  }

  /**
   * Get query history for a document
   */
  static async getQueryHistory(
    documentId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<QueryHistoryListResponse> {
    const params = new URLSearchParams({
      document_id: documentId,
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    return apiClient.get<QueryHistoryListResponse>(
      `${API_CONFIG.ENDPOINTS.RAG.QUERY_HISTORY}?${params}`
    );
  }

  /**
   * Get query by ID
   */
  static async getQuery(queryId: string): Promise<QueryHistory> {
    return apiClient.get<QueryHistory>(API_CONFIG.ENDPOINTS.RAG.QUERY_DETAIL(queryId));
  }

  /**
   * Delete query from history
   */
  static async deleteQuery(queryId: string): Promise<void> {
    return apiClient.delete(API_CONFIG.ENDPOINTS.RAG.QUERY_DETAIL(queryId));
  }

  /**
   * Get document analytics and statistics
   */
  static async getDocumentStats(documentId: string): Promise<DocumentStats> {
    return apiClient.get<DocumentStats>(
      API_CONFIG.ENDPOINTS.RAG.DOCUMENT_STATS(documentId)
    );
  }

  /**
   * Get available AI models
   */
  static async getAvailableModels(): Promise<AIModel[]> {
    return apiClient.get<AIModel[]>(API_CONFIG.ENDPOINTS.RAG.MODELS);
  }

  /**
   * Validate document processing status
   */
  static async validateDocumentProcessing(documentId: string): Promise<{
    is_processed: boolean;
    chunk_count: number;
    processing_status: string;
    error_message?: string;
  }> {
    return apiClient.get(API_CONFIG.ENDPOINTS.RAG.VALIDATE_DOCUMENT(documentId));
  }

  /**
   * Reprocess document chunks (admin/debug function)
   */
  static async reprocessDocument(documentId: string): Promise<{
    message: string;
    chunk_count: number;
    processing_time_ms: number;
  }> {
    return apiClient.post(API_CONFIG.ENDPOINTS.RAG.REPROCESS_DOCUMENT(documentId));
  }

  /**
   * Get document chunk details
   */
  static async getDocumentChunks(
    documentId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    count: number;
    next: string | null;
    previous: string | null;
    results: DocumentChunk[];
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.RAG.DOCUMENT_CHUNKS(documentId)}?${params}`
    );
  }

  /**
   * Advanced search with filters
   */
  static async advancedSearch(
    query: string,
    documentId: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const request: QueryRequest & SearchFilters = {
      query,
      document_id: documentId,
      n_results: filters.max_chunks || 5,
      similarity_threshold: filters.similarity_threshold || 0.1,
      include_metadata: filters.include_metadata || true,
      ...filters,
    };

    return this.searchDocument(request);
  }

  /**
   * Get search suggestions based on document content
   */
  static async getSearchSuggestions(documentId: string): Promise<string[]> {
    return apiClient.get<string[]>(
      API_CONFIG.ENDPOINTS.RAG.SEARCH_SUGGESTIONS(documentId)
    );
  }

  /**
   * Get similar queries from history
   */
  static async getSimilarQueries(
    query: string,
    documentId: string,
    limit: number = 5
  ): Promise<QueryHistory[]> {
    const params = new URLSearchParams({
      query,
      document_id: documentId,
      limit: limit.toString(),
    });

    return apiClient.get<QueryHistory[]>(
      `${API_CONFIG.ENDPOINTS.RAG.SIMILAR_QUERIES}?${params}`
    );
  }
}

/**
 * Streaming Response Parser
 * 
 * Utility class to parse streaming AI responses.
 */
export class StreamingResponseParser {
  private decoder = new TextDecoder();
  private buffer = '';

  /**
   * Parse streaming response chunks
   */
  async *parseStream(stream: ReadableStream): AsyncGenerator<{
    type: 'token' | 'complete' | 'error';
    data: any;
  }> {
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        const chunk = this.decoder.decode(value, { stream: true });
        this.buffer += chunk;

        // Process complete lines
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            // Parse Server-Sent Events format
            if (line.startsWith('data: ')) {
              const jsonData = line.slice(6); // Remove 'data: ' prefix
              
              if (jsonData === '[DONE]') {
                yield { type: 'complete', data: null };
                continue;
              }

              const parsed = JSON.parse(jsonData);
              yield { type: 'token', data: parsed };
            }
          } catch (error) {
            console.error('Failed to parse streaming chunk:', error);
            yield { type: 'error', data: { message: 'Parse error', error } };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Simple token extraction from streamed response
   */
  static extractToken(data: any): string {
    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      return data.token || data.content || data.text || '';
    }

    return '';
  }
}

/**
 * Document Context Manager
 * 
 * Manages document context and chunk relevance scoring.
 */
export class DocumentContextManager {
  private documentId: string;
  private cachedChunks: DocumentChunk[] = [];
  private lastQuery: string = '';

  constructor(documentId: string) {
    this.documentId = documentId;
  }

  /**
   * Get relevant context for a query
   */
  async getContext(
    query: string,
    maxChunks: number = 5,
    similarityThreshold: number = 0.1
  ): Promise<DocumentChunk[]> {
    // Use cached chunks if the query is similar to the last one
    if (this.isSimilarQuery(query) && this.cachedChunks.length > 0) {
      return this.cachedChunks.slice(0, maxChunks);
    }

    const result = await RAGService.searchDocument({
      query,
      document_id: this.documentId,
      n_results: maxChunks,
      similarity_threshold: similarityThreshold,
      include_metadata: true,
    });

    this.cachedChunks = result.chunks;
    this.lastQuery = query;

    return result.chunks;
  }

  /**
   * Get formatted context string for AI prompt
   */
  static formatContextForPrompt(chunks: DocumentChunk[]): string {
    return chunks
      .map((chunk, index) => {
        const pageInfo = chunk.page_number ? ` (Page ${chunk.page_number})` : '';
        return `[Context ${index + 1}]${pageInfo}: ${chunk.text}`;
      })
      .join('\n\n');
  }

  /**
   * Extract page references from chunks
   */
  static extractPageReferences(chunks: DocumentChunk[]): number[] {
    return [...new Set(chunks.map(chunk => chunk.page_number).filter(Boolean))].sort();
  }

  private isSimilarQuery(newQuery: string): boolean {
    if (!this.lastQuery) return false;

    const similarity = this.calculateSimilarity(
      this.lastQuery.toLowerCase(),
      newQuery.toLowerCase()
    );

    return similarity > 0.7;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export default RAGService;