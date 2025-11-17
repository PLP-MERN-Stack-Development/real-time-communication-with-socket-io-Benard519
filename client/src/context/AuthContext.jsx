import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api.js';
import { clearStoredToken, getStoredToken, setStoredToken } from '../utils/storage.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [defaultRoomId, setDefaultRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const bootstrapProfile = useCallback(async () => {
    if (!token) {
      setInitializing(false);
      return;
    }

    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
      setRooms(data.user.rooms || []);
    } catch (error) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setRooms([]);
    } finally {
      setInitializing(false);
    }
  }, [token]);

  useEffect(() => {
    bootstrapProfile();
  }, [bootstrapProfile]);

  const login = async (username) => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { username });
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
      const normalizedRooms = Array.from(
        new Set([...(data.user.rooms || []), data.defaultRoom?._id].filter(Boolean).map(String))
      );
      setRooms(normalizedRooms);
      setDefaultRoomId(data.defaultRoom?._id || normalizedRooms[0] || null);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const { data } = await api.get('/api/auth/me');
    setUser(data.user);
    setRooms(data.user.rooms || []);
    return data.user;
  }, [token]);

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setRooms([]);
    setDefaultRoomId(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      rooms,
      setRooms,
      defaultRoomId,
      login,
      logout,
      loading,
      initializing,
      refreshProfile,
    }),
    [token, user, rooms, defaultRoomId, loading, initializing, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};



