const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let authToken = localStorage.getItem('eventsphere_token') || '';
export function saveToken(t) {
  authToken = t || '';
  if (t) localStorage.setItem('eventsphere_token', t);
  else localStorage.removeItem('eventsphere_token');
}
export function hasToken() { return !!authToken; }
export async function api(path, { method = 'GET', body, ...rest } = {}) {
  const headers = { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(body instanceof FormData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}) };
  const response = await fetch(`${BASE}${path}`, { method, headers, body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined, ...rest });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.message || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}
