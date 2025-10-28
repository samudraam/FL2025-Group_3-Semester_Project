/**
 * @file controllers/gameController.js
 * @description 比赛相关的业务逻辑控制器, 支持单双打 (Controller for game-related business logic, supports singles and doubles)
 */
const Game = require("../models/Game");
const User = require("../models/User");
const ratingService = require("../services/ratingService");
const socketService = require("../services/socketService");

/**
 * 创建一场新的快速比赛 (单打或双打)
 * Create a new quick game (singles or doubles)
 */
exports.createGame = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const {
      gameType,    // 'singles' or 'doubles'
      scores,      // e.g., [[21, 19], [21, 18]]
      // --- 单打需要 --- (Needed for singles)
      opponentId,
      winnerId, // 单打时的胜者ID (Winner ID in singles)
      // --- 双打需要 --- (Needed for doubles)
      teammateId,  // 创建者的队友 (Creator's teammate)
      opponent1Id,
      opponent2Id,
      winnerTeam, // 'teamA' or 'teamB'
    } = req.body;

    let teamA = [creatorId];
    let teamB = [];
    let pendingConfirmationFrom = [];
    let gameWinnerTeam = winnerTeam; // Use winnerTeam directly for doubles

    // --- 数据验证与队伍组建 --- (Data validation and team formation) ---
    if (!gameType || !scores) {
        return res.status(400).json({ success: false, error: "Game type and scores are required." });
    }

    if (gameType === "singles") {
      if (!opponentId || !winnerId) {
        return res.status(400).json({ success: false, error: "Opponent ID and Winner ID are required for singles." });
      }
      teamB = [opponentId];
      pendingConfirmationFrom = [opponentId];
      // Determine winner team based on winnerId for singles
      if (winnerId === creatorId) {
          gameWinnerTeam = 'teamA';
      } else if (winnerId === opponentId) {
          gameWinnerTeam = 'teamB';
      } else {
          return res.status(400).json({ success: false, error: "Winner ID must be one of the players." });
      }

    } else if (gameType === "doubles") {
      if (!teammateId || !opponent1Id || !opponent2Id || !winnerTeam) {
        return res.status(400).json({ success: false, error: "Teammate ID, opponent IDs, and winner team are required for doubles." });
      }
      teamA.push(teammateId);
      teamB = [opponent1Id, opponent2Id];
      pendingConfirmationFrom = [opponent1Id, opponent2Id]; // 两个对手都需要确认 (Both opponents need to confirm initially) - though only one needs to respond
      if (winnerTeam !== 'teamA' && winnerTeam !== 'teamB') {
           return res.status(400).json({ success: false, error: "Winner team must be 'teamA' or 'teamB'." });
      }

    } else {
      return res.status(400).json({ success: false, error: "Invalid game type." });
    }

    // --- 创建比赛记录 --- (Create game record) ---
    const newGame = new Game({
      gameType,
      teamA,
      teamB,
      scores,
      winnerTeam: gameWinnerTeam,
      status: "pending",
      pendingConfirmationFrom,
      createdBy: creatorId,
    });

    await newGame.save();

    // --- 发送实时通知给需要确认的对手 --- (Send real-time notification to opponents who need to confirm) ---
    pendingConfirmationFrom.forEach(opponentUserId => {
        socketService.notifyUser(opponentUserId.toString(), "game:confirmation:received", {
            gameId: newGame._id,
            createdBy: creatorId, // 可以考虑填充创建者昵称 (Consider populating creator's display name)
        });
    });

    res.status(201).json({
      success: true,
      message: "Game created successfully, pending opponent confirmation.",
      game: newGame,
    });

  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({ success: false, error: "Failed to create game." });
  }
};


/**
 * 确认一场待处理的比赛结果, 并更新多项积分
 * Confirm a pending game result and update multiple ratings
 */
