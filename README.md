# Practical-6: Task CRUD API with MongoDB and Mongoose

## Aim

To enhance the Task CRUD REST API developed in Practical-4 by replacing
the in-memory task array with MongoDB database storage using Mongoose,
implementing persistent CRUD operations and centralized error handling.

## Objectives

-   Install and configure Mongoose and dotenv.
-   Connect an Express.js application to MongoDB.
-   Create a Mongoose schema and model for tasks.
-   Replace in-memory CRUD operations with MongoDB operations.
-   Implement error handling using `try/catch` and `next(err)`.
-   Test all CRUD endpoints using Postman.
-   Verify that task data persists after restarting the server.

## Technologies Used

-   Node.js
-   Express.js
-   MongoDB / MongoDB Atlas
-   Mongoose
-   dotenv
-   Postman
-   JavaScript

## Project Structure

``` text
task-api/
│
├── models/
│   └── Task.js
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## Prerequisites

Make sure the following are installed:

1.  Node.js
2.  npm
3.  MongoDB Atlas account or a local MongoDB server
4.  Postman

Check Node.js and npm:

``` bash
node --version
npm --version
```

## Step 1: Install Required Packages

Open the terminal inside the project folder and run:

``` bash
npm install express mongoose dotenv
```

If Express was already installed in Practical-4, installing it again is
harmless.

## Step 2: Create the Environment File

Create a `.env` file in the project root.

Example:

``` env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/taskdb?retryWrites=true&w=majority
PORT=3000
```

Replace `USERNAME`, `PASSWORD`, and the cluster information with the
actual MongoDB connection details.

### Security Note

Do not upload `.env` to GitHub because it can contain database
credentials.

Add the following to `.gitignore`:

``` text
node_modules/
.env
```

## Step 3: Create the Task Model

Create the file:

``` text
models/Task.js
```

Use the following code:

``` javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    completed: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', taskSchema);
```

### Task Schema Fields

  Field           Type      Description
  --------------- --------- -----------------------------------------
  `title`         String    Task title; required
  `description`   String    Optional task description
  `completed`     Boolean   Indicates whether the task is completed
  `createdAt`     Date      Automatically stores creation time

## Step 4: Configure MongoDB and Express

Create/update `server.js`:

``` javascript
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();

app.use(express.json());

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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```

## Step 5: Run the Server

Start the application:

``` bash
node server.js
```

Expected output:

``` text
MongoDB connected
Server running on http://localhost:3000
```

If `MongoDB connected` is not displayed, verify the `MONGO_URI`, MongoDB
credentials, and MongoDB Atlas network access settings.

## Step 6: Test CRUD Operations Using Postman

The API provides four main endpoints.

  Operation       Method   Endpoint
  --------------- -------- --------------
  Get all tasks   GET      `/tasks`
  Create task     POST     `/tasks`
  Update task     PUT      `/tasks/:id`
  Delete task     DELETE   `/tasks/:id`

### 6.1 Create a Task

**Method:**

``` text
POST
```

**URL:**

``` text
http://localhost:3000/tasks
```

**Body → raw → JSON:**

``` json
{
    "title": "Complete MongoDB Practical",
    "description": "Implement CRUD operations using Mongoose",
    "completed": false
}
```

Expected response contains a MongoDB-generated `_id`.

Example:

``` json
{
    "_id": "689abc123...",
    "title": "Complete MongoDB Practical",
    "description": "Implement CRUD operations using Mongoose",
    "completed": false,
    "createdAt": "2026-08-12T00:00:00.000Z",
    "__v": 0
}
```

Save the `_id` for testing PUT and DELETE.

### 6.2 Get All Tasks

**Method:**

``` text
GET
```

**URL:**

``` text
http://localhost:3000/tasks
```

Expected response:

``` json
[
    {
        "_id": "689abc123...",
        "title": "Complete MongoDB Practical",
        "description": "Implement CRUD operations using Mongoose",
        "completed": false,
        "createdAt": "2026-08-12T00:00:00.000Z",
        "__v": 0
    }
]
```

### 6.3 Update a Task

**Method:**

``` text
PUT
```

**URL:**

``` text
http://localhost:3000/tasks/YOUR_TASK_ID
```

**Body → raw → JSON:**

``` json
{
    "completed": true
}
```

The response should contain the updated task.

### 6.4 Delete a Task

**Method:**

``` text
DELETE
```

**URL:**

``` text
http://localhost:3000/tasks/YOUR_TASK_ID
```

Expected response:

``` json
{
    "message": "Task deleted successfully",
    "task": {
        "_id": "689abc123...",
        "title": "Complete MongoDB Practical",
        "description": "Implement CRUD operations using Mongoose",
        "completed": true
    }
}
```

## Step 7: Verify Data Persistence

One of the main requirements of this practical is to confirm that data
remains stored after the server is restarted.

### Procedure

1.  Create a task using the POST endpoint.
2.  Retrieve it using the GET endpoint.
3.  Stop the Node.js server using `Ctrl + C`.
4.  Start the server again:

``` bash
node server.js
```

5.  Execute the GET request again:

``` text
GET http://localhost:3000/tasks
```

6.  Confirm that the previously created task is still present.

This proves that the task is stored in MongoDB rather than only in
application memory.

## Mongoose CRUD Methods Used

  CRUD Operation   Mongoose Method              Purpose
  ---------------- ---------------------------- ---------------------------
  Read             `Task.find()`                Retrieves all tasks
  Create           `Task.create()`              Creates and stores a task
  Update           `Task.findByIdAndUpdate()`   Updates an existing task
  Delete           `Task.findByIdAndDelete()`   Deletes an existing task

## Error Handling

Each asynchronous route uses `try/catch`.

Example:

``` javascript
try {
    const tasks = await Task.find();
    res.status(200).json(tasks);
} catch (err) {
    next(err);
}
```

Errors are forwarded to the global error handler:

``` javascript
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message
    });
});
```

This keeps error handling centralized instead of repeating the same
response logic in every route.

## Difference from Practical-4

In Practical-4, tasks were stored in an in-memory array:

``` javascript
let tasks = [];
```

This means all data was lost whenever the server stopped.

In Practical-6, Mongoose communicates with MongoDB:

``` text
Postman
   ↓
Express.js Route
   ↓
Mongoose
   ↓
MongoDB
   ↓
Persistent Data
```

Therefore, data remains available even after restarting the Node.js
server.

## Expected Result

The Task CRUD REST API successfully:

-   Connects to MongoDB using Mongoose.
-   Creates tasks and stores them in MongoDB.
-   Retrieves tasks from MongoDB.
-   Updates existing tasks.
-   Deletes tasks.
-   Handles route errors using `next(err)`.
-   Persists data after server restart.

## Conclusion

Practical-6 successfully upgrades the Task CRUD API from temporary
in-memory storage to persistent MongoDB storage using Mongoose. The
application implements complete CRUD functionality, environment-based
database configuration, centralized error handling, and Postman-based
API testing. The persistence test confirms that task data remains
available after restarting the server.

## Learning Outcomes

After completing this practical, the student is able to:

1.  Connect a Node.js/Express application with MongoDB.
2.  Use Mongoose to define schemas and models.
3.  Perform MongoDB CRUD operations through Mongoose.
4.  Configure sensitive connection information using `.env`.
5.  Implement centralized Express error handling.
6.  Test REST APIs using Postman.
7.  Understand the difference between in-memory and persistent database
    storage.
