// controllers/adminController.js
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');

async function resolveCategoryIds(categoryInput, fallbackText = '') {
  // fetch categories once per process; keep in memory for speed
  if (!global.__cats_cache) {
    global.__cats_cache = await ServiceCategory.find().select('_id name keywords').lean();
  }
  const catsCache = global.__cats_cache;

  const pick = (val) => {
    if (!val) return [];
    const text = String(val).trim();
    if (!text) return [];

    if (/^[a-f0-9]{24}$/i.test(text)) return [text];
    const exact = catsCache.find((c) => new RegExp(`^${text}$`, 'i').test(c.name));
    if (exact) return [exact._id];

    const variants = new Set();
    const base = text.toLowerCase();
    variants.add(base);
    if (base.endsWith('ing')) variants.add(base.slice(0, -3));
    if (base.endsWith('er')) variants.add(base.slice(0, -2));
    const snapshot = [...variants];
    snapshot.forEach((v) => {
      if (!v.endsWith('er')) variants.add(`${v}er`);
      if (!v.endsWith('ing')) variants.add(`${v}ing`);
    });

    for (const cat of catsCache) {
      const name = cat.name.toLowerCase();
      const kws = (cat.keywords || []).map((k) => String(k).toLowerCase());
      if ([...variants].some((v) => name.includes(v) || v.includes(name) || kws.includes(v))) {
        return [cat._id];
      }
    }
    return [];
  };

  const primary = pick(categoryInput);
  if (primary.length) return primary;
  return pick(fallbackText);
}

// Ensure every vendor user has a Provider document
async function backfillProvidersFromVendors() {
  const vendorUsers = await User.find({ role: 'vendor' })
    .select('_id name defaultAddress location vendorApproved category')
    .lean();
  const existing = await Provider.distinct('userRef');
  const missing = vendorUsers.filter((u) => !existing.some((id) => String(id) === String(u._id)));

  if (!missing.length) return 0;

  const docs = [];
  for (const u of missing) {
    const cats = await resolveCategoryIds(u.category, u.name);
    docs.push({
      userRef: u._id,
      businessName: u.name,
      description: u.defaultAddress || '',
      status: u.vendorApproved ? 'verified' : 'pending',
      location: u.location,
      categories: cats
    });
  }

  await Provider.insertMany(docs, { ordered: false });
  // Also ensure existing providers get category filled if missing
  const existingNeedingCategory = await Provider.find({
    userRef: { $in: existing },
    $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }],
  }).select('_id userRef businessName');
  const existingNeedingLocation = await Provider.find({
    userRef: { $in: existing },
    $or: [{ location: { $exists: false } }, { 'location.coordinates.1': { $exists: false } }],
  }).select('_id userRef');

  let updated = 0;
  for (const p of existingNeedingCategory) {
    const user = vendorUsers.find((u) => String(u._id) === String(p.userRef));
    const cats = await resolveCategoryIds(user?.category, p.businessName || user?.name);
    if (cats.length) {
      await Provider.findByIdAndUpdate(p._id, { $set: { categories: cats } });
      updated += 1;
    }
  }

  for (const p of existingNeedingLocation) {
    const user = vendorUsers.find((u) => String(u._id) === String(p.userRef));
    if (user?.location?.coordinates?.length === 2) {
      await Provider.findByIdAndUpdate(p._id, { $set: { location: user.location } });
      updated += 1;
    }
  }

  return docs.length + updated;
}

function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastNDaysStart(days) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - (days - 1));
  return now;
}

