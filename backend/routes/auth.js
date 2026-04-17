const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock users database (replace with MongoDB)
const users = [];

// Register endpoint
router.post('/register', async (req, res) => {
    try {
          const { email, password } = req.body;

          if (!email || !password) {
                  return res.status(400).json({ error: 'Email and password required' });
                }

          const userExists = users.find(u => u.email === email);
          if (userExists) {
                  return res.status(400).json({ error: 'User already exists' });
                }

          const hashedPassword = await bcryptjs.hash(password, 10);
          const user = { id: Date.now(), email, password: hashedPassword };
          users.push(user);

          const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret-key');
          res.status(201).json({ token, user: { id: user.id, email: user.email } });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
  });

// Login endpoint
router.post('/login', async (req, res) => {
    try {
          const { email, password } = req.body;

          const user = users.find(u => u.email === email);
          if (!user) {
                  return res.status(401).json({ error: 'Invalid credentials' });
                }

          const validPassword = await bcryptjs.compare(password, user.password);
          if (!validPassword) {
                  return res.status(401).json({ error: 'Invalid credentials' });
                }

          const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret-key');
          res.json({ token, user: { id: user.id, email: user.email } });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
  });

module.exports = router;
