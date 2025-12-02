import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, getStoredToken, setStoredToken, clearStoredToken } from './api';
import { initializeSocket, disconnectSocket } from './socketService';

interface User {
  id: string;
  email: string;
  profile: {
    displayName: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    level: string;
    points: number;
  };
  ratings?: {
    singles: number;
    doubles: number;
    mixed: number;
  };
  stats?: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
  };
  isNewUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; token?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  /**
   * Request OTP code
   */
  const requestOTP = async (email: string): Promise<void> => {
    await authAPI.requestOTP(email);
  };

  /**
   * Verify OTP and login user
   */
  const verifyOTP = async (email: string, otp: string): Promise<{ success: boolean; token?: string; user?: User }> => {
    const response = await authAPI.verifyOTP(email, otp);
    if (response.success && response.token) {
      await setStoredToken(response.token);
      setUser(response.user);
      // Initialize socket connection with the new token
      initializeSocket(response.token);
    }
    return response;
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Disconnect socket before clearing token
      disconnectSocket();
      setUser(null);
      await clearStoredToken();
    }
  };

  /**
   * Refresh current user data
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      await logout();
    }
  };

  /**
   * Check if user is already logged in on app start
   */
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = await getStoredToken();
      if (token) {
        try {
          await refreshUser();
          // Initialize socket if user is already authenticated
          initializeSocket(token);
        } catch (error) {
          console.error('Auth check failed:', error);
          await clearStoredToken();
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    requestOTP,
    verifyOTP,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