// Get all providers with filters for admin dashboard
exports.getAllProviders = async (req, res) => {
  try {
    await backfillProvidersFromVendors();

    const { status, page = 1, limit = 50 } = req.query; // Increased limit to see more providers
    
    // Build filter
    const filter = {};
    if (status && status !== 'all' && ['pending', 'verified', 'blocked'].includes(status)) {
      filter.status = status;
    }

    console.log('Fetching providers with filter:', filter);

    const providers = await Provider.find(filter)
      .populate('userRef', 'name email phone')
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Provider.countDocuments(filter);

    console.log(`[Admin] Found ${providers.length} providers with status: ${status || 'all'}`);
    console.log('Providers list:', providers.map(p => ({
      id: p._id,
      businessName: p.businessName,
      user: p.userRef?.email,
      status: p.status
    })));

    return res.json({
      success: true,
      count: providers.length,
      total,
      data: providers
    });
  } catch (err) {
    console.error('adminController.getAllProviders error:', err);
    return res.status(500).json({ 
      success: false,
      msg: 'Server error fetching providers' 
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    await backfillProvidersFromVendors();

    const todayStart = getStartOfDay();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const monthStart = getStartOfMonth();
    const last7DaysStart = getLastNDaysStart(7);

    const [
      totalProviders,
      pendingProviders,
      verifiedProviders,
      blockedProviders,
      totalUsers,
      totalVendors,
      totalBookings,
      dailyBookings,
      recentBookings
    ] = await Promise.all([
      Provider.countDocuments(),
      Provider.countDocuments({ status: 'pending' }),
      Provider.countDocuments({ status: 'verified' }),
      Provider.countDocuments({ status: 'blocked' }),
      User.countDocuments(),
      User.countDocuments({ role: 'vendor' }),
      Booking.countDocuments(),
      Booking.countDocuments({
        bookingTime: { $gte: todayStart, $lt: tomorrowStart }
      }),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('user', 'name email phone')
        .populate('vendor', 'businessName status')
        .populate('assignedProvider', 'businessName status')
        .populate('category', 'name')
        .lean()
    ]);

    const completedBookings = await Booking.countDocuments({ status: 'completed' });

    const [
      revenueSummary,
      revenueByDayRaw
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            totalAmount: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            todayRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$updatedAt', todayStart] }, { $lt: ['$updatedAt', tomorrowStart] }] },
                  '$totalAmount',
                  0
                ]
              }
            },
            monthRevenue: {
              $sum: {
                $cond: [{ $gte: ['$updatedAt', monthStart] }, '$totalAmount', 0]
              }
            }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            totalAmount: { $ne: null },
            updatedAt: { $gte: last7DaysStart }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$updatedAt'
              }
            },
            revenue: { $sum: '$totalAmount' },
            completedBookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const summary = revenueSummary[0] || { totalRevenue: 0, todayRevenue: 0, monthRevenue: 0 };

    const revenueByDay = revenueByDayRaw.map((item) => ({
      date: item._id,
      revenue: Number(item.revenue || 0),
      completedBookings: item.completedBookings || 0
    }));

    const completionRate = totalBookings
      ? Number(((completedBookings / totalBookings) * 100).toFixed(1))
      : 0;

    console.log(`[Admin] Dashboard stats - Total Providers: ${totalProviders}, Pending: ${pendingProviders}, Verified: ${verifiedProviders}, Blocked: ${blockedProviders}`);

    res.json({
      success: true,
      data: {
        providers: {
          total: totalProviders,
          pending: pendingProviders,
          verified: verifiedProviders,
          blocked: blockedProviders
        },
        users: totalUsers,
        vendors: totalVendors,
        bookings: totalBookings,
        dailyBookings,
        completedBookings,
        completionRate,
        revenue: {
          currency: 'INR',
          total: Number((summary.totalRevenue || 0).toFixed(2)),
          today: Number((summary.todayRevenue || 0).toFixed(2)),
          thisMonth: Number((summary.monthRevenue || 0).toFixed(2)),
          last7Days: revenueByDay
        },
        recentBookings: recentBookings
      }
    });
  } catch (err) {
    console.error('adminController.getDashboardStats error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching dashboard stats' 
    });
  }
};

