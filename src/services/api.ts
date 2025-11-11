/**
 * API Configuration and Base Client
 * 
 * Centralized API configuration for the ChatPDF application.
 * Handles authentication, request/response intercepting, and error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';


console.log(import.meta.env.VITE_API_BASE_URL);
console.log(import.meta.env.VITE_WS_BASE_URL);
// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

console.log('API_BASE_URL', API_BASE_URL);
console.log('API_WS_BASE_URL', API_WS_BASE_URL);

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  WS_BASE_URL: API_WS_BASE_URL,
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/auth/login/',
      REGISTER: '/api/auth/register/',
      REFRESH: '/api/auth/refresh/',
      PROFILE: '/api/auth/profile/',
      LOGOUT: '/api/auth/logout/',
      PASSWORD_RESET: '/api/auth/password-reset/',
      PASSWORD_RESET_CONFIRM: '/api/auth/password-reset-confirm/',
    },
    // Documents
    DOCUMENTS: {
      LIST: '/api/documents/',
      UPLOAD: '/api/documents/',
      DELETE: (id: string) => `/api/documents/${id}/`,
      DETAIL: (id: string) => `/api/documents/${id}/`,
    },
    // Chat
    CHAT: {
      SESSIONS: '/api/chats/sessions/',
      MESSAGES: '/api/chats/messages/',
      STATS: '/api/chats/stats/',
      SESSION_DETAIL: (id: string) => `/api/chats/sessions/${id}/`,
      SESSION_MESSAGES: (id: string) => `/api/chats/sessions/${id}/messages/`,
      SESSION_CLEAR: (id: string) => `/api/chats/sessions/${id}/clear/`,
      WEBSOCKET_INFO: (id: string) => `/api/chats/sessions/${id}/websocket_info/`,
    },
    // RAG
    RAG: {
      SEARCH: '/api/rag/search/',
      QUERY: '/api/rag/query/',
      QUERY_STREAM: '/api/rag/query-stream/',
      SIMPLE_QUERY: '/api/rag/simple-query/',
      MODELS: '/api/rag/models/',
      QUERIES: '/api/rag/queries/',
      QUERY_HISTORY: '/api/rag/queries/',
      QUERY_DETAIL: (id: string) => `/api/rag/queries/${id}/`,
      DOCUMENT_STATS: (id: string) => `/api/rag/documents/${id}/stats/`,
      VALIDATE_DOCUMENT: (id: string) => `/api/rag/documents/${id}/validate/`,
      REPROCESS_DOCUMENT: (id: string) => `/api/rag/documents/${id}/reprocess/`,
      DOCUMENT_CHUNKS: (id: string) => `/api/rag/documents/${id}/chunks/`,
      SEARCH_SUGGESTIONS: (id: string) => `/api/rag/documents/${id}/suggestions/`,
      SIMILAR_QUERIES: '/api/rag/similar-queries/',
      FEEDBACK: '/api/rag/feedback/',
      VECTOR_CACHE: '/api/rag/vector-cache/',
    },
  },
};

// Token Management
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'chatpdf_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'chatpdf_refresh_token';
  private static readonly USER_KEY = 'chatpdf_user';
  private static readonly AUTH_STORE_KEY = 'auth-store';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static getUser(): any | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setTokens(accessToken: string, refreshToken: string, user?: any): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.AUTH_STORE_KEY);
  }

  static isAuthenticated(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken());
  }
}

// API Error Types
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class ApiException extends Error {
  status?: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.errors = errors;
  }
}

// Base API Client
export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use((config) => {
      const accessToken = TokenManager.getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      const base = this.axiosInstance.defaults.baseURL || '';
      if (base.includes('ngrok-free.app')) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
      }
      return config;
    });

    // Response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const refreshed = await this.refreshToken();
          if (refreshed) {
            const newAccessToken = TokenManager.getAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.axiosInstance(originalRequest);
          } else {
            TokenManager.clearTokens();
            throw new ApiException('Authentication failed', 401);
          }
        }
        
        return this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any;
      const message = data?.message || data?.detail || `HTTP ${error.response.status}`;
      const errors = data?.errors || data;
      throw new ApiException(message, error.response.status, errors);
    } else if (error.request) {
      // Network error
      throw new ApiException('Network error: No response received');
    } else {
      // Request setup error
      throw new ApiException(`Request error: ${error.message}`);
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      console.log('🔒 No refresh token available');
      return false;
    }

    try {
      console.log('🔄 Attempting to refresh access token...');
      const response = await axios.post(`${this.axiosInstance.defaults.baseURL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`, {
        refresh: refreshToken
      });

      const data = response.data;
      // Store new access token (and new refresh token if provided)
      const newRefreshToken = data.refresh || refreshToken; // Use new refresh if provided, else keep old
      TokenManager.setTokens(data.access, newRefreshToken, data.user);
      console.log('✅ Token refresh successful');
      return true;
    } catch (error: any) {
      console.log('❌ Token refresh failed:', error.response?.status || error.message);
      return false;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.get<T>(endpoint);
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put<T>(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.patch<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.axiosInstance.delete<T>(endpoint);
    return response.data;
  }

  getAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Default API client instance
export const apiClient = new ApiClient();