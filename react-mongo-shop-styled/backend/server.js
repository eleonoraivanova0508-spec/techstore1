const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const nodemailer = require('nodemailer')
require('dotenv').config()
const bcrypt = require('bcryptjs')
const app = express()
const PORT = process.env.PORT || 5000
// =====================
// MIDDLEWARE
// =====================
app.use(
  cors({
    origin: true,
    credentials: true
  })
)

app.use(express.json())

// =====================
// HEALTH
// =====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// =====================
// MONGODB
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err))

// =====================
// SCHEMAS
// =====================
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    brand: String,
    sku: String,

    price: { type: Number, required: true },
    oldPrice: Number,

    category: String,

    description: String,
    fullDescription: String,

    stock: { type: Number, default: 0 },

    status: {
      type: String,
      default: 'active'
    },

    visibility: {
      type: String,
      default: 'visible'
    },
    colors: [
      {
        name: String,
        value: String
      }
    ],
    images: [String],

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: String,
    phone: String,
    address: String,

    password: { type: String, default: '' },

    status: { type: String, default: 'active' },
    isAdmin: { type: Boolean, default: false },
    role: { type: String, default: 'user' }
  },
  { timestamps: true }
)


const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    userEmail: String,
    rating: Number,
    text: String
  },
  { timestamps: true }
)

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      name: String,
      phone: String,
      email: String,
      address: String
    },
    items: Array,
    total: Number,
    paymentMethod: String,
    comment: String,
    status: { type: String, default: 'В обработке' },
    createdAt: String
  },
  { timestamps: true }
)

// =====================
// MODELS
// =====================
const Product = mongoose.model('Product', ProductSchema)
const User = mongoose.model('User', UserSchema)
const Review = mongoose.model('Review', ReviewSchema)
const Order = mongoose.model('Order', OrderSchema)

// =====================
// EMAIL
// =====================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

transporter.verify(err => {
  if (err) console.error('❌ EMAIL ERROR:', err)
  else console.log('✅ Email ready')
})

// =====================
// PRODUCTS
// =====================
app.get('/api/products', async (req, res) => {
  res.json(await Product.find())
})

app.post('/api/products', async (req, res) => {
  const product = new Product(req.body)
  await product.save()
  res.json(product)
})

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params

    console.log('🧩 UPDATE PRODUCT ID:', id)
    console.log('🧩 UPDATE PRODUCT BODY:', req.body)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID товара' })
    }

    const data = { ...req.body }
    delete data._id

    // убираем undefined
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key]
    })

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления' })
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )

    if (!updated) {
      return res.status(404).json({ message: 'Товар не найден' })
    }

    res.json(updated)
  } catch (e) {
    console.error('❌ PRODUCT UPDATE ERROR:', e)
    res.status(500).json({ message: 'Ошибка обновления товара' })
  }
})

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params

    console.log('🛠 PUT PRODUCT ID:', id)
    console.log('🛠 PUT PRODUCT BODY:', req.body)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неверный ID товара' })
    }

    const data = { ...req.body }
    delete data._id

    // чистим undefined
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key]
    })

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления' })
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true
      }
    )

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Товар не найден' })
    }

    res.json(updatedProduct)
  } catch (error) {
    console.error('❌ PUT PRODUCT ERROR:', error)
    res.status(500).json({ message: 'Ошибка обновления товара' })
  }
})

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ message: 'Delete error' })
  }
})

// =====================
// USERS (FIXED)
// =====================
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body

    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'User exists' })

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone
    })

    await user.save()
    res.json(user)
  } catch (e) {
    console.error(e)
    res.status(500).json({ message: 'User create error' })
  }
})

app.get('/api/users', async (req, res) => {
  const users = await User.find().select('-password')
  res.json(users)
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    // ❗ ОБЯЗАТЕЛЬНО ПЕРВАЯ СТРОКА
    const data = { ...req.body }

    delete data._id

    // 🔑 пароль — ТОЛЬКО если пришёл
    if (typeof data.password === 'string' && data.password.length > 0) {
      const bcrypt = require('bcryptjs')
      data.password = await bcrypt.hash(data.password, 10)
    } else {
      delete data.password
    }

    // 👑 админ
    if (typeof data.isAdmin === 'boolean') {
      data.role = data.isAdmin ? 'admin' : 'user'
    }

    // 🧹 чистка
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) delete data[key]
    })

    const user = await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(user)
  } catch (err) {
    console.error('USER PUT ERROR:', err)
    res.status(500).json({ message: 'User update error' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'User not found' })

    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'User blocked' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).json({ message: 'Wrong password' })

    res.json(user)
  } catch (e) {
    res.status(500).json({ message: 'Login error' })
  }
})

