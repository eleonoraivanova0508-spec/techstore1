const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
const PORT = 5000

// =====================
// MIDDLEWARE
// =====================
app.use(cors())
app.use(express.json())

// =====================
// HEALTH CHECK
// =====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// =====================
// MONGODB CONNECT
// =====================
mongoose.connect(
  'mongodb+srv://techstore:elya2007@cluster0.xb8xnpb.mongodb.net/test?retryWrites=true&w=majority'
)

.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err))

// =====================
// SCHEMAS
// =====================
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  category: String,
  badge: String,
  description: String,
  image: String
}, { timestamps: true })

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
}, { timestamps: true })

const OrderSchema = new mongoose.Schema({
  items: { type: Array, required: true },
  totalPrice: { type: Number, required: true },
  userId: String,
  status: {
    type: String,
    default: 'new' // new | processing | shipped | canceled
  }
}, { timestamps: true })

// =====================
// MODELS
// =====================
const Product = mongoose.model('Product', ProductSchema)
const User = mongoose.model('User', UserSchema)
const Order = mongoose.model('Order', OrderSchema)

// =====================
// PRODUCTS API
// =====================

// получить все товары
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find()
    res.json(products)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// создать товар
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body)
    await product.save()
    res.json(product)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// обновить товар
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' })
    }

    res.json(product)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// удалить товар
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)

    if (!product) {
      return res.status(404).json({ message: 'Товар не найден' })
    }

    res.json({ message: 'Товар удалён' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// =====================
// USERS API
// =====================

// регистрация
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body)
    await user.save()
    res.json(user)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// получить всех пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// =====================
// ORDERS API
// =====================

// создать заказ
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body)
    await order.save()
    res.json(order)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// получить все заказы
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find()
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// изменить статус заказа
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )

    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`)
})
