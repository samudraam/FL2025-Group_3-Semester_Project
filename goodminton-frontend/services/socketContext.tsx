import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { initializeSocket, disconnectSocket, getSocket, onEvent } from './socketService';
import { getStoredToken } from './api';
import { useAuth } from './authContext';

/**
 * Notification types that can be displayed to the user
 */
export type NotificationType = 'friend_request' | 'friend_accepted' | 'friend_rejected' | 'game_confirmation' | 'game_confirmed';

/**
 * Structure of a notification object
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

interface SocketContextType {
  isConnected: boolean;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  emitEvent: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * SocketProvider manages the WebSocket connection and notification state
 * It automatically connects when the user is authenticated and disconnects on logout
 * This provider should wrap the app to make socket functionality available everywhere
 */
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * Add a new notification to the list
   */
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  /**
   * Remove a notification by ID
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Emit an event to the server
   */
  const emitEvent = useCallback((event: string, data?: any) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  /**
   * Initialize socket connection when user is authenticated
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      // Get the token from storage and initialize socket
      const initSocket = async () => {
        try {
          const token = await getStoredToken();
          
          if (token) {
            const socket = initializeSocket(token);
            
            socket.on('connect', () => {
              setIsConnected(true);
            });

            socket.on('disconnect', () => {
              setIsConnected(false);
            });

            // Listen for friend request received
            socket.on('friend:request:received', (data: any) => {
              addNotification({
                id: Date.now().toString(),
                type: 'friend_request',
                title: 'New Friend Request',
                message: `${data.from?.displayName || 'Someone'} sent you a friend request`,
                data,
                timestamp: new Date(),
              });
            });

            // Listen for friend request accepted
            socket.on('friend:request:accepted', (data: any) => {
              addNotification({
                id: Date.now().toString(),
                type: 'friend_accepted',
                title: 'Friend Request Accepted',
                message: `${data.acceptedBy?.displayName || 'Someone'} accepted your friend request`,
                data,
                timestamp: new Date(),
              });
            });

            // Listen for friend request rejected
            socket.on('friend:request:rejected', (data: any) => {
              addNotification({
                id: Date.now().toString(),
                type: 'friend_rejected',
                title: 'Friend Request Rejected',
                message: `${data.rejectedBy?.displayName || 'Someone'} rejected your friend request`,
                data,
                timestamp: new Date(),
              });
            });

            // Listen for game confirmation received
            socket.on('game:confirmation:received', (data: any) => {
              addNotification({
                id: Date.now().toString(),
                type: 'game_confirmation',
                title: 'Game Confirmation Needed',
                message: `${data.submittedBy?.displayName || 'Someone'} submitted a game result`,
                data,
                timestamp: new Date(),
              });
            });

            // Listen for game confirmed
            socket.on('game:confirmed', (data: any) => {
              addNotification({
                id: Date.now().toString(),
                type: 'game_confirmed',
                title: 'Game Confirmed',
                message: `${data.confirmedBy?.displayName || 'Someone'} confirmed your game`,
                data,
                timestamp: new Date(),
              });
            });

            // Listen for connection confirmation from server
            socket.on('connected', (data: any) => {
              // console.log('✅ Server connection confirmed:', data);
            });
          }
        } catch (error) {
          console.error('Failed to initialize socket:', error);
        }
      };

      initSocket();
    }

    // Cleanup on unmount or when user logs out
    return () => {
      if (!isAuthenticated) {
        disconnectSocket();
        setIsConnected(false);
        clearNotifications();
      }
    };
  }, [isAuthenticated, user, addNotification, clearNotifications]);

  const value: SocketContextType = {
    isConnected,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    emitEvent,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to access socket context
 */
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

