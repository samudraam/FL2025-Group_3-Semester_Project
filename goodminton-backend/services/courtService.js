const Court = require("../models/Court");
const CourtRating = require("../models/CourtRating");

// radius 单位 km
async function searchCourts({ lat, lng, radius, name, isOpen, hasAvailableCourts }) {
    const query = {
        location: {
            $geoWithin: {
                $centerSphere: [[lng, lat], radius / 6378.1],
            },
        },
    };

    if (name) {
        query.name = { $regex: name.trim(), $options: "i" };
    }

    if (hasAvailableCourts) {
        query.availableCourts = { $gt: 0 };
    }

    // 基础查询
    const courts = await Court.find(query).lean();

    // 处理是否营业过滤
    if (isOpen !== undefined) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        return courts.filter((court) => {
            const { open, close } = court.openHours || {};
            if (!open || !close) return false;

            const [openH, openM] = open.split(":").map(Number);
            const [closeH, closeM] = close.split(":").map(Number);
            const openMin = openH * 60 + openM;
            const closeMin = closeH * 60 + closeM;

            const openNow =
                closeMin < openMin
                    ? currentMinutes >= openMin || currentMinutes < closeMin
                    : currentMinutes >= openMin && currentMinutes < closeMin;

            return isOpen ? openNow : !openNow;
        });
    }

    return courts;
}

async function rateCourt(courtId, userId, score) {
    const existing = await CourtRating.findOne({ userId, courtId });

    if (existing) {
        existing.score = score;
        await existing.save();
    } else {
        await CourtRating.create({ userId, courtId, score });
    }

    const ratings = await CourtRating.find({ courtId });
    const avg =
        ratings.reduce((acc, r) => acc + r.score, 0) / (ratings.length || 1);

    // 更新 court.rating
    await Court.findByIdAndUpdate(courtId, { rating: avg });

    return avg;
};

module.exports = { searchCourts, rateCourt };
