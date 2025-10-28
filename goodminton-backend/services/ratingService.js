/**
 * @file services/ratingService.js
 * @description 积分计算服务, 支持单双打、混双及性别因素 (Rating calculation service supporting singles, doubles, mixed, and gender factors)
 */

const K_FACTOR = 32; // ELO K值 (ELO K-factor)
const GENDER_K_ADJUSTMENT = 1.2; // 女胜男时的K值调整系数 (K-factor adjustment for female winning against male)
const GENDER_RATING_BONUS = 50; // 假设男性在对抗中平均高出的分数 (Assumed average rating bonus for males in cross-gender matches)

/**
 * 计算单场比赛后的新 ELO 积分 (Calculates new ELO ratings after a single match)
 * @param {number} ratingA - 玩家A的当前积分 (Player A's current rating)
 * @param {number} ratingB - 玩家B的当前积分 (Player B's current rating)
 * @param {boolean} didAWin - 玩家A是否获胜 (Did Player A win?)
 * @param {string} genderA - 玩家A的性别 ('male'/'female')
 * @param {string} genderB - 玩家B的性别 ('male'/'female')
 * @param {boolean} isCrossGender - 是否是跨性别比赛 (Is it a cross-gender match?)
 * @returns {{newRatingA: number, newRatingB: number}} - 两位玩家的新积分 (New ratings for both players)
 */
function calculateElo(ratingA, ratingB, didAWin, genderA, genderB, isCrossGender) {
    let effectiveRatingA = ratingA;
    let effectiveRatingB = ratingB;
    let kFactorA = K_FACTOR;
    let kFactorB = K_FACTOR;

    // --- 应用性别调整 (Apply gender adjustments) ---
    if (isCrossGender) {
        // 假设男性在跨性别比赛中有基础优势 (Assume male has a base advantage in cross-gender)
        if (genderA === 'male') effectiveRatingA += GENDER_RATING_BONUS;
        else effectiveRatingB += GENDER_RATING_BONUS;

        // 如果是女胜男，增加K值，放大积分变化 (If female wins against male, increase K-factor)
        if (didAWin && genderA === 'female') {
            kFactorA *= GENDER_K_ADJUSTMENT;
            kFactorB *= GENDER_K_ADJUSTMENT;
        }
        // 如果是男输女，也增加K值 (If male loses against female, also increase K-factor)
        else if (!didAWin && genderB === 'female') {
             kFactorA *= GENDER_K_ADJUSTMENT;
             kFactorB *= GENDER_K_ADJUSTMENT;
        }
    }

    // --- 计算预期胜率 (Calculate expected scores based on effective ratings) ---
    const ratingDifferenceBvsA = effectiveRatingB - effectiveRatingA;
    const expectedScoreA = 1 / (1 + 10 ** (ratingDifferenceBvsA / 400));
    const expectedScoreB = 1 - expectedScoreA;

    // --- 确定实际得分 (Determine actual scores) ---
    const actualScoreA = didAWin ? 1 : 0;
    const actualScoreB = 1 - actualScoreA;

    // --- 计算新积分 (Calculate new ratings) ---
    const newRatingA = Math.round(ratingA + kFactorA * (actualScoreA - expectedScoreA));
    const newRatingB = Math.round(ratingB + kFactorB * (actualScoreB - expectedScoreB));

    return { newRatingA, newRatingB };
}


/**
 * 主函数：根据比赛结果计算所有玩家的新积分
 * Main function: Calculates new ratings for all players based on game results
 * @param {object} game - 比赛文档对象 (The game document object)
 * @param {Array<object>} players - 包含所有玩家完整信息的数组 (Array containing full info for all players involved)
 * 每个玩家对象需要包含 _id, gender, ratings 对象
 * (Each player object needs _id, gender, and ratings object)
 * @returns {object} - 包含更新后积分的对象 (Object containing updated ratings)
 * e.g., { playerId1: { singles: 1015 }, playerId2: { singles: 985 } }
 */
