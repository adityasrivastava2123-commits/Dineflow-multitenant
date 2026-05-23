const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  specialInstructions: { type: String },
  isVeg: { type: Boolean },
  image: String,
});

const orderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableNumber: { type: Number, required: true },
    orderNumber: { type: String, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String },
    customerPhone: { type: String },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'],
      default: 'pending',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    offerCode: String,
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded', 'failed'], default: 'unpaid' },
    paymentMethod: { type: String, enum: ['razorpay', 'cash', 'upi'] },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    notes: String,
    estimatedReadyAt: Date,
  },
  { timestamps: true }
);

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    const count = await this.constructor.countDocuments({ restaurantId: this.restaurantId });
    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}-${random}`;
  }
  next();
});

orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ tableNumber: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
