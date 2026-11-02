// October 2026 integration: credentials stay in HttpOnly cookies; never log request data.
export function validateApiUrl(value) {
  const url = new URL(value);
  if (url.origin !== 'https://localhost:8836' || url.pathname !== '/api' || url.search || url.hash || url.username || url.password) {
    throw new Error('REACT_APP_API_URL must be https://localhost:8836/api.');
  }
  return url.href;
}
export const API_BASE_URL = validateApiUrl(import.meta.env.VITE_API_URL || 'https://localhost:8836/api');
const unauthorizedListeners = new Set();
export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};
const messages = {
  400: 'Request rejected. Check the fields; if correct, refresh the page and try again (security token may be stale).',
  401: 'Your session ended. Please sign in again.',
  403: 'You do not have permission for this operation.',
  404: 'The requested record is unavailable.',
  409: 'This request conflicts with existing data. The email may already be registered.',
  410: 'This operation is unavailable.',
  413: 'Graph is too large. Reduce it to 12 KiB before saving.',
  429: 'Too many attempts. Wait a minute before trying again.'
};
export class ApiError extends Error {
  constructor(status) {
    super(messages[status] || (status ? 'The server could not complete the request. Try again later.' :
      'Cannot reach the local API. Check that it is running and the localhost certificate is trusted.'));
    this.status = status;
  }
}
async function request(method, path, data, csrfToken) {
  // Never forward CSRF material to a caller-supplied origin.
  if (!/^\/(auth(?:\/|$)|RequestHandler\/assigned\/)/.test(path) || path.includes('..') || path.includes('\\')) {
    throw new Error('Unsupported API path.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method, credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json', ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}) },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {})
    });
    if (!response.ok) {
      // Invalid login/current-password credentials do not by themselves invalidate a session.
      if (response.status === 401 && !['/auth/login', '/auth/register', '/auth/change-password'].includes(path)) {
        unauthorizedListeners.forEach(listener => listener());
      }
      throw new ApiError(response.status);
    }
    if (response.status === 204) return { status: response.status, data: null };
    if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError(502);
    return { status: response.status, data: await response.json() };
  } catch (error) {
    throw error instanceof ApiError ? error : new ApiError(0);
  } finally { clearTimeout(timer); }
}
export async function refreshCsrf() {
  const { data } = await request('GET', '/auth/csrf');
  if (typeof data.requestToken !== 'string' || !data.requestToken) throw new ApiError(502);
  return data.requestToken;
}
async function write(method, path, data) {
  // New identity-bound token for every write; no blind write replay on failure.
  return request(method, path, data, await refreshCsrf());
}
const api = {
  get: (path) => request('GET', path),
  post: (path, data) => write('POST', path, data),
  put: (path, data) => write('PUT', path, data),
  patch: (path, data) => write('PATCH', path, data),
  delete: (path) => write('DELETE', path)
};
export default api;
