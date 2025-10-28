/**
 * @file controllers/userController.js
 * @description 用户相关的业务逻辑控制器 (Controller for user-related business logic)
 */
const User = require("../models/User");
const Game = require("../models/Game");
const FriendRequest = require("../models/FriendRequest");
const socketService = require("../services/socketService");

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


/**
 * 获取好友排行榜 (可按项目筛选)
 * Get the friend leaderboard (can filter by discipline)
 */
exports.getFriendsLeaderboard = async (req, res) => {
  try {
    // 从查询参数获取要排名的项目，默认为单打 (Get discipline from query param, default to singles)
    const discipline = req.query.discipline || 'singles';
    const validDisciplines = ['singles', 'doubles', 'mixed'];

    if (!validDisciplines.includes(discipline)) {
        return res.status(400).json({ success: false, error: "Invalid discipline specified. Use 'singles', 'doubles', or 'mixed'." });
    }

    const ratingField = `ratings.${discipline}`; // 构建要查询和排序的字段路径 (Construct field path for query and sort)

    // 查找当前用户并填充好友的指定积分和昵称 (Find user and populate friends' specific rating and display name)
    const currentUser = await User.findById(req.user.userId)
      .populate(
        "friends",
        `profile.displayName ${ratingField} email gender` // 获取性别用于可能的进一步筛选 (Get gender for potential further filtering)
      );

    if (!currentUser) { /* ... User not found handling ... */ }

    // 将自己也加入排行榜 (Add self to leaderboard)
    const leaderboardData = [
      ...currentUser.friends,
      currentUser // 自身信息已包含所需积分 (currentUser already has the needed rating field)
    ];

    // 按指定项目的积分降序排序 (Sort by the specified discipline's rating descending)
    leaderboardData.sort((a, b) => (b.ratings?.[discipline] || 0) - (a.ratings?.[discipline] || 0));

    // 根据 discipline 进一步筛选排行榜 (例如，男单榜只显示男性)
    // Further filter leaderboard based on discipline (e.g., MS leaderboard only shows males)
    let filteredLeaderboard = leaderboardData;
    // 示例：男单/男双榜只留男性，女单/女双榜只留女性 (Example: MS/MD keep males, WS/WD keep females)
    if (discipline === 'singles' || discipline === 'doubles') {
        // 这里可以根据前端需求决定是否严格区分 MS/WS/MD/WD
        // 或简单地返回一个包含所有性别的单打/双打榜
        // For demo, let's return a combined list, frontend can filter if needed
        // filteredLeaderboard = leaderboardData.filter(p => p.gender === 'male'); // Example for MS
    }
     // 混双榜通常包含所有性别 (Mixed leaderboard usually includes all genders)

    res.status(200).json({
         success: true,
         discipline: discipline, // 告诉前端当前是什么榜单 (Tell frontend which leaderboard this is)
         leaderboard: filteredLeaderboard.map(p => ({ // 返回简化信息 (Return simplified info)
             _id: p._id,
             displayName: p.profile.displayName,
             rating: p.ratings?.[discipline] || 1000, // 返回对应积分 (Return the relevant rating)
             gender: p.gender
         }))
    });

  } catch (error) {
    console.error(`Get ${req.query.discipline || 'singles'} leaderboard error:`, error);
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

    // Add each user to the other's friends list
    await fromUser.addFriend(toUser._id);
    await toUser.addFriend(fromUser._id);

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

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters long.",
      });
    }

    // Get current user to check existing friends
    const currentUser = await User.findById(currentUserId);

    // Search for users by email or display name
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, 
        { publicProfile: { $ne: false } }, 
        {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { "profile.displayName": { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .select(
        "email profile.displayName profile.avatar profile.points stats.gamesPlayed"
      )
      .limit(10);

    // Add friend status to each user
    const usersWithFriendStatus = users.map((user) => ({
      _id: user._id,
      email: user.email,
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
 * 获取当前用户的好友排行榜
 * Get the current user's friend leaderboard
 */
exports.getFriendsLeaderboard = async (req, res) => {
  try {
    // 1. 从数据库中查找当前用户，并使用 .populate() 一次性加载他所有好友的必要信息
    // 1. Find the current user and populate necessary info for their friends
    const currentUser = await User.findById(req.user.userId).populate(
      "friends",
      "profile.displayName profile.points email" // 我们只需要好友的昵称、积分和邮箱
    );

    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, error: "Current user not found." });
    }

    // 2. 创建一个用于排序的排行榜数组，并将所有好友放进去
    // 2. Create a leaderboard array and add all friends to it
    const leaderboard = [...currentUser.friends];

    // 3. 将当前用户自己也加入排行榜，以便进行比较
    // 3. Add the current user to the leaderboard for comparison
    leaderboard.push(currentUser);

    // 4. 使用 sort() 方法，按照个人资料中的积分 (profile.points) 从高到低进行排序
    // 4. Sort the leaderboard by points in descending order
    leaderboard.sort((a, b) => b.profile.points - a.profile.points);

    // 5. 将排序后的排行榜作为成功响应返回
    // 5. Send the sorted leaderboard as a success response
    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch leaderboard." });
  }
};
