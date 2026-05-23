const express = require('express');
const Order = require('../models/Order');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET dashboard stats
router.get('/dashboard', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalOrders, todayOrders, paidOrders, activeOrders, revenueAgg, todayRevenueAgg] = await Promise.all([
      Order.countDocuments({ restaurantId }),
      Order.countDocuments({ restaurantId, createdAt: { $gte: today, $lt: tomorrow } }),
      Order.countDocuments({ restaurantId, paymentStatus: 'paid' }),
      Order.countDocuments({ restaurantId, status: { $in: ['pending', 'accepted', 'preparing', 'ready'] } }),
      Order.aggregate([
        { $match: { restaurantId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { restaurantId, paymentStatus: 'paid', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    res.json({
      totalOrders,
      todayOrders,
      paidOrders,
      activeOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET top-selling items
router.get('/top-items', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const topItems = await Order.aggregate([
      { $match: { restaurantId: req.user.restaurantId, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json(topItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET peak hours
router.get('/peak-hours', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const peakHours = await Order.aggregate([
      { $match: { restaurantId: req.user.restaurantId, createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, orderCount: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing hours with 0
    const hours = Array.from({ length: 24 }, (_, h) => {
      const found = peakHours.find((p) => p._id === h);
      return { hour: h, orderCount: found?.orderCount || 0, revenue: found?.revenue || 0 };
    });

    res.json(hours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET revenue by day (last 30 days)
router.get('/revenue-trend', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trend = await Order.aggregate([
      { $match: { restaurantId: req.user.restaurantId, paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(trend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
