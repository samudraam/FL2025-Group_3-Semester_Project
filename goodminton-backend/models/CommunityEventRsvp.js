/**
 * @file models/CommunityEventRsvp.js
 * @description Stores attendee RSVPs for community events
 */
const mongoose = require("mongoose");

const communityEventRsvpSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityEvent",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["going"],
      default: "going",
    },
  },
  {
    timestamps: true,
  }
);

communityEventRsvpSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CommunityEventRsvp", communityEventRsvpSchema);
