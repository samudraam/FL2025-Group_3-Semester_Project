/**
 * @file models/FriendRequest.js
 * @description Friend request data model for managing friend requests between users
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const friendRequestSchema = new Schema(
  {
    // User who sent the friend request
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // User who received the friend request
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status of the friend request
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    // Message sent with the friend request (optional)
    message: {
      type: String,
      maxlength: 200,
    },

    // When the request was accepted/rejected
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index to prevent duplicate friend requests
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

// Index for efficient querying
friendRequestSchema.index({ to: 1, status: 1 });
friendRequestSchema.index({ from: 1, status: 1 });

module.exports = mongoose.model("FriendRequest", friendRequestSchema);
