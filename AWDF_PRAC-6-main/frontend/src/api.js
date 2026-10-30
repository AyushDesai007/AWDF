// Central place for all backend calls.
// Replaces the Practical 3 GitHub-fetching logic with our own auth + /tasks endpoints.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const AUTH_EVENT = 'auth:unauthorized';

async function handleResponse(res) {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(AUTH_EVENT));
    }

    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // response wasn't JSON, ignore and use default message
    }
    throw new Error(message);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return null;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
}

export const login = (email, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const register = (email, password) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => request('/auth/me');

export const getTasks = () => request('/tasks');

export const createTask = (task) =>
  request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });

export const updateTask = (id, updates) =>
  request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteTask = (id) =>
  request(`/tasks/${id}`, {
    method: 'DELETE',
  });

export const getEventLogs = () => request('/tasks/events/logs');


export const generateAiDescription = (title) =>
  request('/api/ai/generate-description', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
