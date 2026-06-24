// src/lib/api.js
export async function apiFetch(path, opts = {}, token) {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };

  // If body is FormData, let the browser set multipart headers
  if (opts.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // Get token from argument or localStorage
  const t = token || localStorage.getItem('token');
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(base + path, {
    ...opts,
    headers
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }

  return res.json();
}
