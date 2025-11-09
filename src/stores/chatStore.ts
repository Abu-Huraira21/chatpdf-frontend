/**
 * Chat State Store
 * 
 * Manages chat sessions, messages, and WebSocket connections.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatService, ChatSession, Message, ChatSessionCreate, ChatListResponse } from '../services/chat';

export interface ChatState {
  // State
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (data: ChatSessionCreate) => Promise<ChatSession>;
  selectSession: (session: ChatSession | null) => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  setConnectionStatus: (status: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sessions: [],
      currentSession: null,
      messages: [],
      isLoading: false,
      isSending: false,
      isConnected: false,
      error: null,

      // Fetch all chat sessions
      fetchSessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const response: ChatListResponse = await ChatService.getChatSessions();
          set({ 
            sessions: response.results, 
            isLoading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch chat sessions',
            isLoading: false,
          });
        }
      },

      // Create new chat session
      createSession: async (data: ChatSessionCreate) => {
        set({ isLoading: true, error: null });
        try {
          const session = await ChatService.createChatSession(data);
          set((state) => ({
            sessions: [session, ...state.sessions],
            currentSession: session,
            messages: [],
            isLoading: false,
          }));
          return session;
        } catch (error: any) {
          set({
            error: error.message || 'Failed to create chat session',
            isLoading: false,
          });
          throw error;
        }
      },

      // Select and load session messages
      selectSession: async (session: ChatSession | null) => {
        set({ currentSession: session, messages: [], isLoading: !!session });
        
        if (session) {
          try {
            await get().fetchMessages(session.id);
          } catch (error) {
            // Error already handled in fetchMessages
          }
        }
      },

      // Fetch messages for current session
      fetchMessages: async (sessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const messages = await ChatService.getChatMessages(sessionId);
          set({ 
            messages: messages.results, 
            isLoading: false 
          });
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch messages',
            isLoading: false,
          });
        }
      },

      // Send message (to be used with WebSocket)
      sendMessage: async (content: string) => {
        const { currentSession } = get();
        if (!currentSession) {
          set({ error: 'No active session' });
          return;
        }

        set({ isSending: true, error: null });
        
        // Add user message immediately to UI
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          page_references: [],
          ai_model_used: currentSession.ai_model,
          response_time_ms: null,
          token_count: null,
          context_documents: [],
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
        }));

        // This will be handled by WebSocket integration in components
        // For now, just mark as not sending - WebSocket will handle the actual message
        set({ isSending: false });
      },

      // Clear messages
      clearMessages: () => {
        set({ messages: [] });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Delete session
      deleteSession: async (sessionId: string) => {
        set({ isLoading: true, error: null });
        try {
          await ChatService.deleteChatSession(sessionId);
          
          set((state) => ({
            sessions: state.sessions.filter(session => session.id !== sessionId),
            currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
            messages: state.currentSession?.id === sessionId ? [] : state.messages,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || 'Failed to delete session',
            isLoading: false,
          });
          throw error;
        }
      },

      // Set WebSocket connection status
      setConnectionStatus: (status: boolean) => {
        set({ isConnected: status });
      },
    }),
    { name: 'ChatStore' }
  )
);