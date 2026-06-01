const mongoose = require('mongoose');

const rescueAlertSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  status: {
    type: String,
    enum: ['Reported', 'In Progress', 'Resolved'],
    default: 'Reported'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  nearbyNgos: [{
    sourceId: String,
    name: String,
    district: String,
    state: String,
    contactNumber: String,
    email: String
  }],
  notificationAttempts: [{
    ngoName: String,
    channel: String,
    target: String,
    status: String,
    reason: String,
    messageId: String,
    sentAt: Date
  }],
  notes: [{
    text: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('RescueAlert', rescueAlertSchema);