app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )

    res.json(user)
  } catch (e) {
    console.error('STATUS ERROR:', e)
    res.status(500).json({ message: 'Status update error' })
  }
})

app.patch('/api/users/:id/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Wrong old password' })
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json({ message: 'Password updated' })
  } catch (e) {
    res.status(500).json({ message: 'Password change error' })
  }
})

app.patch('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    )

    res.json(user)
  } catch (e) {
    console.error('ROLE ERROR:', e)
    res.status(500).json({ message: 'Role update error' })
  }
})

// =====================
// REVIEWS
// =====================
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const productId = new mongoose.Types.ObjectId(req.params.productId)

    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 })

    res.json(reviews)
  } catch (e) {
    console.error('LOAD REVIEWS ERROR:', e)
    res.status(500).json([])
  }
})
app.post('/api/reviews', async (req, res) => {
  try {
    const review = new Review({
      ...req.body,
      productId: new mongoose.Types.ObjectId(req.body.productId)
    })

    await review.save()

    // берём только отзывы этого товара
    const reviews = await Review.find({
      productId: review.productId
    })

    const avg =
      reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length

    await Product.findByIdAndUpdate(review.productId, {
      rating: avg,
      reviewCount: reviews.length
    })

    // ⬅️ ВАЖНО: возвращаем отзыв
    res.json(review)
  } catch (e) {
    console.error('REVIEW SAVE ERROR:', e)
    res.status(500).json({ message: 'Review save error' })
  }
})
// =====================
// ORDERS
// =====================
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order({
      ...req.body,
      createdAt: new Date().toISOString()
    })

    await order.save()

    if (order.customer?.email) {

      const itemsHtml = order.items
        .map(
          item => `
          <tr>
            <td style="padding:8px 0">${item.name}</td>
            <td align="center">${item.quantity}</td>
            <td align="right">${item.price} ₸</td>
          </tr>
        `
        )
        .join('')

      await transporter.sendMail({
        from: `"TechStore" <${process.env.EMAIL_USER}>`,
        to: order.customer.email,
        subject: '🛒 Ваш заказ успешно оформлен',
        html: `
        <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#333">
          
          <h2 style="color:#2c3e50">Спасибо за заказ!</h2>

          <p>Здравствуйте, <strong>${order.customer.name || 'покупатель'}</strong> 👋</p>
          <p>Мы получили ваш заказ и уже начали его обработку.</p>

          <hr>

          <h3>📦 Детали заказа</h3>
          <p><strong>Номер заказа:</strong> ${order._id}</p>
          <p><strong>Дата:</strong> ${new Date(order.createdAt).toLocaleString()}</p>

          <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid #ddd">
                <th align="left">Товар</th>
                <th align="center">Кол-во</th>
                <th align="right">Цена</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <hr>

          <h3>💰 Итого: ${order.total} ₸</h3>
          <p><strong>Способ оплаты:</strong> ${order.paymentMethod}</p>
          <p><strong>Статус заказа:</strong> ${order.status}</p>

          ${
            order.customer.address
              ? `<p><strong>Адрес доставки:</strong> ${order.customer.address}</p>`
              : ''
          }

          ${
            order.comment
              ? `<p><strong>Комментарий:</strong> ${order.comment}</p>`
              : ''
          }

          <hr>

          <p>📞 Если у вас есть вопросы, мы свяжемся с вами по телефону <strong>${order.customer.phone}</strong></p>

          <p style="color:#777;font-size:13px">
            Спасибо, что выбрали наш магазин 💙<br>
            <strong>TechStore</strong>
          </p>

        </div>
        `
      })
    }

    res.json(order)
  } catch (e) {
    console.error('ORDER ERROR:', e)
    res.status(500).json({ message: 'Order save error' })
  }
})


// 👉 ПОДТЯГИВАНИЕ В АДМИНКУ
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json(orders)
  } catch (e) {
    res.status(500).json({ message: 'Load orders error' })
  }
})

// 👉 СМЕНА СТАТУСА
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 🧠 вытаскиваем статус КАК УГОДНО
    let status = req.body.status

    if (typeof status === 'object' && status !== null) {
      status = status.value
    }

    if (typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({
        message: 'Status is required',
        received: req.body
      })
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid order ID' })
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { status: status.trim() } },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' })
    }

    console.log('✅ ORDER STATUS UPDATED:', updated._id, updated.status)

    res.json(updated)
  } catch (e) {
    console.error('❌ ORDER STATUS ERROR:', e)
    res.status(500).json({ message: 'Status update error' })
  }
})

// =====================
// START
// =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server started on port ${PORT}`)
})
