const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // matches register & login
  email: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false }, // used in login
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },

  // Optional fields (used later in profile step)
  phone: { type: String, trim: true },
  defaultAddress: { type: String, trim: true },
  avatar: { type: String, trim: true },
  vendorApproved: { type: Boolean, default: false },

  // GeoJSON point (optional)
  location: {
    type: { type: String, enum: ['Point'], default: undefined },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },

  // Vendor extra fields
  mobile: String,
  adhar: String,
  experience: String,
  address: String,
  workingArea: String,
  category: String,
  certification: String,
  authToken: { type: String, default: null, select: false },
  tokenIssuedAt: { type: Date, default: null },

  // One-time-passcode for login verification
  otpCode: { type: String, default: null, select: false },
  otpExpiresAt: { type: Date, default: null, select: false }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
