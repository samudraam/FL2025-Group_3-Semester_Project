const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courtRatingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courtId: { type: mongoose.Schema.Types.ObjectId, ref: "Court", required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
}, { timestamps: true });

courtRatingSchema.index({ userId: 1, courtId: 1 }, { unique: true }); // ✅ 一个用户对一个球场只能打一次分

module.exports = mongoose.model("CourtRating", courtRatingSchema);
