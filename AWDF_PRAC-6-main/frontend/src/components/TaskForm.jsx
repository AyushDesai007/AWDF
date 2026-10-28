import { useState } from 'react';

export default function TaskForm({ onCreate, creating, defaultUser = '' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [simulateError, setSimulateError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      assignedUser: assignedUser.trim() || defaultUser || 'admin@example.com',
      simulateError,
    });
    setTitle('');
    setDescription('');
    setSimulateError(false);
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ flex: '2 1 200px' }}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ flex: '2 1 200px' }}
        />
        <input
          type="text"
          placeholder={`Assigned User (${defaultUser || 'admin@example.com'})`}
          value={assignedUser}
          onChange={(e) => setAssignedUser(e.target.value)}
          style={{ flex: '1 1 180px' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '6px' }}>
        <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
          />
          Simulate background listener error (Test error event)
        </label>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? 'Adding...' : '⚡ Add Task & Emit Event'}
        </button>
      </div>
    </form>
  );
}

