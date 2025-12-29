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

// Проверка переменных
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET не найден');

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) throw new Error('MONGO_URL не найден');

// Подключение MongoDB Atlas
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Atlas подключён'))
.catch(err => { console.error(err); process.exit(1); });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Schemas
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

// Auth Middleware для админа
const authAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Ошибка авторизации' });
  }
};

/* ================= USERS ================= */
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Все поля обязательны' });

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: 'Email уже существует' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name, email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Все поля обязательны' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Неверные данные' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Неверные данные' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email, isAdmin: user.isAdmin } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= PRODUCTS ================= */
app.get('/api/products', async (_, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Добавление товара только админом
app.post('/api/products', authAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= ORDERS ================= */
app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body);

    await transporter.sendMail({
      from: `"TechStore" <${process.env.MAIL_USER}>`,
      to: order.customer.email,
      subject: 'Заказ принят',
      html: `<h2>Спасибо за заказ!</h2><p>Сумма: <b>${order.total} ₸</b></p><p>Статус: ${order.status}</p>`
    });

    res.json({ message: 'Заказ создан', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= FRONTEND ================= */
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

/* ================= START ================= */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
