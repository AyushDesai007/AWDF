import { useState } from 'react';
import { generateAiDescription } from '../api';

export default function TaskForm({ onCreate, creating, defaultUser = '' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [simulateError, setSimulateError] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);
  const [aiError, setAiError] = useState(null);

  const handleGenerateAi = async () => {
    if (!title.trim()) {
      setAiError('Please enter a task title first to generate an AI description.');
      return;
    }
    setAiError(null);
    setGeneratingAi(true);
    try {
      const res = await generateAiDescription(title.trim());
      if (res?.description) {
        setDescription(res.description);
      }
      if (res?.notice) {
        setAiNotice(res.notice);
      } else {
        setAiNotice('AI description generated successfully.');
      }
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI description');
    } finally {
      setGeneratingAi(false);
    }
  };

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
    setAiNotice(null);
    setAiError(null);
    setSimulateError(false);
  };

  return (
    <form className="task-form-card" onSubmit={handleSubmit}>
      <h3 className="form-heading">Create New Task</h3>

      <div className="form-group">
        <label className="form-label" htmlFor="task-title">Task Title</label>
        <input
          id="task-title"
          type="text"
          className="form-input"
          placeholder="Task title (e.g., pllay game for tournament)"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (aiError) setAiError(null);
          }}
          required
        />
      </div>

      <div className="form-group">
        <div className="description-header">
          <label className="form-label" htmlFor="task-description" style={{ margin: 0 }}>Description</label>
          <button
            type="button"
            className="btn-ai-generate"
            onClick={handleGenerateAi}
            disabled={generatingAi || !title.trim()}
            title="Generate description using external AI API with graceful fallback"
          >
            {generatingAi ? (
              <>
                <span className="ai-spinner"></span> Generating...
              </>
            ) : (
              '✨ Generate Description'
            )}
          </button>
        </div>

        <div className="ai-disclaimer">
          AI-generated suggestions may be inaccurate. Review and edit before saving.
        </div>

        {aiNotice && (
          <div className="ai-notice-pill">
            <span className="notice-icon">ℹ️</span>
            <span>💡 Generated suggestion: {aiNotice}</span>
          </div>
        )}

        {aiError && (
          <div className="ai-error-pill">
            <span>⚠️ {aiError}</span>
          </div>
        )}

        <textarea
          id="task-description"
          className="form-textarea"
          rows={3}
          placeholder="Task description (type manually or click Generate Description above)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="assigned-user">Assigned User</label>
        <input
          id="assigned-user"
          type="text"
          className="form-input"
          placeholder={`Assigned User (${defaultUser || 'admin@example.com'})`}
          value={assignedUser}
          onChange={(e) => setAssignedUser(e.target.value)}
        />
      </div>

      <div className="form-footer">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
          />
          <span>Simulate background listener error (Test error event)</span>
        </label>
      </div>

      <button className="btn-submit-task" type="submit" disabled={creating}>
        {creating ? 'Adding Task...' : 'Add Task'}
      </button>
    </form>
  );
}
