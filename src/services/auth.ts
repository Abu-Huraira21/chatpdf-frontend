/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and profile management.
 */

import { apiClient, API_CONFIG, TokenManager, ApiException } from './api';

// Type definitions matching backend models
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  avatar: string | null;
  avatar_url: string | null;
  join_date: string;
  is_email_verified: boolean;
  oauth_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  password_confirm: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  avatar?: File;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await apiClient.post<AuthTokens>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      
      // Validate response before setting tokens
      if (!response.access || !response.refresh || !response.user) {
        throw new ApiException('Invalid server response: missing required fields');
      }
      
      // Store tokens and user data only after successful validation
      TokenManager.setTokens(response.access, response.refresh, response.user);
      
      return response;
    } catch (error) {
      // Ensure no tokens are set on error
      TokenManager.clearTokens();
      
      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException('Login failed. Please try again.');
    }
  }

  /**
   * Register new user
   */
  static async register(data: RegisterData): Promise<AuthTokens> {
    try {
      const response = await apiClient.post<AuthTokens>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        data
      );
      
      // Store tokens and user data
      TokenManager.setTokens(response.access, response.refresh, response.user);
      
      return response;
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      throw new ApiException('Registration failed. Please try again.');
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();

    try {
      if (refreshToken) {
        await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
          refresh_token: refreshToken,
        });
      }
    } catch (error) {
      // Logout on client side even if server request fails
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear client-side tokens/settings
      TokenManager.clearTokens();
      localStorage.removeItem('user_settings');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    return apiClient.get<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: ProfileUpdateData): Promise<User> {
    if (data.avatar) {
      // Handle file upload
      const formData = new FormData();
      formData.append('avatar', data.avatar);
      if (data.first_name) formData.append('first_name', data.first_name);
      if (data.last_name) formData.append('last_name', data.last_name);
      
      return apiClient.upload<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE, formData);
    } else {
      return apiClient.patch<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE, data);
    }
  }

  /**
   * Change password
   */
  static async changePassword(data: PasswordChangeData): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.AUTH.PROFILE, data);
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.AUTH.PASSWORD_RESET, data);
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    return apiClient.post(API_CONFIG.ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, data);
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<AuthTokens> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new ApiException('No refresh token available');
    }

    const response = await apiClient.post<AuthTokens>(
      API_CONFIG.ENDPOINTS.AUTH.REFRESH,
      { refresh: refreshToken }
    );

    // Update stored tokens
    TokenManager.setTokens(response.access, response.refresh, response.user);
    
    return response;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return TokenManager.isAuthenticated();
  }

  /**
   * Get current user from storage
   */
  static getCurrentUser(): User | null {
    return TokenManager.getUser();
  }

  /**
   * OAuth login redirect (for Google/GitHub)
   */
  static getOAuthLoginUrl(provider: 'google' | 'github'): string {
    return `${API_CONFIG.BASE_URL}/accounts/${provider}/login/`;
  }

  /**
   * Get OAuth URL for authentication
   */
  static async getOAuthUrl(provider: 'google' | 'github'): Promise<string> {
    return this.getOAuthLoginUrl(provider);
  }
}

export default AuthService;