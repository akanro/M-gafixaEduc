import { apiFetch } from '../utils/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: number;
  nom: string;
  email: string;
  role: string;
  permissions?: any[];
  enseignant_id?: number | null;
  eleve_id?: number | null;
  google_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isRefreshing = React.useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (isRefreshing.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    isRefreshing.current = true;
    try {
      const response = await apiFetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else if (response.status === 401) {
        // Token expired or invalid
        logout();
      }
    } catch (error) {
      // Gracefully handle "Failed to fetch" which often occurs during dev server restarts
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return;
      }
      console.error('Error refreshing user data:', error);
    } finally {
      isRefreshing.current = false;
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
        // Refresh immediately on load to get latest permissions
        refreshUser();
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Polling for updates every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [user]);

  // Refresh on window focus
  useEffect(() => {
    if (!user) return;
    const handleFocus = () => {
      refreshUser();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {!loading && children}
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