exports.confirmGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const confirmerId = req.user.userId;

    // 查找比赛，这次不需要 populate 积分，因为我们需要完整的用户信息
    // Find game, no need to populate points this time as we need full user info
    const game = await Game.findById(gameId);

    if (!game) {
        return res.status(404).json({ success: false, error: "Game not found." });
     }
    if (game.status !== "pending") {
        return res.status(400).json({
          success: false,
          error: "This game is not pending confirmation.",
        });
     }

    // 获取所有参与比赛的玩家的完整信息 (Get full info for all players involved)
    const allPlayerIds = [...game.teamA, ...game.teamB];
    const players = await User.find({ '_id': { $in: allPlayerIds } });

     // 确保找到了所有玩家 (Ensure all players were found)
     if (players.length !== allPlayerIds.length) {
         console.error(`Error: Could not find all players for game ${gameId}. Found ${players.length}, expected ${allPlayerIds.length}`);
         return res.status(500).json({ success: false, error: "Internal error: Player data mismatch." });
     }

    // 验证确认者身份 (Verify confirmer)
    const confirmer = players.find(p => p._id.equals(confirmerId));
    const isConfirmerInTeamB = game.teamB.some(id => id.equals(confirmerId));
    if (!confirmer || !isConfirmerInTeamB) {
        return res.status(403).json({ success: false, error: "You are not authorized to confirm this game." });
    }

    // --- 更新比赛状态 --- (Update game status) ---
    game.status = "confirmed";
    game.confirmedBy = confirmerId;
    game.respondedAt = new Date();
    game.pendingConfirmationFrom = [];
    await game.save();

    // --- 计算并更新积分 --- (Calculate and update ratings) ---
    try {
        const updatedRatings = calculateNewRatings(game, players);

        // 批量更新用户信息 (Batch update user info)
        const updatePromises = Object.entries(updatedRatings).map(async ([playerId, ratingsUpdate]) => {
            const updateDoc = {};
            // 构建 $set 操作符内容 (Build $set operator content)
            for (const field in ratingsUpdate) {
                // 确保字段存在于模型中 (Ensure field exists in the model)
                 if (['singles', 'doubles', 'mixed'].includes(field)) {
                     updateDoc[`ratings.${field}`] = ratingsUpdate[field];
                 } else {
                     console.warn(`Attempted to update unknown rating field: ${field} for player ${playerId}`);
                 }
            }
            // 同时更新统计数据 (Update stats simultaneously)
            // 查找玩家对象以检查是否获胜 (Find player object to check winner status)
            const player = players.find(p => p._id.equals(playerId));
            const isWinner = (game.winnerTeam === 'teamA' && game.teamA.some(id => id.equals(playerId))) ||
                             (game.winnerTeam === 'teamB' && game.teamB.some(id => id.equals(playerId)));

            if (Object.keys(updateDoc).length > 0) { // 只有在有积分更新时才执行 $set (Only perform $set if there are rating updates)
                await User.findByIdAndUpdate(playerId, {
                    $set: updateDoc,
                    $inc: {
                        'stats.gamesPlayed': 1,
                        'stats.gamesWon': isWinner ? 1 : 0
                    }
                }, { new: true }); // 添加 {new: true} 以便可以链式调用 updateStats

                // 获取更新后的用户并调用 updateStats (Get updated user and call updateStats)
                const updatedUser = await User.findById(playerId);
                if (updatedUser) {
                    await updatedUser.updateStats(); // 更新胜率 (Update win rate)
                }
            } else {
                 // 即使没有积分更新，也更新统计数据 (Update stats even if no rating changed)
                 await User.findByIdAndUpdate(playerId, {
                     $inc: {
                         'stats.gamesPlayed': 1,
                         'stats.gamesWon': isWinner ? 1 : 0
                     }
                 }, { new: true });
                 const updatedUser = await User.findById(playerId);
                 if (updatedUser) {
                     await updatedUser.updateStats(); // 更新胜率 (Update win rate)
                 }
            }
        });

        await Promise.all(updatePromises);

    } catch (ratingError) {
        console.error(`Rating calculation error for game ${gameId}:`, ratingError);
        // 重要：即使积分计算失败，比赛状态也已改为 confirmed，需要考虑如何处理或记录这个错误
        // Important: Even if rating calculation fails, game status is already confirmed. Need to consider how to handle/log this error.
        // 可以考虑添加一个字段标记积分计算是否出错，或者发送警报
        // Consider adding a flag to mark rating error or send an alert
    }

    // --- 发送实时通知 --- (Send real-time notifications) ---
     // Populate confirmer's name before sending notification
     await game.populate('confirmedBy', 'profile.displayName');
     const notificationData = {
         gameId: game._id,
         confirmedBy: {
             id: confirmerId,
             displayName: confirmer?.profile.displayName || 'Opponent'
         },
         gameType: game.gameType,
         winnerTeam: game.winnerTeam,
         scores: game.scores
     };

    // 通知创建者 (Notify the creator)
    socketService.notifyUser(game.createdBy.toString(), "game:confirmed", notificationData);
    // 如果是双打，通知创建者的队友 (If doubles, notify the creator's teammate)
    if (game.gameType === 'doubles' && game.teamA.length > 1) {
        const teammate = players.find(p => game.teamA.some(id => id.equals(p._id)) && !p._id.equals(game.createdBy));
        if (teammate) {
            socketService.notifyUser(teammate._id.toString(), "game:confirmed", notificationData);
        }
    }
    // 如果是双打，通知另一个对手 (If doubles, notify the other opponent)
     if (game.gameType === 'doubles') {
        const otherOpponent = players.find(p => game.teamB.some(id => id.equals(p._id)) && !p._id.equals(confirmerId));
         if (otherOpponent) {
             socketService.notifyUser(otherOpponent._id.toString(), "game:confirmed", notificationData);
         }
     }


    res.status(200).json({
      success: true,
      message: "Game confirmed successfully. Ratings updated.",
      game: await Game.findById(gameId).populate('teamA teamB confirmedBy createdBy', 'profile.displayName email'), // 返回填充了昵称的 game 对象 (Return game object populated with display names)
    });
  } catch (error) {
    console.error("Confirm game error:", error);
    res.status(500).json({ success: false, error: "Failed to confirm game." });
  }
};



