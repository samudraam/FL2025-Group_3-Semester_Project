/**
 * @file models/Game.js
 * @description 比赛数据模型 (Mongoose schema for Games), 支持单打和双打 (supports singles and doubles)
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const gameSchema = new Schema(
  {
    // 比赛类型 (Game type)
    gameType: {
      type: String,
      enum: ["singles", "doubles"], // 'singles' 或 'doubles'
      required: true,
    },
    // A队玩家 (Team A players) - 创建者总是在A队 (Creator is always in Team A)
    teamA: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // B队玩家 (Team B players) - 对手队伍 (Opponent team)
    teamB: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // 比赛分数，嵌套数组表示每局得分
    // Game scores, nested array represents scores per set, e.g., [[21, 19], [18, 21], [21, 15]]
    scores: {
      type: [[Number]], // 例如: [[21, 19], [21, 18]]
      required: true,
      validate: [
        (val) => Array.isArray(val) && val.every(set => Array.isArray(set) && set.length === 2 && set.every(Number.isInteger)),
        'Scores must be an array of sets, each set being an array of two integers.'
      ]
    },
    // 获胜队伍 ('teamA' 或 'teamB')
    // Winning team ('teamA' or 'teamB')
    winnerTeam: {
      type: String,
      enum: ["teamA", "teamB"],
      required: true,
    },
    // 比赛状态 (Game status)
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"], // 'pending': 待确认, 'confirmed': 已确认, 'rejected': 已拒绝
      default: "pending",
      index: true,
    },
    // 等待哪些对手确认 (Which opponents need to confirm)
    // 对于双打，B队的两个成员都在这里 (For doubles, both members of Team B are here)
    pendingConfirmationFrom: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // 确认比赛结果的用户 (The user who confirmed the game result)
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // 拒绝比赛结果的用户 (The user who rejected the game result)
    rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    // 比赛确认或拒绝的时间 (Timestamp when the game was confirmed or rejected)
    respondedAt: {
      type: Date,
    },
    // 比赛创建者 (The user who created the game entry)
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt (Automatically add createdAt and updatedAt)
  }
);

// 索引优化查询 (Indexes for query optimization)
gameSchema.index({ status: 1, pendingConfirmationFrom: 1 }); // 快速查找待某人确认的比赛 (Quickly find games pending confirmation by someone)
gameSchema.index({ teamA: 1, status: 1 }); // 快速查找某人参与的A队比赛 (Quickly find games where someone is in Team A)
gameSchema.index({ teamB: 1, status: 1 }); // 快速查找某人参与的B队比赛 (Quickly find games where someone is in Team B)


module.exports = mongoose.model("Game", gameSchema);

