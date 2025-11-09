/**
 * Utilities Service
 * 
 * Common utilities, helpers, and WebSocket management.
 */

// File type validation
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// File validation utilities
export class FileValidator {
  static validateFileType(file: File): boolean {
    const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES);
    return supportedTypes.includes(file.type);
  }

  static validateFileSize(file: File): boolean {
    return file.size <= MAX_FILE_SIZE;
  }

  static getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  static isValidFile(file: File): { valid: boolean; error?: string } {
    if (!this.validateFileType(file)) {
      return {
        valid: false,
        error: `Unsupported file type. Supported types: ${Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')}`
      };
    }

    if (!this.validateFileSize(file)) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
      };
    }

    return { valid: true };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Date and time utilities
export class DateUtils {
  static formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  }

  static formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(dateString);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  }

  static isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
}

// Text processing utilities
export class TextUtils {
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static highlightText(text: string, query: string): string {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  static extractKeywords(text: string, limit: number = 5): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word);
  }

  static sanitizeInput(input: string): string {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
  }
}

// Local storage utilities
export class StorageUtils {
  static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
}

// Error handling utilities
export class ErrorUtils {
  static getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    
    // Handle Django REST Framework error format
    if (error?.errors?.non_field_errors?.length > 0) {
      return error.errors.non_field_errors[0];
    }
    
    // Handle other error formats
    if (error?.message) return error.message;
    if (error?.detail) return error.detail;
    
    return 'An unexpected error occurred';
  }

  static isNetworkError(error: any): boolean {
    return error?.name === 'NetworkError' || 
           error?.message?.includes('fetch') ||
           error?.message?.includes('network');
  }

  static getErrorType(error: any): 'network' | 'auth' | 'validation' | 'server' | 'unknown' {
    if (this.isNetworkError(error)) return 'network';
    if (error?.status === 401 || error?.status === 403) return 'auth';
    if (error?.status >= 400 && error?.status < 500) return 'validation';
    if (error?.status >= 500) return 'server';
    return 'unknown';
  }
}

// Retry utility
export class RetryUtils {
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }
}

// Debounce utility
export class DebounceUtils {
  private static timeouts = new Map<string, number>();

  static debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimeout = this.timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        fn(...args);
        this.timeouts.delete(key);
      }, delay);

      this.timeouts.set(key, timeout);
    };
  }
}

// WebSocket connection manager
export class WebSocketManager {
  private static connections = new Map<string, WebSocket>();

  static create(
    key: string,
    url: string,
    options: {
      onOpen?: (event: Event) => void;
      onMessage?: (event: MessageEvent) => void;
      onClose?: (event: CloseEvent) => void;
      onError?: (event: Event) => void;
    } = {}
  ): WebSocket {
    // Close existing connection if any
    this.close(key);

    const ws = new WebSocket(url);
    
    ws.onopen = (event) => {
      console.log(`WebSocket ${key} connected`);
      options.onOpen?.(event);
    };

    ws.onmessage = (event) => {
      options.onMessage?.(event);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket ${key} disconnected:`, event.code, event.reason);
      this.connections.delete(key);
      options.onClose?.(event);
    };

    ws.onerror = (event) => {
      console.error(`WebSocket ${key} error:`, event);
      options.onError?.(event);
    };

    this.connections.set(key, ws);
    return ws;
  }

  static get(key: string): WebSocket | undefined {
    return this.connections.get(key);
  }

  static close(key: string): void {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }

  static closeAll(): void {
    for (const [key, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
  }

  static isConnected(key: string): boolean {
    const ws = this.connections.get(key);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
}

// Performance monitoring
export class PerformanceUtils {
  private static timers = new Map<string, number>();

  static startTimer(key: string): void {
    this.timers.set(key, performance.now());
  }

  static endTimer(key: string): number | null {
    const start = this.timers.get(key);
    if (start === undefined) return null;

    const duration = performance.now() - start;
    this.timers.delete(key);
    return duration;
  }

  static measure<T>(key: string, fn: () => T | Promise<T>): T | Promise<T> {
    this.startTimer(key);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = this.endTimer(key);
          if (duration !== null) {
            console.log(`${key} took ${duration.toFixed(2)}ms`);
          }
        });
      } else {
        const duration = this.endTimer(key);
        if (duration !== null) {
          console.log(`${key} took ${duration.toFixed(2)}ms`);
        }
        return result;
      }
    } catch (error) {
      this.endTimer(key);
      throw error;
    }
  }
}

// Constants for the application
export const APP_CONSTANTS = {
  MAX_CHAT_HISTORY: 50,
  MAX_MESSAGE_LENGTH: 4000,
  WEBSOCKET_RECONNECT_DELAY: 3000,
  API_REQUEST_TIMEOUT: 30000,
  UPLOAD_CHUNK_SIZE: 1024 * 1024, // 1MB
  AUTO_SAVE_DELAY: 2000,
} as const;

export default {
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
};