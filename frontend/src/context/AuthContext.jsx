import { createContext, useContext, useState, useEffect } from 'react';
import { registerUser, loginUser, getMe } from '../api/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'tms_auth_token';

/**
 * AuthProvider — manages JWT storage, user state, and auth operations.
 * Wraps the component tree to provide auth context everywhere.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, email } or null
  const [loading, setLoading] = useState(true);  // true while checking saved token
  const [error, setError] = useState(null);

  // On mount, check for an existing token and validate it
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }

    getMe(savedToken)
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        // Token expired or invalid — clean up
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const register = async (email, password) => {
    setError(null);
    const data = await registerUser({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    setError(null);
    const data = await loginUser({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  /**
   * Returns the stored JWT token, or null if not logged in.
   * Used by API clients to attach Authorization headers.
   */
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * @returns {{ user, loading, error, register, login, logout, getToken }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
