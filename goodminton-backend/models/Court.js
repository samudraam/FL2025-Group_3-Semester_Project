const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courtSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },

    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    indoor: { type: Boolean, default: true },
    price: { type: Number, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    // ratingStats: {
    //     totalScore: { type: Number, default: 0 },
    //     ratingCount: { type: Number, default: 0 },
    // },
    courts: { type: Number, default: 1 },
    availableCourts: { type: Number, default: 1 },
    openHours: {
        open: String,
        close: String,
    },
    contact: {type: String, default: ""},
});

courtSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Court", courtSchema);

