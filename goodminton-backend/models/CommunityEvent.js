/**
 * @file models/CommunityEvent.js
 * @description Mongoose schema for events scoped to a community
 */
const mongoose = require("mongoose");

const communityEventSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 240,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    rsvpLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    visibility: {
      type: String,
      enum: ["community", "public"],
      default: "community",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

communityEventSchema.index({ community: 1, startAt: 1 });

module.exports = mongoose.model("CommunityEvent", communityEventSchema);
