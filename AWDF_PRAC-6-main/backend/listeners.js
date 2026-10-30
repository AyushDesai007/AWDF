const taskEvents = require('./events');

// In-memory buffer of recent event records for demonstration and inspection
const eventLogs = [];
const MAX_LOGS = 50;

function addEventLog(entry) {
  eventLogs.unshift({
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
  });
  if (eventLogs.length > MAX_LOGS) {
    eventLogs.pop();
  }
}

function getEventLogs() {
  return [...eventLogs];
}

// 1. Task Created Listener (with non-blocking async execution)
taskEvents.on('task-created', (task) => {
  const handlerStartTime = new Date().toISOString();
  console.log(
    `[Notification Listener] Task "${task.title}" created event received at ${handlerStartTime} (Assigned: ${
      task.assignedUser || 'admin@example.com'
    })`
  );

  addEventLog({
    event: 'task-created',
    stage: 'started',
    taskTitle: task.title,
    taskId: task._id || task.id,
    assignedUser: task.assignedUser || 'admin@example.com',
    apiResponseTime: task.apiResponseTime,
    handlerStartTime,
    status: 'processing',
    message: `Background notification queued for task "${task.title}"`,
  });

  const delay = process.env.NODE_ENV === 'test' ? 10 : 2000;
  const timer = setTimeout(() => {
    try {
      if (task.simulateError) {
        throw new Error(`Notification dispatch failed for task "${task.title}": Simulated delivery timeout`);
      }

      const handlerFinishTime = new Date().toISOString();
      console.log(
        `[Notification Listener] COMPLETED: Notification sent for task "${task.title}" (Assigned: ${
          task.assignedUser || 'admin@example.com'
        }) at ${handlerFinishTime}`
      );

      addEventLog({
        event: 'task-created',
        stage: 'completed',
        taskTitle: task.title,
        taskId: task._id || task.id,
        assignedUser: task.assignedUser || 'admin@example.com',
        apiResponseTime: task.apiResponseTime,
        handlerStartTime,
        handlerFinishTime,
        delayMs: delay,
        status: 'success',
        message: `Notification email dispatched to ${task.assignedUser || 'admin@example.com'}`,
      });
    } catch (err) {
      taskEvents.emit('error', err);
    }
  }, delay);

  if (timer.unref) {
    timer.unref();
  }
});

// 2. Task Deleted Listener (Supplementary Requirement)
taskEvents.on('task-deleted', (task) => {
  const handlerStartTime = new Date().toISOString();
  console.log(
    `[Deletion Listener] Task "${task.title || task.id}" (ID: ${task.id}) deleted event received at ${handlerStartTime}`
  );

  addEventLog({
    event: 'task-deleted',
    stage: 'started',
    taskTitle: task.title || `Task #${task.id}`,
    taskId: task.id,
    assignedUser: task.assignedUser || 'admin@example.com',
    apiResponseTime: task.apiResponseTime,
    handlerStartTime,
    status: 'processing',
    message: `Cleaning up resources for deleted task "${task.title || task.id}"`,
  });

  const delay = process.env.NODE_ENV === 'test' ? 10 : 1000;
  const timer = setTimeout(() => {
    const handlerFinishTime = new Date().toISOString();
    console.log(
      `[Deletion Listener] COMPLETED: Cleanup finalized for deleted task "${task.title || task.id}" at ${handlerFinishTime}`
    );

    addEventLog({
      event: 'task-deleted',
      stage: 'completed',
      taskTitle: task.title || `Task #${task.id}`,
      taskId: task.id,
      assignedUser: task.assignedUser || 'admin@example.com',
      apiResponseTime: task.apiResponseTime,
      handlerStartTime,
      handlerFinishTime,
      delayMs: delay,
      status: 'success',
      message: `Audit and notification cleanup completed for task "${task.title || task.id}"`,
    });
  }, delay);

  if (timer.unref) {
    timer.unref();
  }
});

// 3. Error Event Listener (Supplementary Requirement)
taskEvents.on('error', (err) => {
  const errorTime = new Date().toISOString();
  console.error(`[Event Error Listener] Caught asynchronous error at ${errorTime}:`, err.message);

  addEventLog({
    event: 'error',
    stage: 'error',
    errorMessage: err.message,
    timestamp: errorTime,
    status: 'failed',
    message: `Listener error caught: ${err.message}`,
  });
});

console.log('[TaskEvents] Event listeners registered: "task-created", "task-deleted", "error"');

module.exports = {
  taskEvents,
  getEventLogs,
  addEventLog,
};
