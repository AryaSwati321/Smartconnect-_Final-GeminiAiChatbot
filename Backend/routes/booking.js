const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ServiceCategory = require('../models/ServiceCategory');
const Provider = require('../models/Provider');
const { verifyToken } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Upload setup for review photos
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper to check vendor approval status
async function checkVendorApproval(req, res) {
  if (req.user.role !== 'vendor') {
    return false;
  }
  
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('vendorApproved').lean();
  
  if (!user?.vendorApproved) {
    res.status(403).json({ 
      msg: 'Your vendor account is pending admin approval. You cannot perform this action until approved.' 
    });
    return false;
  }
  
  return true;
}

function parsePositiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Number(num.toFixed(2));
}

function emitBookingUpdate(req, booking, extra = {}) {
  const io = req.app.get('io');
  if (!io || !booking) return;

  const payload = {
    bookingId: booking._id,
    status: booking.status,
    serviceType: booking.serviceType || '',
    vendorId: booking.vendor || null,
    assignedProvider: booking.assignedProvider || null,
    bookingTime: booking.bookingTime || booking.createdAt,
    updatedAt: booking.updatedAt || new Date(),
    location: booking.location?.coordinates?.length === 2
      ? { lat: booking.location.coordinates[1], lng: booking.location.coordinates[0] }
      : null,
    providerLiveLocation: booking.providerLiveLocation?.coordinates?.length === 2
      ? { lat: booking.providerLiveLocation.coordinates[1], lng: booking.providerLiveLocation.coordinates[0] }
      : null,
    ...extra
  };

  io.to(`booking:${booking._id}`).emit('booking:update', payload);
  if (booking.user) io.to(String(booking.user)).emit('booking:update', payload);
  if (booking.vendor) io.to(String(booking.vendor)).emit('booking:update', payload);
  if (
    booking.assignedProvider &&
    String(booking.assignedProvider) !== String(booking.vendor || '')
  ) {
    io.to(String(booking.assignedProvider)).emit('booking:update', payload);
  }
}

