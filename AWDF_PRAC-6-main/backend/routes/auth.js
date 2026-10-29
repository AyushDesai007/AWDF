const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');

const memoryUsers = new Map();
const demoUserEmail = 'admin@example.com';
const demoUserPassword = 'password123';

const ensureDemoUser = async (req) => {
  if (isMemoryMode(req)) {
    if (memoryUsers.has(demoUserEmail)) return;
    const hashedPassword = await bcrypt.hash(demoUserPassword, 10);
    memoryUsers.set(demoUserEmail, {
      _id: 'demo-admin',
      email: demoUserEmail,
      password: hashedPassword,
    });
  } else {
    try {
      const existing = await User.findOne({ email: demoUserEmail });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(demoUserPassword, 10);
        await User.create({ email: demoUserEmail, password: hashedPassword });
      }
    } catch (e) {
      // Ignore if already created concurrently
    }
  }
};

const isMemoryMode = (req) => req.app.locals.dbMode === 'memory';

// POST /auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (isMemoryMode(req)) {
      await ensureDemoUser();
      if (memoryUsers.has(normalizedEmail)) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        _id: `memory-user-${Date.now()}`,
        email: normalizedEmail,
        password: hashedPassword,
      };
      memoryUsers.set(normalizedEmail, user);
      return res.status(201).json({ id: user._id, email: user.email });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, password: hashedPassword });

    res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    if (isMemoryMode(req)) {
      await ensureDemoUser();
      const user = memoryUsers.get(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      });

      return res.status(200).json({ token, user: { id: user._id, email: user.email } });
    }

    await ensureDemoUser(req);
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    res.status(200).json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET /auth/me — returns the logged-in user's details from the decoded token
router.get('/me', auth, async (req, res) => {
  try {
    if (isMemoryMode(req)) {
      await ensureDemoUser();
      const user = [...memoryUsers.values()].find((entry) => String(entry._id) === String(req.user.id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(200).json({ id: user._id, email: user.email });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

module.exports = router;
