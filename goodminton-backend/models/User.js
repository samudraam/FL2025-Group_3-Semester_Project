const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    // Firebase Auth 提供的唯一用户ID，这是核心关联字段
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true, // 为常用查询字段添加索引以提高性能
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // 允许邮箱为空，但如果存在，则必须唯一
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // 允许手机号为空，但如果存在，则必须唯一
      validate: {
        validator: function (v) {
          // 美国手机号验证
          return /^\+1\d{10}$/.test(v);
        },
        message: "Please provide a valid US phone number (+1XXXXXXXXXX)",
      },
    },
    profile: {
      firstName: String,
      lastName: String,
      displayName: String,
      avatar: String,
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        default: "beginner",
      },
      points: { type: Number, default: 1000 }, // ELO-like rating system
      location: {
        city: String,
        state: String,
        zipCode: String,
      },
      bio: String,
      preferredPlayStyle: [String], // singles, doubles, mixed
    },
    stats: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isVerified: { type: Boolean, default: false },
    preferences: {
      notifications: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true },
    },
  },
  {
    // (推荐) 使用此选项自动管理 createdAt 和 updatedAt 字段
    timestamps: true,
    toJSON: { virtuals: true }, // 确保虚拟字段在输出为JSON时可见
    toObject: { virtuals: true }, // 确保虚拟字段在转换为普通对象时可见
  }
);

// 虚拟字段：全名
userSchema.virtual("profile.fullName").get(function () {
  if (this.profile && this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return ""; // 如果没有名字，返回空字符串
});

// 更新统计信息的方法
userSchema.methods.updateStats = function () {
  this.stats.winRate =
    this.stats.gamesPlayed > 0
      ? (this.stats.gamesWon / this.stats.gamesPlayed) * 100
      : 0;
  return this.save();
};

/**
 * Add a friend to the user's friends list
 * @param {String} friendId - The ID of the friend to add
 * @returns {Promise} - Promise that resolves when friend is added
 */
userSchema.methods.addFriend = function (friendId) {
  if (!this.friends.includes(friendId)) {
    this.friends.push(friendId);
    return this.save();
  }
  return Promise.resolve(this);
};

/**
 * Remove a friend from the user's friends list
 * @param {String} friendId - The ID of the friend to remove
 * @returns {Promise} - Promise that resolves when friend is removed
 */
userSchema.methods.removeFriend = function (friendId) {
  this.friends = this.friends.filter(
    (id) => id.toString() !== friendId.toString()
  );
  return this.save();
};

/**
 * Check if a user is already a friend
 * @param {String} friendId - The ID of the user to check
 * @returns {Boolean} - True if the user is already a friend
 */
userSchema.methods.isFriend = function (friendId) {
  return this.friends.some((id) => id.toString() === friendId.toString());
};

module.exports = mongoose.model("User", userSchema);
