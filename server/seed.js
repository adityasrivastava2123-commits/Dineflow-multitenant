/**
 * DineFlow Seed Script
 * Run: node seed.js
 * Creates a demo restaurant, admin user, and menu items
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dineflow';

const menuItems = [
  // Starters
  { name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled to perfection', price: 280, category: 'Starters', isVeg: true, isBestseller: true, preparationTime: 15 },
  { name: 'Chicken Seekh Kebab', description: 'Spiced minced chicken on skewers', price: 320, category: 'Starters', isVeg: false, isBestseller: true, preparationTime: 20 },
  { name: 'Veg Spring Rolls', description: 'Crispy rolls with mixed vegetables', price: 180, category: 'Starters', isVeg: true, preparationTime: 12 },
  { name: 'Aloo Tikki Chaat', description: 'Crispy potato patties with tangy chutneys', price: 150, category: 'Starters', isVeg: true, preparationTime: 10 },

  // Main Course
  { name: 'Butter Chicken', description: 'Tender chicken in rich tomato-butter gravy', price: 380, category: 'Main Course', isVeg: false, isBestseller: true, preparationTime: 25 },
  { name: 'Dal Makhani', description: 'Slow-cooked black lentils with cream and butter', price: 260, category: 'Main Course', isVeg: true, isBestseller: true, preparationTime: 20 },
  { name: 'Palak Paneer', description: 'Fresh cottage cheese in spiced spinach gravy', price: 290, category: 'Main Course', isVeg: true, preparationTime: 18 },
  { name: 'Mutton Rogan Josh', description: 'Aromatic Kashmiri lamb curry', price: 450, category: 'Main Course', isVeg: false, preparationTime: 35 },
  { name: 'Kadai Chicken', description: 'Stir-fried chicken with bell peppers and spices', price: 360, category: 'Main Course', isVeg: false, preparationTime: 25 },
  { name: 'Shahi Paneer', description: 'Royal cottage cheese in cashew-cream gravy', price: 310, category: 'Main Course', isVeg: true, preparationTime: 20 },

  // Breads
  { name: 'Butter Naan', description: 'Leavened bread baked in tandoor with butter', price: 50, category: 'Breads', isVeg: true, preparationTime: 8 },
  { name: 'Garlic Naan', description: 'Tandoor bread topped with fresh garlic and herbs', price: 65, category: 'Breads', isVeg: true, isBestseller: true, preparationTime: 8 },
  { name: 'Laccha Paratha', description: 'Layered whole wheat bread from tandoor', price: 60, category: 'Breads', isVeg: true, preparationTime: 10 },
  { name: 'Missi Roti', description: 'Spiced gram flour bread', price: 55, category: 'Breads', isVeg: true, preparationTime: 8 },

  // Rice & Biryani
  { name: 'Hyderabadi Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 420, category: 'Rice & Biryani', isVeg: false, isBestseller: true, preparationTime: 30 },
  { name: 'Veg Biryani', description: 'Fragrant basmati rice with fresh vegetables and saffron', price: 300, category: 'Rice & Biryani', isVeg: true, preparationTime: 25 },
  { name: 'Jeera Rice', description: 'Basmati rice tempered with cumin', price: 180, category: 'Rice & Biryani', isVeg: true, preparationTime: 15 },

  // Desserts
  { name: 'Gulab Jamun', description: 'Soft milk dumplings in rose-scented sugar syrup', price: 120, category: 'Desserts', isVeg: true, isBestseller: true, preparationTime: 5 },
  { name: 'Kulfi Falooda', description: 'Traditional Indian ice cream with rose milk and vermicelli', price: 150, category: 'Desserts', isVeg: true, preparationTime: 5 },
  { name: 'Gajar Ka Halwa', description: 'Slow-cooked carrot pudding with dry fruits', price: 130, category: 'Desserts', isVeg: true, preparationTime: 5 },

  // Beverages
  { name: 'Mango Lassi', description: 'Refreshing yogurt-based mango drink', price: 120, category: 'Beverages', isVeg: true, preparationTime: 5 },
  { name: 'Masala Chai', description: 'Spiced Indian tea with ginger and cardamom', price: 60, category: 'Beverages', isVeg: true, preparationTime: 5 },
  { name: 'Fresh Lime Soda', description: 'Freshly squeezed lime with soda, sweet or salted', price: 80, category: 'Beverages', isVeg: true, preparationTime: 3 },
  { name: 'Rose Sharbat', description: 'Chilled rose-flavored drink', price: 90, category: 'Beverages', isVeg: true, preparationTime: 3 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([Restaurant.deleteMany({}), User.deleteMany({}), MenuItem.deleteMany({})]);
  console.log('🗑️  Cleared existing data');

  // Create restaurant
  const restaurant = await Restaurant.create({
    name: 'Spice Garden',
    slug: 'spice-garden',
    description: 'Authentic Indian cuisine in a warm, welcoming atmosphere',
    address: { street: '12, MG Road', city: 'Kanpur', state: 'Uttar Pradesh', pincode: '208001' },
    phone: '+91 98765 43210',
    email: 'info@spicegarden.in',
    tables: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, capacity: i < 6 ? 4 : 6 })),
    taxRate: 5,
    offers: [
      { code: 'WELCOME20', discount: 20, maxDiscount: 100, minOrder: 300, isActive: true },
      { code: 'FLAT50', discount: 0, maxDiscount: 50, minOrder: 200, isActive: true },
    ],
    settings: { acceptingOrders: true, estimatedPrepTime: 25 },
  });
  console.log(`🏪 Restaurant created: ${restaurant.name} (slug: ${restaurant.slug})`);

  // Create admin user
  const hashedPwd = await bcrypt.hash('admin123', 12);
  const admin = await User.create({
    name: 'Raj Kumar',
    email: 'admin@spicegarden.in',
    password: hashedPwd,
    phone: '+91 98765 00001',
    role: 'admin',
    restaurantId: restaurant._id,
  });

  // Kitchen user
  await User.create({
    name: 'Kitchen Staff',
    email: 'kitchen@spicegarden.in',
    password: await bcrypt.hash('kitchen123', 12),
    role: 'kitchen',
    restaurantId: restaurant._id,
  });

  console.log('👤 Admin user created: admin@spicegarden.in / admin123');
  console.log('👨‍🍳 Kitchen user created: kitchen@spicegarden.in / kitchen123');

  // Create menu items
  const itemsWithRestaurant = menuItems.map((item, i) => ({
    ...item,
    restaurantId: restaurant._id,
    sortOrder: i,
    image: `https://source.unsplash.com/400x300/?indian-food,${encodeURIComponent(item.name)}`,
  }));

  await MenuItem.insertMany(itemsWithRestaurant);
  console.log(`🍽️  Created ${menuItems.length} menu items`);

  console.log('\n🎉 Seed complete!');
  console.log(`\n📱 Customer URL: http://localhost:5173/restaurant/spice-garden?table=1`);
  console.log(`🔐 Admin URL: http://localhost:5173/admin/login`);
  console.log(`👨‍🍳 Kitchen URL: http://localhost:5173/kitchen`);

  mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  mongoose.connection.close();
  process.exit(1);
});
