const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');

const router = express.Router();

// Lazy-load Razorpay to avoid crash if keys not set
let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// POST create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ error: 'Order already paid' });

    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: order._id.toString(), tableNumber: order.tableNumber.toString() },
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST verify payment
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        paymentMethod: 'razorpay',
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Emit payment success
    const restaurant = await require('../models/Restaurant').findById(order.restaurantId).select('slug');
    req.io.to(`restaurant:${restaurant.slug}`).emit('payment-received', { orderId: order._id, orderNumber: order.orderNumber });
    req.io
      .to(`table:${restaurant.slug}:${order.tableNumber}`)
      .emit('payment-confirmed', { orderId: order._id, orderNumber: order.orderNumber });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST handle payment failure
router.post('/failure', async (req, res) => {
  try {
    const { orderId } = req.body;
    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
    res.json({ message: 'Payment failure recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET invoice data for an order
router.get('/invoice/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('restaurantId', 'name address phone email');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
