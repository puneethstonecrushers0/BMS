import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../types';
import { apiClient, setCsrfToken } from '../../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<{ isPendingApproval: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await apiClient<{ user: User; csrfToken: string }>('/auth/me');
      if (res?.user) {
        setUser(res.user);
        if (res.csrfToken) {
          setCsrfToken(res.csrfToken);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await apiClient<{ user: User; csrfToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res?.user) {
      setUser(res.user);
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      }
    }
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    const res = await apiClient<{ id: string; name: string; email: string; isPendingApproval: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return { isPendingApproval: res.isPendingApproval };
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Continue cleanup on frontend
    } finally {
      setUser(null);
      setCsrfToken('');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
