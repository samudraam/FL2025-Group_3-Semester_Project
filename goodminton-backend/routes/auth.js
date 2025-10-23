const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// --- Public authentication routes ---

// @route   POST /api/auth/login/otp
// @desc    Request OTP code via email
router.post("/login/otp", authController.requestOTPLogin);

// @route   POST /api/auth/verify/otp
// @desc    Verify OTP and login
router.post("/verify/otp", authController.verifyOTP);

// @route   POST /api/auth/logout
// @desc    Logout user and clear session
// @access  Private
router.post("/logout", authenticateToken, authController.logout);

// --- Private routes requiring authentication ---

// @route   GET /api/auth/me
// @desc    Get current logged-in user information
// @access  Private
router.get("/me", authenticateToken, authController.getCurrentUser);

// @route   POST /api/auth/register
// @desc    Create a new user
// @access  Public
router.post("/register", authController.createUser);

module.exports = router;
