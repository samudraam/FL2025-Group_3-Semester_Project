const FavoriteCourt = require("../models/FavoriteCourt");

async function getFavoriteCourts(userId) {
  // find favorite collection and  populate 出 Court
    const favorites = await FavoriteCourt.find({ userId })
    .populate("courtId") // 只返回 court 信息
    .lean();

  // favorites ：
  // [{ courtId: {...courtObject...} }, { courtId: {...} }]

  // 只取 court 信息
    const courts = favorites.map(f => f.courtId);

    // 打印每次返回的 court 信息
    console.log("🎾 [getFavoriteCourts] returns user favorite courts:");
    courts.forEach(c => {
        console.log(`- Court ID: ${c._id}, Name: ${c.name}`);
    });

    return courts;
}

module.exports = {
    getFavoriteCourts,
};
