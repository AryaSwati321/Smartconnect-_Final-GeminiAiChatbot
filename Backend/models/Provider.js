// models/Provider.js
const mongoose = require('mongoose');

const DaySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '10:00' },
    end: { type: String, default: '18:00' }
  },
  { _id: false }
);

const ProviderSchema = new mongoose.Schema(
  {
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    businessName: { type: String, trim: true },
    description: { type: String, trim: true, default: '' },
    reviewsCount: { type: Number, default: 0 },
    priceEstimateMin: { type: Number, default: null },
    priceEstimateMax: { type: Number, default: null },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String, trim: true, default: '' },
        photos: [{ type: String, trim: true }],
        createdAt: { type: Date, default: Date.now }
      }
    ],

    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }
    ],

    status: {
      type: String,
      enum: ['pending', 'verified', 'blocked'],
      default: 'pending',
      index: true
    },

    // ✅ GEOJSON LOCATION (PERMANENT)
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [lng, lat]
      }
    },

    availability: {
      mon: { type: DaySchema, default: () => ({ enabled: true }) },
      tue: { type: DaySchema, default: () => ({ enabled: true }) },
      wed: { type: DaySchema, default: () => ({ enabled: true }) },
      thu: { type: DaySchema, default: () => ({ enabled: true }) },
      fri: { type: DaySchema, default: () => ({ enabled: true }) },
      sat: { type: DaySchema, default: () => ({ enabled: true }) },
      sun: { type: DaySchema, default: () => ({ enabled: false }) }
    },

    avgRating: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// ✅ REQUIRED FOR GEO SEARCH
ProviderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Provider', ProviderSchema);
