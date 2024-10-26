const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  clickCount: { type: Number, default: 0 },
  visitorIds: { type: [String], default: [] },
});

module.exports = mongoose.model('Url', urlSchema);
