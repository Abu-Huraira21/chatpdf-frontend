/**
 * Authentication State Store
 * 
 * Manages user authentication state, login, logout, and profile data.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AuthService, User, LoginCredentials, RegisterData, ProfileUpdateData } from '../services/auth';
import { TokenManager } from '../services/api';
import { useDocumentsStore } from './documentsStore'; // Import for resetting on logout

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Login action
        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });
          try {
            const response = await AuthService.login(credentials);
            
            // Save user settings if included in login response
            if (response.settings) {
              localStorage.setItem('user_settings', JSON.stringify(response.settings));
            }
            
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false,
              error: null
            });
          } catch (error: any) {
            // Import ErrorUtils for proper error handling
            const { ErrorUtils } = await import('../services');
            const errorMessage = ErrorUtils.getErrorMessage(error);
            
            set({ 
              error: errorMessage, 
              isLoading: false,
              isAuthenticated: false,
              user: null
            });
            throw error;
          }
        },

        // Register action
        register: async (data: RegisterData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await AuthService.register(data);
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } catch (error: any) {
            set({ 
              error: error.message || 'Registration failed', 
              isLoading: false 
            });
            throw error;
          }
        },

        // Logout action
        logout: async () => {
          try {
            await AuthService.logout();
          } catch (error) {
            console.warn('Client logout encountered an error:', error);
          }

          // Reset auth state
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });

          // Reset documents store
          useDocumentsStore.getState().reset();
          console.log('🚪 Logout complete - all stores reset');
        },

        // Check authentication status
        checkAuth: async () => {
          set({ isLoading: true });
          try {
            // Check if we have tokens
            const hasTokens = TokenManager.isAuthenticated();
            
            if (!hasTokens) {
              // No tokens at all - definitely not authenticated
              set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false 
              });
              return;
            }
            
            // We have tokens - try to fetch user profile
            // The API client will automatically refresh the token if it's expired
            try {
              const user = await AuthService.getProfile();
              set({ 
                user, 
                isAuthenticated: true, 
                isLoading: false 
              });
            } catch (profileError: any) {
              // Profile fetch failed - check if it's a 401 (auth failed)
              if (profileError.status === 401) {
                // Token refresh also failed - truly unauthenticated
                console.log('🔒 Authentication expired - tokens invalid');
                TokenManager.clearTokens();
                set({ 
                  user: null, 
                  isAuthenticated: false, 
                  isLoading: false
                });
              } else {
                // Other error (network, etc) - don't log out
                // Keep user logged in and retry later
                console.warn('⚠️ Profile fetch failed, but keeping user logged in:', profileError.message);
                const cachedUser = TokenManager.getUser();
                set({ 
                  user: cachedUser, 
                  isAuthenticated: !!cachedUser, 
                  isLoading: false,
                  error: 'Could not verify authentication. Please check your connection.'
                });
              }
            }
          } catch (error: any) {
            // Unexpected error
            console.error('❌ Unexpected error in checkAuth:', error);
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false,
              error: error.message || 'Authentication check failed'
            });
          }
        },

        // Clear error
        clearError: () => {
          set({ error: null });
        },

        // Update profile
        updateProfile: async (data: ProfileUpdateData) => {
          set({ isLoading: true, error: null });
          try {
            const updatedUser = await AuthService.updateProfile(data);
            set({ 
              user: updatedUser, 
              isLoading: false 
            });
          } catch (error: any) {
            set({ 
              error: error.message || 'Profile update failed', 
              isLoading: false 
            });
            throw error;
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({ 
          user: state.user, 
          isAuthenticated: state.isAuthenticated 
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);