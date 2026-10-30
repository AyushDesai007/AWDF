const isTestEnv = process.env.NODE_ENV === 'test';
require('dotenv').config();
if (isTestEnv) {
  process.env.NODE_ENV = 'test';
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoose = require('mongoose');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
require('./listeners');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/taskdb';
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean);

if (process.env.NODE_ENV === 'test') {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-test-jwt-secret-key-charusat';
  app.locals.dbMode = 'memory';
} else {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in the backend .env file.');
  }
  app.locals.dbMode = 'mongodb';
}

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevOrigin =
        origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (!origin || isLocalDevOrigin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    dbMode: req.app.locals.dbMode,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'PR6 backend running',
    dbMode: req.app.locals.dbMode,
    uptime: process.uptime(),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

const connectDatabase = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
  });
};

if (process.env.NODE_ENV !== 'test') {
  connectDatabase()
    .then(() => {
      console.log('MongoDB connected');
      startServer();
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      console.warn('Starting backend in memory fallback mode so the app remains usable locally.');
      app.locals.dbMode = 'memory';
      startServer();
    });
}

module.exports = app;
