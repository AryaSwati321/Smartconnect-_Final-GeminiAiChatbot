// routes/provider.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Provider = require('../models/Provider');
const ServiceCategory = require('../models/ServiceCategory');
const { verifyToken } = require('../middlewares/auth');
const ctrl = require('../controllers/providerController');

/* ---------------- Vendor ---------------- */

// GET /api/providers/me
router.get('/me', verifyToken, ctrl.getMe);

// PUT /api/providers/me
router.put('/me', verifyToken, ctrl.updateMe);

// GET /api/providers/availability
router.get('/availability', verifyToken, ctrl.getAvailability);

// PUT /api/providers/availability
router.put('/availability', verifyToken, ctrl.updateAvailability);

/* ---------------- Admin ---------------- */

// PUT /api/providers/:id/status
router.put('/:id/status', verifyToken, ctrl.updateStatus);

/* -------- GET CATEGORY BY NAME (MUST be before /search) -------- */
/**
 * GET /api/providers/search/category-by-name?name=Plumber
 * Fetches category ID by name
 */
router.get('/search/category-by-name', async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await ServiceCategory.findOne({
      name: new RegExp(`^${name}$`, 'i')
    }).select('_id name');

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json(category);
  } catch (err) {
    console.error('get category by name error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------- SEARCH NEARBY ---------------- */
/**
 * GET /api/providers/search
 * ?service=Painting&lat=18.47&lng=73.85&radius=5
 */
router.get('/search', async (req, res) => {
  try {
    const service = (req.query.service || '').trim();
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radius || 5);

    if (!service || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        message: 'service, lat and lng are required'
      });
    }

    const category = await ServiceCategory.findOne({
      name: new RegExp(`^${service}$`, 'i')
    }).select('_id');

    if (!category) {
      return res.json({ results: [], count: 0 });
    }

    const geoResults = await Provider.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: {
            status: 'verified',
            categories: category._id,
            location: { $exists: true }
          }
        }
      },
      {
        $project: {
          businessName: 1,
          avgRating: { $ifNull: ['$avgRating', 0] },
          reviewsCount: { $ifNull: ['$reviewsCount', 0] },
          description: { $ifNull: ['$description', 'Professional service provider near your location.' ] },
          reviews: { $slice: [{ $ifNull: ['$reviews', []] }, -3] },
          availability: 1,
          priceEstimateMin: 1,
          priceEstimateMax: 1,
          distance: 1
        }
      },
      { $sort: { distance: 1 } }
    ]);

    // Fallback: providers missing location
    const geoIds = new Set(geoResults.map((r) => String(r._id)));
    const fallback = await Provider.find({
      status: 'verified',
      categories: category._id,
      $or: [{ location: { $exists: false } }, { location: null }, { 'location.coordinates.0': { $exists: false } }]
    })
      .select('_id businessName avgRating reviewsCount description availability priceEstimateMin priceEstimateMax reviews')
      .limit(10)
      .lean();

    const results = [...geoResults, ...fallback.filter((f) => !geoIds.has(String(f._id)))];

    const io = req.app.get('io');
    if (io && Array.isArray(results) && results.length) {
      results.forEach((provider) => {
        io.to(provider._id.toString()).emit('vendor:notification', {
          type: 'search_request',
          title: 'New service request near your location',
          message: `${service} request found within ${radiusKm} km`,
          service,
          distanceKm: Math.round((provider.distance / 1000) * 10) / 10,
          at: new Date().toISOString(),
        });
      });
    }

    return res.json({
      results: results.map(r => ({
        id: r._id,
        name: r.businessName,
        rating: r.avgRating,
        reviews: r.reviewsCount || 0,
        description: r.description,
        reviewList: (r.reviews || []).map((item) => ({
          rating: item.rating,
          review: item.review,
          createdAt: item.createdAt
        })),
        availability: r.availability || null,
        priceEstimateMin: r.priceEstimateMin ?? null,
        priceEstimateMax: r.priceEstimateMax ?? null,
        distanceKm: typeof r.distance === 'number'
          ? Math.round((r.distance / 1000) * 10) / 10
          : null
      })),
      count: results.length
    });
  } catch (err) {
    console.error('providers.search error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* -------- GET ALL VENDORS BY CATEGORY (IRRESPECTIVE OF LOCATION) -------- */
/**
 * GET /api/providers/category/:categoryId
 * Fetches all verified vendors in a specific category (no location filtering)
 */
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    const providers = await Provider.find({
      status: 'verified',
      categories: categoryId
    })
      .populate('categories', 'name _id')
      .select('_id userRef businessName avgRating reviewsCount description availability priceEstimateMin priceEstimateMax reviews location')
      .sort({ avgRating: -1, reviewsCount: -1 })
      .lean();

    return res.json({
      results: providers.map(p => ({
        id: p._id,
        userId: p.userRef,
        name: p.businessName,
        rating: p.avgRating || 0,
        reviews: p.reviewsCount || 0,
        description: p.description,
        categories: p.categories,
        reviewList: (p.reviews || []).slice(-3).map((item) => ({
          rating: item.rating,
          review: item.review,
          createdAt: item.createdAt
        })),
        availability: p.availability || null,
        priceEstimateMin: p.priceEstimateMin ?? null,
        priceEstimateMax: p.priceEstimateMax ?? null
      })),
      count: providers.length
    });
  } catch (err) {
    console.error('get vendors by category error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
