import api, { refreshCsrf } from './api';
export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
  await refreshCsrf(); // Framework tokens are bound to the new identity.
  return data;
};
export const register = async ({ name, email, password, accessCode }) => (await api.post('/auth/register', {
  name: name.trim(), email: email.trim().toLowerCase(), password, role: 'developer', accessCode: accessCode.trim()
})).data;
export const logout = () => api.post('/auth/logout'); // 204 has no JSON body.
export const getCurrentUser = async () => (await api.get('/auth/me')).data;
export const getProfile = async (id) => (await api.get(`/auth/profile/${encodeURIComponent(id)}`)).data;
export const updateProfile = async (id, name) => (await api.patch(`/auth/profile/${encodeURIComponent(id)}`, { name: name.trim() })).data;
export const changePassword = async (currentPassword, newPassword) => {
  try { return (await api.post('/auth/change-password', { currentPassword, newPassword })).data; }
  catch (error) {
    // Both wrong current password and expired session return 401. Confirm the session before clearing UI.
    if (error.status === 401) await getCurrentUser().catch(() => {});
    throw error;
  }
};
export const inviteDeveloper = async (email) => (await api.post('/auth/invitations', { email: email.trim().toLowerCase() })).data;
export const passwordIsValid = (value) => value.trim().length > 0 && value.length >= 12 &&
  new TextEncoder().encode(value).length <= 72;
// Historical exports: recovery has no backend implementation.
export const forgotPassword = async () => { throw new Error('Password recovery is unavailable.'); };
export const resetPassword = forgotPassword;
