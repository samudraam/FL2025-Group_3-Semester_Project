const express = require("express");
const router = express.Router();
const courtController = require("../controllers/courtController");
const { authenticateToken } = require("../middleware/auth");

// POST /api/courts/search
router.post("/search", courtController.searchCourts);

// POST /api/courts/
router.post("/:id/rate", courtController.rateCourt);
router.get("/:id/ratings", courtController.getCourtRatings);

// Favorites /api/courts/<court's Id>/favorite
router.post("/:id/favorite", authenticateToken, courtController.favoriteCourt);
router.delete("/:id/favorite", authenticateToken, courtController.unfavoriteCourt);

// Comments /api/courts/<court's Id>/comment
// do not have an delete comment route for now
router.post("/:id/comment", authenticateToken, courtController.addComment);
router.get("/:id/comments", courtController.getComments);


module.exports = router;
