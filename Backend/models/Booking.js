const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    // USER who booked
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // PROVIDER who accepted
    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null
    },

    // VENDOR selected by user at request time
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null
    },

    // Vendors who already rejected this booking
    rejectedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
      }
    ],

    // SERVICE CATEGORY
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true
    },

    // BOOKING STATUS
    status: {
      type: String,
      enum: [
        'pending',
        'requested',
        'accepted',
        'rejected',
        'on_the_way',
        'in_progress',
        'completion_requested',
        'completion_confirmed',
        'completed',
        'cancelled'
      ],
      default: 'pending'
    },

    // Snapshot of service name at booking time
    serviceType: {
      type: String,
      default: ''
    },

    // Explicit booking request timestamp
    bookingTime: {
      type: Date,
      default: Date.now
    },

    // USER ADDRESS (optional)
    address: {
      type: String
    },

    // USER LOCATION (important for nearby search & tracking)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },

    // PROVIDER LIVE LOCATION (tracking)
    providerLiveLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },

    // HISTORY LOG (VERY IMPORTANT)
    history: [
      {
        action: String, // requested / accepted / completed
        by: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'history.byModel'
        },
        byModel: {
          type: String,
          enum: ['User', 'Provider', 'Admin']
        },
        note: String,
        at: {
          type: Date,
          default: Date.now
        }
      }
    ],

    feedback: {
      rating: Number,
      comments: String,
      photos: [String]
    },

    // Optional billing amount used for admin revenue analytics.
    totalAmount: {
      type: Number,
      default: null
    },

    currency: {
      type: String,
      default: 'INR'
    },

    // REJECTION REASON (when vendor rejects)
    rejectionReason: {
      type: String,
      default: null
    },

    // Timestamp when vendor rejected
    rejectedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// GEO INDEX (MANDATORY)
BookingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Booking', BookingSchema);
