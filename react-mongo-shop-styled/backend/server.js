const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


// Схемы
const reviewSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    rating: Number,
    text: String,
    date: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: String,
    brand: String,
    sku: String,
    price: Number,
    oldPrice: Number,
    category: String,
    images: [String],
    description: String,
    stock: Number,
    badge: String,
    status: { type: String, default: 'active' },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    isAdmin: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    customer: {
        name: String,
        email: String,
        phone: String,
        address: String
    },
    userId: String,
    userEmail: String,
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number
    }],
    total: Number,
    paymentMethod: String,
    paymentStatus: { type: String, default: 'pending' },
    status: { type: String, default: 'processing' },
    comment: String,
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
    orderId: String,
    customerName: String,
    customerEmail: String,
    amount: Number,
    paymentMethod: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
});

// Модели
const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// API для товаров
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для отзывов
app.post('/api/products/:id/reviews', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        product.reviews.push(req.body);
        
        // Пересчитываем рейтинг
        const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
        product.rating = totalRating / product.reviews.length;
        
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для заказов
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для пользователей
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для платежей
app.get('/api/payments', async (req, res) => {
    try {
        const payments = await Payment.find();
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});