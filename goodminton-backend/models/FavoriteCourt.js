const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const favoriteCourtSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        courtId: {
            type: Schema.Types.ObjectId,
            ref: 'Court',
            required: true,
            index: true,
        },

        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    }
);

favoriteCourtSchema.index({ userId: 1, courtId: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteCourt", favoriteCourtSchema);