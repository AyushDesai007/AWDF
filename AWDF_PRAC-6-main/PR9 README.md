# Practical 9: Backend Performance Optimization

This practical improves the backend for a production-ready task API by adding production security, request protection, response compression, and query-level optimization.

## Highlights

- Helmet security headers
- Response compression with gzip
- Rate limiting to protect the API from abuse
- Stronger MongoDB connection pool settings
- Caching for repetitive task reads
- Memory fallback mode when MongoDB is unreachable
- JWT validation requirements via `.env`

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

## Key environment variables

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pr6_tasks
FRONTEND_URL=http://localhost:5173
JWT_SECRET=replace_with_a_secure_random_string
JWT_EXPIRES_IN=1h
TASK_CACHE_TTL_MS=15000
```

## Optimized backend notes

- `server.js` now uses compression, helmet, request logging, and rate limiting.
- `routes/tasks.js` caches the list of tasks for short intervals to reduce repeated database reads.
- `Task.js` adds indexes for faster sorting and filtering.
- `mongoose` is configured with a safer pool and stricter query behavior.

## Test the app

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health
- Task API: http://localhost:5000/tasks
