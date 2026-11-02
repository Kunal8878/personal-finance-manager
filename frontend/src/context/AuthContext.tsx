import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUserCurrency: (currency: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('finance_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMe() {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await apiFetch<{ user: User }>('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        // Expired token
        logout();
      }
      setLoading(false);
    }
    checkMe();
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('finance_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('finance_token');
    setToken(null);
    setUser(null);
  };

  const updateUserCurrency = (currency: string) => {
    if (user) {
      setUser({ ...user, currency });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserCurrency }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
