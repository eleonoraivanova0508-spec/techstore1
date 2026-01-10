require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ================= CHECK ENV =================
const requiredEnv = [
  'MONGO_URL',
  'JWT_SECRET',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_HOST',
  'MAIL_PORT'
];

const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length)
  throw new Error(`Не найдены переменные окружения: ${missingEnv.join(', ')}`);

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB Atlas подключена'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err.message));

// ================= MIDDLEWARE =================
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= NODEMAILER =================
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
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
  reviews: [{ user: String, rating: Number, comment: String, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  customer: { name: String, email: String, phone: String, address: String },
  items: Array,
  total: Number,
  paymentMethod: String,
  status: { type: String, default: 'processing' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);

// ================= AUTH MIDDLEWARE =================
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'Пользователь не найден' });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Ошибка авторизации' });
  }
};

const authAdmin = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
  next();
};

// ================= USERS =================
app.get('/api/users', auth, authAdmin, async (_, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Все поля обязательны' });

    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email уже существует' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Неверные данные' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Неверные данные' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PRODUCTS =================
app.get('/api/products', async (_, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

app.post('/api/products', auth, authAdmin, async (req, res) => {
  const product = await Product.create(req.body);
  res.json(product);
});

app.put('/api/products/:id', auth, authAdmin, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

// ================= ORDERS =================
app.get('/api/orders', auth, authAdmin, async (_, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const order = await Order.create(req.body);

  // Отправка письма
  await transporter.sendMail({
    from: `"TechStore" <${process.env.MAIL_USER}>`,
    to: order.customer.email,
    subject: 'Ваш заказ принят',
    html: `<h2>Спасибо за заказ, ${order.customer.name}!</h2>
           <p>Сумма: <b>${order.total} ₸</b></p>
           <p>Статус: ${order.status}</p>`
  });

  res.json({ message: 'Заказ создан', order });
});

app.put('/api/orders/:id', auth, authAdmin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(order);
});

// ================= FRONTEND =================
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));

// ================= START =================
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
