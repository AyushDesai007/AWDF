const request = require('supertest');
const app = require('../server');

describe('Task Management API Automated Tests (CI/CD Practical 12)', () => {
  // Test 1: GET /health endpoint
  test('GET /health returns status 200 and healthy status payload', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  // Test 2: GET /tasks endpoint (Deliberately broken for CI failure demonstration)
  test('GET /tasks returns 200', async () => {
    const res = await request(app).get('/tasks');
    // DELIBERATE FAILURE: changed expected status code to 500 to demonstrate CI Red X
    expect(res.statusCode).toBe(500);
  });

  // Test 3: POST /tasks creates a new task (Student Assignment: second automated test)
  test('POST /tasks creates a new task successfully', async () => {
    const newTask = {
      title: 'Automated CI Test Task',
      description: 'Verifying continuous integration pipeline with Jest and Supertest',
      assignedUser: '24it012@charusat.edu.in',
    };

    const res = await request(app)
      .post('/tasks')
      .send(newTask);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('title', newTask.title);
    expect(res.body).toHaveProperty('assignedUser', newTask.assignedUser);
  });

  // Test 4: POST /tasks validates required title field
  test('POST /tasks without title returns 400 validation error', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'Missing title task' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Title is required');
  });
});
