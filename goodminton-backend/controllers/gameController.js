/**
 * @file controllers/gameController.js
 * @description 比赛相关的业务逻辑控制器 (Controller for game-related business logic)
 */
const Game = require("../models/Game");
const User = require("../models/User");
const { updateRatings } = require("../services/ratingService");
const socketService = require("../services/socketService");

/**
 * 创建一场新的快速比赛
 * Create a new quick game
 */
exports.createGame = async (req, res) => {
  try {
    // 从请求体和认证信息中获取数据
    // Get data from request body and authentication info
    const { opponentId, scores, winnerId } = req.body;
    const createdBy = req.user.userId; // 从认证中间件获取当前用户ID (Get current user ID from auth middleware)

    // 基础数据验证
    // Basic data validation
    if (!opponentId || !scores || !winnerId) {
      return res.status(400).json({
        success: false,
        error: "Opponent, scores, and winner are required.",
      });
    }

    // 创建新的比赛实例
    // Create a new game instance
    const newGame = new Game({
      players: [createdBy, opponentId],
      scores,
      winner: winnerId,
      createdBy: createdBy,
      pendingConfirmationFrom: opponentId,
    });

    // 保存到数据库
    // Save to the database
    await newGame.save();

    // 发送实时通知给对手
    // Send real-time notification to opponent
    socketService.notifyUser(opponentId, "game:confirmation:received", {
      gameId: newGame._id,
      opponent: {
        _id: createdBy,
        profile: { displayName: "Opponent" }, // You might want to populate this
      },
      scores: scores,
      winner: winnerId,
      message: "Please confirm this game result",
    });

    res.status(201).json({
      success: true,
      message: "Game created. Waiting for opponent confirmation.",
      game: newGame,
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({ success: false, error: "Failed to create game." });
  }
};

/**
 * 确认一场比赛的结果
 * Confirm a game result
 */
exports.confirmGame = async (req, res) => {
  try {
    // 从请求参数和认证信息中获取数据
    // Get data from request parameters and authentication info
    const gameId = req.params.id;
    const userId = req.user.userId;

    // 查找比赛
    // Find the game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: "Game not found." });
    }

    // 检查当前用户是否有权限确认这场比赛
    // Check if the current user is authorized to confirm this game
    if (game.pendingConfirmationFrom.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to confirm this game.",
      });
    }

    // 检查比赛状态是否为“待确认”
    // Check if the game status is 'pending'
    if (game.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This game has already been resolved.",
      });
    }

    // --- 核心逻辑：更新积分 (Core Logic: Update Ratings) ---
    // 获取两位玩家的完整信息
    // Get full documents for both players
    const playerA = await User.findById(game.players[0]);
    const playerB = await User.findById(game.players[1]);

    const didPlayerAWin = game.winner.toString() === playerA._id.toString();

    // 调用积分服务计算新积分
    // Call the rating service to calculate new ratings
    const { newRatingA, newRatingB } = updateRatings(
      playerA.profile.points,
      playerB.profile.points,
      didPlayerAWin
    );

    const ratingChangeA = newRatingA - playerA.profile.points;
    const ratingChangeB = newRatingB - playerB.profile.points;

    // 更新玩家A的积分和统计数据
    // Update Player A's rating and stats
    playerA.profile.points = newRatingA;
    playerA.stats.gamesPlayed += 1;
    if (didPlayerAWin) playerA.stats.gamesWon += 1;
    await playerA.updateStats(); // 调用模型方法更新胜率 (Call model method to update win rate)

    // 更新玩家B的积分和统计数据
    // Update Player B's rating and stats
    playerB.profile.points = newRatingB;
    playerB.stats.gamesPlayed += 1;
    if (!didPlayerAWin) playerB.stats.gamesWon += 1;
    await playerB.updateStats(); // 调用模型方法更新胜率 (Call model method to update win rate)

    // 更新比赛状态和信息
    // Update the game status and information
    game.status = "confirmed";
    game.confirmedAt = new Date();
    game.ratingChange = {
      playerA: { user: playerA._id, change: ratingChangeA },
      playerB: { user: playerB._id, change: ratingChangeB },
    };
    await game.save();

    // 发送实时通知给创建者
    // Send real-time notification to game creator
    const creatorId = game.createdBy.toString();
    socketService.notifyUser(creatorId, "game:confirmed", {
      gameId: game._id,
      confirmedBy: {
        _id: userId,
        profile: { displayName: "Player" }, // You might want to populate this
      },
      ratingChanges: game.ratingChange,
      message: "Game result has been confirmed and ratings updated!",
    });

    res.status(200).json({
      success: true,
      message: "Game confirmed and ratings updated!",
      game,
    });
  } catch (error) {
    console.error("Confirm game error:", error);
    res.status(500).json({ success: false, error: "Failed to confirm game." });
  }
};

