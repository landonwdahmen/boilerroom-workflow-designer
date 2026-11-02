import { vi } from 'vitest';
import api, { validateApiUrl, onUnauthorized, ApiError } from './api';
import * as auth from './auth';
import { createProject } from './projects';
const response = (status, data = {}, contentType = 'application/json') => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: () => contentType }, json: vi.fn().mockResolvedValue(data)
});
beforeEach(() => { global.fetch = vi.fn(); });
afterEach(() => { delete global.fetch; });
test.each(['http://localhost:8836/api', 'https://127.0.0.1:8836/api', 'https://outside.invalid/api', 'https://localhost:8836/api?key=synthetic'])('rejects unsafe API configuration %s', value => {
  expect(() => validateApiUrl(value)).toThrow();
});
test('credentialed GET uses fixed HTTPS origin', async () => {
  fetch.mockResolvedValue(response(200, []));
  await api.get('/auth/projects');
  expect(fetch).toHaveBeenCalledWith('https://localhost:8836/api/auth/projects', expect.objectContaining({ credentials: 'include', method: 'GET', redirect: 'error' }));
});
test('unsafe call bootstraps CSRF, sends header and handles empty 204', async () => {
  const empty = response(204);
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'synthetic-csrf' })).mockResolvedValueOnce(empty);
  expect(await api.post('/auth/logout')).toEqual({ status: 204, data: null });
  expect(fetch.mock.calls[0][0]).toMatch(/auth\/csrf$/);
  expect(fetch.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBe('synthetic-csrf');
  expect(empty.json).not.toHaveBeenCalled();
});
test.each([400, 401, 403, 404, 409, 410, 429, 500])('sanitizes HTTP %s without parsing sensitive response or retrying', async status => {
  const failure = response(status);
  fetch.mockResolvedValue(failure);
  await expect(api.get('/auth/projects')).rejects.toMatchObject({ status });
  expect(failure.json).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('401 notifies protected requests but invalid credential login does not', async () => {
  const listener = vi.fn(); const stop = onUnauthorized(listener);
  fetch.mockResolvedValueOnce(response(401));
  await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 401 });
  expect(listener).toHaveBeenCalledTimes(1);
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'synthetic' })).mockResolvedValueOnce(response(401));
  await expect(api.post('/auth/login', {})).rejects.toMatchObject({ status: 401 });
  expect(listener).toHaveBeenCalledTimes(1); stop();
});
test('a rejected write is never replayed automatically', async () => {
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'synthetic' })).mockResolvedValueOnce(response(400));
  await expect(api.patch('/auth/profile/synthetic', { name: 'Synthetic' })).rejects.toMatchObject({ status: 400 });
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('non-JSON success and network failure produce safe messages', async () => {
  fetch.mockResolvedValueOnce(response(200, '', 'text/html'));
  await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 502 });
  fetch.mockRejectedValueOnce(new Error('private transport detail'));
  await expect(api.get('/auth/me')).rejects.toEqual(new ApiError(0));
});
test('login flat response preserves whitespace and refreshes identity-bound CSRF', async () => {
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'before' }))
    .mockResolvedValueOnce(response(200, { userId: 'synthetic', role: 'developer' }))
    .mockResolvedValueOnce(response(200, { requestToken: 'after' }));
  expect((await auth.login(' SYNTHETIC@example.test ', ' synthetic password ')).userId).toBe('synthetic');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ email: 'synthetic@example.test', password: ' synthetic password ' });
  expect(fetch).toHaveBeenCalledTimes(3);
});
test('project creation uses supported fields and null assignment', async () => {
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'synthetic' })).mockResolvedValueOnce(response(200, { id: 'synthetic' }));
  await createProject({ name: ' Synthetic ', description: '', assignedTo: '' });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ name: 'Synthetic', description: '', assignedTo: null, status: 'active' });
});
test('password validation measures UTF-8 bytes and preserves spaces', () => {
  expect(auth.passwordIsValid(' synthetic password ')).toBe(true);
  expect(auth.passwordIsValid('a'.repeat(72))).toBe(true);
  expect(auth.passwordIsValid('é'.repeat(40))).toBe(false);
  expect(auth.passwordIsValid(' '.repeat(15))).toBe(false);
});
test.each([200, 401])('password 401 confirms server session (%s) before ending UI identity', async meStatus => {
  const listener = vi.fn(); const stop = onUnauthorized(listener);
  fetch.mockResolvedValueOnce(response(200, { requestToken: 'synthetic' }))
    .mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(meStatus, { userId: 'synthetic' }));
  await expect(auth.changePassword('synthetic current', 'synthetic new')).rejects.toMatchObject({ status: 401 });
  expect(fetch.mock.calls[2][0]).toMatch(/auth\/me$/);
  expect(listener).toHaveBeenCalledTimes(meStatus === 401 ? 1 : 0);
  stop();
});
