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
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: function (v) {
          return /^\+1\d{10}$/.test(v);
        },
        message: "Please provide a valid US phone number (+1XXXXXXXXXX)",
      },
    },

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
      avatarPublicId: String,
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner",
      },
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
      mixed: { type: Number, default: 1000 }, // 混双积分 (XD rating)
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

/**
 * Virtual field to get full name from firstName and lastName
 */
userSchema.virtual("profile.fullName").get(function () {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return (
    this.profile.firstName || this.profile.lastName || this.profile.displayName
  );
});

/**
 * Update user stats (win rate) based on games played and won
 */
userSchema.methods.updateStats = async function () {
  if (this.stats.gamesPlayed > 0) {
    this.stats.winRate = (this.stats.gamesWon / this.stats.gamesPlayed) * 100;
  } else {
    this.stats.winRate = 0;
  }
  await this.save({ validateBeforeSave: false });
};

/**
 * Check if a user is already a friend
 */
userSchema.methods.isFriend = function (userId) {
  return this.friends.some(
    (friendId) => friendId.toString() === userId.toString()
  );
};

/**
 * Add a friend to the user's friends list (prevents duplicates)
 */
userSchema.methods.addFriend = async function (userId) {
  if (!this.isFriend(userId)) {
    this.friends.push(userId);
    await this.save({ validateBeforeSave: false });
  }
};

/**
 * Remove a friend from the user's friends list
 */
userSchema.methods.removeFriend = async function (userId) {
  this.friends = this.friends.filter(
    (friendId) => friendId.toString() !== userId.toString()
  );
  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model("User", userSchema);
