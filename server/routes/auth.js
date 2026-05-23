const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

// GET /me - inline authenticate to avoid circular dependency
const jwt = require('jsonwebtoken');
const getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId).select('name slug taxRate settings subscription');
    }
    res.json({ user: { ...user._doc, restaurant } });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId).select('name slug taxRate settings subscription');
    }

    res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name, restaurantId: user.restaurantId, restaurant } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (optional, for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: role || 'admin' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/customer-identify (identify or create a customer by phone)
router.post('/customer-identify', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    let user = await User.findOne({ phone, role: 'customer' });
    if (!user) {
      user = await User.create({ name: name || 'Guest', phone, role: 'customer' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', getMe);

module.exports = router;
