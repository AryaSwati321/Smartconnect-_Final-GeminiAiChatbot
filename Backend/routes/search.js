const express = require('express');
const Provider = require('../models/Provider');
const ServiceCategory = require('../models/ServiceCategory');

const router = express.Router();

const nlpDictionary = {
  plumber: ['plumber', 'plumbing', 'pipe', 'leak', 'tap', 'drain', 'washbasin', 'water'],
  electrician: ['electric', 'electrician', 'wiring', 'switch', 'board', 'fuse', 'power', 'socket'],
  ac: ['ac', 'cooling', 'air conditioner', 'airconditioner', 'compressor', 'refrigerant'],
};

function normalizeText(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text = '') {
  return normalizeText(text).split(' ').filter(Boolean);
}

function scoreCategory(category, queryText, tokens) {
  const name = normalizeText(category.name || '');
  const nameTokens = new Set(tokenize(name));
  const keywordTokens = new Set((category.keywords || []).flatMap((k) => tokenize(String(k))));
  const allTokens = new Set([...nameTokens, ...keywordTokens]);
  const matchedTokens = new Set();
  let score = 0;

  for (const token of tokens) {
    if (allTokens.has(token)) {
      score += 3;
      matchedTokens.add(token);
    }
    if (name.includes(token)) {
      score += 2;
    }
  }

  for (const [key, words] of Object.entries(nlpDictionary)) {
    const hasSynonym = words.some((word) => queryText.includes(word));
    if (!hasSynonym) continue;

    if (name.includes(key) || words.some((word) => name.includes(word))) {
      score += 4;
      words.forEach((word) => {
        if (queryText.includes(word)) matchedTokens.add(word);
      });
    }
  }

  return { score, matchedTokens: [...matchedTokens] };
}

router.get('/smart', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
    const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
    const radiusKm = Number(req.query.radius || 5);

    if (!q) {
      return res.status(400).json({ message: 'q is required' });
    }

    const queryText = normalizeText(q);
    const tokens = tokenize(queryText);
    const categories = await ServiceCategory.find().select('_id name keywords').lean();

    let best = null;
    for (const category of categories) {
      const result = scoreCategory(category, queryText, tokens);
      if (!best || result.score > best.score) {
        best = { category, ...result };
      }
    }

    if (!best || best.score <= 0) {
      return res.json({
        query: q,
        mappedService: null,
        vendors: [],
        count: 0,
        message: 'No service mapping found for query',
      });
    }

    let vendorRows = [];
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

    if (hasGeo) {
      vendorRows = await Provider.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distance',
            maxDistance: radiusKm * 1000,
            spherical: true,
            query: {
              status: 'verified',
              categories: best.category._id,
              location: { $exists: true },
            },
          },
        },
        {
          $project: {
            businessName: 1,
            avgRating: { $ifNull: ['$avgRating', 0] },
            reviewsCount: { $ifNull: ['$reviewsCount', 0] },
            description: { $ifNull: ['$description', 'Professional service provider near your location.'] },
            reviews: { $slice: [{ $ifNull: ['$reviews', []] }, -3] },
            availability: 1,
            priceEstimateMin: 1,
            priceEstimateMax: 1,
            distance: 1,
          },
        },
        { $sort: { distance: 1 } },
        { $limit: 30 },
      ]);

      // Fallback vendors missing location
      const geoIds = new Set(vendorRows.map((r) => String(r._id)));
      const fallback = await Provider.find({
        status: 'verified',
        categories: best.category._id,
        $or: [{ location: { $exists: false } }, { location: null }, { 'location.coordinates.0': { $exists: false } }]
      })
        .select('_id businessName avgRating reviewsCount description availability priceEstimateMin priceEstimateMax reviews')
        .limit(10)
        .lean();
      vendorRows = [...vendorRows, ...fallback.filter((f) => !geoIds.has(String(f._id)))];
    } else {
      vendorRows = await Provider.find({
        status: 'verified',
        categories: best.category._id,
      })
        .select('_id businessName avgRating reviewsCount description availability priceEstimateMin priceEstimateMax reviews')
        .limit(30)
        .lean();
    }

    const vendors = vendorRows.map((row) => ({
      id: row._id,
      name: row.businessName || 'Provider',
      rating: row.avgRating || 0,
      reviews: row.reviewsCount || 0,
      description: row.description || 'Professional service provider near your location.',
      reviewList: (row.reviews || []).slice(-3).map((item) => ({
        rating: item.rating,
        review: item.review,
        photos: item.photos || [],
        createdAt: item.createdAt
      })),
      availability: row.availability || null,
      priceEstimateMin: row.priceEstimateMin ?? null,
      priceEstimateMax: row.priceEstimateMax ?? null,
      distanceKm:
        typeof row.distance === 'number' ? Math.round((row.distance / 1000) * 10) / 10 : null,
    }));

    const io = req.app.get('io');
    if (io && vendors.length) {
      vendors.forEach((vendor) => {
        io.to(String(vendor.id)).emit('vendor:notification', {
          type: 'smart_search_request',
          title: 'New service request near your location',
          message: `Smart search mapped query to ${best.category.name}`,
          service: best.category.name,
          query: q,
          distanceKm: vendor.distanceKm,
          at: new Date().toISOString(),
        });
      });
    }

    const confidence = Math.min(100, Math.max(35, Math.round(best.score * 10)));

    return res.json({
      query: q,
      mappedService: {
        id: best.category._id,
        name: best.category.name,
        confidence,
        matchedTokens: best.matchedTokens,
      },
      vendors,
      count: vendors.length,
    });
  } catch (err) {
    console.error('smart search error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
