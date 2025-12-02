/**
 * @file controllers/userController.js
 * @description 用户相关的业务逻辑控制器 (Controller for user-related business logic)
 */
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Game = require("../models/Game");
const FriendRequest = require("../models/FriendRequest");
const socketService = require("../services/socketService");
const userService = require("../services/userService");
const cloudinary = require("../utils/cloudinary");
const uploadBufferToCloudinary = require("../utils/cloudinaryUpload");

const uploadsRoot = path.join(__dirname, "..", "uploads");
const CLOUDINARY_AVATAR_FOLDER = "goodminton/avatars";

/**
 * Attempt to delete a legacy avatar that was stored on disk. (DELETE THIS?)
 * @param {string} avatarUrl
 * @returns {void}
 */
const deleteLegacyAvatarFromDisk = (avatarUrl) => {
  const uploadsSegment = "/uploads/";

  if (!avatarUrl || !avatarUrl.includes(uploadsSegment)) {
    return;
  }

  const relativePath = avatarUrl.split(uploadsSegment)[1];

  if (!relativePath) {
    return;
  }

  const absolutePath = path.join(uploadsRoot, relativePath);

  fs.promises
    .unlink(absolutePath)
    .catch((error) =>
      console.warn("Failed to delete previous disk avatar:", error.message)
    );
};

