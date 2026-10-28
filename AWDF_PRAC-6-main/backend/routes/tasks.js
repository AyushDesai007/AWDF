const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const taskEvents = require('../events');
const { getEventLogs } = require('../listeners');

const memoryTasks = [];
let memoryId = 1;
const taskCache = new Map();
const cacheTtlMs = Number(process.env.TASK_CACHE_TTL_MS) || 15000;

const isMemoryMode = (req) => req.app.locals.dbMode === 'memory';

const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => new Date(b.createdAt || b.updatedAt || Date.now()) - new Date(a.createdAt || a.updatedAt || Date.now()));

const toMemoryTask = (task) => ({
  ...task,
  _id: String(task._id ?? task.id ?? memoryId++),
  title: task.title,
  description: task.description || '',
  completed: Boolean(task.completed),
  assignedUser: task.assignedUser || 'admin@example.com',
  createdAt: task.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const clearTaskCache = () => taskCache.clear();

const readTasksFromStore = async (req) => {
  if (isMemoryMode(req)) {
    return sortTasks(memoryTasks);
  }

  const cacheKey = 'tasks:all';
  const cached = taskCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const tasks = await Task.find().sort({ createdAt: -1 }).lean();
  taskCache.set(cacheKey, { data: tasks, expiresAt: Date.now() + cacheTtlMs });
  return tasks;
};

// GET /tasks/events/logs - get EventEmitter log records for inspection
router.get('/events/logs', (req, res) => {
  return res.status(200).json(getEventLogs());
});

// GET /tasks - fetch all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await readTasksFromStore(req);
    return res.status(200).json(tasks);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

// POST /tasks - create a task
router.post('/', async (req, res) => {
  try {
    const { title, description, assignedUser, simulateError } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const assigned = (assignedUser && assignedUser.trim()) || 'admin@example.com';

    if (isMemoryMode(req)) {
      const task = toMemoryTask({
        title: title.trim(),
        description: description ? description.trim() : '',
        completed: false,
        assignedUser: assigned,
      });
      memoryTasks.unshift(task);
      clearTaskCache();

      const apiResponseTime = new Date().toISOString();
      console.log(`[API] Response sent at ${apiResponseTime}`);
      res.status(201).json(task);

      taskEvents.emit('task-created', {
        ...task,
        apiResponseTime,
        simulateError: Boolean(simulateError || title.includes('TRIGGER_ERROR')),
      });
      return;
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      assignedUser: assigned,
    });
    clearTaskCache();

    const apiResponseTime = new Date().toISOString();
    console.log(`[API] Response sent at ${apiResponseTime}`);
    res.status(201).json(task);

    taskEvents.emit('task-created', {
      ...(task.toObject ? task.toObject() : task),
      apiResponseTime,
      simulateError: Boolean(simulateError || title.includes('TRIGGER_ERROR')),
    });
    return;
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
});

// PUT /tasks/:id - update a task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, completed } = req.body;

    if (isMemoryMode(req)) {
      const taskIndex = memoryTasks.findIndex((task) => String(task._id) === String(req.params.id));
      if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const updatedTask = toMemoryTask({
        ...memoryTasks[taskIndex],
        title: title ?? memoryTasks[taskIndex].title,
        description: description ?? memoryTasks[taskIndex].description,
        completed: completed ?? memoryTasks[taskIndex].completed,
      });

      memoryTasks[taskIndex] = updatedTask;
      clearTaskCache();
      return res.status(200).json(updatedTask);
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: title ? title.trim() : title,
        description: description !== undefined ? description.trim() : description,
        completed,
      },
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    clearTaskCache();
    return res.status(200).json(task);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
});

// DELETE /tasks/:id - delete a task
router.delete('/:id', async (req, res) => {
  try {
    if (isMemoryMode(req)) {
      const initialLength = memoryTasks.length;
      const targetTask = memoryTasks.find((task) => String(task._id) === String(req.params.id));
      const filteredTasks = memoryTasks.filter((task) => String(task._id) !== String(req.params.id));

      if (filteredTasks.length === initialLength || !targetTask) {
        return res.status(404).json({ message: 'Task not found' });
      }

      memoryTasks.length = 0;
      memoryTasks.push(...filteredTasks);
      clearTaskCache();

      const apiResponseTime = new Date().toISOString();
      console.log(`[API] Delete response sent at ${apiResponseTime}`);
      res.status(200).json({ message: 'Task deleted', id: req.params.id, title: targetTask.title });

      taskEvents.emit('task-deleted', {
        id: req.params.id,
        title: targetTask.title,
        assignedUser: targetTask.assignedUser || 'admin@example.com',
        apiResponseTime,
      });
      return;
    }

    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    clearTaskCache();

    const apiResponseTime = new Date().toISOString();
    console.log(`[API] Delete response sent at ${apiResponseTime}`);
    res.status(200).json({ message: 'Task deleted', id: req.params.id, title: task.title });

    taskEvents.emit('task-deleted', {
      id: req.params.id,
      title: task.title,
      assignedUser: task.assignedUser || 'admin@example.com',
      apiResponseTime,
    });
    return;
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
});

module.exports = router;
