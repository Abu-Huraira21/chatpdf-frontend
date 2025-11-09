/**
 * User Settings API Service
 * 
 * Handles fetching and updating user preferences and AI settings.
 */

import { TokenManager } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface UserSettings {
  ai_model: string;
  temperature: number;
  context_length: number;
  auto_save: boolean;
  page_references: boolean;
  notifications: boolean;
  dark_mode: boolean;
  updated_at: string;
}

export interface UpdateSettingsPayload {
  ai_model?: string;
  temperature?: number;
  context_length?: number;
  auto_save?: boolean;
  page_references?: boolean;
  notifications?: boolean;
  dark_mode?: boolean;
}

/**
 * Fetch user settings from the backend
 */
export async function getUserSettings(): Promise<UserSettings> {
  const token = TokenManager.getAccessToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/auth/settings/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    throw new Error('Failed to fetch settings');
  }
  
  const settings = await response.json();
  
  // Store in localStorage for offline access
  localStorage.setItem('user_settings', JSON.stringify(settings));
  
  return settings;
}

/**
 * Update user settings on the backend
 */
export async function updateUserSettings(settings: UpdateSettingsPayload): Promise<UserSettings> {
  const token = TokenManager.getAccessToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/auth/settings/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    
    if (response.status === 400) {
      const errorData = await response.json();
      const errorMessages = Object.entries(errorData)
        .map(([field, messages]) => `${field}: ${messages}`)
        .join(', ');
      throw new Error(errorMessages);
    }
    
    throw new Error('Failed to update settings');
  }
  
  const updatedSettings = await response.json();
  
  // Update localStorage
  localStorage.setItem('user_settings', JSON.stringify(updatedSettings));
  
  return updatedSettings;
}

/**
 * Get cached settings from localStorage
 */
export function getCachedSettings(): UserSettings | null {
  try {
    const cached = localStorage.getItem('user_settings');
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error reading cached settings:', error);
    return null;
  }
}

/**
 * Get default settings (fallback when no settings are available)
 */
export function getDefaultSettings(): UserSettings {
  return {
    ai_model: 'standard',
    temperature: 0.7,
    context_length: 4000,
    auto_save: true,
    page_references: true,
    notifications: true,
    dark_mode: false,
    updated_at: new Date().toISOString()
  };
}

/**
 * Apply settings to the application
 */
export function applySettings(settings: UserSettings): void {
  // Apply dark mode
  if (settings.dark_mode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Store in localStorage
  localStorage.setItem('user_settings', JSON.stringify(settings));
}


