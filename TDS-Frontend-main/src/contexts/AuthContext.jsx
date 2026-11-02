import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as auth from '../services/auth';
import { onUnauthorized, refreshCsrf } from '../services/api';
export const AuthContext = createContext(null);
export const dashboardPath = (user) => user?.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard';
const validUser = (user) => user?.userId && ['administrator', 'developer'].includes(user.role);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const generation = useRef(0);
  const restoring = useRef(true);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const endSession = useCallback((message = '') => {
    generation.current++;
    setUser(null);
    setSessionMessage(message);
  }, []);
  const restore = useCallback(async () => {
    const current = ++generation.current;
    restoring.current = true;
    setIsLoading(true);
    try {
      const account = await auth.getCurrentUser();
      if (!validUser(account)) throw new Error('Unsupported account response.');
      if (current === generation.current) { setUser(account); setSessionMessage(''); }
    } catch (error) {
      if (current === generation.current) { setUser(null); setSessionMessage(error.status === 401 ? '' : error.message); }
    } finally {
      if (current === generation.current) { restoring.current = false; setIsLoading(false); }
    }
  }, []);
  useEffect(() => {
    // Remove legacy credentials without reading or trusting stored identity.
    try { ['token', 'refreshToken', 'authToken', 'userData', 'tds_auth_token', 'tds_refresh_token'].forEach(key => {
      localStorage.removeItem(key); sessionStorage.removeItem(key);
    }); } catch { /* Cookie authentication works with browser storage disabled. */ }
    // During bootstrap, restore handles 401 quietly; protected requests notify afterwards.
    restore();
    const unsubscribe = onUnauthorized(() => {
      if (!restoring.current) endSession('Your session ended. Please sign in again.');
    });
    return () => { invalidate(); unsubscribe(); };
  }, [restore, endSession, invalidate]);
  useEffect(() => {
    if (!user) return undefined;
    const check = () => {
      const current = generation.current;
      auth.getCurrentUser().then(account => {
        if (current === generation.current && validUser(account)) setUser(account);
      }).catch(() => {}); // 401 subscriber handles expiry; network failures do not fabricate logout.
    };
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [user]);
  const login = async (email, password) => {
    const current = ++generation.current;
    const account = await auth.login(email, password);
    if (!validUser(account)) throw new Error('Unsupported account response.');
    if (current === generation.current) { setUser(account); setSessionMessage(''); }
    return account;
  };
  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await auth.logout();
      endSession('Signed out.');
      await refreshCsrf().catch(() => {});
    } catch (error) {
      if (error.status === 401) endSession('Signed out.');
      else setSessionMessage(`Sign out failed. Your server session may still be active. ${error.message}`);
    } finally { setIsLoggingOut(false); }
  };
  const passwordChanged = () => {
    endSession('Password changed. All sessions ended; sign in again.');
    refreshCsrf().catch(() => {});
  };
  const updateUser = (account) => setUser(previous => previous?.userId === account.userId ? account : previous);
  return <AuthContext.Provider value={{ user, login, logout, isLoading, isLoggingOut, updateUser, passwordChanged }}>
    {sessionMessage && <div role="status" className="p-3 bg-orange-50 text-gray-900">
      {sessionMessage} <button type="button" onClick={restore} className="underline">Check session</button>
    </div>}
    {isLoading ? <p role="status" className="p-8">Checking session…</p> : children}
  </AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
