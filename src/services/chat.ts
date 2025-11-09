/**
 * Chat Service
 * 
 * Handles chat sessions, messages, and real-time WebSocket communication.
 */

import { apiClient, API_CONFIG, TokenManager, ApiException } from './api';

// Type definitions matching backend models
export interface ChatSession {
  id: string;
  document: string; // Document ID
  title: string;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  page_references: number[];
  ai_model_used: string;
  response_time_ms: number | null;
  token_count: number | null;
  context_documents: any[];
  created_at: string;
}

export interface ChatSessionCreate {
  document_id: string;
  title?: string;
  ai_model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatSession[];
}

export interface MessageListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Message[];
}

export interface ChatStats {
  total_chats: number;
  total_messages: number;
  user_messages: number;
  ai_messages: number;
  today_chats: number;
  today_messages: number;
  average_messages_per_chat: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface WSChatMessage extends WSMessage {
  type: 'chat_message';
  message: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface WSTokenMessage extends WSMessage {
  type: 'token';
  message_id: string;
  token: string;
  timestamp: string;
}

export interface WSResponseCompleteMessage extends WSMessage {
  type: 'response_complete';
  message_id: string;
  content: string;
  chunks: any[];
  timestamp: string;
}

export interface WSErrorMessage extends WSMessage {
  type: 'error';
  message: string;
  timestamp: string;
}

export interface WebSocketInfo {
  websocket_url: string;
  chat_id: string;
  document_id: string;
  connection_guide: {
    url: string;
    query_params: {
      token: string;
    };
    message_format: {
      type: string;
      message: string;
      model: string;
      temperature: number;
      max_tokens: number;
    };
  };
}

export class ChatService {
  /**
   * Get list of chat sessions
   */
  static async getChatSessions(page: number = 1, pageSize: number = 20): Promise<ChatListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    return apiClient.get<ChatListResponse>(
      `${API_CONFIG.ENDPOINTS.CHAT.SESSIONS}?${params}`
    );
  }

  /**
   * Create new chat session
   */
  static async createChatSession(data: ChatSessionCreate): Promise<ChatSession> {
    return apiClient.post<ChatSession>(API_CONFIG.ENDPOINTS.CHAT.SESSIONS, data);
  }

  /**
   * Get chat session by ID
   */
  static async getChatSession(id: string): Promise<ChatSession> {
    return apiClient.get<ChatSession>(API_CONFIG.ENDPOINTS.CHAT.SESSION_DETAIL(id));
  }

  /**
   * Delete chat session
   */
  static async deleteChatSession(id: string): Promise<void> {
    return apiClient.delete(API_CONFIG.ENDPOINTS.CHAT.SESSION_DETAIL(id));
  }

  /**
   * Get messages for a chat session
   */
  static async getChatMessages(
    chatId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<MessageListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    return apiClient.get<MessageListResponse>(
      `${API_CONFIG.ENDPOINTS.CHAT.SESSION_MESSAGES(chatId)}?${params}`
    );
  }

  /**
   * Clear all messages from chat session
   */
  static async clearChatSession(id: string): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.CHAT.SESSION_CLEAR(id));
  }

  /**
   * Get chat statistics
   */
  static async getChatStats(): Promise<ChatStats> {
    return apiClient.get<ChatStats>(API_CONFIG.ENDPOINTS.CHAT.STATS);
  }

  /**
   * Get WebSocket connection info for chat
   */
  static async getWebSocketInfo(chatId: string): Promise<WebSocketInfo> {
    return apiClient.get<WebSocketInfo>(API_CONFIG.ENDPOINTS.CHAT.WEBSOCKET_INFO(chatId));
  }
}

/**
 * WebSocket Chat Client
 * 
 * Handles real-time communication with the chat WebSocket.
 */
export class WebSocketChatClient {
  private ws: WebSocket | null = null;
  private chatId: string;
  private documentId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isIntentionallyClosed = false;

  // Event handlers
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: Event) => void;
  public onToken?: (data: WSTokenMessage) => void;
  public onResponseComplete?: (data: WSResponseCompleteMessage) => void;
  public onMessage?: (data: WSMessage) => void;
  public onChatError?: (data: WSErrorMessage) => void;

  constructor(chatId: string, documentId: string) {
    this.chatId = chatId;
    this.documentId = documentId;
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    const accessToken = TokenManager.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${API_CONFIG.WS_BASE_URL}/ws/chat/${this.chatId}/document/${this.documentId}/?token=${accessToken}`;
        console.log('Connecting to WebSocket URL:', wsUrl);
        console.log('Chat ID:', this.chatId, 'Document ID:', this.documentId);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WSMessage = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          console.log('Close event details:', event);
          this.onDisconnect?.();

          // Attempt to reconnect if not intentionally closed
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              this.connect();
            }, this.reconnectInterval * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket error details:', {
            readyState: this.ws?.readyState,
            url: wsUrl,
            chatId: this.chatId,
            documentId: this.documentId
          });
          this.onError?.(error);
          reject(new Error('WebSocket connection failed'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send chat message
   */
  sendMessage(
    message: string,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const data: WSChatMessage = {
      type: 'chat_message',
      message,
      model: options.model || 'standard',
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2048,
    };

    this.ws.send(JSON.stringify(data));
  }

  /**
   * Update model settings
   */
  updateSettings(settings: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const data: WSMessage = {
      type: 'settings_update',
      ...settings,
    };

    this.ws.send(JSON.stringify(data));
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WSMessage): void {
    switch (data.type) {
      case 'connection':
        console.log('WebSocket connection confirmed');
        break;

      case 'message_saved':
        console.log('Message saved:', data);
        break;

      case 'response_start':
        console.log('AI response started:', data);
        break;

      case 'token':
        this.onToken?.(data as WSTokenMessage);
        break;

      case 'chunks_retrieved':
        console.log('Document chunks retrieved:', data);
        break;

      case 'response_complete':
        this.onResponseComplete?.(data as WSResponseCompleteMessage);
        break;

      case 'settings_updated':
        console.log('Settings updated:', data);
        break;

      case 'error':
        this.onChatError?.(data as WSErrorMessage);
        break;

      default:
        console.log('Unknown message type:', data);
        this.onMessage?.(data);
    }
  }
}

export default ChatService;