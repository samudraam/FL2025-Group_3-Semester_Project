const express = require("express");
const router = express.Router();
const courtController = require("../controllers/courtController");

// POST /api/courts/search
router.post("/search", courtController.searchCourts);

// POST 
router.post("/:id/rate", courtController.rateCourt);

router.get("/:id/ratings", courtController.getCourtRatings);

module.exports = router;