/**
 * 获取当前用户待处理的比赛确认请求
 * Get pending game confirmations for the current user
 */
exports.getPendingGameConfirmations = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.userId); // 转换为 ObjectId 以便查询

    const pendingGames = await Game.find({
      status: "pending",
      // 查询 pendingConfirmationFrom 数组中包含当前用户ID的比赛
      // Query for games where pendingConfirmationFrom array contains the current user ID
      pendingConfirmationFrom: currentUserId,
    })
      // 填充队伍信息和创建者信息，以便前端显示
      // Populate team info and creator info for frontend display
      .populate("teamA", "profile.displayName profile.avatar")
      .populate("teamB", "profile.displayName profile.avatar")
      .populate("createdBy", "profile.displayName")
      .sort({ createdAt: -1 }); // 按创建时间降序排序 (Sort by creation date descending)

    res.status(200).json({
      success: true,
      pendingGames: pendingGames.map(game => ({ // 返回简化且清晰的格式 (Return simplified and clear format)
          _id: game._id,
          gameType: game.gameType,
          teamA: game.teamA,
          teamB: game.teamB,
          scores: game.scores,
          winnerTeam: game.winnerTeam, // 前端可能需要这个来展示预设结果 (Frontend might need this to show proposed result)
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
 * 获取当前用户最近一周内已确认的比赛记录
 * Get the current user's confirmed games from the last week (Sunday - Saturday)
 */
exports.getWeeklyGames = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.userId);

    // --- 计算本周的起止时间 --- (Calculate start and end of the current week) ---
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek); // 回到本周日 (Go back to Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // 前进到本周六 (Go forward to Saturday)
    weekEnd.setHours(23, 59, 59, 999);

    // --- 查询数据库 --- (Query the database) ---
    const games = await Game.find({
      status: "confirmed",
      // 查询 respondedAt 在本周范围内 (Query for respondedAt within the week)
      respondedAt: { $gte: weekStart, $lte: weekEnd },
      // 查询 teamA 或 teamB 中包含当前用户的比赛 (Query for games where user is in teamA OR teamB)
      $or: [
          { teamA: currentUserId },
          { teamB: currentUserId }
      ]
    })
      .populate("teamA", "profile.displayName") // 填充所有玩家昵称 (Populate all player display names)
      .populate("teamB", "profile.displayName")
      .sort({ respondedAt: -1 }); // 按确认时间降序排序 (Sort by confirmation date descending)


    // --- 格式化返回结果 --- (Format the results) ---
    const formattedGames = games.map((game) => {
      // 判断当前用户在哪一队 (Determine which team the current user is on)
      const userIsInTeamA = game.teamA.some(player => player._id.equals(currentUserId));
      const userTeam = userIsInTeamA ? 'teamA' : 'teamB';
      const opponentTeam = userIsInTeamA ? 'teamB' : 'teamA';

      // 判断胜负 (Determine win/loss)
      const userWon = game.winnerTeam === userTeam;

      // 获取队伍名称 (Get team names)
      const teamANames = game.teamA.map(p => p.profile.displayName || "Unknown").join(" & ");
      const teamBNames = game.teamB.map(p => p.profile.displayName || "Unknown").join(" & ");

      return {
        id: game._id.toString(),
        time: game.respondedAt.toISOString(), // 使用确认/拒绝时间 (Use response time)
        gameType: game.gameType,
        teamA: teamANames,
        teamB: teamBNames,
        scores: game.scores, // 直接返回原始分数数组 (Return raw scores array)
        result: userWon ? "win" : "loss",
        winnerTeamDisplay: game.winnerTeam === 'teamA' ? teamANames : teamBNames, // 显示获胜队伍名称
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
 * 拒绝一个待处理的比赛结果 (单打或双打)
 * Reject a pending game result (singles or doubles)
 * 对于双打，任一对手拒绝即可 (For doubles, rejection from either opponent is sufficient)
 */
exports.rejectGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const rejecterId = req.user.userId; // 进行拒绝操作的用户 (The user performing the rejection)

    // 查找比赛 (Find the game)
    const game = await Game.findById(gameId).populate('teamA teamB');

    if (!game) {
      return res.status(404).json({ success: false, error: "Game not found." });
    }

    // 检查比赛状态是否是'pending' (Check if the game status is 'pending')
    if (game.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "This game is not pending confirmation.",
      });
    }

    // 验证拒绝者是否是 B 队的成员 (Verify if the rejecter is a member of Team B)
    const isRejecterInTeamB = game.teamB.some(player => player._id.toString() === rejecterId);

    if (!isRejecterInTeamB) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to reject this game.",
      });
    }

    // --- 更新比赛状态 --- (Update game status) ---
    game.status = "rejected";
    game.rejectedBy = rejecterId;
    game.respondedAt = new Date();
    // 清空待确认列表 (Clear pending list)
    game.pendingConfirmationFrom = [];

    await game.save();

    // --- 发送实时通知 --- (Send real-time notifications) ---
    // 通知创建者 (Notify the creator)
    socketService.notifyUser(game.createdBy.toString(), "game:rejected", {
      gameId: game._id,
      rejectedBy: rejecterId,
    });
     // 如果是双打，通知创建者的队友 (If doubles, notify the creator's teammate)
    if (game.gameType === 'doubles' && game.teamA.length > 1) {
        const teammate = game.teamA.find(p => p._id.toString() !== game.createdBy.toString());
        if (teammate) {
            socketService.notifyUser(teammate._id.toString(), "game:rejected", {
                gameId: game._id,
                rejectedBy: rejecterId,
            });
        }
    }
    // 如果是双打，通知另一个对手 (If doubles, notify the other opponent)
     if (game.gameType === 'doubles') {
        const otherOpponent = game.teamB.find(p => p._id.toString() !== rejecterId);
         if (otherOpponent) {
             socketService.notifyUser(otherOpponent._id.toString(), "game:rejected", {
                 gameId: game._id,
                 rejectedBy: rejecterId,
             });
         }
     }


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