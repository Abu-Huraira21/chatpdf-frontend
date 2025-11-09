/**
 * Custom Hooks for State Management
 * 
 * Provides convenient hooks for using multiple stores together.
 */

import { useAuthStore, useDocumentsStore, useChatStore, useAppStore } from './index';

/**
 * Hook to check if the app is ready (initialized and authenticated)
 */
export const useAppReady = () => {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  
  return {
    isReady: isInitialized && !isLoading,
    isAuthenticated,
    needsAuth: isInitialized && !isAuthenticated && !isLoading,
  };
};

/**
 * Hook for document and chat integration
 */
export const useDocumentChat = () => {
  const selectedDocument = useDocumentsStore((state) => state.selectedDocument);
  const currentSession = useChatStore((state) => state.currentSession);
  const createSession = useChatStore((state) => state.createSession);
  
  const startChatForDocument = async (documentId: string) => {
    if (!selectedDocument || selectedDocument.id !== documentId) {
      // Need to select document first
      return null;
    }
    
    // Create new chat session for the document
    const session = await createSession({
      document: documentId,
      title: `Chat with ${selectedDocument.name}`,
    });
    
    return session;
  };
  
  return {
    selectedDocument,
    currentSession,
    canStartChat: !!selectedDocument,
    startChatForDocument,
  };
};

/**
 * Hook for global error handling across stores
 */
export const useGlobalError = () => {
  const authError = useAuthStore((state) => state.error);
  const documentsError = useDocumentsStore((state) => state.error);
  const chatError = useChatStore((state) => state.error);
  
  const clearAuthError = useAuthStore((state) => state.clearError);
  const clearDocumentsError = useDocumentsStore((state) => state.clearError);
  const clearChatError = useChatStore((state) => state.clearError);
  const addNotification = useAppStore((state) => state.addNotification);
  
  const handleError = (error: string, type: 'auth' | 'documents' | 'chat' = 'auth') => {
    addNotification({
      type: 'error',
      title: 'Error',
      message: error,
      duration: 5000,
    });
    
    // Clear the specific error
    switch (type) {
      case 'auth':
        clearAuthError();
        break;
      case 'documents':
        clearDocumentsError();
        break;
      case 'chat':
        clearChatError();
        break;
    }
  };
  
  return {
    errors: {
      auth: authError,
      documents: documentsError,
      chat: chatError,
    },
    hasErrors: !!(authError || documentsError || chatError),
    handleError,
    clearAllErrors: () => {
      clearAuthError();
      clearDocumentsError();
      clearChatError();
    },
  };
};