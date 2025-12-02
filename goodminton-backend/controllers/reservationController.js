const Reservation = require("../models/Reservation");

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); 
// [8,9,10..18]

exports.getReservations = async (req, res) => {
  try {
    const courtId = req.params.courtId;
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({ error: "date is required (e.g. 2025-02-03)" });
    }

    const reservations = await Reservation.find({ courtId, date });

    const slots = HOURS.map(hour => {
      const r = reservations.find(x => x.hour === hour);
      return {
        hour,
        reserved: !!r,
        userId: r ? r.userId : null,
        reservationId: r ? r._id : null,
      };
    });

    res.json({
      courtId,
      date,
      slots,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};


exports.createReservation = async (req, res) => {
  try {
    const courtId = req.params.courtId;
    const { date, hour } = req.body;

    const userId = req.user.userId;

    if (!courtId || !date || hour === undefined) {
      return res.status(400).json({ error: "courtId, date, hour are required" });
    }

    if (hour < 8 || hour > 18) {
      return res.status(400).json({ error: "hour must be between 8 and 18" });
    }

    // 检查是否已被预定（unique index 保证只有一个）
    const exists = await Reservation.findOne({ courtId, date, hour });
    if (exists) {
      return res.status(400).json({ error: "This time slot is already reserved" });
    }

    const newR = await Reservation.create({
      courtId,
      userId,
      date,
      hour,
    });

    res.json({
      message: "Reservation successful",
      reservation: newR,
    });

  } catch (err) {
    // 如果出现重复 key，则说明这个时间段刚被别人预定了
    if (err.code === 11000) {
      return res.status(400).json({ error: "Time slot already reserved (conflict)" });
    }
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
