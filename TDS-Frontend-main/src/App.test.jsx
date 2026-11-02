import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, AuthContext, useAuth, dashboardPath } from './contexts/AuthContext';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import * as auth from './services/auth';
import { onUnauthorized, refreshCsrf } from './services/api';
vi.mock('./services/auth');
vi.mock('./services/api', () => ({
  onUnauthorized: vi.fn(() => vi.fn()),
  refreshCsrf: vi.fn(() => Promise.resolve('synthetic'))
}));
const account = { userId: 'synthetic-user', name: 'Synthetic User', email: 'synthetic@example.test', role: 'administrator' };
function State() {
  const state = useAuth();
  return <><p>{state.user?.name || 'Anonymous'}</p>
    <button onClick={state.logout}>End session</button>
    <button onClick={state.passwordChanged}>Password changed</button></>;
}
beforeEach(() => {
  vi.clearAllMocks();
  onUnauthorized.mockImplementation(() => vi.fn());
  auth.getCurrentUser.mockResolvedValue(account);
  auth.logout.mockResolvedValue({ status: 204 });
  refreshCsrf.mockResolvedValue('synthetic');
});
test('restores identity from server and removes obsolete stored credentials', async () => {
  localStorage.setItem('token', 'obsolete-synthetic');
  localStorage.setItem('userData', JSON.stringify(account));
  render(<AuthProvider><State /></AuthProvider>);
  expect(screen.getByText('Checking session…')).toBeInTheDocument();
  expect(await screen.findByText('Synthetic User')).toBeInTheDocument();
  expect(auth.getCurrentUser).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('userData')).toBeNull();
});
test('server rejection ignores forged browser identity', async () => {
  auth.getCurrentUser.mockRejectedValue({ status: 401 });
  localStorage.setItem('userData', JSON.stringify(account));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('Anonymous')).toBeInTheDocument();
});
test('logout waits for backend and clears identity after success', async () => {
  let finish;
  auth.logout.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('Synthetic User');
  fireEvent.click(screen.getByText('End session'));
  expect(screen.getByText('Synthetic User')).toBeInTheDocument();
  finish({ status: 204 });
  expect(await screen.findByText('Anonymous')).toBeInTheDocument();
  expect(refreshCsrf).toHaveBeenCalled();
});
test('failed logout preserves identity and explains that session may remain active', async () => {
  auth.logout.mockRejectedValue(new Error('API offline.'));
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('Synthetic User');
  fireEvent.click(screen.getByText('End session'));
  expect(await screen.findByText(/Sign out failed/)).toBeInTheDocument();
  expect(screen.getByText('Synthetic User')).toBeInTheDocument();
});
test('password change clears identity and requires login', async () => {
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('Synthetic User');
  fireEvent.click(screen.getByText('Password changed'));
  expect(await screen.findByText('Anonymous')).toBeInTheDocument();
  expect(screen.getByText(/All sessions ended/)).toBeInTheDocument();
});
test('protected 401 notification clears identity', async () => {
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('Synthetic User');
  const notify = onUnauthorized.mock.calls[0][0];
  // Trigger through the subscribed API boundary.

  act(() => notify());
  expect(await screen.findByText('Anonymous')).toBeInTheDocument();
});
test('roles map to their real dashboard routes', () => {
  expect(dashboardPath(account)).toBe('/admin-dashboard');
  expect(dashboardPath({ role: 'developer' })).toBe('/member-dashboard');
});
test('login sends untrimmed password and shows credential failure', async () => {
  const login = vi.fn().mockRejectedValue({ status: 401 });

  render(<MemoryRouter><AuthContext.Provider value={{ login }}><LoginForm /></AuthContext.Provider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'synthetic@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: ' synthetic password ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  expect(login).toHaveBeenCalledWith('synthetic@example.test', ' synthetic password ');
});
test('signup exposes invited developer fields without administrator signup', () => {
  render(<MemoryRouter><SignupForm /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Create developer account' })).toBeInTheDocument();
  expect(screen.getByLabelText('Invitation code')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Project information' })).toHaveAttribute('href', '/terms');
});

test('valid invited signup submits without contractual acceptance', async () => {
  auth.passwordIsValid.mockReturnValue(true);
  auth.register.mockResolvedValue({});
  render(<MemoryRouter><SignupForm /></MemoryRouter>);
  for (const [label, value] of [['Full name', 'Synthetic User'], ['Email address', 'synthetic@example.test'],
    ['Password', 'synthetic password'], ['Confirm password', 'synthetic password'], ['Invitation code', 'a'.repeat(64)]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Create developer account' }));
  await waitFor(() => expect(auth.register).toHaveBeenCalledWith({ name: 'Synthetic User', email: 'synthetic@example.test',
    password: 'synthetic password', confirmPassword: 'synthetic password', accessCode: 'a'.repeat(64) }));
});

test('signup still rejects invalid invitations before requesting registration', async () => {
  auth.passwordIsValid.mockReturnValue(true);
  render(<MemoryRouter><SignupForm /></MemoryRouter>);
  for (const [label, value] of [['Full name', 'Synthetic User'], ['Email address', 'synthetic@example.test'],
    ['Password', 'synthetic password'], ['Confirm password', 'synthetic password'], ['Invitation code', 'invalid']]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.submit(screen.getByRole('button', { name: 'Create developer account' }).closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('64-character invitation code');
  expect(auth.register).not.toHaveBeenCalled();
});
test('duplicate signup displays conflict without signing in', async () => {
  auth.passwordIsValid.mockReturnValue(true);
  auth.register.mockRejectedValue(new Error('This request conflicts with existing data.'));
  render(<MemoryRouter><SignupForm /></MemoryRouter>);
  for (const [label, value] of [['Full name', 'Synthetic User'], ['Email address', 'synthetic@example.test'],
    ['Password', 'synthetic password'], ['Confirm password', 'synthetic password'], ['Invitation code', 'a'.repeat(64)]]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create developer account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('conflicts');
  await waitFor(() => expect(auth.register).toHaveBeenCalledTimes(1));
});