/* ---------------------------------------
   CREATE BOOKING (USER)
---------------------------------------- */
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ msg: 'Only users can create bookings' });
    }

    const { categoryId, vendorId, serviceType, lat, lng, address, bookingTime, totalAmount, currency } = req.body;

    if (!lat || !lng || !categoryId || !vendorId) {
      return res.status(400).json({ msg: 'Vendor, location and category are required' });
    }

    const provider = await Provider.findById(vendorId).select('_id businessName status').lean();
    if (!provider) {
      return res.status(404).json({ msg: 'Selected vendor not found' });
    }
    if (provider.status !== 'verified') {
      return res.status(400).json({ msg: 'Selected vendor is not yet approved by admin' });
    }

    const category = await ServiceCategory.findById(categoryId).select('name').lean();
    if (!category) {
      return res.status(404).json({ msg: 'Service category not found' });
    }

    const booking = await Booking.create({
      user: req.user._id,
      vendor: provider._id,
      category: categoryId,
      serviceType: serviceType || category.name || '',
      bookingTime: bookingTime ? new Date(bookingTime) : new Date(),
      status: 'pending',
      address,
      totalAmount: parsePositiveNumber(totalAmount),
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'INR',
      location: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)]
      },
      history: [
        {
          action: 'pending',
          by: req.user._id,
          byModel: 'User',
          note: 'Booking request created'
        }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      const realtimePayload = {
        type: 'booking_request',
        title: 'New service request near your location',
        message: `New ${booking.serviceType || category.name} booking request`,
        bookingId: booking._id,
        serviceType: booking.serviceType || category.name,
        vendorId: provider._id,
        userId: req.user._id,
        status: booking.status,
        bookingTime: booking.bookingTime,
        location: {
          lat: Number(lat),
          lng: Number(lng)
        },
        at: new Date().toISOString()
      };

      io.to(provider._id.toString()).emit('vendor:notification', realtimePayload);
      io.to(provider._id.toString()).emit('booking:new', realtimePayload);
    }

    emitBookingUpdate(req, booking, { stage: 'pending' });

    return res.json(booking);
  } catch (err) {
    console.error('create booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET ALL BOOKINGS FOR VENDOR/USER
   (Returns combined list of all bookings)
---------------------------------------- */
router.get('/', verifyToken, async (req, res) => {
  try {
    let bookings = [];

    if (req.user.role === 'vendor') {
      // For vendors: get all bookings (pending + accepted + in progress + completed)
      const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
      if (provider) {
        bookings = await Booking.find({
          $or: [{ vendor: provider._id }, { assignedProvider: provider._id }]
        })
          .populate('user', '_id name email phone defaultAddress')
          .populate('category', '_id name')
          .sort({ createdAt: -1 })
          .lean();
      }
    } else if (req.user.role === 'user') {
      // For users: get their own bookings
      bookings = await Booking.find({ user: req.user._id })
        .populate('vendor', '_id businessName')
        .populate('category', '_id name')
        .sort({ createdAt: -1 })
        .lean();
    }

    return res.json(bookings || []);
  } catch (err) {
    console.error('get all bookings error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR PENDING BOOKINGS
   (Bookings awaiting vendor approval)
---------------------------------------- */
router.get('/vendor/pending', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get all pending bookings assigned to this vendor
    const bookings = await Booking.find({
      vendor: provider._id,
      status: 'pending'
    })
      .populate('user', '_id name email phone defaultAddress')
      .populate('category', '_id name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings || []);
  } catch (err) {
    console.error('get vendor pending bookings error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR ALL BOOKINGS
   (Accepted, in progress, completed)
---------------------------------------- */
router.get('/vendor/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get all bookings (accepted, in progress, completed) for this vendor
    const bookings = await Booking.find({
      $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
      status: { $in: ['accepted', 'on_the_way', 'in_progress', 'completed'] }
    })
      .populate('user', '_id name email phone defaultAddress')
      .populate('category', '_id name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings || []);
  } catch (err) {
    console.error('get vendor all bookings error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR DASHBOARD STATS
   (Counts by status for dashboard)
---------------------------------------- */
router.get('/vendor/dashboard/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get counts by status
    const statuses = ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed'];
    const stats = {};

    for (const status of statuses) {
      const count = await Booking.countDocuments({
        $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
        status: status
      });
      stats[status] = count;
    }

    return res.json(stats);
  } catch (err) {
    console.error('get vendor dashboard stats error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR WORK IN PROGRESS BOOKINGS
   (Accepted, on_the_way, in_progress)
---------------------------------------- */
router.get('/vendor/work-in-progress', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id businessName').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get active bookings (accepted, on_the_way, in_progress, completion_requested)
    // Removed: completion_confirmed (no longer used - goes directly to completed)
    const bookings = await Booking.find({
      $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
      status: { $in: ['accepted', 'on_the_way', 'in_progress', 'completion_requested'] }
    })
      .populate('user', '_id name email phone defaultAddress')
      .populate('category', '_id name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings || []);
  } catch (err) {
    console.error('get vendor work in progress error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR COMPLETED TASKS
   (Show all completed bookings)
---------------------------------------- */
router.get('/vendor/completed-tasks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id businessName').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get completed bookings
    const bookings = await Booking.find({
      $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
      status: 'completed'
    })
      .populate('user', '_id name email phone defaultAddress')
      .populate('category', '_id name')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(bookings || []);
  } catch (err) {
    console.error('get vendor completed tasks error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET VENDOR SERVICE REQUEST HISTORY
   (Show all service requests - pending, accepted, completed)
---------------------------------------- */
router.get('/vendor/service-request-history', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can access this' });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id businessName').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Get all requests for this vendor (all statuses)
    const bookings = await Booking.find({
      $or: [{ vendor: provider._id }, { assignedProvider: provider._id }]
    })
      .populate('user', '_id name email phone defaultAddress')
      .populate('category', '_id name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(bookings || []);
  } catch (err) {
    console.error('get vendor service request history error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   UPDATE BOOKING STATUS (VENDOR)
   Updates status and emits real-time updates
---------------------------------------- */
router.post('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only vendors can update status' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const { status } = req.body;
    const validStatuses = ['on_the_way', 'in_progress', 'completion_requested'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    const requiredCurrentStatus = {
      on_the_way: 'accepted',
      in_progress: 'on_the_way',
      completion_requested: 'in_progress'
    }[status];

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
        status: requiredCurrentStatus
      },
      {
        $set: { status },
        $push: {
          history: {
            action: status,
            by: provider._id,
            byModel: 'Provider',
            note: `Vendor updated status to ${status}`
          }
        }
      },
      { new: true }
    )
      .populate('user', '_id name email phone')
      .populate('category', '_id name');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found or invalid status transition' });
    }

    emitBookingUpdate(req, booking, { stage: status });

    return res.json(booking);
  } catch (err) {
    console.error('update booking status error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   USER CONFIRM COMPLETION
   USER-DRIVEN COMPLETION WORKFLOW
---------------------------------------- */
router.post('/:id/confirm-completion', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ msg: 'Only users can confirm completion' });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: 'completion_requested'
      },
      {
        $set: { status: 'completed' },
        $push: {
          history: {
            action: 'completed',
            by: req.user._id,
            byModel: 'User',
            note: 'User approved service completion'
          }
        }
      },
      { new: true }
    )
      .populate('assignedProvider vendor user category');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found or not ready for confirmation' });
    }

    const io = req.app.get('io');
    if (io && booking.assignedProvider) {
      io.to(String(booking.assignedProvider)).emit('vendor:notification', {
        type: 'completion_approved',
        bookingId: booking._id,
        status: 'completed',
        message: 'User has approved service completion. Booking is now complete.',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, booking, { stage: 'completed' });

    return res.json(booking);
  } catch (err) {
    console.error('confirm completion error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   USER REJECT COMPLETION REQUEST
   Changes status from completion_requested back to in_progress
---------------------------------------- */
router.post('/:id/reject-completion', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ msg: 'Only users can reject completion' });
    }

    const { reason } = req.body || {};

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: 'completion_requested'
      },
      {
        $set: { status: 'in_progress' },
        $push: {
          history: {
            action: 'completion_rejected',
            by: req.user._id,
            byModel: 'User',
            note: reason || 'User rejected completion request - work needs to be redone'
          }
        }
      },
      { new: true }
    )
      .populate('assignedProvider vendor user category');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found or not ready for rejection' });
    }

    const io = req.app.get('io');
    if (io && booking.assignedProvider) {
      io.to(String(booking.assignedProvider)).emit('vendor:notification', {
        type: 'completion_rejected',
        bookingId: booking._id,
        status: 'in_progress',
        message: `User has rejected your completion request. ${reason ? 'Reason: ' + reason : 'Please review and resubmit.'}`,
        rejectionReason: reason || 'No reason provided',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, booking, { stage: 'in_progress', reason: reason || 'Completion rejected' });

    return res.json(booking);
  } catch (err) {
    console.error('reject completion error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   PROVIDER ACCEPT BOOKING
   VENDOR APPROVAL FLOW: DIRECT ACCEPTANCE
---------------------------------------- */
router.post('/:id/accept', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers can accept' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }
    if (provider.status !== 'verified') {
      return res.status(403).json({ msg: 'Your vendor account is awaiting admin approval' });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        vendor: provider._id
      },
      {
        $set: {
          status: 'accepted',
          assignedProvider: provider._id
        },
        $push: {
          history: {
            action: 'accepted',
            by: provider._id,
            byModel: 'Provider',
            note: 'Vendor accepted the booking request'
          }
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(409).json({ msg: 'Booking not found or already processed' });
    }

    const io = req.app.get('io');
    if (io && booking.user) {
      io.to(String(booking.user)).emit('user:notification', {
        type: 'booking_accepted',
        bookingId: booking._id,
        status: 'accepted',
        message: 'Your booking request has been accepted by the vendor!',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, booking, { stage: 'accepted' });

    return res.json(booking);
  } catch (err) {
    console.error('accept booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   PROVIDER REJECT BOOKING
   VENDOR APPROVAL FLOW: NO REASSIGNMENT
---------------------------------------- */
router.post('/:id/reject', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers can reject' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const { reason } = req.body || {};

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }
    if (provider.status !== 'verified') {
      return res.status(403).json({ msg: 'Your vendor account is awaiting admin approval' });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        vendor: provider._id
      },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason || 'Vendor rejected the booking request',
          rejectedAt: new Date()
        },
        $push: {
          history: {
            action: 'rejected',
            by: provider._id,
            byModel: 'Provider',
            note: reason || 'Vendor rejected the booking request'
          }
        }
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found or already processed' });
    }

    const io = req.app.get('io');
    if (io && booking.user) {
      io.to(String(booking.user)).emit('user:notification', {
        type: 'booking_rejected',
        bookingId: booking._id,
        status: 'rejected',
        message: `Your booking request was rejected by the vendor. Reason: ${reason || 'No reason provided'}`,
        rejectionReason: reason || 'No reason provided',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, booking, { stage: 'rejected', reason: reason || 'Vendor rejected' });

    return res.json(booking);
  } catch (err) {
    console.error('reject booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   PROVIDER UPDATE LIVE LOCATION
---------------------------------------- */
router.post('/:id/location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers allowed' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const { lat, lng } = req.body;
    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }
    if (provider.status !== 'verified') {
      return res.status(403).json({ msg: 'Your vendor account is awaiting admin approval' });
    }

    const updated = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedProvider: provider._id,
        status: { $in: ['accepted', 'on_the_way'] }
      },
      {
        $set: {
          providerLiveLocation: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          status: 'on_the_way'
        },
        $push: {
          history: {
            action: 'on_the_way',
            by: provider._id,
            byModel: 'Provider',
            note: 'Vendor marked on the way'
          }
        }
      }
      ,
      { new: true }
    );

    if (!updated) return res.status(404).json({ msg: 'Booking not found' });

    const io = req.app.get('io');
    if (io && updated.user) {
      io.to(String(updated.user)).emit('user:notification', {
        type: 'booking_on_the_way',
        bookingId: updated._id,
        status: 'on_the_way',
        message: 'Vendor is on the way',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, updated, { stage: 'on_the_way' });

    return res.json(updated);
  } catch (err) {
    console.error('location update error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   UPDATE REAL-TIME PROVIDER LOCATION
   (Continuous tracking - doesn't change status)
---------------------------------------- */
router.post('/:id/update-location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers allowed' });
    }

    const { lat, lng } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ msg: 'Location (lat, lng) required' });
    }

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Update location without changing status
    const updated = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [{ vendor: provider._id }, { assignedProvider: provider._id }],
        status: { $in: ['accepted', 'on_the_way', 'in_progress'] }
      },
      {
        $set: {
          providerLiveLocation: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ msg: 'Booking not found or not in active state' });
    }

    // Emit real-time location update via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`booking:${updated._id}`).emit('providerLocationUpdate', {
        bookingId: updated._id,
        providerId: provider._id,
        lat: Number(lat),
        lng: Number(lng),
        at: new Date().toISOString()
      });
    }

    return res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('update location error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   PROVIDER START SERVICE
---------------------------------------- */
router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers allowed' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id status').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }
    if (provider.status !== 'verified') {
      return res.status(403).json({ msg: 'Your vendor account is awaiting admin approval' });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedProvider: provider._id,
        status: { $in: ['accepted', 'on_the_way'] }
      },
      {
        $set: { status: 'in_progress' },
        $push: {
          history: {
            action: 'in_progress',
            by: provider._id,
            byModel: 'Provider',
            note: 'Service started'
          }
        }
      },
      { new: true }
    );

    if (!booking) return res.status(400).json({ msg: 'Cannot start service' });

    const io = req.app.get('io');
    if (io && booking.user) {
      io.to(String(booking.user)).emit('user:notification', {
        type: 'booking_in_progress',
        bookingId: booking._id,
        status: 'in_progress',
        message: 'Vendor started working on your service',
        at: new Date().toISOString()
      });
    }

    emitBookingUpdate(req, booking, { stage: 'in_progress' });

    return res.json(booking);
  } catch (err) {
    console.error('start booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   COMPLETE BOOKING (DEPRECATED - use user approval instead)
   Note: Booking is now completed when user approves the completion request
---------------------------------------- */
router.post('/:id/complete', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ msg: 'Only providers can access this endpoint' });
    }

    // Check vendor approval status
    const approved = await checkVendorApproval(req, res);
    if (!approved) return;

    const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
    if (!provider) {
      return res.status(400).json({ msg: 'Vendor profile not found' });
    }

    // Check if booking exists and is in completion_requested status
    const booking = await Booking.findOne({
      _id: req.params.id,
      assignedProvider: provider._id,
      status: 'completion_requested'
    });

    if (!booking) {
      return res.status(400).json({ 
        msg: 'Booking workflow has changed. The user must approve your completion request. You will receive a notification once they do.'
      });
    }

    // If we get here, the booking is waiting for user approval
    return res.json({
      msg: 'Completion request is pending user approval. You will be notified once the user reviews your work.',
      bookingId: booking._id,
      status: booking.status
    });

  } catch (err) {
    console.error('complete booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   USER RATE & REVIEW COMPLETED BOOKING
---------------------------------------- */
router.post('/:id/review', verifyToken, upload.array('photos', 5), async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({ msg: 'Only users can review bookings' });
    }

    const { rating, review = '' } = req.body || {};
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'completed'
    });

    if (!booking) {
      return res.status(404).json({ msg: 'Completed booking not found' });
    }

    const providerId = booking.assignedProvider || booking.vendor;
    if (!providerId) {
      return res.status(400).json({ msg: 'Provider not found for this booking' });
    }

    const photos = (req.files || []).map((f) => f.filename);

    booking.feedback = {
      rating: numericRating,
      comments: String(review).trim(),
      photos
    };
    booking.history.push({
      action: 'reviewed',
      by: req.user._id,
      byModel: 'User',
      note: `User rated ${numericRating} stars`
    });
    await booking.save();

    const provider = await Provider.findById(providerId);
    if (!provider) return res.status(404).json({ msg: 'Provider not found' });

    provider.reviews = Array.isArray(provider.reviews) ? provider.reviews : [];
    const existingIndex = provider.reviews.findIndex(
      (r) => String(r.booking) === String(booking._id)
    );
    const reviewPayload = {
      user: req.user._id,
      booking: booking._id,
      rating: numericRating,
      review: String(review).trim(),
      photos,
      createdAt: new Date()
    };

    if (existingIndex >= 0) {
      provider.reviews[existingIndex] = reviewPayload;
    } else {
      provider.reviews.push(reviewPayload);
    }

    provider.reviewsCount = provider.reviews.length;
    const total = provider.reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    provider.avgRating = provider.reviewsCount ? Number((total / provider.reviewsCount).toFixed(1)) : 0;
    await provider.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(provider._id)).emit('vendor:notification', {
        type: 'new_review',
        title: 'New rating received',
        message: `You received ${numericRating} star rating`,
        bookingId: booking._id,
        rating: numericRating,
        review: String(review).trim(),
        at: new Date().toISOString()
      });

      emitBookingUpdate(req, booking, { stage: 'completed', reviewed: true, rating: numericRating });
    }

    return res.json({
      msg: 'Review submitted successfully',
      bookingId: booking._id,
      rating: numericRating,
      review: String(review).trim(),
      provider: {
        id: provider._id,
        avgRating: provider.avgRating,
        reviewsCount: provider.reviewsCount
      }
    });
  } catch (err) {
    console.error('review booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET BOOKINGS (USER / PROVIDER)
---------------------------------------- */
router.get('/', verifyToken, async (req, res) => {
  try {
    let bookings;

    if (req.user.role === 'user') {
      bookings = await Booking.find({ user: req.user._id })
        .populate('assignedProvider vendor category')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'vendor') {
      const provider = await Provider.findOne({ userRef: req.user._id }).select('_id').lean();
      if (!provider) return res.json([]);

      bookings = await Booking.find({
        $or: [{ vendor: provider._id }, { assignedProvider: provider._id }]
      })
        .populate('user category')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ msg: 'Invalid role' });
    }

    return res.json(bookings);
  } catch (err) {
    console.error('get bookings error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

/* ---------------------------------------
   GET SINGLE BOOKING (TRACKING)
---------------------------------------- */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user assignedProvider vendor category');

    return res.json(booking);
  } catch (err) {
    console.error('get booking error', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
