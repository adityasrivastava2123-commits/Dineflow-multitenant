const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    image: { type: String },
    available: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
    isBestseller: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    tags: [String],
    nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
    },
    preparationTime: { type: Number, default: 15 }, // minutes
    sortOrder: { type: Number, default: 0 },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, category: 1 });
menuItemSchema.index({ restaurantId: 1, available: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
