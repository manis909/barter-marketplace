import { createContext, useContext, useState, useEffect } from 'react';
import api from '../../services/api';
import { getToken, setToken as saveToken, clearToken } from '../../utils/storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then(res => setCurrentUser(res.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function login(user, newToken) {
    saveToken(newToken);
    setToken(newToken);
    setCurrentUser(user);
  }

  function logout() {
    clearToken();
    setToken(null);
    setCurrentUser(null);
  }

  // Re-fetches the current user from the backend — call this after any
  // action that changes user data server-side but doesn't naturally
  // update AuthContext's own state (e.g. photo upload, profile edit).
  async function refreshUser() {
    if (!token) return;
    try {
      const res = await api.get('/users/me');
      setCurrentUser(res.data.user);
    } catch {
      // ignore — if this fails, currentUser just stays as-is
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, token, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);