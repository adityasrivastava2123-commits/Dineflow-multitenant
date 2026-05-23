const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('superadmin'));

// GET all restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    const withStaff = await Promise.all(restaurants.map(async (r) => {
      const staff = await User.find({ restaurantId: r._id, role: { $in: ['admin', 'kitchen', 'manager'] } }).select('name email role');
      const daysLeft = r.subscription?.expiresAt ? Math.ceil((new Date(r.subscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      return { ...r.toObject(), staff, daysLeft };
    }));
    res.json(withStaff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new restaurant
router.post('/restaurants', async (req, res) => {
  try {
    const { name, slug, description, address, phone, email, taxRate, adminName, adminEmail, adminPassword, plan, expiryDays } = req.body;
    const existing = await Restaurant.findOne({ slug });
    if (existing) return res.status(400).json({ error: 'Slug already in use' });

    const expiresAt = new Date(Date.now() + (expiryDays || 30) * 24 * 60 * 60 * 1000);
    const restaurant = await Restaurant.create({
      name, slug: slug.toLowerCase().replace(/\s+/g, '-'), description,
      address, phone, email, taxRate: taxRate || 5,
      tables: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, capacity: i < 6 ? 4 : 6 })),
      settings: { acceptingOrders: true, estimatedPrepTime: 25 },
      subscription: { plan: plan || 'trial', status: 'active', expiresAt },
    });

    const hashed = await bcrypt.hash(adminPassword || 'admin123', 12);
    const admin = await User.create({ name: adminName, email: adminEmail, password: hashed, role: 'admin', restaurantId: restaurant._id });
    res.status(201).json({ restaurant, admin: { name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update subscription
router.put('/restaurants/:id/subscription', async (req, res) => {
  try {
    const { plan, expiryDays, status } = req.body;
    const expiresAt = new Date(Date.now() + (expiryDays || 30) * 24 * 60 * 60 * 1000);
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { 'subscription.plan': plan, 'subscription.expiresAt': expiresAt, 'subscription.status': status || 'active' },
      { new: true }
    );
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add staff
router.post('/restaurants/:id/staff', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const hashed = await bcrypt.hash(password || 'staff123', 12);
    const user = await User.create({ name, email, password: hashed, role: role || 'kitchen', restaurantId: restaurant._id });
    res.status(201).json({ name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET QR codes for a restaurant
router.get('/restaurants/:id/qrcodes', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const baseUrl = req.query.baseUrl || 'https://dineflow-multitenant.vercel.app';
    const qrCodes = await Promise.all(
      restaurant.tables.map(async (table) => {
        const url = `${baseUrl}/restaurant/${restaurant.slug}?table=${table.number}`;
        const qr = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#1c1917', light: '#ffffff' } });
        return { tableNumber: table.number, url, qr };
      })
    );
    res.json({ restaurant: { name: restaurant.name, slug: restaurant.slug }, qrCodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE restaurant
router.delete('/restaurants/:id', async (req, res) => {
  try {
    await Restaurant.findByIdAndDelete(req.params.id);
    await User.deleteMany({ restaurantId: req.params.id });
    await MenuItem.deleteMany({ restaurantId: req.params.id });
    res.json({ message: 'Restaurant deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
router.get('/stats', async (req, res) => {
  try {
    const totalRestaurants = await Restaurant.countDocuments();
    const totalUsers = await User.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ 'subscription.status': 'active' });
    const expiredRestaurants = await Restaurant.countDocuments({ 'subscription.status': 'expired' });
    res.json({ totalRestaurants, totalUsers, activeRestaurants, expiredRestaurants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
