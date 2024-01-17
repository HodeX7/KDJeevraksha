const mongoose = require("mongoose");

const kennelSchema = new mongoose.Schema({
    kennelId: Number,
    isOccupied: Boolean
});

kennelSchema.pre('save', async function (next) {
    if (!this.kennelId) {
        // Find the highest existing kennelId and increment it
        const highestKennel = await this.constructor.findOne({}).sort('-kennelId').exec();
        this.kennelId = (highestKennel ? highestKennel.kennelId : 0) + 1;
    }
    next();
});

kennelSchema.statics.assignKennelToDog = async function (dogId) {
    const availableKennel = await this.findOne({ isOccupied: false }).exec();

    if (availableKennel) {
        availableKennel.isOccupied = true;
        await availableKennel.save();
        return availableKennel;
    }

    return null; // No available kennels
};

module.exports = mongoose.model('Kennel', kennelSchema);