/**
 * 获取指定用户的公开资料
 * Get a specific user's public profile
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    // 查找用户，但不返回敏感信息或不必要的数据
    // Find the user, excluding sensitive or unnecessary data
    const userProfile = await User.findById(userId).select(
      "-__v -friends -preferences"
    );

    if (!userProfile) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // 查找该用户最近的5场已确认比赛
    // Find the 5 most recent confirmed games for this user
    const recentGames = await Game.find({
      players: userId,
      status: "confirmed",
    })
      .sort({ confirmedAt: -1 }) // 按确认时间降序排序 (Sort by confirmation date descending)
      .limit(5)
      .populate("players", "profile.displayName") // 填充玩家的昵称 (Populate players' display names)
      .populate("winner", "profile.displayName"); // 填充胜者的昵称 (Populate winner's display name)

    res.status(200).json({
      success: true,
      user: userProfile,
      recentGames,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch user profile." });
  }
};

exports.getFriendsLeaderboard = async (req, res) => {
  try {
    // --- 1. 获取和验证查询参数 ---
    // --- 1. Get and validate query parameters ---

    // 从查询参数获取要排名的项目和性别
    // Get discipline and gender from query params
    const { discipline = "singles", gender = "male" } = req.query;

    // 定义有效值 (Define valid values)
    const validDisciplines = ["singles", "doubles", "mixed"];
    const validGenders = ["male", "female"];

    // 验证参数 (Validate parameters)
    if (
      !validDisciplines.includes(discipline) ||
      !validGenders.includes(gender)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid discipline or gender. Use 'singles', 'doubles', 'mixed' for discipline and 'male', 'female' for gender.",
      });
    }

    // 构建要查询和排序的字段路径
    // Construct field path for query and sort
    const ratingField = `ratings.${discipline}`; // e.g., "ratings.singles"

    // --- 2. 获取数据 ---
    // --- 2. Fetch Data ---

    // 查找当前用户并填充好友的必要信息
    // Find user and populate friends' necessary info
    const currentUser = await User.findById(req.user.userId).populate(
      "friends",
      `profile.displayName profile.avatar ${ratingField} email gender` // 必须同时获取 gender 和头像
    );

    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, error: "Current user not found." });
    }

    // --- 3. 处理数据 ---
    // --- 3. Process Data ---

    // 将自己也加入排行榜
    // Add self to the list
    const fullList = [
      ...currentUser.friends,
      currentUser, // 自身信息已包含所需积分 (currentUser already has the needed rating field)
    ];

    // 4. *** 关键改动：按性别筛选 ***
    // 4. *** KEY CHANGE: Filter by gender ***
    const filteredLeaderboard = fullList.filter(
      (user) => user.gender === gender
    );

    // 5. 按指定项目的积分降序排序
    // 5. Sort by the specified discipline's rating descending
    filteredLeaderboard.sort(
      (a, b) =>
        (b.ratings?.[discipline] || 1000) - (a.ratings?.[discipline] || 1000)
    );

    // --- 4. 返回响应 ---
    // --- 4. Send Response ---
    res.status(200).json({
      success: true,
      discipline: discipline, // 告诉前端当前是什么榜单
      gender: gender, // 告诉前端当前是什么性别
      leaderboard: filteredLeaderboard.map((p) => ({
        // 返回简化信息
        _id: p._id,
        displayName: p.profile.displayName,
        rating: p.ratings?.[discipline] || 1000, // 返回对应积分
        gender: p.gender,
        avatar: p.profile?.avatar || null,
      })),
    });
  } catch (error) {
    console.error(`Get ${gender} ${discipline} leaderboard error:`, error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch leaderboard." });
  }
};

/**
 * Send a friend request to another user
 * Send a friend request by email or phone number
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const { emailOrPhone, message } = req.body;
    const currentUserId = req.user.userId;

    if (!emailOrPhone) {
      return res
        .status(400)
        .json({ success: false, error: "Email or phone number is required." });
    }

    // Find the target user by email or phone
    let targetUser;
    if (emailOrPhone.includes("@")) {
      // Search by email
      targetUser = await User.findOne({ email: emailOrPhone.toLowerCase() });
    } else {
      // Search by phone number
      targetUser = await User.findOne({ phone: emailOrPhone });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "User not found with that email or phone number.",
      });
    }

    // Check if trying to send request to themselves
    if (targetUser._id.toString() === currentUserId) {
      return res.status(400).json({
        success: false,
        error: "You cannot send a friend request to yourself.",
      });
    }

    // Get current user to check if they're already friends
    const currentUser = await User.findById(currentUserId);
    if (currentUser.isFriend(targetUser._id)) {
      return res.status(400).json({
        success: false,
        error: "You are already friends with this user.",
      });
    }

    // Check if there's already a pending request (in either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: currentUserId, to: targetUser._id },
        { from: targetUser._id, to: currentUserId },
      ],
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error:
          "There is already a pending friend request between you and this user.",
      });
    }

    // Create the friend request
    const friendRequest = new FriendRequest({
      from: currentUserId,
      to: targetUser._id,
      message: message || "",
    });

    await friendRequest.save();

    // Populate the request with user details
    await friendRequest.populate(
      "from to",
      "profile.displayName profile.avatar email"
    );

    // Send real-time notification to the recipient
    socketService.notifyUser(
      targetUser._id.toString(),
      "friend:request:received",
      {
        requestId: friendRequest._id,
        from: {
          _id: friendRequest.from._id,
          profile: friendRequest.from.profile,
          email: friendRequest.from.email,
        },
        message: friendRequest.message,
        createdAt: friendRequest.createdAt,
      }
    );

    res.status(201).json({
      success: true,
      message: "Friend request sent successfully.",
      friendRequest: {
        _id: friendRequest._id,
        from: friendRequest.from,
        to: friendRequest.to,
        message: friendRequest.message,
        status: friendRequest.status,
        createdAt: friendRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to send friend request." });
  }
};

/**
 * Get pending friend requests for the current user
 * Get all pending friend requests received by the current user
 */
exports.getPendingFriendRequests = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const pendingRequests = await FriendRequest.find({
      to: currentUserId,
      status: "pending",
    })
      .populate("from", "profile.displayName profile.avatar email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pendingRequests: pendingRequests.map((request) => ({
        _id: request._id,
        from: request.from,
        message: request.message,
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get pending friend requests error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending friend requests.",
    });
  }
};

