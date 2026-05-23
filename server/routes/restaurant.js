const express = require('express');
const Restaurant = require('../models/Restaurant');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET restaurant details (admin - full)
// NOTE: This must be defined BEFORE /:slug to avoid Express matching 'admin' as a slug
router.get('/admin/details', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET restaurant by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug }).select('-offers');
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create restaurant
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update restaurant
router.put('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.user.restaurantId, req.body, { new: true });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH toggle open/close
router.patch('/toggle-open', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    restaurant.isOpen = !restaurant.isOpen;
    restaurant.settings.acceptingOrders = restaurant.isOpen;
    await restaurant.save();
    res.json({ isOpen: restaurant.isOpen });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add offer
router.post('/offers', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    restaurant.offers.push(req.body);
    await restaurant.save();
    res.json(restaurant.offers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE offer
router.delete('/offers/:offerId', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    restaurant.offers = restaurant.offers.filter((o) => o._id.toString() !== req.params.offerId);
    await restaurant.save();
    res.json({ message: 'Offer removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST validate offer code (customer)
router.post('/:slug/validate-offer', async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const offer = restaurant.offers.find(
      (o) =>
        o.code === code.toUpperCase() &&
        o.isActive &&
        (!o.expiresAt || new Date() < o.expiresAt) &&
        orderAmount >= (o.minOrder || 0)
    );

    if (!offer) return res.status(400).json({ error: 'Invalid or expired offer code' });

    const rawDiscount = (orderAmount * offer.discount) / 100;
    const discountAmount = offer.maxDiscount ? Math.min(rawDiscount, offer.maxDiscount) : rawDiscount;

    res.json({ valid: true, discount: offer.discount, discountAmount, maxDiscount: offer.maxDiscount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
