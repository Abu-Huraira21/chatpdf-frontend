/**
 * App State Store
 * 
 * Manages global application state, settings, and UI preferences.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  language: string;
  autoSave: boolean;
}

export interface AppState {
  // State
  isInitialized: boolean;
  isOnline: boolean;
  settings: AppSettings;
  notifications: Notification[];
  
  // Actions
  initialize: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setOnlineStatus: (status: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  createdAt: Date;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isInitialized: false,
        isOnline: navigator.onLine,
        settings: {
          theme: 'system',
          sidebarCollapsed: false,
          language: 'en',
          autoSave: true,
        },
        notifications: [],

        // Initialize app
        initialize: async () => {
          set({ isInitialized: false });
          
          try {
            // Setup online/offline listeners
            const handleOnline = () => get().setOnlineStatus(true);
            const handleOffline = () => get().setOnlineStatus(false);
            
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            
            set({ isInitialized: true });
          } catch (error) {
            console.error('App initialization failed:', error);
            set({ isInitialized: true }); // Still mark as initialized to prevent loops
          }
        },

        // Update settings
        updateSettings: (newSettings: Partial<AppSettings>) => {
          set((state) => ({
            settings: {
              ...state.settings,
              ...newSettings,
            },
          }));
        },

        // Set online status
        setOnlineStatus: (status: boolean) => {
          const { isOnline } = get();
          if (isOnline !== status) {
            set({ isOnline: status });
            
            // Add notification for status change
            get().addNotification({
              type: status ? 'success' : 'warning',
              title: status ? 'Back Online' : 'Connection Lost',
              message: status 
                ? 'Your connection has been restored' 
                : 'You are currently offline. Some features may not work.',
              duration: 3000,
            });
          }
        },

        // Add notification
        addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => {
          const id = `notification-${Date.now()}-${Math.random()}`;
          const newNotification: Notification = {
            id,
            createdAt: new Date(),
            duration: 5000, // Default 5 seconds
            ...notification,
          };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove after duration
          if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, newNotification.duration);
          }
        },

        // Remove notification
        removeNotification: (id: string) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id),
          }));
        },

        // Clear all notifications
        clearNotifications: () => {
          set({ notifications: [] });
        },
      }),
      {
        name: 'app-store',
        partialize: (state) => ({ 
          settings: state.settings,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);