function calculateNewRatings(game, players) {
    const { gameType, teamA: teamAIds, teamB: teamBIds, winnerTeam } = game;
    const updatedRatings = {};

    // --- 1. 确定比赛项目和获取相关积分 ---
    // --- 1. Determine discipline and get relevant ratings ---
    let discipline = ''; // 'singles', 'doubles', or 'mixed'
    const teamAPlayers = teamAIds.map(id => players.find(p => p._id.equals(id)));
    const teamBPlayers = teamBIds.map(id => players.find(p => p._id.equals(id)));

    if (!teamAPlayers.every(p => p) || !teamBPlayers.every(p => p)) {
        throw new Error("Could not find all player details for rating calculation.");
    }

    const teamAGenders = teamAPlayers.map(p => p.gender);
    const teamBGenders = teamBPlayers.map(p => p.gender);

    if (gameType === 'singles') {
        discipline = 'singles';
    } else if (gameType === 'doubles') {
        // 判断是男双、女双还是混双 (Determine MD, WD, or XD)
        const isTeamAMixed = new Set(teamAGenders).size === 2;
        const isTeamBMixed = new Set(teamBGenders).size === 2;
        const isTeamAMale = teamAGenders.every(g => g === 'male');
        const isTeamAFemale = teamAGenders.every(g => g === 'female');
        const isTeamBMale = teamBGenders.every(g => g === 'male');
        const isTeamBFemale = teamBGenders.every(g => g === 'female');

        if ((isTeamAMixed && isTeamBMixed) || (isTeamAMixed && !isTeamBMixed) || (!isTeamAMixed && isTeamBMixed)) {
            discipline = 'mixed';
        } else if (isTeamAMale && isTeamBMale) {
            discipline = 'doubles'; // MD vs MD
        } else if (isTeamAFemale && isTeamBFemale) {
            discipline = 'doubles'; // WD vs WD
        } else {
             discipline = 'mixed'; // 默认为混双类别，或处理 MD vs WD 等特殊情况 (Default to mixed, or handle MD vs WD etc.)
             console.warn(`Complex doubles matchup detected for game ${game._id}. Applying mixed doubles rating.`);
        }
    } else {
        throw new Error(`Invalid game type for rating calculation: ${gameType}`);
    }

    const ratingField = discipline; // 'singles', 'doubles', or 'mixed'

    // --- 2. 计算积分变化 ---
    // --- 2. Calculate rating changes ---

    if (gameType === 'singles') {
        const playerA = teamAPlayers[0];
        const playerB = teamBPlayers[0];
        const ratingA = playerA.ratings[ratingField];
        const ratingB = playerB.ratings[ratingField];
        const didAWin = winnerTeam === 'teamA';
        const isCrossGender = playerA.gender !== playerB.gender;

        const { newRatingA, newRatingB } = calculateElo(ratingA, ratingB, didAWin, playerA.gender, playerB.gender, isCrossGender);

        updatedRatings[playerA._id.toString()] = { [ratingField]: newRatingA };
        updatedRatings[playerB._id.toString()] = { [ratingField]: newRatingB };

    } else if (gameType === 'doubles') {
        // 计算队伍平均分 (Calculate team average ratings)
        const avgRatingA = teamAPlayers.reduce((sum, p) => sum + p.ratings[ratingField], 0) / teamAPlayers.length;
        const avgRatingB = teamBPlayers.reduce((sum, p) => sum + p.ratings[ratingField], 0) / teamBPlayers.length;

        // 简化处理：双打暂不引入复杂的性别对抗调整，仅使用基础 ELO 计算队伍总分变化
        // Simplified approach: No complex gender adjustments for doubles yet, just basic ELO for team rating change
        const didTeamAWin = winnerTeam === 'teamA';
        const ratingDiffBvsA = avgRatingB - avgRatingA;
        const expectedScoreTeamA = 1 / (1 + 10 ** (ratingDiffBvsA / 400));
        const actualScoreTeamA = didTeamAWin ? 1 : 0;

        // 计算队伍总积分变化量 (Calculate total team rating change)
        const teamRatingChangeA = K_FACTOR * (actualScoreTeamA - expectedScoreTeamA);
        const teamRatingChangeB = -teamRatingChangeA; // 零和 (Zero-sum)

        // 将变化量平均分配给队员 (Distribute change equally among teammates)
        teamAPlayers.forEach(player => {
            const playerRatingChange = teamRatingChangeA / teamAPlayers.length;
            const newRating = Math.round(player.ratings[ratingField] + playerRatingChange);
            updatedRatings[player._id.toString()] = { [ratingField]: newRating };
        });
        teamBPlayers.forEach(player => {
            const playerRatingChange = teamRatingChangeB / teamBPlayers.length;
            const newRating = Math.round(player.ratings[ratingField] + playerRatingChange);
            updatedRatings[player._id.toString()] = { [ratingField]: newRating };
        });
    }

    return updatedRatings;
}

module.exports = { calculateNewRatings };

