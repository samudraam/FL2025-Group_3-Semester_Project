/**
 * @file models/Message.js
 * @description Message data model for direct messaging between users
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying of conversation messages
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
