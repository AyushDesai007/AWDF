import React, { useState, useEffect, useCallback } from 'react';
import { getEventLogs, createTask } from '../api';

export default function EventLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await getEventLogs();
      setLogs(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 1500);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleTestCreate = async (withError = false) => {
    setTriggering(true);
    setActionMessage(null);
    try {
      const title = withError
        ? `Error Simulation Test ${Date.now().toString().slice(-4)}`
        : `Async Task ${Date.now().toString().slice(-4)}`;
      const res = await createTask({
        title,
        description: withError ? 'Simulating listener failure' : 'Testing background notification',
        assignedUser: 'evaluator@charusat.edu.in',
        simulateError: withError,
      });
      setActionMessage({
        type: 'success',
        text: `POST /tasks responded instantly (${res._id}). Background event emitted.`,
      });
      await fetchLogs();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>⚡ Asynchronous Event Monitor (Practical 10)</h2>
          <p className="page-description" style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Live proof of Node.js built-in <code>EventEmitter</code> background processing without blocking the API response cycle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Live Polling (1.5s)
          </label>
          <button className="btn btn-secondary btn-small" onClick={fetchLogs} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => handleTestCreate(false)}
          disabled={triggering}
        >
          {triggering ? 'Emitting...' : '🚀 Emit Normal "task-created" Event'}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => handleTestCreate(true)}
          disabled={triggering}
        >
          {triggering ? 'Emitting...' : '⚠️ Emit Event with Simulated Error'}
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: actionMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: actionMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${actionMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '0.9rem',
          }}
        >
          {actionMessage.text}
        </div>
      )}

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          fontSize: '0.88rem',
          lineHeight: '1.5',
        }}
      >
        <strong>Event-Driven Flow Architecture:</strong>
        <p style={{ margin: '6px 0 0', color: '#334155' }}>
          When <code>POST /tasks</code> or <code>DELETE /tasks/:id</code> is called, the database operation finishes,
          the HTTP response is sent <em>immediately</em> (HTTP 201/200), and <code>taskEvents.emit()</code> triggers background
          listeners asynchronously. The listener completes 2000ms later (simulating email/push delivery) without adding a single millisecond of delay to the client!
        </p>
      </div>

      {loading && logs.length === 0 && <p className="status">Loading event records...</p>}
      {error && <p className="status error">Failed to load events: {error}</p>}

      {!loading && logs.length === 0 && (
        <p className="empty-state">No events recorded yet. Create a task or use the buttons above to test.</p>
      )}

      {logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px' }}>Event Name</th>
                <th style={{ padding: '10px 12px' }}>Stage</th>
                <th style={{ padding: '10px 12px' }}>Target / Task</th>
                <th style={{ padding: '10px 12px' }}>Assigned User</th>
                <th style={{ padding: '10px 12px' }}>API Responded</th>
                <th style={{ padding: '10px 12px' }}>Listener Executed</th>
                <th style={{ padding: '10px 12px' }}>Execution Delay</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isError = log.event === 'error' || log.status === 'failed';
                const isCompleted = log.stage === 'completed';

                let delayProof = '-';
                if (log.apiResponseTime && log.handlerFinishTime) {
                  const diff = new Date(log.handlerFinishTime) - new Date(log.apiResponseTime);
                  delayProof = `+${diff}ms (after HTTP response)`;
                } else if (log.delayMs) {
                  delayProof = `+${log.delayMs}ms`;
                }

                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: isError ? '#fff5f5' : isCompleted ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          background:
                            log.event === 'task-created'
                              ? '#dbeafe'
                              : log.event === 'task-deleted'
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            log.event === 'task-created'
                              ? '#1e40af'
                              : log.event === 'task-deleted'
                              ? '#92400e'
                              : '#991b1b',
                        }}
                      >
                        {log.event}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{log.stage}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {log.taskTitle || log.errorMessage || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#4f46e5' }}>
                      {log.assignedUser || 'admin@example.com'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {log.apiResponseTime ? log.apiResponseTime.split('T')[1]?.replace('Z', '') : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {(log.handlerFinishTime || log.handlerStartTime || log.timestamp)
                        ?.split('T')[1]
                        ?.replace('Z', '')}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 'bold' }}>
                      {delayProof}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background:
                            log.status === 'success'
                              ? '#dcfce7'
                              : log.status === 'failed'
                              ? '#fee2e2'
                              : '#e0e7ff',
                          color:
                            log.status === 'success'
                              ? '#15803d'
                              : log.status === 'failed'
                              ? '#b91c1c'
                              : '#4338ca',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
