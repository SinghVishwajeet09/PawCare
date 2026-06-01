const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true
  },
  firebaseUid: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'firebase'],
    default: 'local'
  },
  password: {
    type: String,
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCodeHash: {
    type: String,
    select: false
  },
  emailVerificationExpiresAt: {
    type: Date,
    select: false
  },
  loginVerificationCodeHash: {
    type: String,
    select: false
  },
  loginVerificationExpiresAt: {
    type: Date,
    select: false
  },
  lastLoginAt: {
    type: Date
  },
  role: {
    type: String,
    enum: ['volunteer', 'ngo', 'standard'],
    default: 'standard'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  fcmToken: {
    type: String
  },
  ngoDetails: {
    description: String,
    capacity: Number,
    contactNumber: String
  }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);
