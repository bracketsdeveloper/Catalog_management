const mongoose = require('mongoose');

const BatteryEventSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  level:     { type: Number, required: true },    // e.g. 0.17
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BatteryEvent', BatteryEventSchema);
