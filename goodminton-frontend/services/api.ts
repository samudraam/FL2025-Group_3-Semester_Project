import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Summary: This file contains the API functions for the app. It uses axios to make the API calls and AsyncStorage to store the authentication token. It also uses the apiHelpers file to handle the caching and retries.
/**
 * Global request queue to prevent rate limiting across all API calls
 */
class GlobalRequestQueue {
  private activeRequests = new Map<string, Promise<any>>();
  
  async queueRequest<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
    const key = url.split('?')[0]; // Remove query params for deduplication
    
    if (this.activeRequests.has(key)) {
      console.log(`Global queue: Request for ${key} already in progress, waiting...`);
      return this.activeRequests.get(key)!;
    }
    
    const requestPromise = requestFn().finally(() => {
      this.activeRequests.delete(key);
    });
    
    this.activeRequests.set(key, requestPromise);
    return requestPromise;
  }
}

const globalQueue = new GlobalRequestQueue();

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

// Response interceptor to handle auth errors and rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored token on unauthorized
      await clearStoredToken();
    } else if (error.response?.status === 429) {
      // Rate limit exceeded - log a friendly message
      console.warn('Rate limit exceeded. Please wait a moment before trying again.');
      // Optionally, you can add exponential backoff retry logic here
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

// Friend Requests API functions
export const friendRequestsAPI = {
  /**
   * Get pending friend requests
   */
  getPending: async () => {
    const response = await api.get('/users/friend-requests');
    return response.data;
  },

  /**
   * Send a friend request
   */
  send: async (emailOrPhone: string, message?: string) => {
    const response = await api.post('/users/friend-requests', {
      emailOrPhone,
      message,
    });
    return response.data;
  },

  /**
   * Accept a friend request
   */
  accept: async (requestId: string) => {
    const response = await api.post(`/users/friend-requests/${requestId}/accept`);
    return response.data;
  },

  /**
   * Reject a friend request
   */
  reject: async (requestId: string) => {
    const response = await api.post(`/users/friend-requests/${requestId}/reject`);
    return response.data;
  },
};

// Games API functions
export const gamesAPI = {
  /**
   * Submit game results to the backend
   */
  submitGame: async (
    gameData:
      | {
          gameType: 'singles';
          opponentId: string;
          scores: number[][];
          winnerId: string;
        }
      | {
          gameType: 'doubles';
          teammateId: string;
          opponent1Id: string;
          opponent2Id: string;
          scores: number[][];
          winnerTeam: 'teamA' | 'teamB';
        }
  ) => {
    const response = await api.post('/games', gameData);
    return response.data;
  },

  /**
   * Get pending game confirmations
   */
  getPending: async () => {
    const response = await api.get('/games/pending');
    return response.data;
  },

  /**
   * Confirm a game result
   */
  confirm: async (gameId: string) => {
    const response = await api.post(`/games/${gameId}/confirm`);
    return response.data;
  },

  /**
   * Get weekly games history
   */
  getWeeklyGames: async () => {
    const response = await api.get('/games/weekly');
    return response.data;
  },
};

// Users API functions
export const usersAPI = {
  /**
   * Get leaderboard data
   * @param discipline - The discipline to filter by (singles, doubles, or mixed)
   */
  getLeaderboard: async (discipline: 'singles' | 'doubles' | 'mixed' = 'singles') => {
    const response = await api.get('/users/leaderboard', {
      params: { discipline }
    });
    return response.data;
  },

  /**
   * Get user profile by ID
   */
  getUserProfile: async (userId: string) => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  /**
   * Send friend request to user by email or phone
   */
  sendFriendRequest: async (emailOrPhone: string, message?: string) => {
    const response = await api.post('/users/friend-requests', {
      emailOrPhone,
      message,
    });
    return response.data;
  },

  /**
   * Check friendship status with a user
   */
  checkFriendshipStatus: async (userId: string) => {
    const response = await api.get(`/users/${userId}/friendship-status`);
    return response.data;
  },

  /**
   * Search users by query (email or phone)
   */
  search: async (q: string) => {
    const response = await api.get('/users/search', { params: { q } });
    return response.data;
  },
};

// Posts API functions
export const postsAPI = {
  /**
   * Get all posts from the community feed
   */
  getAllPosts: async () => {
    const response = await api.get('/posts');
    return response.data;
  },

  /**
   * Create a new post
   */
  createPost: async (postData: {
    title: string;
    description: string;
    location?: string;
  }) => {
    const response = await api.post('/posts', postData);
    return response.data;
  },

  /**
   * Get a specific post by ID
   */
  getPostById: async (postId: string) => {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  },
};

export interface Conversation {
  _id: string;
  otherUser: {
    _id: string;
    displayName: string;
    avatar?: string;
    email: string;
  };
  lastMessage?: any;
  lastMessageAt: Date;
}

export interface Message {
  _id: string;
  sender: {
    _id: string;
    displayName: string;
    avatar?: string;
    email: string;
  };
  recipient: string;
  content: string;
  createdAt: string;
}

export const chatAPI = {
  /**
   * Get all conversations for the current user
   */
  getConversations: async (): Promise<{ success: boolean; conversations: Conversation[] }> => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  /**
   * Get message history with a specific user
   */
  getMessages: async (userId: string, page: number = 1, limit: number = 50): Promise<{ success: boolean; messages: Message[]; pagination: any }> => {
    const response = await api.get(`/chat/messages/${userId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Send a message to another user
   */
  sendMessage: async (recipientId: string, content: string): Promise<{ success: boolean; message: Message }> => {
    const response = await api.post('/chat/messages', {
      recipientId,
      content
    });
    return response.data;
  },
};

export default api;
