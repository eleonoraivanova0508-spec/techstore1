// backend/index.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== ВРЕМЕННОЕ ХРАНЕНИЕ (без MongoDB) ====================
let orders = [];
let orderCounter = 1000;
let products = [
  {
    _id: "69404ad3414fd744993b1e46",
    name: "iPhone 14 Pro",
    price: 520000,
    image: "https://images.unsplash.com/photo-1661961112958-3b65e26bfe66",
    category: "phone"
  },
  {
    _id: "69404add414fd744993b1e48",
    name: "Samsung Galaxy S23",
    price: 480000,
    image: "https://images.unsplash.com/photo-1674418551259-2c7d6d0b7c5c",
    category: "phone"
  },
  {
    _id: "69404aec414fd744993b1e4a",
    name: "MacBook Air M2",
    price: 780000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8",
    category: "laptop"
  },
  {
    _id: "69404af6414fd744993b1e4c",
    name: "ASUS VivoBook 15",
    price: 420000,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    category: "laptop"
  }
];

// ==================== РОУТЫ ====================

// Главная страница
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shop API is running!',
    endpoints: {
      products: 'GET /api/products',
      createOrder: 'POST /api/orders',
      getOrders: 'GET /api/orders',
      testOrder1: 'POST /api/orders/test',
      testOrder2: 'POST /api/test-order'
    }
  });
});

// Получение продуктов
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    count: products.length,
    data: products
  });
});

// Создание заказа
app.post('/api/orders', (req, res) => {
  console.log('📦 Order received:', JSON.stringify(req.body, null, 2));
  
  try {
    const orderNumber = ++orderCounter;
    const orderId = Date.now();
    
    const order = {
      _id: orderId.toString(),
      ...req.body,
      orderNumber,
      status: 'processing',
      createdAt: new Date().toISOString()
    };
    
    orders.push(order);
    
    console.log('✅ Order saved in memory. Total orders:', orders.length);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Получение всех заказов
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// Тестовый эндпоинт 1
app.post('/api/orders/test', (req, res) => {
  const testOrder = {
    _id: Date.now().toString(),
    orderNumber: ++orderCounter,
    customer: {
      fullName: "Тестовый Покупатель",
      phone: "+79991112233",
      email: "test@example.com",
      address: "г. Москва, ул. Тестовая, д. 1"
    },
    payment: {
      method: "card"
    },
    order: {
      items: [
        {
          name: "iPhone 14 Pro",
          price: 520000,
          quantity: 1,
          productId: "69404ad3414fd744993b1e46"
        }
      ],
      total: 520000
    },
    status: "processing",
    createdAt: new Date().toISOString()
  };
  
  orders.push(testOrder);
  
  res.json({
    success: true,
    message: 'Test order created via /api/orders/test',
    data: testOrder
  });
});

// Тестовый эндпоинт 2 (тот, который вы пытаетесь использовать)
app.post('/api/test-order', (req, res) => {
  const testOrder = {
    _id: Date.now().toString(),
    orderNumber: ++orderCounter,
    customer: {
      fullName: "Тестовый Покупатель V2",
      phone: "+79991112233",
      email: "test2@example.com",
      address: "г. Москва, ул. Тестовая, д. 2"
    },
    payment: {
      method: "card"
    },
    order: {
      items: [
        {
          name: "Samsung Galaxy S23",
          price: 480000,
          quantity: 2,
          productId: "69404add414fd744993b1e48"
        }
      ],
      total: 960000
    },
    status: "processing",
    createdAt: new Date().toISOString()
  };
  
  orders.push(testOrder);
  
  res.json({
    success: true,
    message: 'Test order created via /api/test-order',
    data: testOrder
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/api/products`);
  console.log(`   POST http://localhost:${PORT}/api/orders`);
  console.log(`   GET  http://localhost:${PORT}/api/orders`);
  console.log(`   POST http://localhost:${PORT}/api/orders/test`);
  console.log(`   POST http://localhost:${PORT}/api/test-order`);
  console.log(`\n💡 Для теста отправьте:`);
  console.log(`   POST http://localhost:${PORT}/api/test-order`);
});