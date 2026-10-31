import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_USERS = [
  { role: 'admin', label: 'Admin (Full System)', email: 'admin@brightloop.com', password: 'Admin123!@#' },
  { role: 'staff', label: 'Staff (Sarah Jenkins - Sales)', email: 'sarah.sales@brightloop.com', password: 'Staff123!@#' },
  { role: 'customer', label: 'Customer (Alex Rivera - Nova Retail)', email: 'alex@novashops.com', password: 'Customer123!@#' }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('billzy_token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      } else {
        // Automatically default to Admin demo account on first visit
        await switchDemoUser('admin');
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('billzy_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('billzy_token');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (roleName) => {
    const demo = DEMO_USERS.find(d => d.role === roleName) || DEMO_USERS[0];
    try {
      const res = await api.login(demo.email, demo.password);
      localStorage.setItem('billzy_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error(`Failed to switch to demo role ${roleName}:`, err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      switchDemoUser,
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'staff' || user?.role === 'admin',
      isCustomer: user?.role === 'customer'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
