const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./mailer');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'techstore-secret-key-2025';

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/techstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB подключена'))
.catch(err => console.error('❌ Ошибка подключения MongoDB:', err));

// ======= Схемы =======
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: String,
    brand: String,
    price: Number,
    oldPrice: Number,
    category: String,
    badge: String,
    color: String,
    memory: String,
    ram: String,
    screen: String,
    processor: String,
    battery: String,
    images: [String],
    description: String,
    stock: Number,
    rating: Number,
    createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    customer: {
        name: String,
        phone: String,
        email: String,
        address: String
    },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number
    }],
    total: Number,
    paymentMethod: String,
    status: { type: String, default: 'processing' },
    comment: String,
    userId: String,
    userEmail: String,
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
    orderId: String,
    customerName: String,
    amount: Number,
    paymentMethod: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
});

// ======= Модели =======
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// ======= Middleware =======
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется аутентификация' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный токен' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Требуются права администратора' });
    }
    next();
};

// ======= API =======

// Проверка сервиса
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Инициализация админа и тестовых товаров
app.post('/api/init', async (req, res) => {
    try {
        const adminExists = await User.findOne({ email: 'admin@techstore.ru' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await new User({ name: 'Администратор', email: 'admin@techstore.ru', password: hashedPassword, isAdmin: true }).save();
        }

        const productsCount = await Product.countDocuments();

if (productsCount === 0) {
    // создаются тестовые товары
}


        res.json({ message: 'База данных инициализирована', adminCreated: !adminExists, productsCreated: productsCount === 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка инициализации' });
    }
});

// ======= Пользователи =======
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, isAdmin } = req.body;
        if (await User.findOne({ email })) return res.status(400).json({ error: 'Пользователь существует' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await new User({ name, email, password: hashedPassword, isAdmin: isAdmin || false }).save();

        const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ message: 'Пользователь зарегистрирован', user, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка регистрации' }); }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password, isAdmin } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
        if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Неверный пароль' });
        if (isAdmin && !user.isAdmin) return res.status(403).json({ error: 'Недостаточно прав' });

        const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Вход успешен', user, token });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка входа' }); }
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try { const users = await User.find().select('-password').sort({ createdAt: -1 }); res.json(users); } 
    catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка получения пользователей' }); }
});

app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        if (user.isAdmin) return res.status(403).json({ error: 'Нельзя удалить администратора' });
        await user.remove();
        res.json({ message: 'Пользователь удален' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления пользователя' }); }
});

// ======= Товары =======
app.get('/api/products', async (req, res) => { try { const products = await Product.find().sort({ createdAt: -1 }); res.json(products); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка получения товаров' }); } });
app.post('/api/products', authenticateToken, isAdmin, async (req, res) => { try { const product = await new Product(req.body).save(); res.status(201).json(product); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка создания товара' }); } });
app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => { try { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!product) return res.status(404).json({ error: 'Товар не найден' }); res.json(product); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка обновления товара' }); } });
app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => { try { const product = await Product.findByIdAndDelete(req.params.id); if (!product) return res.status(404).json({ error: 'Товар не найден' }); res.json({ message: 'Товар удален' }); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления товара' }); } });

// ======= Заказы =======
app.get('/api/orders', authenticateToken, isAdmin, async (req, res) => { try { const orders = await Order.find().sort({ createdAt: -1 }); res.json(orders); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка получения заказов' }); } });

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();

        // Создание записи о платеже
        const payment = new Payment({
            orderId: order._id,
            customerName: order.customer.name,
            amount: order.total,
            paymentMethod: order.paymentMethod,
            status: 'success'
        });
        await payment.save();

        // Формируем письмо для покупателя
        const emailHtml = `
            <h2>Спасибо за ваш заказ, ${order.customer.name}!</h2>
            <p>Ваш заказ принят и обрабатывается.</p>
            <p><b>Сумма:</b> ${order.total} ₽</p>
            <p><b>Метод оплаты:</b> ${order.paymentMethod}</p>
            <p>Детали заказа:</p>
            <ul>
                ${order.items.map(item => `<li>${item.name} — ${item.quantity} шт. по ${item.price} ₽</li>`).join('')}
            </ul>
            <p>Адрес доставки: ${order.customer.address}</p>
            <p>Спасибо за покупку!</p>
        `;

        // Отправка письма покупателю и копии себе
        await sendEmail(order.customer.email, 'Подтверждение заказа TechStore', emailHtml);

        res.status(201).json(order);
    } catch (error) {
        console.error('Ошибка создания заказа:', error);
        res.status(500).json({ error: 'Ошибка создания заказа' });
    }
});

// ======= Платежи =======
app.get('/api/payments', authenticateToken, isAdmin, async (req, res) => { try { const payments = await Payment.find().sort({ createdAt: -1 }); res.json(payments); } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка получения платежей' }); } });

// ======= Статистика =======
app.get('/api/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const inStockProducts = await Product.countDocuments({ stock: { $gt: 0 } });
        const today = new Date(); today.setHours(0,0,0,0);
        const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
        const totalRevenueResult = await Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;
        res.json({ totalProducts, inStockProducts, todayOrders, totalRevenue });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка получения статистики' }); }
});

// ======= Старт сервера =======
app.get('/', (req, res) => res.send('<h1>🚀 TechStore API работает</h1>'));

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port', PORT);
});


