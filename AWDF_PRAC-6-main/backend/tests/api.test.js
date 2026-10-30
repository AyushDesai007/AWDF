const request = require('supertest');
const app = require('../server');
const aiRouter = require('../routes/ai');

describe('Task Management API Test Suite', () => {
  beforeEach(() => {
    if (aiRouter._resetRateLimits) {
      aiRouter._resetRateLimits();
    }
  });

  describe('Core API & CI/CD Pipeline (Practical 12)', () => {
    test('should return HTTP 200 and backend operational status on GET /health', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('should return HTTP 200 with an array of tasks on GET /tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('should create a task successfully on POST /tasks with HTTP 201', async () => {
      const newTask = {
        title: 'Automated CI Test Task',
        description: 'Verifying continuous integration pipeline with Jest and Supertest',
        assignedUser: '24it012@charusat.edu.in',
      };
      const res = await request(app).post('/tasks').send(newTask);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('title', newTask.title);
      expect(res.body).toHaveProperty('assignedUser', newTask.assignedUser);
    });

    test('should reject task creation without title with HTTP 400', async () => {
      const res = await request(app).post('/tasks').send({ description: 'No title' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Title is required');
    });
  });

  describe('Authentication & Security', () => {
    test('should reject request with invalid or tampered JWT token with HTTP 401', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-or-tampered-token');
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    test('should reject registration missing email and password with HTTP 400', async () => {
      const res = await request(app).post('/auth/register').send({});
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PRACTICAL 13: POST /api/ai/generate-description', () => {
    test('Scenario 1: should generate an AI description for a valid task title with configured provider', async () => {
      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: 'Deploy full-stack microservice to cloud' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('description');
      expect(typeof res.body.description).toBe('string');
      expect(res.body.description.length).toBeGreaterThan(10);
    });

    test('Scenario 2: should reject empty, whitespace, or missing title with HTTP 400', async () => {
      const resEmpty = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: '   ' });

      expect(resEmpty.statusCode).toBe(400);
      expect(resEmpty.body).toHaveProperty('message', 'Task title is required');

      const resMissing = await request(app)
        .post('/api/ai/generate-description')
        .send({});

      expect(resMissing.statusCode).toBe(400);
      expect(resMissing.body).toHaveProperty('message', 'Task title is required');
    });

    test('Scenario 2 (cont.): should reject title exceeding length limit (> 200 chars) with HTTP 400', async () => {
      const longTitle = 'a'.repeat(201);
      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: longTitle });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Task title cannot exceed 200 characters');
    });

    test('Scenario 3: should return controlled fallback when API key is missing', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: 'Prepare lab journal for Practical 13' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fallback', true);
      expect(res.body).toHaveProperty('notice');
      expect(res.body.notice).toContain('OpenAI API key is not configured');
      expect(res.body.description).toContain('Prepare lab journal for Practical 13');

      process.env.OPENAI_API_KEY = originalKey;
    });

    test('Scenario 4: should handle invalid API key credentials gracefully without crashing', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-invalid-demo-key-12345';

      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: 'Configure NGINX reverse proxy' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fallback', true);
      expect(res.body).toHaveProperty('description');

      process.env.OPENAI_API_KEY = originalKey;
    });

    test('Scenario 5: should handle provider timeout / network failure gracefully', async () => {
      const originalTimeout = process.env.AI_REQUEST_TIMEOUT_MS;
      process.env.AI_REQUEST_TIMEOUT_MS = '1'; // 1ms timeout forces timeout

      const res = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: 'Implement database connection pooling' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fallback', true);
      expect(res.body).toHaveProperty('description');

      process.env.AI_REQUEST_TIMEOUT_MS = originalTimeout;
    });

    test('Scenario 6: should enforce rate limiting on repeated rapid requests', async () => {
      // Send 5 rapid requests (within allowed limit)
      for (let i = 0; i < 5; i++) {
        const resOk = await request(app)
          .post('/api/ai/generate-description')
          .send({ title: `Rapid request #${i + 1}` });
        expect(resOk.statusCode).toBe(200);
      }

      // The 6th request within the 1-minute window should trigger rate limit (HTTP 429)
      const resRateLimited = await request(app)
        .post('/api/ai/generate-description')
        .send({ title: 'Excessive rapid request triggering rate limiter' });

      expect(resRateLimited.statusCode).toBe(429);
      expect(resRateLimited.body).toHaveProperty('message');
      expect(resRateLimited.body.message).toContain('Rate limit exceeded');
    });
  });
});
