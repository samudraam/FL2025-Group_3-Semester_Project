/**
 * @file routes/users.routes.js
 * @description 用户相关的API路由 (API routes for users)
 */
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

// 获取好友排行榜需要登录
// Getting the friend leaderboard requires authentication.
// @route   GET /api/users/leaderboard
// @desc    获取当前用户的好友排行榜 (Get the current user's friend leaderboard)
router.get(
  "/leaderboard",
  authenticateToken,
  userController.getFriendsLeaderboard
);

// 获取任何用户的公开资料是公开的，不需要登录
// Getting a user's public profile is a public action and does not require authentication.
// @route   GET /api/users/:id/profile
// @desc    获取指定用户的公开资料 (Get a specific user's public profile)
router.get("/:id/profile", userController.getUserProfile);

// --- Friend Request Routes (All require authentication) ---

// @route   POST /api/users/friend-requests
// @desc    发送好友请求 (Send a friend request by email or phone)
router.post(
  "/friend-requests",
  authenticateToken,
  userController.sendFriendRequest
);

// @route   GET /api/users/friend-requests
// @desc    获取待处理的好友请求 (Get pending friend requests)
router.get(
  "/friend-requests",
  authenticateToken,
  userController.getPendingFriendRequests
);

// @route   POST /api/users/friend-requests/:id/accept
// @desc    接受好友请求 (Accept a friend request)
router.post(
  "/friend-requests/:id/accept",
  authenticateToken,
  userController.acceptFriendRequest
);

// @route   POST /api/users/friend-requests/:id/reject
// @desc    拒绝好友请求 (Reject a friend request)
router.post(
  "/friend-requests/:id/reject",
  authenticateToken,
  userController.rejectFriendRequest
);

// --- Friend Management Routes (All require authentication) ---

// @route   GET /api/users/friends
// @desc    获取好友列表 (Get current user's friends list)
router.get("/friends", authenticateToken, userController.getFriends);

// @route   DELETE /api/users/friends/:id
// @desc    删除好友 (Remove a friend)
router.delete("/friends/:id", authenticateToken, userController.removeFriend);

// @route   GET /api/users/search
// @desc    搜索用户 (Search for users by email or display name)
router.get("/search", authenticateToken, userController.searchUsers);

// @route   GET /api/users/:userId/friendship-status
// @desc    检查当前用户与指定用户的好友状态 (Check friendship status with a specific user)
router.get(
  "/:userId/friendship-status",
  authenticateToken,
  userController.checkFriendshipStatus
);

module.exports = router;
