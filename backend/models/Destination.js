// models/Destination.js
const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  priority:  { type: Number, required: true },      // ← new
  reached:   { type: Boolean, default: false },
  reachedAt: Date
});

module.exports = mongoose.model('Destination', destinationSchema);
