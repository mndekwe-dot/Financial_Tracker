import { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem('access');
    if (!access) {
      setLoading(false);
      return;
    }
    client
      .get('/auth/me/')
      .then(({ data }) => setUser(data))
      .catch((err) => {
        // Only clear tokens when the server actually rejected them —
        // a network error just means we're offline.
        if (err.response) {
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const { data } = await client.post('/auth/login/', { username, password });
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    const { data: me } = await client.get('/auth/me/');
    setUser(me);
  }

  async function register(username, email, password) {
    await client.post('/auth/register/', { username, email, password });
    await login(username, password);
  }

  function logout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