// Update provider status
exports.updateProviderStatus = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { status } = req.body;

    if (!['pending', 'verified', 'blocked'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid status' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid provider ID' 
      });
    }

    const provider = await Provider.findById(providerId)
      .populate('userRef', 'name email role vendorApproved location category')
      .populate('categories', 'name');

    if (!provider) {
      return res.status(404).json({ 
        success: false,
        msg: 'Provider not found' 
      });
    }

    // When verifying, try to backfill location/category, but don't block approval.
    if (status === 'verified') {
      const hasProviderLoc = provider.location?.coordinates?.length === 2;
      const userLoc = provider.userRef?.location;
      const hasUserLoc = userLoc?.coordinates?.length === 2;

      if (!hasProviderLoc && hasUserLoc) {
        provider.location = {
          type: 'Point',
          coordinates: userLoc.coordinates
        };
      } else if (!hasProviderLoc) {
        // avoid invalid geo docs; remove empty location
        provider.location = undefined;
      }

      if (!provider.categories || provider.categories.length === 0) {
        const cats = await resolveCategoryIds(
          provider.userRef?.category,
          provider.businessName || provider.userRef?.name
        );
        if (cats.length) {
          provider.categories = cats;
        }
      }
    }

    // Always strip invalid geo payloads to avoid 2dsphere errors.
    if (!(provider.location?.coordinates?.length === 2)) {
      provider.location = undefined;
    }

    provider.status = status;
    await provider.save();

    // Keep user.vendorApproved in sync with provider status
    const vendorApproved = status === 'verified';
    if (provider.userRef?._id) {
      await User.findByIdAndUpdate(provider.userRef._id, { $set: { vendorApproved } });
    }

    console.log(`[Admin] Updated provider ${providerId} status to: ${status} | vendorApproved=${vendorApproved}`);

    res.json({
      success: true,
      msg: `Provider ${status} successfully`,
      data: provider
    });
  } catch (err) {
    console.error('adminController.updateProviderStatus error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error updating provider status' 
    });
  }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (
      status &&
      ['pending', 'requested', 'accepted', 'rejected', 'on_the_way', 'in_progress', 'completed', 'cancelled'].includes(status)
    ) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('category', 'name')
      .populate('vendor', 'businessName status')
      .populate('assignedProvider', 'businessName status')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: bookings
    });
  } catch (err) {
    console.error('adminController.getAllBookings error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching bookings' 
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid status' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid booking ID' 
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        msg: 'Booking not found' 
      });
    }

    // ADMIN RESTRICTIONS: Admins cannot approve initial requests
    // Only vendors can accept/reject pending/requested bookings
    if (['pending', 'requested'].includes(booking.status) && status === 'accepted') {
      return res.status(403).json({
        success: false,
        msg: 'Admin cannot approve initial requests. Vendors manage approvals. Only Complete or Cancel are allowed after vendor acceptance.'
      });
    }

    // Admins can only complete or cancel bookings that are already accepted/in progress
    const allowedStatusesForAdmin = ['completed', 'cancelled'];
    const requiredCurrentStatusesForAdmin = ['accepted', 'on_the_way', 'in_progress'];
    
    if (!allowedStatusesForAdmin.includes(status) && !['pending', 'rejected'].includes(status)) {
      // If trying to change to a non-terminal state, check permissions
      if (!requiredCurrentStatusesForAdmin.includes(booking.status)) {
        return res.status(403).json({
          success: false,
          msg: 'Admin can only Complete or Cancel bookings after vendor acceptance. Vendors control initial approvals.'
        });
      }
    }

    booking.status = status;
    booking.history = Array.isArray(booking.history) ? booking.history : [];
    booking.history.push({
      action: status,
      by: req.user._id,
      byModel: 'Admin',
      note: `Booking status updated by admin to ${status}`
    });
    await booking.save();

    await booking.populate('user', 'name email phone');
    await booking.populate('category', 'name');
    await booking.populate('vendor', 'businessName status');
    await booking.populate('assignedProvider', 'businessName status');

    res.json({
      success: true,
      msg: `Booking ${status} successfully`,
      data: booking
    });
  } catch (err) {
    console.error('adminController.updateBookingStatus error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error updating booking status' 
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role phone createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error('adminController.getAllUsers error:', err);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching users' 
    });
  }
};

// Delete provider (remove fake vendor)
exports.deleteProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid provider ID'
      });
    }

    const provider = await Provider.findById(providerId).lean();
    if (!provider) {
      return res.status(404).json({
        success: false,
        msg: 'Provider not found'
      });
    }

    await Provider.findByIdAndDelete(providerId);

    if (provider.userRef) {
      await User.findByIdAndUpdate(provider.userRef, { $set: { role: 'user', vendorApproved: false } });
    }

    return res.json({
      success: true,
      msg: 'Provider removed successfully'
    });
  } catch (err) {
    console.error('adminController.deleteProvider error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error removing provider'
    });
  }
};
