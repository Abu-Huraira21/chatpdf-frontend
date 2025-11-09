/**
 * State Management Stores
 * 
 * Central export point for all Zustand stores.
 * Import stores from here to use in components.
 */

// Auth Store
export { useAuthStore } from './authStore';
export type { AuthState } from './authStore';

// Documents Store  
export { useDocumentsStore } from './documentsStore';
export type { DocumentsState } from './documentsStore';

// Chat Store
export { useChatStore } from './chatStore';
export type { ChatState } from './chatStore';

// App Store
export { useAppStore } from './appStore';
export type { AppState, AppSettings } from './appStore';

// Re-export service types for convenience
export type { User, LoginCredentials, RegisterData, ProfileUpdateData } from '../services/auth';
export type { Document, DocumentUpload } from '../services/documents';
export type { ChatSession, Message, ChatSessionCreate } from '../services/chat';