/**
 * Accept a friend request
 * Accept a friend request and add both users to each other's friends list
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const currentUserId = req.user.userId;

    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId).populate(
      "from to",
      "profile.displayName"
    );

    if (!friendRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Friend request not found." });
    }

    // Check if the current user is the recipient of this request
    if (friendRequest.to._id.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to accept this friend request.",
      });
    }

    // Check if the request is still pending
    if (friendRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This friend request has already been responded to.",
      });
    }

    // Get both users
    const fromUser = await User.findById(friendRequest.from._id);
    const toUser = await User.findById(friendRequest.to._id);

    console.log(
      `👥 Adding friends: ${fromUser.profile.displayName} ↔️ ${toUser.profile.displayName}`
    );
    console.log(`Before - fromUser friends:`, fromUser.friends.length);
    console.log(`Before - toUser friends:`, toUser.friends.length);

    // Add each user to the other's friends list
    await fromUser.addFriend(toUser._id);
    await toUser.addFriend(fromUser._id);

    // Reload users to verify friends were added
    const updatedFromUser = await User.findById(fromUser._id);
    const updatedToUser = await User.findById(toUser._id);
    console.log(`After - fromUser friends:`, updatedFromUser.friends.length);
    console.log(`After - toUser friends:`, updatedToUser.friends.length);

    // Update the friend request status
    friendRequest.status = "accepted";
    friendRequest.respondedAt = new Date();
    await friendRequest.save();

    // Send real-time notification to the sender
    socketService.notifyUser(
      fromUser._id.toString(),
      "friend:request:accepted",
      {
        requestId: friendRequest._id,
        acceptedBy: {
          _id: toUser._id,
          profile: toUser.profile,
          email: toUser.email,
        },
        message: `You are now friends with ${
          toUser.profile.displayName || toUser.email
        }!`,
      }
    );

    res.status(200).json({
      success: true,
      message: `You are now friends with ${
        fromUser.profile.displayName || fromUser.email
      }!`,
      friendRequest: {
        _id: friendRequest._id,
        from: friendRequest.from,
        to: friendRequest.to,
        status: friendRequest.status,
        respondedAt: friendRequest.respondedAt,
      },
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to accept friend request." });
  }
};

/**
 * Reject a friend request
 * Reject a friend request without adding to friends list
 */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const currentUserId = req.user.userId;

    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId).populate(
      "from",
      "profile.displayName"
    );

    if (!friendRequest) {
      return res
        .status(404)
        .json({ success: false, error: "Friend request not found." });
    }

    // Check if the current user is the recipient of this request
    if (friendRequest.to.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to reject this friend request.",
      });
    }

    // Check if the request is still pending
    if (friendRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This friend request has already been responded to.",
      });
    }

    // Update the friend request status
    friendRequest.status = "rejected";
    friendRequest.respondedAt = new Date();
    await friendRequest.save();

    res.status(200).json({
      success: true,
      message: "Friend request rejected.",
      friendRequest: {
        _id: friendRequest._id,
        from: friendRequest.from,
        status: friendRequest.status,
        respondedAt: friendRequest.respondedAt,
      },
    });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to reject friend request." });
  }
};

/**
 * Get the current user's friends list
 * Get all friends of the current user
 */
exports.getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId).populate(
      "friends",
      "profile.displayName profile.avatar profile.points stats.gamesPlayed stats.winRate email"
    );

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.status(200).json({
      success: true,
      friends: user.friends.map((friend) => ({
        _id: friend._id,
        email: friend.email,
        profile: friend.profile,
        stats: friend.stats,
      })),
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch friends list." });
  }
};

/**
 * Remove a friend from the current user's friends list
 * Remove a friend (does not remove from the other user's list)
 */
exports.removeFriend = async (req, res) => {
  try {
    const friendId = req.params.id;
    const currentUserId = req.user.userId;

    // Get current user
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Check if they are actually friends
    if (!currentUser.isFriend(friendId)) {
      return res.status(400).json({
        success: false,
        error: "This user is not in your friends list.",
      });
    }

    // Remove the friend
    await currentUser.removeFriend(friendId);

    res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ success: false, error: "Failed to remove friend." });
  }
};

