const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String }, // for admin only
    role: { type: String, enum: ['superadmin', 'admin', 'manager', 'kitchen', 'customer'], default: 'customer' },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    visitHistory: [
      {
        restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
        visitedAt: { type: Date, default: Date.now },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      },
    ],
    preferences: {
      language: { type: String, default: 'en' },
      darkMode: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
