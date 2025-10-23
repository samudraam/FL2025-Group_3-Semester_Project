const mongoose = require("mongoose");

const authTokenSchema = new mongoose.Schema({
  email: String,
  phone: String,
  token: String,
  type: { type: String, enum: ["email", "sms", "otp"], required: true },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15分钟过期
    index: { expires: "15m" }, // 自动删除过期文档
  },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// 复合索引，确保快速查询
authTokenSchema.index({ token: 1, type: 1, used: 1 });

module.exports = mongoose.model("AuthToken", authTokenSchema);
