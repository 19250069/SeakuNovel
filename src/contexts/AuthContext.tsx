import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const USE_COOKIE = import.meta.env.VITE_USE_COOKIE_AUTH === 'true';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, display_name: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    if (USE_COOKIE) return null;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (USE_COOKIE) return null;
    return localStorage.getItem('token');
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync auth state from localStorage
  const syncAuthFromStorage = useCallback(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    } else if (storedToken) {
      setToken(storedToken);
    } else {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (USE_COOKIE) {
        try {
          const response = await api.get('/auth/profile');
          const profile = response.data.profile || response.data.user || response.data;
          setUser(profile.user || profile);
        } catch {
          setUser(null);
        }
        setToken(null);
      } else {
        syncAuthFromStorage();
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for storage changes from other tabs for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        syncAuthFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncAuthFromStorage]);

  const persistAuth = (newToken: string | null, userData: User) => {
    if (!USE_COOKIE && newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    persistAuth(USE_COOKIE ? null : newToken, userData);
  };

  const register = async (username: string, email: string, password: string, display_name: string) => {
    const response = await api.post('/auth/register', { username, email, password, display_name });
    const { token: newToken, user: userData } = response.data;

    persistAuth(USE_COOKIE ? null : newToken, userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const profile = res.data.profile || res.data.user || res.data;
      const updatedUser = profile.user || profile;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, refreshProfile, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}