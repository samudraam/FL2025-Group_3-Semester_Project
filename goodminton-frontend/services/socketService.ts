import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

// console.log('🔗 Socket URL:', SOCKET_URL);

let socket: Socket | null = null;

/**
 * Initialize socket connection with authentication token
 * This establishes a WebSocket connection to the backend server
 * and authenticates the user using their JWT token
 */
export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    // console.log('Socket connected:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    // console.log('Socket disconnected:', reason);
  });

  // Debug: Log all incoming events
  // socket.onAny((eventName, ...args) => {
  //   console.log(`📥 Socket event received: ${eventName}`, args);
  // });

  return socket;
};

/**
 * Disconnect the socket connection
 * Called when user logs out or when we need to close the connection
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance
 * Returns null if socket is not initialized
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Emit an event to the server
 * This sends data from the client to the server
 */
export const emitEvent = (event: string, data?: any): void => {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected, cannot emit event:', event);
  }
};

/**
 * Listen to an event from the server
 * Returns a cleanup function to remove the listener
 */
export const onEvent = (event: string, callback: (data: any) => void): (() => void) => {
  if (socket) {
    socket.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }
  return () => {};
};

export default {
  initializeSocket,
  disconnectSocket,
  getSocket,
  emitEvent,
  onEvent,
};

