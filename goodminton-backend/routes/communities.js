/**
 * @file routes/communities.js
 * @description API routes for community management
 */
const express = require("express");
const communityController = require("../controllers/communityController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, communityController.createCommunity);
router.post(
  "/:identifier/admins",
  authenticateToken,
  communityController.promoteMemberToAdmin
);
router.delete(
  "/:identifier/admins/:userId",
  authenticateToken,
  communityController.demoteAdmin
);
router.get(
  "/:identifier",
  optionalAuth,
  communityController.getCommunityDetails
);

module.exports = router;

