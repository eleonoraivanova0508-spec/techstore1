require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOrderEmail, sendStatusEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ Mongo error:', err);
    process.exit(1);
  });

// ================= SCHEMAS =================
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  name: String,
  brand: String,
  price: Number,
  images: [String],
  description: String,
  stock: Number,
  createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  customer: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    quantity: Number
  }],
  total: Number,
  paymentMethod: String,
  status: { type: String, default: 'processing' },
  createdAt: { type: Date, default: Date.now }
});

// ================= MODELS =================
const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);

// ================= AUTH =================
const authAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Ошибка авторизации' });
  }
};

// ================= USERS =================
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: 'Email уже есть' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Неверно' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Неверно' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= PRODUCTS =================
app.get('/api/products', async (_, res) => {
  res.json(await Product.find().sort({ createdAt: -1 }));
});

app.post('/api/products', authAdmin, async (req, res) => {
  res.json(await Product.create(req.body));
});

app.put('/api/products/:id', authAdmin, async (req, res) => {
  res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

app.delete('/api/products/:id', authAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= ORDERS =================
app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    await sendOrderEmail(order);
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders', authAdmin, async (_, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

app.put('/api/orders/:id/status', authAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  await sendStatusEmail(order);
  res.json(order);
});

// ================= HEALTH =================
app.get('/api/health', (_, res) => res.json({ status: 'OK' }));

// ================= START =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
