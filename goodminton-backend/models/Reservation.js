const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  courtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Court",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: String, // "2025-02-03"
    required: true,
  },
  hour: {
    type: Number, // e.g., 8, 9, ... 18
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 限制同一个球馆同一天同一小时不能重复预定
reservationSchema.index({ courtId: 1, date: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model("Reservation", reservationSchema);
