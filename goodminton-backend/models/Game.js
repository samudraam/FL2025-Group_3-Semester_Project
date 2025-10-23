/**
 * @file models/game.model.js
 * @description 比赛数据模型 (Game Data Model)
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gameSchema = new Schema({
  // 两个参赛玩家，引用 'User' 模型
  // The two players participating in the game, referencing the 'User' model.
  players: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // 记录的比分，格式为二维数组，例如 [[21, 18], [15, 21], [21, 19]]
  // The scores, formatted as an array of arrays, e.g., [[21, 18], [15, 21], [21, 19]].
  scores: {
    type: [[Number]],
    required: true
  },

  // 比赛的胜者
  // The winner of the game.
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 比赛状态
  // The status of the game.
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'disputed'], // 待确认, 已确认, 有争议
    default: 'pending'
  },

  // 发起比赛的用户 (用于确认流程)
  // The user who created the game record (for the confirmation process).
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 待确认的用户 (对手)
  // The opponent whose confirmation is pending.
  pendingConfirmationFrom: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 比赛确认日期
  // The date when the game was confirmed.
  confirmedAt: {
    type: Date
  },

  // 本场比赛给玩家带来的积分变化
  // The rating change for each player resulting from this game.
  ratingChange: {
    playerA: {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      change: Number
    },
    playerB: {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      change: Number
    }
  }

}, {
  // 自动添加 createdAt 和 updatedAt 字段
  // Automatically add createdAt and updatedAt timestamps.
  timestamps: true
});

module.exports = mongoose.model('Game', gameSchema);

