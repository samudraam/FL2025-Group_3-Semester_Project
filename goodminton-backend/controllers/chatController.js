/**
 * @file controllers/chatController.js
 * @description Controller for chat-related business logic
 */
const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const socketService = require("../services/socketService");

/**
 * Send a message to another user
 */
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.userId;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        error: "Recipient ID and content are required.",
      });
    }

    if (recipientId === senderId) {
      return res.status(400).json({
        success: false,
        error: "You cannot send a message to yourself.",
      });
    }

    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message content cannot be empty.",
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: "Recipient not found.",
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

    socketService.notifyUser(recipientId, "chat:message:received", {
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

    res.status(201).json({
      success: true,
      message: {
        _id: message._id,
        sender: message.sender,
        recipient: recipientId,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send message.",
    });
  }
};

/**
 * Get all conversations for the current user
 */
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate("participants", "profile.displayName profile.avatar email")
      .populate("lastMessage", "content createdAt sender")
      .sort({ lastMessageAt: -1 });

    const conversationsWithDetails = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== currentUserId
      );

      return {
        _id: conv._id,
        otherUser: {
          _id: otherUser._id,
          displayName: otherUser.profile.displayName,
          avatar: otherUser.profile.avatar,
          email: otherUser.email,
        },
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
      };
    });

    res.status(200).json({
      success: true,
      conversations: conversationsWithDetails,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch conversations.",
    });
  }
};

/**
 * Get message history with a specific user
 */
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required.",
      });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "profile.displayName profile.avatar email");

    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId },
      ],
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        hasMore: page * limit < totalMessages,
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages.",
    });
  }
};
