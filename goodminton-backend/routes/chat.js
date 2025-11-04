/**
 * @file routes/chat.js
 * @description API routes for chat functionality
 */
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticateToken } = require("../middleware/auth");

// All chat routes require authentication
router.post("/messages", authenticateToken, chatController.sendMessage);
router.get(
  "/conversations",
  authenticateToken,
  chatController.getConversations
);
router.get("/messages/:userId", authenticateToken, chatController.getMessages);

module.exports = router;