/**
 * Get pending game confirmations for the current user
 * Get all games waiting for confirmation from the current user
 */
exports.getPendingGameConfirmations = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const pendingGames = await Game.find({
      pendingConfirmationFrom: currentUserId,
      status: "pending",
    })
      .populate("players", "profile.displayName profile.avatar email")
      .populate("winner", "profile.displayName")
      .populate("createdBy", "profile.displayName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pendingGames: pendingGames.map((game) => ({
        _id: game._id,
        players: game.players,
        scores: game.scores,
        winner: game.winner,
        createdBy: game.createdBy,
        createdAt: game.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get pending game confirmations error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending game confirmations.",
    });
  }
};

/**
 * Calculate set wins from badminton scores
 * @param {Array} scores - 2D array of set scores [[21, 18], [15, 21]]
 * @param {Array} players - Array of player objects
 * @param {String} currentUserId - The current user's ID
 * @returns {Array} Array of set wins [playerSetWins, opponentSetWins]
 */
const calculateSetWins = (scores, players, currentUserId) => {
  const playerIndex = players.findIndex(
    (p) => p._id.toString() === currentUserId
  );
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  let playerSetWins = 0;
  let opponentSetWins = 0;

  scores.forEach((set) => {
    if (set[playerIndex] > set[opponentIndex]) {
      playerSetWins++;
    } else {
      opponentSetWins++;
    }
  });

  return playerIndex === 0
    ? [playerSetWins, opponentSetWins]
    : [opponentSetWins, playerSetWins];
};

/**
 * Get weekly games for the authenticated user (Sunday - Saturday)
 */
exports.getWeeklyGames = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const now = new Date();
    const dayOfWeek = now.getDay();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const games = await Game.find({
      players: currentUserId,
      status: "confirmed",
      confirmedAt: { $gte: weekStart, $lte: weekEnd },
    })
      .populate("players", "profile.displayName")
      .populate("winner", "_id")
      .sort({ confirmedAt: -1 });

    const formattedGames = games.map((game) => {
      const setWins = calculateSetWins(
        game.scores,
        game.players,
        currentUserId
      );

      const playerNames = game.players.map(
        (player) => player.profile.displayName || "Unknown Player"
      );

      const isWinner = game.winner._id.toString() === currentUserId;

      return {
        id: game._id.toString(),
        time: game.confirmedAt.toISOString(),
        players: playerNames,
        scores: setWins,
        result: isWinner ? "win" : "loss",
      };
    });

    res.status(200).json({
      success: true,
      games: formattedGames,
    });
  } catch (error) {
    console.error("Get weekly games error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch weekly games.",
    });
  }
};


/**
 * 拒绝一个待处理的比赛结果
 * Reject a pending game result
 */
exports.rejectGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const currentUserId = req.user.userId;

    // 查找比赛 (Find the game)
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ success: false, error: "Game not found." });
    }

    // 验证是否是等待该用户确认 (Verify if this user is the one pending confirmation)
    if (game.pendingConfirmationFrom.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to reject this game.",
      });
    }

    // 检查比赛状态是否是'pending' (Check if the game status is 'pending')
    if (game.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This game has already been responded to.",
      });
    }

    // 更新比赛状态为'rejected' (Update the game status to 'rejected')
    game.status = "rejected";
    await game.save();

    // 向创建者发送实时通知 (Send a real-time notification to the creator)
    const creatorId = game.players.find(p => p.toString() !== currentUserId);
    socketService.notifyUser(creatorId.toString(), "game:rejected", {
      gameId: game._id,
      rejectedBy: currentUserId,
    });

    res.status(200).json({
      success: true,
      message: "Game rejected successfully.",
      game,
    });
  } catch (error) {
    console.error("Reject game error:", error);
    res.status(500).json({ success: false, error: "Failed to reject game." });
  }
};