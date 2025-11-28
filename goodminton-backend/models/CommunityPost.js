/**
 * @file models/CommunityPost.js
 * @description Mongoose schema for community-specific posts
 */
const mongoose = require("mongoose");

const communityPostSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    visibility: {
      type: String,
      enum: ["community", "public"],
      default: "community",
    },
  },
  { timestamps: true }
);

communityPostSchema.index({ community: 1, createdAt: -1 });

module.exports = mongoose.model("CommunityPost", communityPostSchema);

