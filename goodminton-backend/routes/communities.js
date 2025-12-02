/**
 * @file routes/communities.js
 * @description API routes for community management
 */
const express = require("express");
const multer = require("multer");
const communityController = require("../controllers/communityController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

const router = express.Router();

const coverStorage = multer.memoryStorage();

const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Please upload a JPG, PNG, or WEBP image under 4MB."
        )
      );
    }
  },
});

const handleCoverUpload = (req, res, next) => {
  coverUpload.single("cover")(req, res, (error) => {
    if (error) {
      console.error("Community cover upload error:", error);
      return res.status(400).json({
        success: false,
        error:
          error.message ||
          "Failed to upload cover image. Ensure it is smaller than 4MB.",
      });
    }
    return next();
  });
};

router.post("/", authenticateToken, communityController.createCommunity);
router.get("/mine", authenticateToken, communityController.getUserCommunities);
router.post(
  "/:identifier/admins",
  authenticateToken,
  communityController.promoteMemberToAdmin
);
router.get(
  "/:identifier/admins",
  authenticateToken,
  communityController.listCommunityAdmins
);
router.post(
  "/:identifier/posts",
  authenticateToken,
  communityController.createCommunityPost
);
router.post(
  "/:identifier/events",
  authenticateToken,
  communityController.createCommunityEvent
);
router.get(
  "/:identifier/events",
  optionalAuth,
  communityController.getCommunityEvents
);
router.post(
  "/:identifier/events/:eventId/rsvp",
  authenticateToken,
  communityController.rsvpForEvent
);
router.delete(
  "/:identifier/events/:eventId/rsvp",
  authenticateToken,
  communityController.cancelEventRsvp
);
router.get(
  "/:identifier/posts",
  optionalAuth,
  communityController.getCommunityPosts
);
router.delete(
  "/:identifier/admins/:userId",
  authenticateToken,
  communityController.demoteAdmin
);
router.patch(
  "/:identifier",
  authenticateToken,
  communityController.updateCommunity
);
router.delete(
  "/:identifier",
  authenticateToken,
  communityController.deleteCommunity
);
router.get(
  "/:identifier",
  optionalAuth,
  communityController.getCommunityDetails
);
router.post(
  "/covers/upload",
  authenticateToken,
  handleCoverUpload,
  communityController.uploadCommunityCover
);

module.exports = router;
