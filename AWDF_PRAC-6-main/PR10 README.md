# Practical 10: Asynchronous Processing with Event-Driven Architecture

## Course Information
- **Course**: Advanced Web Development Frameworks (ITUE301)
- **Institution**: Charotar University of Science and Technology (CHARUSAT) - CSPIT / DEPSTAR
- **CO / PO**: CO4 / PO3, PO5
- **Objective**: To implement asynchronous background processing using Node.js native `EventEmitter` without external dependencies.

---

## Architecture Overview

```
POST /tasks request
       │
       ▼
 Save task to MongoDB / In-Memory Store
       │
       ▼
 [API] Response Sent (HTTP 201) ──► Client receives immediate response
       │
       ▼ (Handled asynchronously via Node.js Event Loop)
 emit('task-created', taskData)
       │
       ▼
 Notification Listener
       └── Logs: Task title, timestamp, assigned user
           Simulates 2000ms async notification dispatch (email/push)
```

---

## Key Features Implemented

1. **Dedicated EventEmitter Module (`backend/events.js`)**:
   - Extends Node's native `EventEmitter`.
   - Exports a singleton `TaskEvents` instance.

2. **Decoupled Background Listeners (`backend/listeners.js`)**:
   - **`task-created` Listener**: Receives task data, logs task title, assigned user, and timestamps. Simulates a 2-second asynchronous processing delay (e.g., sending email/push notification) using `setTimeout` to confirm non-blocking execution.
   - **`task-deleted` Listener (Supplementary)**: Receives deleted task information and executes background audit cleanup asynchronously.
   - **`error` Event Listener (Supplementary)**: Prevents server crashes by catching and logging asynchronous errors thrown inside event handlers.

3. **Immediate API Response (`backend/routes/tasks.js`)**:
   - Responds to the client (`res.status(201).json(task)`) **before** invoking/completing the background listener.
   - Exposes `GET /tasks/events/logs` for real-time inspection.

4. **Server Startup Registration (`backend/server.js`)**:
   - Requires `listeners.js` at server boot to guarantee that listeners are attached prior to any request.

5. **Live Interactive Event Monitor (`frontend/src/Pages/EventLogs.jsx`)**:
   - Visualizes event names, stages, API response timestamps, and handler completion timestamps directly in the browser UI.
   - Provides one-click buttons to emit normal and error-simulating events.

---

## Timestamp Proof of Asynchronous Execution

From actual server execution console logs:

```text
[API] Response sent at 2026-10-28T05:07:52.413Z
[Notification Listener] Task "Complete Practical 10 Report" created event received at 2026-10-28T05:07:52.418Z (Assigned: alice@charusat.edu.in)
POST /tasks 201 424.186 ms - 202
[Notification Listener] COMPLETED: Notification sent for task "Complete Practical 10 Report" (Assigned: alice@charusat.edu.in) at 2026-10-28T05:07:54.425Z
```

### Analysis:
- **API Response Sent**: `05:07:52.413Z` (Client receives HTTP 201 instantly)
- **Background Notification Completed**: `05:07:54.425Z` (2012 ms later)
- **Conclusion**: The background task did **not** delay the HTTP response. The main request-response cycle remained fast and responsive.

---

## Supplementary Problems Solved

1. **Second Event (`task-deleted`)**:
   - Emitted upon `DELETE /tasks/:id`.
   - Handled by a dedicated deletion listener logging cleanup confirmation asynchronously.
2. **Error Event Listener (`error`)**:
   - Handled via `taskEvents.on('error', ...)`.
   - When an unhandled error occurs in the async handler, emitting `'error'` prevents process termination and safely logs the incident.
3. **Simulated Slow Notification**:
   - Implemented via a 2-second `setTimeout` to clearly demonstrate non-blocking execution.

---

## Key Analysis & Viva Questions

### 1. Why does emitting an event not block the API response, even though both run on the same Node.js process?
> Node.js operates on a single-threaded event loop. When the event listener schedules asynchronous work (such as I/O, `setTimeout`, network requests, or database operations), the callback is delegated to the Node.js event loop timer/task queue. The main thread immediately finishes executing the HTTP response logic (`res.json()`), writes the response to the socket, and returns to the event loop. The listener callback executes later in a subsequent tick of the event loop.

### 2. What would happen to API response time if the notification logic were placed directly inside the POST route instead of in an event handler?
> If the notification logic (e.g., SMTP email sending or push notifications taking 2 seconds) were executed synchronously or `await`ed directly inside the POST route handler, the client would have to wait an additional 2000ms+ before receiving the HTTP 201 response. This dramatically degrades API throughput and user experience.

### 3. Why is EventEmitter a reasonable choice for this scale of application, but not for a production system handling millions of events per day?
> - **Why it's reasonable here**: Node.js `EventEmitter` is built into the standard library, has zero external dependencies, introduces zero network overhead, and is lightweight for single-instance applications.
> - **Why it's insufficient for large production systems**:
>   1. **In-Memory Volatility**: Events reside purely in memory. If the Node.js process crashes or restarts, all pending events are permanently lost (no message persistence).
>   2. **No Horizontal Scaling**: Events cannot cross process or server boundaries. Multiple cluster workers or containers cannot distribute event workloads to each other.
>   3. **No Backpressure or Retry Queues**: If events arrive faster than they can be processed, memory consumption skyrockets without rate limiting, dead-letter queues, or automatic exponential backoff.
>   4. *Production alternative*: Distributed message brokers such as RabbitMQ, Apache Kafka, Redis Streams, or BullMQ.

---

## Localhost Links

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Frontend Event Logs Monitor**: [http://localhost:5173/events](http://localhost:5173/events)
- **Backend Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
- **Backend Tasks API**: [http://localhost:5000/tasks](http://localhost:5000/tasks)
- **Backend Event Logs API**: [http://localhost:5000/tasks/events/logs](http://localhost:5000/tasks/events/logs)

---

## Running the Project

### Backend
```bash
cd backend
npm install
npm run dev
# or: node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
