/**
 * @file models/Conversation.js
 * @description Conversation data model for tracking chat conversations between users
 */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure participants array always has exactly 2 users
conversationSchema.path("participants").validate(function (participants) {
  return participants.length === 2;
}, "Conversation must have exactly 2 participants");

// Index on participants for efficient querying (not unique to avoid multikey issues)
conversationSchema.index({ participants: 1 });

/**
 * Find or create a conversation between two users
 * @param {String} userId1 - First user ID
 * @param {String} userId2 - Second user ID
 * @returns {Promise<Conversation>} - Conversation document
 */
conversationSchema.statics.findOrCreateConversation = async function (
  userId1,
  userId2
) {
  const participants = [userId1, userId2].sort();

  let conversation = await this.findOne({
    participants: { $all: participants, $size: 2 },
  });

  if (!conversation) {
    conversation = await this.create({
      participants,
    });
  }

  return conversation;
};

module.exports = mongoose.model("Conversation", conversationSchema);
