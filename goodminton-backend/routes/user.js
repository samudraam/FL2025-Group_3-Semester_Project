/**
 * @file routes/users.routes.js
 * @description 用户相关的API路由 (API routes for users)
 */
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

const avatarsDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "") || ".jpg";
    const safeExt = extension.startsWith(".") ? extension : `.jpg`;
    const ownerId = req.user?.userId || "guest";
    cb(null, `${ownerId}-${Date.now()}${safeExt}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Please upload a JPG, PNG, or WEBP image under 2MB."
        )
      );
    }
  },
});

const handleAvatarUpload = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (error) {
      console.error("Avatar upload error:", error);
      return res.status(400).json({
        success: false,
        error:
          error.message ||
          "Failed to upload avatar. Please ensure the image is under 2MB.",
      });
    }
    next();
  });
};

// --- 更新后的好友排行榜路由 ---
// --- Updated Friend Leaderboard Route ---

// @route   GET /api/users/leaderboard?discipline=singles&gender=male
// @desc    获取好友排行榜 (可按项目和性别筛选)
// (Get the friend leaderboard - can filter by discipline and gender)
// @access  Private
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

// get /api/users/favoriteCourts
router.get("/favoriteCourts", authenticateToken, userController.getFavorites);


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

// @route   PATCH /api/users/profile/avatar
// @desc    Update the authenticated user's profile avatar
router.patch(
  "/profile/avatar",
  authenticateToken,
  handleAvatarUpload,
  userController.updateProfileAvatar
);

module.exports = router;
