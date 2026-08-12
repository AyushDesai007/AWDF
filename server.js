const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();

app.use(express.json());


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));


// GET - Get all tasks
app.get('/tasks', async (req, res, next) => {
    try {
        const tasks = await Task.find();
        res.status(200).json(tasks);
    } catch (err) {
        next(err);
    }
});


// POST - Create a new task
app.post('/tasks', async (req, res, next) => {
    try {
        const { title, description, completed } = req.body;

        const task = await Task.create({
            title,
            description,
            completed
        });

        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});


// PUT - Update a task
app.put('/tasks/:id', async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!task) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }

        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});


// DELETE - Delete a task
app.delete('/tasks/:id', async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                message: 'Task not found'
            });
        }

        res.status(200).json({
            message: 'Task deleted successfully',
            task
        });
    } catch (err) {
        next(err);
    }
});


// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message
    });
});


// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});