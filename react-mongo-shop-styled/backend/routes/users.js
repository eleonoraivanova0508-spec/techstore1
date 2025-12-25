const express = require('express')
const router = express.Router()
const User = require('../models/User')

// ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body)
    await user.save()
    res.json(user)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
