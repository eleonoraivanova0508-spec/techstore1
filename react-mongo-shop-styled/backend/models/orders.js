// backend/models/Order.js
const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
  items: [
    {
      title: String,
      price: Number,
      count: Number
    }
  ],
  totalPrice: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('Order', OrderSchema)
