// controllers/providerController.js
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const ServiceCategory = require('../models/ServiceCategory');

// ---------- Helpers ----------
function ensureVendor(req, res) {
  if (!req.user) {
    res.status(401).json({ msg: 'Not authenticated' });
    return false;
  }
  if (req.user.role !== 'vendor') {
    res.status(403).json({ msg: 'Vendor only' });
    return false;
  }
  return true;
}

// ---------- Controllers ----------

/** GET /api/providers/me */
exports.getMe = async (req, res) => {
  if (!ensureVendor(req, res)) return;

  try {
    // Get full user data including vendorApproved status
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('vendorApproved').lean();
    
    const provider = await Provider.findOne({ userRef: req.user._id })
      .populate('categories', 'name')
      .populate('reviews.user', 'name email')
      .populate('reviews.booking', '_id serviceType createdAt')
      .lean();

    if (!provider) {
      return res.json({
        vendorApproved: user?.vendorApproved || false,
        approvalStatus: 'pending'
      });
    }

    const reviews = Array.isArray(provider.reviews) ? [...provider.reviews] : [];
    reviews.sort((a, b) => {
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return bt - at;
    });

    // Include approval status in response
    return res.json({
      ...provider,
      reviews,
      vendorApproved: user?.vendorApproved || false,
      approvalStatus: user?.vendorApproved ? 'verified' : (provider.status || 'pending')
    });
  } catch (err) {
    console.error('providers.getMe error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/providers/me
 * Create or update provider (PERMANENT save)
 */
exports.updateMe = async (req, res) => {
  if (!ensureVendor(req, res)) return;

  try {
    const {
      businessName,
      categories,
      description,
      reviewsCount,
      priceEstimateMin,
      priceEstimateMax,
      lat,
      lng
    } = req.body;

    const minValue = Number(priceEstimateMin);
    const maxValue = Number(priceEstimateMax);

    const update = {
      businessName,
      categories,
      description: description ?? '',
      reviewsCount: Number.isFinite(Number(reviewsCount)) ? Number(reviewsCount) : 0,
      priceEstimateMin:
        priceEstimateMin === null || priceEstimateMin === undefined || priceEstimateMin === ''
          ? null
          : Number.isFinite(minValue)
            ? minValue
            : null,
      priceEstimateMax:
        priceEstimateMax === null || priceEstimateMax === undefined || priceEstimateMax === ''
          ? null
          : Number.isFinite(maxValue)
            ? maxValue
            : null
    };

    // ✅ PERMANENT GEO LOCATION SAVE
    if (lat && lng) {
      update.location = {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)] // [lng, lat]
      };
    }

    const provider = await Provider.findOneAndUpdate(
      { userRef: req.user._id },
      { $set: update },
      { new: true, upsert: true }
    );

    return res.json(provider);
  } catch (err) {
    console.error('providers.updateMe error', err);
    return res.status(500).json({ message: 'Failed to update provider' });
  }
};

/**
 * GET /api/providers/availability
 * Fetch current availability for vendor
 */
exports.getAvailability = async (req, res) => {
  if (!ensureVendor(req, res)) return;

  try {
    const provider = await Provider.findOne({ userRef: req.user._id })
      .select('availability')
      .lean();

    if (!provider) {
      return res.json({});
    }

    return res.json(provider.availability || {});
  } catch (err) {
    console.error('providers.getAvailability error', err);
    return res.status(500).json({ message: 'Failed to fetch availability' });
  }
};

/**
 * PUT /api/providers/availability
 * Body: { availability: { mon: { enabled, start, end }, ... } }
 */
exports.updateAvailability = async (req, res) => {
  if (!ensureVendor(req, res)) return;

  try {
    // Check if vendor is approved
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('vendorApproved').lean();
    
    if (!user?.vendorApproved) {
      return res.status(403).json({ 
        msg: 'Vendor account is pending admin approval. You cannot update availability until approved.' 
      });
    }

    // Accept availability either directly in req.body or nested under req.body.availability
    const availability = req.body?.availability || req.body;
    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({ message: 'availability object required' });
    }

    const provider = await Provider.findOneAndUpdate(
      { userRef: req.user._id },
      { $set: { availability } },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Availability updated', availability: provider.availability });
  } catch (err) {
    console.error('providers.updateAvailability error', err);
    return res.status(500).json({ message: 'Failed to update availability' });
  }
};

/**
 * PUT /api/providers/:id/status
 * Admin verify / block provider
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const provider = await Provider.findById(id).populate('userRef', 'location category name');
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // ✅ BLOCK VERIFICATION IF LOCATION MISSING (fallback to user location if present)
    if (status === 'verified') {
      const hasProviderLoc = provider.location?.coordinates?.length === 2;
      const userLoc = provider.userRef?.location;
      const hasUserLoc = userLoc?.coordinates?.length === 2;

      if (!hasProviderLoc && hasUserLoc) {
        provider.location = { type: 'Point', coordinates: userLoc.coordinates };
      }

      if (!(provider.location?.coordinates?.length === 2)) {
        return res.status(400).json({
          message: 'Provider location is required before verification'
        });
      }

      if (!provider.categories || provider.categories.length === 0) {
        // Try to backfill from user's selected category string or business name
        const catText = provider.userRef?.category || provider.businessName || provider.userRef?.name;
        const ServiceCategory = mongoose.model('ServiceCategory');
        let found = null;
        if (catText) {
          found = /^[a-f0-9]{24}$/i.test(catText)
            ? await ServiceCategory.findById(catText).select('_id').lean()
            : await ServiceCategory.findOne({ name: new RegExp(`^${catText}$`, 'i') }).select('_id').lean();
          if (!found) {
            const lower = String(catText).toLowerCase();
            found = await ServiceCategory.findOne({
              $or: [
                { name: new RegExp(lower, 'i') },
                { keywords: { $in: [lower] } }
              ]
            }).select('_id').lean();
          }
        }
        if (found?._id) {
          provider.categories = [found._id];
        } else {
          return res.status(400).json({
            message: 'Provider category is required before verification'
          });
        }
      }
    }

    provider.status = status;
    await provider.save();

    // Keep user flag in sync
    if (provider.userRef) {
      const vendorApproved = status === 'verified';
      await mongoose.model('User').findByIdAndUpdate(provider.userRef, { $set: { vendorApproved } });
    }

    return res.json(provider);
  } catch (err) {
    console.error('providers.updateStatus error', err);
    return res.status(500).json({ message: 'Failed to update provider status' });
  }
};
