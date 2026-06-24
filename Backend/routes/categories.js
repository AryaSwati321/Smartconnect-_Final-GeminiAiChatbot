const express = require('express');
const mongoose = require('mongoose');
const ServiceCategory = require('../models/ServiceCategory');
const { verifyToken, isAdmin } = require('../middlewares/auth');

const router = express.Router();

const DEFAULT_CATEGORIES = [
  { name: 'Plumber', keywords: ['plumbing', 'pipes', 'leak', 'tap'] },
  { name: 'Electrician', keywords: ['electrical', 'wiring', 'switch', 'fan'] },
  { name: 'Cleaning', keywords: ['cleaning', 'home cleaning', 'deep cleaning'] },
  { name: 'Appliances', keywords: ['appliance', 'repair', 'fridge', 'washing machine'] },
  { name: 'Painter', keywords: ['painting', 'decor', 'wall paint', 'finish'] },
  { name: 'AC Repair', keywords: ['ac', 'cooling', 'hvac', 'temperature'] },
  { name: 'Maid Service', keywords: ['maid', 'housekeeping', 'domestic', 'cleaning'] },
  { name: 'Cook', keywords: ['cook', 'chef', 'cooking', 'meal', 'food'] }
];

function normalizeKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

async function upsertDefaultCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    await ServiceCategory.updateOne(
      { name: category.name },
      { $setOnInsert: category },
      { upsert: true }
    );
  }
}

router.get('/', async (_req, res) => {
  try {
    const categories = await ServiceCategory.find().sort({ name: 1 }).lean();
    return res.json({ categories });
  } catch (err) {
    return res.status(500).json({ msg: 'Error fetching categories' });
  }
});

router.post('/seed-defaults', verifyToken, isAdmin, async (_req, res) => {
  try {
    await upsertDefaultCategories();
    const categories = await ServiceCategory.find().sort({ name: 1 }).lean();
    return res.json({
      msg: 'Default categories ensured',
      categories
    });
  } catch (err) {
    return res.status(500).json({ msg: 'Error seeding default categories' });
  }
});

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const keywords = normalizeKeywords(req.body?.keywords);
    if (!name) {
      return res.status(400).json({ msg: 'Category name is required' });
    }

    const existing = await ServiceCategory.findOne({ name });
    if (existing) {
      return res.status(409).json({ msg: 'Category already exists' });
    }

    const category = await ServiceCategory.create({ name, keywords });
    return res.json({ msg: 'Service category added', category });
  } catch (err) {
    return res.status(500).json({ msg: 'Error adding category' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid category id' });
    }

    const name = String(req.body?.name || '').trim();
    const keywords = normalizeKeywords(req.body?.keywords);
    if (!name) {
      return res.status(400).json({ msg: 'Category name is required' });
    }

    const duplicate = await ServiceCategory.findOne({
      _id: { $ne: id },
      name
    }).lean();
    if (duplicate) {
      return res.status(409).json({ msg: 'Category name already exists' });
    }

    const updated = await ServiceCategory.findByIdAndUpdate(
      id,
      { name, keywords },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ msg: 'Category not found' });
    }

    return res.json({ msg: 'Updated', category: updated });
  } catch (err) {
    return res.status(500).json({ msg: 'Error updating category' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid category id' });
    }

    const deleted = await ServiceCategory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ msg: 'Category not found' });
    }

    return res.json({ msg: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ msg: 'Error deleting category' });
  }
});

module.exports = router;
