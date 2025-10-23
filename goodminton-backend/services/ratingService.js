/**
 * @file services/ratingService.js
 * @description ELO 等级分算法服务 (ELO Rating Algorithm Service)
 *
 * ELO 算法是一种常用于棋类等双人对战游戏中，评估选手相对技能水平的方法。
 * The ELO algorithm is a method for calculating the relative skill levels of players in zero-sum games such as chess.
 *
 * 核心思想 (Core Concepts):
 * 1. 每个玩家都有一个积分 (Rating)。(Each player has a rating.)
 * 2. 战胜积分比你高的玩家，你会获得更多分数；反之，获得的分数较少。
 * (Beating a higher-rated player yields more points than beating a lower-rated one.)
 * 3. 输给积分比你低的玩家，你会失去更多分数；反之，失去的分数较少。
 * (Losing to a lower-rated player loses more points than losing to a higher-rated one.)
 */

// K-factor (K值) 决定了每次比赛后积分变化的最大幅度。
// K值越大，积分变化越快、越剧烈。对于新手或积分不稳定的系统，K值可以高一些。
// The K-factor determines the maximum possible change in rating. A higher K-factor means more drastic rating changes.
const K_FACTOR = 32;

/**
 * 计算玩家A的预期胜率 (Calculate Player A's expected score)
 * @param {number} ratingA 玩家A的积分 (Player A's rating)
 * @param {number} ratingB 玩家B的积分 (Player B's rating)
 * @returns {number} 玩家A的预期胜率 (0到1之间) (Player A's expected score, between 0 and 1)
 */
const getExpectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * 根据比赛结果更新两位玩家的积分 (Update ratings for two players based on a game result)
 * @param {number} playerARating 玩家A的当前积分 (Player A's current rating)
 * @param {number} playerBRating 玩家B的当前积分 (Player B's current rating)
 * @param {boolean} didPlayerAWin 玩家A是否获胜 (Did Player A win?)
 * @returns {{ newRatingA: number, newRatingB: number }} 两位玩家的新积分 (The new ratings for both players)
 */
exports.updateRatings = (playerARating, playerBRating, didPlayerAWin) => {
  // 计算双方的预期胜率
  // Calculate the expected scores for both players
  const expectedScoreA = getExpectedScore(playerARating, playerBRating);
  const expectedScoreB = getExpectedScore(playerBRating, playerARating);

  // 比赛实际得分，胜者为1，败者为0
  // Determine the actual scores based on the winner (1 for a win, 0 for a loss)
  const actualScoreA = didPlayerAWin ? 1 : 0;
  const actualScoreB = didPlayerAWin ? 0 : 1;

  // ELO 公式：新积分 = 旧积分 + K * (实际得分 - 预期胜率)
  // ELO formula: newRating = currentRating + K * (actualScore - expectedScore)
  const newRatingA = Math.round(playerARating + K_FACTOR * (actualScoreA - expectedScoreA));
  const newRatingB = Math.round(playerBRating + K_FACTOR * (actualScoreB - expectedScoreB));

  return { newRatingA, newRatingB };
};

