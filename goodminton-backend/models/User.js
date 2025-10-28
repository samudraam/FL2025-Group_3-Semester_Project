/**
 * @file models/User.js
 * @description 包含性别和多项积分的用户 Mongoose schema (User Mongoose schema with gender and multiple ratings)
 */
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    // ... firebaseUid, email, phone 保持不变 ...
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, validate: [validator.isEmail, "Please provide a valid email"], },
    phone: { type: String, unique: true, sparse: true, validate: { validator: function (v) { return /^\+1\d{10}$/.test(v); }, message: "Please provide a valid US phone number (+1XXXXXXXXXX)", }, },

    // 新增：性别字段 (New: Gender field)
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true, // 注册时必须提供 (Required during registration)
    },

    profile: {
      // ... firstName, lastName, displayName, avatar, level, location, bio, preferredPlayStyle 保持不变 ...
      firstName: String,
      lastName: String,
      displayName: String,
      avatar: String,
      level: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], default: "beginner", },
      location: { city: String, state: String, zipCode: String },
      bio: String,
      preferredPlayStyle: [String],
      // 移除旧的 points 字段 (Remove old points field)
      // points: { type: Number, default: 1000 },
    },

    // 新增：多项积分对象 (New: Multiple ratings object)
    ratings: {
      singles: { type: Number, default: 1000 }, // 男单/女单积分 (MS/WS rating)
      doubles: { type: Number, default: 1000 }, // 男双/女双积分 (MD/WD rating)
      mixed: { type: Number, default: 1000 },   // 混双积分 (XD rating)
    },

    // stats 和其他字段保持不变 (stats and other fields remain the same)
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
      // 可选：未来可以细分 stats (Optional: Can refine stats later)
      // singlesGamesPlayed: { type: Number, default: 0 },
      // doublesGamesPlayed: { type: Number, default: 0 },
      // mixedGamesPlayed: { type: Number, default: 0 },
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isVerified: { type: Boolean, default: false },
    preferences: {
      notifications: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- 虚拟字段和方法保持不变 ---
userSchema.virtual("profile.fullName").get(function () { /* ... */ });
userSchema.methods.updateStats = function () { /* ... */ };
userSchema.methods.isFriend = function (userId) { /* ... */ };
userSchema.methods.addFriend = async function (userId) { /* ... */ };
userSchema.methods.removeFriend = async function (userId) { /* ... */ };


module.exports = mongoose.model("User", userSchema);

