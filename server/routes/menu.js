const express = require('express');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// NOTE: Static/specific routes MUST come before parameterized routes like /:slug or /:id

// GET single item by ID (must be before /:slug)
router.get('/item/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk create items (for seeding) — must be before POST /:id variants
router.post('/bulk', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const items = req.body.items.map((i) => ({ ...i, restaurantId: req.user.restaurantId }));
    const created = await MenuItem.insertMany(items);
    res.status(201).json({ created: created.length, items: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET menu for a restaurant (public - by slug)
router.get('/:slug', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const items = await MenuItem.find({ restaurantId: restaurant._id }).sort({ category: 1, sortOrder: 1 });

    // Group by category
    const categories = {};
    items.forEach((item) => {
      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push(item);
    });

    res.json({ restaurant, menu: items, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create menu item (admin)
router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const item = await MenuItem.create({ ...req.body, restaurantId: req.user.restaurantId });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update menu item (admin)
router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH toggle availability
router.patch('/:id/toggle', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.available = !item.available;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE menu item (admin)
router.delete('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const item = await MenuItem.findOneAndDelete({ _id: req.params.id, restaurantId: req.user.restaurantId });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
