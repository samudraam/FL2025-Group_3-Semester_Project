/**
 * @file routes/games.routes.js
 * @description 比赛相关的API路由 (API routes for games)
 */
const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const { authenticateToken } = require("../middleware/auth");

// 对此文件中的所有路由应用认证中间件
// Apply the authentication middleware to all routes in this file.
router.use(authenticateToken);

/**
 * @route   POST /api/games
 * @desc    创建一场新的快速比赛 (单打或双打)
 * (Create a new quick game - singles or doubles)
 * @access  Private
 * @body    根据 gameType 不同需要不同的字段:
 * (Requires different fields based on gameType):
 * - Common: gameType ('singles'/'doubles'), scores ([[Number]])
 * - Singles: opponentId (String), winnerId (String - creator or opponent)
 * - Doubles: teammateId (String), opponent1Id (String), opponent2Id (String), winnerTeam ('teamA'/'teamB')
 */
router.post("/", gameController.createGame);

/**
 * @route   POST /api/games/:id/confirm
 * @desc    确认一场待处理的比赛结果 (单打或双打)
 * (Confirm a pending game result - singles or doubles)
 * 对于双打，任一对手确认即可 (For doubles, confirmation from either opponent is sufficient)
 * @access  Private
 */
router.post("/:id/confirm", gameController.confirmGame);

// @route   GET /api/games/pending
// @desc    获取待确认的比赛列表 (Get pending game confirmations)
router.get("/pending", gameController.getPendingGameConfirmations);

// @route   GET /api/games/weekly
// @desc    Get current week's confirmed games for authenticated user (Sunday-Saturday)
router.get("/weekly", gameController.getWeeklyGames);

/**
 * @route   POST /api/games/:id/reject
 * @desc    拒绝一个待处理的比赛结果 (单打或双打)
 * (Reject a pending game result - singles or doubles)
 * 对于双打，任一对手拒绝即可 (For doubles, rejection from either opponent is sufficient)
 * @access  Private
 */
router.post("/:id/reject", authenticateToken, gameController.rejectGame);

module.exports = router;
