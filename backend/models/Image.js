const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    name: String,
    fileName: String,
    path: String
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Image', imageSchema);
