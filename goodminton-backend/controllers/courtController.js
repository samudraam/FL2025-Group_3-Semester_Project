const courtService = require("../services/courtService");

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function searchCourts(req, res) {
    try {
        const { lat, lng, radius, name, isOpen, hasAvailableCourts } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ error: "Missing user location (lat, lng)" });
        }

        const courts = await courtService.searchCourts({
            lat,
            lng,
            radius: radius || 10,
            name,
            isOpen,
            hasAvailableCourts,
        });
        
        // ✅ 在控制台输出每个球场与用户的距离
        courts.forEach(court => {
            if (court.location?.coordinates) {
                const [courtLng, courtLat] = court.location.coordinates;
                const distance = getDistance(lat, lng, courtLat, courtLng);
                console.log(
                    `🏸 Court: ${court.name} | Distance: ${distance.toFixed(2)} km | search Distance: ${radius} km`
                );
            } else {
                console.warn(`⚠️ Court ${court.name} has no valid coordinates`);
            }
        });

        res.json(courts);
    } catch (err) {
        console.error("Error searching courts:", err);
        res.status(500).json({ error: "Server error while searching courts" });
    }
}

/**
 * @desc  给指定球场添加评分（打分）
 * @route POST /api/courts/:id/rate
 * @access Public（可改为 Auth 保护）
 */
async function rateCourt(req, res) {
 try {
    const { id } = req.params;
    const { userId, score } = req.body;

    if (!userId || !score) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newAverage = await courtService.rateCourt(id, userId, score);

    res.json({ message: "Rating saved", newAverage });
  } catch (err) {
    console.error("rateCourt error:", err);
    res.status(500).json({ error: "Server error while rating court" });
  }
}

async function getCourtRatings(req, res) {
  try {
    const { courtId } = req.params;
    const ratings = await Rating.find({ courtId }).populate("userId", "name");
    res.json(ratings);
  } catch (err) {
    console.error("Error fetching ratings:", err);
    res.status(500).json({ error: "Server error fetching ratings" });
  }
};

module.exports = { searchCourts, rateCourt, getCourtRatings };
