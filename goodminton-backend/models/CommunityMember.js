/**
 * @file models/CommunityMember.js
 * @description Mongoose schema describing the membership relationship between users and communities
 */
const mongoose = require("mongoose");

const communityMemberSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "pending", "banned"],
      default: "pending",
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

communityMemberSchema.index({ community: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CommunityMember", communityMemberSchema);

