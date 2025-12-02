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

/**
 * favorite a court
 */
async function favoriteCourt(req, res) {
  try {
    const { id:courtId } = req.params;
    const userId  = req.user.userId;
    if (!userId) {
      return res.status(400).json({error: "Missing userId"});
    }

    const result = await courtService.favoriteCourt(courtId, userId);
    console.log(`🏸 User ${userId} favorited Court ${courtId}`);
    res.json({message: "Court favorited", result});
  } catch (err) {
    console.error("favoriteCourt error:", err);
    res.status(500).json({error: "Server error while favoriting court"});
  }
}

/**
 * unfavorite
 */
async function unfavoriteCourt(req, res) {
    try {
        const { id:courtId } = req.params;
        const userId  = req.user.userId;

        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        const result = await courtService.unfavoriteCourt(courtId, userId);
        console.log(`🏸 User ${userId} unfavorited Court ${courtId}`);
        res.json({ message: "Court un-favorited", result });

    } catch (err) {
        console.error("unfavoriteCourt error:", err);
        res.status(500).json({ error: "Server error while unfavoriting court" });
    }
}

/**
 * add a comment
 */
async function addComment(req, res) {
    try {
        const { id:courtId } = req.params; // courtId
        const userId  = req.user.userId;
        const { description } = req.body;

        if (!userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        if (!description || description.trim() === "") {
          return res.status(400).json({ error: "Comment description is required" });
        }

        const comment = await courtService.addComment(courtId, userId, description);
        console.log(`💬 User ${userId} commented on Court ${courtId}: ${description}`);
        res.json({ message: "Comment added", comment });

    } catch (err) {
        console.error("addComment error:", err);
        res.status(500).json({ error: "Server error while adding comment" });
    }
}

/**
 * get all comments for a court
 */
async function getComments(req, res) {
    try {
        const { id } = req.params; // courtId

        const comments = await courtService.getComments(id);
        res.json(comments);

    } catch (err) {
        console.error("getComments error:", err);
        res.status(500).json({ error: "Server error fetching comments" });
    }
}


module.exports = { 
  searchCourts, 
  rateCourt, 
  getCourtRatings,
  favoriteCourt,
  unfavoriteCourt,
  addComment,
  getComments,
};
