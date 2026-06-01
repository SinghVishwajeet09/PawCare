const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
  animalType: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  photoUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['Healthy', 'Injured', 'Hungry', 'Needs Rescue'],
    default: 'Healthy'
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Emergency'],
    default: 'Medium'
  },
  assistanceType: {
    type: String,
    enum: ['Food', 'Medical', 'Rescue', 'Shelter', 'Other'],
    default: 'Other'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  locationDetails: {
    address: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    }
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastFed: {
    type: Date
  }
}, { timestamps: true });

animalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Animal', animalSchema);