/**
 * Search for users by email or display name
 * Search for users to potentially add as friends
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.userId;
    const trimmedQuery = q?.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters long.",
      });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, error: "Current user not found." });
    }

    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const queryRegex = new RegExp(escapedQuery, "i");

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        { publicProfile: { $ne: false } },
        {
          $or: [
            { email: queryRegex },
            { phone: queryRegex },
            { "profile.displayName": queryRegex },
            { "profile.firstName": queryRegex },
            { "profile.lastName": queryRegex },
          ],
        },
      ],
    })
      .select(
        "email phone profile.displayName profile.firstName profile.lastName profile.avatar stats.gamesPlayed"
      )
      .limit(25);

    const usersWithFriendStatus = users.map((user) => ({
      _id: user._id,
      email: user.email,
      phone: user.phone,
      profile: user.profile,
      stats: user.stats,
      isFriend: currentUser.isFriend(user._id),
    }));

    res.status(200).json({
      success: true,
      users: usersWithFriendStatus,
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ success: false, error: "Failed to search users." });
  }
};

/**
 * Check friendship status between the current user and another user
 */
exports.checkFriendshipStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required.",
      });
    }

    const targetUser = await User.findById(targetUserId).select(
      "_id profile.displayName"
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: "Current user not found.",
      });
    }

    const isFriends = currentUser.isFriend(targetUserId);

    let pendingRequest = null;
    if (!isFriends) {
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { from: currentUserId, to: targetUserId },
          { from: targetUserId, to: currentUserId },
        ],
        status: "pending",
      }).populate("from to", "profile.displayName");

      if (existingRequest) {
        pendingRequest = {
          _id: existingRequest._id,
          sentByCurrentUser:
            existingRequest.from._id.toString() === currentUserId,
          from: existingRequest.from,
          to: existingRequest.to,
          createdAt: existingRequest.createdAt,
        };
      }
    }

    res.status(200).json({
      success: true,
      isFriends,
      pendingRequest,
      user: {
        _id: targetUser._id,
        displayName: targetUser.profile.displayName,
      },
    });
  } catch (error) {
    console.error("Check friendship status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check friendship status.",
    });
  }
};

/**
 * Update the current user's profile avatar
 */
exports.updateProfileAvatar = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: "Avatar image is required.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    let uploadResult;

    try {
      const ownerId = (req.user?.userId || user._id || "guest").toString();

      uploadResult = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        folder: CLOUDINARY_AVATAR_FOLDER,
        publicId: `user-${ownerId}-${Date.now()}`,
        options: {
          transformation: [
            { width: 512, height: 512, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
      });
    } catch (uploadError) {
      console.error("Cloudinary avatar upload error:", uploadError);
      return res.status(500).json({
        success: false,
        error: "Failed to upload avatar. Please try again in a moment.",
      });
    }

    const previousAvatarPublicId = user.profile?.avatarPublicId;
    const previousAvatar = user.profile?.avatar;

    if (previousAvatarPublicId) {
      cloudinary.uploader
        .destroy(previousAvatarPublicId)
        .catch((destroyError) =>
          console.warn(
            "Failed to delete previous Cloudinary avatar:",
            destroyError.message
          )
        );
    } else if (previousAvatar) {
      deleteLegacyAvatarFromDisk(previousAvatar);
    }

    user.profile.avatar = uploadResult.secure_url;
    user.profile.avatarPublicId = uploadResult.public_id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully.",
      avatarUrl: uploadResult.secure_url,
      user: {
        _id: user._id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Update profile avatar error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile avatar.",
    });
  }
};

// returns the whole court infomation that the user has favorited
exports.getFavorites = async (req, res) => {
    try {
        const courts = await userService.getFavoriteCourts(req.user.userId);
        console.log(req.user);
        res.status(200).json({ courts });
    } catch (err) {
        res.status(500).json({ message: "Failed to get favorite courts" });
    }
};


