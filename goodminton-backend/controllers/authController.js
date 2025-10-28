/**
 * @file controllers/authController.js
 * @description Authentication related business logic controller
 * (认证相关的业务逻辑控制器)
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // 确保引入的是更新后的 User 模型
const AuthToken = require("../models/AuthToken"); // 确保引入 AuthToken 模型
const { sendOTPEmail } = require("../services/emailService"); // 确保 emailService 正确导出此函数

// --- Helper Functions ---

/**
 * Generate 6-digit OTP code
 * (生成6位数字OTP验证码)
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// --- Controller Functions ---

/**
 * @desc    Request OTP code via email
 * @route   POST /api/auth/login/otp
 * @access  Public
 */
exports.requestOTPLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, error: "No account found with this email. Please register first." });
    }

    const otp = generateOTP();

    // Save OTP to database
    await AuthToken.create({
      email: email.toLowerCase(),
      token: otp,
      type: "otp", // Make sure type matches your AuthToken model ('otp' or 'sms' etc.)
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    // Development only: Log OTP and Ethereal link if available
    if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 OTP Code for ${email}: ${otp}`);
        // If sendOTPEmail returns preview URL, log it
        // e.g., const previewURL = await sendOTPEmail(email, otp); if (previewURL) console.log(`📧 Email Preview: ${previewURL}`);
    }


    res.json({ success: true, message: "Verification code sent to your email. Please check your inbox." });

  } catch (error) {
    console.error("OTP request error:", error);
    res.status(500).json({ success: false, error: "Failed to send verification code" });
  }
};

/**
 * @desc    Verify OTP and login user
 * @route   POST /api/auth/verify/otp
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and verification code are required" });
    }

    // Find valid, unused, unexpired OTP
    const authToken = await AuthToken.findOne({
      email: email.toLowerCase(),
      token: otp.toString(),
      type: "otp", // Ensure type matches what was saved
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      return res.status(400).json({ success: false, error: "Invalid or expired verification code. Please request a new one." });
    }

    // Mark OTP as used
    authToken.used = true;
    await authToken.save();

    // Get user
    const user = await User.findOne({ email: authToken.email });
    if (!user) {
      // This case should ideally not happen if requestOTP checks user existence
      console.error(`User not found for verified OTP email: ${authToken.email}`);
      return res.status(404).json({ success: false, error: "User not found associated with this email." });
    }

    // Update last login time
    user.lastLogin = new Date(); // Ensure User model has lastLogin field
    await user.save();

    // Generate JWT
    const jwtToken = jwt.sign(
        { userId: user._id }, // Payload includes user ID
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: "Login successful",
      token: jwtToken,
      user: { // Return necessary user info to frontend
        id: user._id,
        email: user.email,
        profile: user.profile,
        ratings: user.ratings, // Include ratings if needed by frontend
        // Avoid sending sensitive info
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};


/**
 * @desc    User logout (implementation depends on frontend token handling)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  // Server-side logout is often just confirming the client clears the token.
  // If using refresh tokens stored in DB, you might invalidate them here.
  // If using cookies, clear the cookie: res.clearCookie('yourCookieName');
  res.json({ success: true, message: "Logged out successfully (client should clear token)" });
};

/**
 * @desc    Get current logged-in user information
 * @route   GET /api/auth/me
 * @access  Private (requires auth middleware)
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user.userId is attached by auth middleware
    const user = await User.findById(req.user.userId)
      .select("-__v -firebaseUid") // Exclude internal/sensitive fields
      .populate("friends", "profile.displayName profile.avatar"); // Populate basic friend info

    if (!user) {
      // This might happen if user was deleted after token was issued
      return res.status(404).json({ success: false, error: "User associated with token not found." });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve user data." });
  }
};


/**
 * @desc    Create a new user (Register)
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.createUser = async (req, res) => {
  try {
    // --- FIX: Include 'gender' in destructuring ---
    const { email, gender, firstName, lastName, displayName, phone, level } = req.body;

    // --- Validation ---
    if (!email || !gender) { // Ensure gender is also required here if model requires it
      return res.status(400).json({
        success: false,
        error: "Email and gender are required", // Updated error message
      });
    }
    // Optional: Add more specific validation for gender enum if needed

    // Check if user already exists (by email)
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, error: "User with this email already exists" });
    }

    // Check if user already exists (by phone, if provided)
    if (phone) {
        const existingUserByPhone = await User.findOne({ phone });
        if(existingUserByPhone) {
            return res.status(400).json({ success: false, error: "User with this phone number already exists" });
        }
    }


    // Create unique firebaseUid for email-based registration
    // Ensure this logic aligns with potential future auth methods
    const firebaseUid = `email|${email.toLowerCase()}`;
    const existingFirebaseUser = await User.findOne({ firebaseUid });
    if (existingFirebaseUser) {
      // This might indicate a logic issue if email check passed but this fails
      console.warn(`Potential duplicate firebaseUid detected: ${firebaseUid}`);
      return res.status(400).json({ success: false, error: "User authentication profile already exists" });
    }

    // --- Create new user ---
    const newUser = await User.create({
      email: email.toLowerCase(),
      firebaseUid,
      gender, // --- FIX: Pass 'gender' to User.create ---
      phone, // Pass phone if provided
      profile: {
        firstName: firstName || email.split("@")[0], // Default first name from email
        lastName: lastName || "", // Default empty last name
        displayName: displayName || firstName || email.split("@")[0], // Default display name
        level: level || "beginner", // Default level
      },
      // ratings will use default values from the model
    });

    res.status(201).json({
      success: true,
      message: "User created successfully. Please request OTP to login.", // Guide user to next step
      user: { // Return minimal info, user needs to login to get full profile + token
        id: newUser._id,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    // Handle Mongoose validation errors more specifically
    if (error.name === 'ValidationError') {
        // Extract meaningful messages from validation errors
        const messages = Object.values(error.errors).map(el => el.message);
        return res.status(400).json({ success: false, error: messages.join(', ') });
    }

    // Handle duplicate key errors (e.g., if unique index constraint fails despite checks)
    if (error.code === 11000) {
      // Determine which field caused the duplicate error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, error: `User with this ${field} already exists` });
    }

    // General server error
    res.status(500).json({ success: false, error: "Failed to create user due to server error" });
  }
};

