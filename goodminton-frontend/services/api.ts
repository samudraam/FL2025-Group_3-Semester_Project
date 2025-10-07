import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored token on unauthorized
      await clearStoredToken();
    }
    return Promise.reject(error);
  }
);

// Token management using AsyncStorage
const TOKEN_KEY = 'auth_token';

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
  }
};

export const clearStoredToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
};

// Auth API functions
export const authAPI = {
  /**
   * Register a new user account
   */
  register: async (userData: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phone: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  /**
   * Request OTP code for login
   */
  requestOTP: async (email: string) => {
    const response = await api.post('/auth/login/otp', { email });
    return response.data;
  },

  /**
   * Verify OTP code and login
   */
  verifyOTP: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify/otp', { email, otp });
    return response.data;
  },

  /**
   * Get current user information
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    await clearStoredToken();
    return response.data;
  },
};

export default api;
