const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AuthToken = require("../models/AuthToken");
const { sendOTPEmail } = require("../services/emailService");

// --- Helper Functions ---

/**
 * Generate 6-digit OTP code
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
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Check if user exists in database
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email. Please register first.",
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Save OTP to database with 15 minute expiration
    await AuthToken.create({
      email: email.toLowerCase(),
      token: otp,
      type: "otp",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.json({
      success: true,
      message: "Verification code sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send verification code",
    });
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
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    // Find valid, unused, unexpired OTP
    const authToken = await AuthToken.findOne({
      email: email.toLowerCase(),
      token: otp.toString(),
      type: "otp",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid or expired verification code. Please request a new one.",
      });
    }

    // Mark OTP as used to prevent reuse
    authToken.used = true;
    await authToken.save();

    // Get user
    const user = await User.findOne({ email: authToken.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Update user's last login time
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT (JSON Web Token) as login credential
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    // Return token and user data directly (no redirect needed for mobile!)
    res.json({
      success: true,
      message: "Login successful",
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      error: "Verification failed",
    });
  }
};

/**
 * @desc    User logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie("authToken");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
};

/**
 * @desc    Get current logged-in user information
 * @route   GET /api/auth/me
 * @access  Private (requires auth middleware)
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user.userId is attached by auth middleware after JWT verification
    const user = await User.findById(req.user.userId)
      .select("-__v") // Exclude Mongoose __v field
      .populate("friends", "profile.displayName profile.avatar"); // Populate friends information

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve user data.",
    });
  }
};

/**
 * @desc    Create a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      displayName,
      phone,
      level,
      gender,
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const normalizedGender =
      typeof gender === "string" ? gender.trim().toLowerCase() : "";
    const allowedGenders = ["male", "female"];
    if (!allowedGenders.includes(normalizedGender)) {
      return res.status(400).json({
        success: false,
        error: "Gender is required and must be either 'male' or 'female'",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Create unique firebaseUid for email-based user
    const firebaseUid = `email|${email.toLowerCase()}`;

    // Check if firebaseUid already exists
    const existingFirebaseUser = await User.findOne({ firebaseUid });
    if (existingFirebaseUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this authentication method",
      });
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      firebaseUid,
      phone,
      gender: normalizedGender,
      profile: {
        firstName: firstName || email.split("@")[0],
        lastName: lastName || "",
        displayName: displayName || firstName || email.split("@")[0],
        level: level || "beginner",
      },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user._id,
        email: user.email,
        gender: user.gender,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "User with this email or phone already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};
