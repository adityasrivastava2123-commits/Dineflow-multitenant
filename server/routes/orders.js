const express = require('express');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST create order (customer)
router.post('/', async (req, res) => {
  try {
    const { restaurantSlug, tableNumber, items, customerName, customerPhone, notes, offerCode } = req.body;

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (!restaurant.settings.acceptingOrders) return res.status(400).json({ error: 'Restaurant is not accepting orders' });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = parseFloat(((subtotal * restaurant.taxRate) / 100).toFixed(2));
    let discountAmount = 0;

    // Apply offer code
    if (offerCode) {
      const offer = restaurant.offers.find(
        (o) => o.code === offerCode.toUpperCase() && o.isActive && (!o.expiresAt || new Date() < o.expiresAt)
      );
      if (offer && subtotal >= (offer.minOrder || 0)) {
        const rawDiscount = (subtotal * offer.discount) / 100;
        discountAmount = offer.maxDiscount ? Math.min(rawDiscount, offer.maxDiscount) : rawDiscount;
      }
    }

    const totalAmount = parseFloat((subtotal + taxAmount - discountAmount).toFixed(2));
    const estimatedReadyAt = new Date(Date.now() + restaurant.settings.estimatedPrepTime * 60000);

    const order = await Order.create({
      restaurantId: restaurant._id,
      tableNumber,
      items,
      customerName,
      customerPhone,
      notes,
      offerCode: offerCode?.toUpperCase(),
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      estimatedReadyAt,
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });

    // Track customer visit
    if (customerPhone) {
      await User.findOneAndUpdate(
        { phone: customerPhone, role: 'customer' },
        {
          $push: { visitHistory: { restaurantId: restaurant._id, orderId: order._id } },
          $setOnInsert: { phone: customerPhone, name: customerName, role: 'customer' },
        },
        { upsert: true }
      );
    }

    // Emit to admin and kitchen
    req.io.to(`restaurant:${restaurantSlug}`).emit('new-order', order);
    req.io.to(`kitchen:${restaurantSlug}`).emit('new-order', order);

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all orders for a restaurant (admin)
router.get('/', authenticate, requireRole('admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    const { status, date, tableNumber, limit = 50, page = 1 } = req.query;
    const filter = { restaurantId: req.user.restaurantId };

    if (status) filter.status = status;
    if (tableNumber) filter.tableNumber = Number(tableNumber);
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(filter);
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET live/active orders for kitchen (must be before /:id to avoid 'kitchen' being matched as an id)
router.get('/kitchen/live', authenticate, requireRole('admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    const orders = await Order.find({
      restaurantId: req.user.restaurantId,
      status: { $in: ['accepted', 'preparing'] },
    }).sort({ createdAt: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single order (customer can also access with orderId)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('restaurantId', 'name slug phone');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update order status (admin / kitchen)
router.patch('/:id/status', authenticate, requireRole('admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const validTransitions = {
      admin: ['accepted', 'cancelled'],
      manager: ['accepted', 'cancelled'],
      kitchen: ['preparing', 'ready'],
    };

    const allowed = validTransitions[req.user.role];
    if (!allowed?.includes(status)) {
      return res.status(400).json({ error: `Role ${req.user.role} cannot set status to ${status}` });
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      {
        status,
        $push: { statusHistory: { status, timestamp: new Date(), note } },
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const restaurant = await require('../models/Restaurant').findById(order.restaurantId).select('slug');

    // Emit to customer table
    req.io
      .to(`table:${restaurant.slug}:${order.tableNumber}`)
      .emit('order-status-update', { orderId: order._id, status, orderNumber: order.orderNumber });

    // Emit to admin
    req.io.to(`restaurant:${restaurant.slug}`).emit('order-updated', order);

    // If accepted, also notify kitchen
    if (status === 'accepted') {
      req.io.to(`kitchen:${restaurant.slug}`).emit('order-accepted', order);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH mark as delivered (admin)
router.patch('/:id/deliver', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      { status: 'delivered', $push: { statusHistory: { status: 'delivered', timestamp: new Date() } } },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const restaurant = await require('../models/Restaurant').findById(order.restaurantId).select('slug');
    req.io
      .to(`table:${restaurant.slug}:${order.tableNumber}`)
      .emit('order-status-update', { orderId: order._id, status: 'delivered', orderNumber: order.orderNumber });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
