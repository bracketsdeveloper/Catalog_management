const mongoose = require('mongoose');

const AndroidActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  start: {
    type: Date,
    default: Date.now
  },
  end: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('AndroidActivity', AndroidActivitySchema);
