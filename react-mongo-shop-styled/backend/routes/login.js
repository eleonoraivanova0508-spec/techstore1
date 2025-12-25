const express = require('express')
const router = express.Router()

// Пример логина
router.post('/', (req, res) => {
  const { email, password } = req.body
  if (email === 'test@mail.com' && password === '1234') {
    return res.json({ message: 'Login successful', user: { email } })
  } else {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
})

module.exports = router
