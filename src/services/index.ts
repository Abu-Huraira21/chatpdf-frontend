/**
 * Services Index
 * 
 * Central export point for all API services.
 */

// Core API client
export { apiClient, TokenManager, ApiException, API_CONFIG, API_BASE_URL } from './api';

// Authentication service
export { AuthService } from './auth';
export type { User, AuthTokens, LoginCredentials, RegisterData, PasswordResetRequest, PasswordResetConfirm } from './auth';

// Document service
export { DocumentService } from './documents';
export type { 
  Document, 
  DocumentUpload, 
  DocumentListResponse, 
  DocumentChunk as DocumentChunkModel 
} from './documents';

// Chat service
export { ChatService, WebSocketChatClient } from './chat';
export type { 
  ChatSession, 
  Message, 
  ChatSessionCreate, 
  ChatListResponse, 
  MessageListResponse, 
  ChatStats,
  WSMessage,
  WSChatMessage,
  WSTokenMessage,
  WSResponseCompleteMessage,
  WSErrorMessage,
  WebSocketInfo
} from './chat';

// Settings service
export * from './settings';

// RAG service
export { RAGService, StreamingResponseParser, DocumentContextManager } from './rag';
export type { 
  DocumentChunk as RAGDocumentChunk,
  SearchResult,
  QueryRequest,
  ContextualQuery,
  AIResponse,
  QueryHistory,
  QueryHistoryListResponse,
  DocumentStats as RAGDocumentStats,
  AIModel,
  SearchFilters
} from './rag';

// Utilities
export {
  FileValidator,
  DateUtils,
  TextUtils,
  StorageUtils,
  ErrorUtils,
  RetryUtils,
  DebounceUtils,
  WebSocketManager,
  PerformanceUtils,
  APP_CONSTANTS,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE
} from './utils';