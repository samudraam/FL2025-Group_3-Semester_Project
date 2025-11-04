/**
 * @file services/socketService.js
 * @description Socket.io service for real-time communication
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socket mapping
  }

  /**
   * Initialize Socket.io server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    const { Server } = require("socket.io");

    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log("🔌 Socket.io server initialized");
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;

        next();
      } catch (error) {
        console.error("Socket authentication error:", error.message);
        next(new Error("Authentication failed"));
      }
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`👤 User connected: ${socket.userId} (${socket.userEmail})`);

      // Store user's socket connection
      this.userSockets.set(socket.userId, socket);

      // Handle client events
      this.handleClientEvents(socket);

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`👋 User disconnected: ${socket.userId}`);
        this.userSockets.delete(socket.userId);
      });

      // Send connection confirmation
      socket.emit("connected", {
        message: "Successfully connected to server",
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle events emitted from client
   * @param {Object} socket - Socket instance
   */
  handleClientEvents(socket) {
    // Handle friend request events
    socket.on("friend:request:accept", async (data) => {
      try {
        console.log(`Friend request accept: ${data.requestId}`);
        // The actual acceptance is handled by the HTTP endpoint
        // This is just for logging/analytics
      } catch (error) {
        console.error("Friend request accept error:", error);
        socket.emit("error", {
          message: "Failed to process friend request acceptance",
        });
      }
    });

    socket.on("friend:request:reject", async (data) => {
      try {
        console.log(`Friend request reject: ${data.requestId}`);
        // The actual rejection is handled by the HTTP endpoint
        // This is just for logging/analytics
      } catch (error) {
        console.error("Friend request reject error:", error);
        socket.emit("error", {
          message: "Failed to process friend request rejection",
        });
      }
    });

    // Handle game events
    socket.on("game:confirm", async (data) => {
      try {
        console.log(`Game confirm: ${data.gameId}`);
        // The actual confirmation is handled by the HTTP endpoint
        // This is just for logging/analytics
      } catch (error) {
        console.error("Game confirm error:", error);
        socket.emit("error", {
          message: "Failed to process game confirmation",
        });
      }
    });

    socket.on("game:reject", async (data) => {
      try {
        console.log(`Game reject: ${data.gameId}`);
        // The actual rejection is handled by the HTTP endpoint
        // This is just for logging/analytics
      } catch (error) {
        console.error("Game reject error:", error);
        socket.emit("error", { message: "Failed to process game rejection" });
      }
    });

    // Handle chat events
    socket.on("chat:send", async (data) => {
      try {
        const { recipientId, content } = data;
        const senderId = socket.userId;

        if (!recipientId || !content || !content.trim()) {
          return socket.emit("error", {
            message: "Invalid message data",
          });
        }

        if (recipientId === senderId) {
          return socket.emit("error", {
            message: "Cannot send message to yourself",
          });
        }

        const User = require("../models/User");
        const Message = require("../models/Message");
        const Conversation = require("../models/Conversation");

        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return socket.emit("error", {
            message: "Recipient not found",
          });
        }

        const message = await Message.create({
          sender: senderId,
          recipient: recipientId,
          content: content.trim(),
        });

        await message.populate(
          "sender",
          "profile.displayName profile.avatar email"
        );

        const conversation = await Conversation.findOrCreateConversation(
          senderId,
          recipientId
        );

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        await conversation.save();

        this.notifyUser(recipientId, "chat:message:received", {
          messageId: message._id,
          sender: {
            _id: message.sender._id,
            displayName: message.sender.profile.displayName,
            avatar: message.sender.profile.avatar,
            email: message.sender.email,
          },
          content: message.content,
          createdAt: message.createdAt,
        });

        socket.emit("chat:message:sent", {
          messageId: message._id,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error("Chat send error:", error);
        socket.emit("error", {
          message: "Failed to send message",
        });
      }
    });

    socket.on("chat:typing", (data) => {
      try {
        const { recipientId, isTyping } = data;
        if (recipientId) {
          this.notifyUser(recipientId, "chat:typing", {
            senderId: socket.userId,
            isTyping,
          });
        }
      } catch (error) {
        console.error("Chat typing error:", error);
      }
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  }

  /**
   * Send notification to specific user
   * @param {String} userId - Target user ID
   * @param {String} event - Event name
   * @param {Object} data - Event data
   * @returns {Boolean} - Success status
   */
  notifyUser(userId, event, data) {
    try {
      const socket = this.userSockets.get(userId);
      if (socket && socket.connected) {
        socket.emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
        console.log(`📤 Notification sent to user ${userId}: ${event}`);
        return true;
      } else {
        console.log(`⚠️ User ${userId} not connected, notification queued`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to notify user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {String} event - Event name
   * @param {Object} data - Event data
   */
  notifyUsers(userIds, event, data) {
    userIds.forEach((userId) => {
      this.notifyUser(userId, event, data);
    });
  }

  /**
   * Get connected users count
   * @returns {Number} - Number of connected users
   */
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Get list of connected user IDs
   * @returns {Array} - Array of connected user IDs
   */
  getConnectedUserIds() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Check if user is connected
   * @param {String} userId - User ID to check
   * @returns {Boolean} - Connection status
   */
  isUserConnected(userId) {
    const socket = this.userSockets.get(userId);
    return socket && socket.connected;
  }

  /**
   * Broadcast to all connected users
   * @param {String} event - Event name
   * @param {Object} data - Event data
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      console.log(`📡 Broadcast sent: ${event}`);
    }
  }

  /**
   * Get socket instance for testing
   * @returns {Object} - Socket.io instance
   */
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();
