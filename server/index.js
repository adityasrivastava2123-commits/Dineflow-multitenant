require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const restaurantRoutes = require('./routes/restaurant');
const paymentRoutes = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');
const superadminRoutes = require('./routes/superadmin');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:5173'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'DineFlow API' }));

// Temp seed route - creates admin, kitchen users and restaurant
app.get('/api/seed', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const Restaurant = require('./models/Restaurant');
    const User = require('./models/User');
    const MenuItem = require('./models/MenuItem');

    await Promise.all([Restaurant.deleteMany({}), User.deleteMany({}), MenuItem.deleteMany({})]);

    const restaurant = await Restaurant.create({
      name: 'Spice Garden',
      slug: 'spice-garden',
      description: 'Authentic Indian cuisine',
      address: { street: '12, MG Road', city: 'Kanpur', state: 'Uttar Pradesh', pincode: '208001' },
      phone: '+91 98765 43210',
      email: 'info@spicegarden.in',
      tables: Array.from({ length: 10 }, (_, i) => ({ number: i + 1, capacity: i < 6 ? 4 : 6 })),
      taxRate: 5,
      offers: [{ code: 'WELCOME20', discount: 20, maxDiscount: 100, minOrder: 300, isActive: true }],
      settings: { acceptingOrders: true, estimatedPrepTime: 25 },
    });

    await User.create({ name: 'Raj Kumar', email: 'admin@spicegarden.in', password: await bcrypt.hash('admin123', 12), phone: '+91 98765 00001', role: 'admin', restaurantId: restaurant._id });
    await User.create({ name: 'Kitchen Staff', email: 'kitchen@spicegarden.in', password: await bcrypt.hash('kitchen123', 12), role: 'kitchen', restaurantId: restaurant._id });
    await User.create({ name: 'Super Admin', email: 'superadmin@dineflow.in', password: await bcrypt.hash('superadmin123', 12), role: 'superadmin' });

    const menuItems = [
      { name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled to perfection', price: 280, category: 'Starters', isVeg: true, isBestseller: true, preparationTime: 15 },
      { name: 'Chicken Seekh Kebab', description: 'Spiced minced chicken on skewers', price: 320, category: 'Starters', isVeg: false, isBestseller: true, preparationTime: 20 },
      { name: 'Veg Spring Rolls', description: 'Crispy rolls with mixed vegetables', price: 180, category: 'Starters', isVeg: true, preparationTime: 12 },
      { name: 'Aloo Tikki Chaat', description: 'Crispy potato patties with tangy chutneys', price: 150, category: 'Starters', isVeg: true, preparationTime: 10 },
      { name: 'Butter Chicken', description: 'Tender chicken in rich tomato-butter gravy', price: 380, category: 'Main Course', isVeg: false, isBestseller: true, preparationTime: 25 },
      { name: 'Dal Makhani', description: 'Slow-cooked black lentils with cream and butter', price: 260, category: 'Main Course', isVeg: true, isBestseller: true, preparationTime: 20 },
      { name: 'Palak Paneer', description: 'Fresh cottage cheese in spiced spinach gravy', price: 290, category: 'Main Course', isVeg: true, preparationTime: 18 },
      { name: 'Mutton Rogan Josh', description: 'Aromatic Kashmiri lamb curry', price: 450, category: 'Main Course', isVeg: false, preparationTime: 35 },
      { name: 'Kadai Chicken', description: 'Stir-fried chicken with bell peppers and spices', price: 360, category: 'Main Course', isVeg: false, preparationTime: 25 },
      { name: 'Shahi Paneer', description: 'Royal cottage cheese in cashew-cream gravy', price: 310, category: 'Main Course', isVeg: true, preparationTime: 20 },
      { name: 'Butter Naan', description: 'Leavened bread baked in tandoor with butter', price: 50, category: 'Breads', isVeg: true, preparationTime: 8 },
      { name: 'Garlic Naan', description: 'Tandoor bread topped with fresh garlic and herbs', price: 65, category: 'Breads', isVeg: true, isBestseller: true, preparationTime: 8 },
      { name: 'Laccha Paratha', description: 'Layered whole wheat bread from tandoor', price: 60, category: 'Breads', isVeg: true, preparationTime: 10 },
      { name: 'Hyderabadi Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 420, category: 'Rice & Biryani', isVeg: false, isBestseller: true, preparationTime: 30 },
      { name: 'Veg Biryani', description: 'Fragrant basmati rice with fresh vegetables and saffron', price: 300, category: 'Rice & Biryani', isVeg: true, preparationTime: 25 },
      { name: 'Jeera Rice', description: 'Basmati rice tempered with cumin', price: 180, category: 'Rice & Biryani', isVeg: true, preparationTime: 15 },
      { name: 'Gulab Jamun', description: 'Soft milk dumplings in rose-scented sugar syrup', price: 120, category: 'Desserts', isVeg: true, isBestseller: true, preparationTime: 5 },
      { name: 'Kulfi Falooda', description: 'Traditional Indian ice cream with rose milk', price: 150, category: 'Desserts', isVeg: true, preparationTime: 5 },
      { name: 'Gajar Ka Halwa', description: 'Slow-cooked carrot pudding with dry fruits', price: 130, category: 'Desserts', isVeg: true, preparationTime: 5 },
      { name: 'Mango Lassi', description: 'Refreshing yogurt-based mango drink', price: 120, category: 'Beverages', isVeg: true, preparationTime: 5 },
      { name: 'Masala Chai', description: 'Spiced Indian tea with ginger and cardamom', price: 60, category: 'Beverages', isVeg: true, preparationTime: 5 },
      { name: 'Fresh Lime Soda', description: 'Freshly squeezed lime with soda', price: 80, category: 'Beverages', isVeg: true, preparationTime: 3 },
    ];

    await MenuItem.insertMany(menuItems.map((item, i) => ({ ...item, restaurantId: restaurant._id, sortOrder: i })));

    res.json({ success: true, message: `Seeded! ${menuItems.length} menu items, admin@spicegarden.in / admin123, superadmin@dineflow.in / superadmin123` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-restaurant', (restaurantSlug) => {
    socket.join(`restaurant:${restaurantSlug}`);
    console.log(`Socket ${socket.id} joined restaurant:${restaurantSlug}`);
  });

  socket.on('join-kitchen', (restaurantSlug) => {
    socket.join(`kitchen:${restaurantSlug}`);
  });

  socket.on('join-table', ({ restaurantSlug, tableNumber }) => {
    socket.join(`table:${restaurantSlug}:${tableNumber}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineflow')
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 DineFlow server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, io };
