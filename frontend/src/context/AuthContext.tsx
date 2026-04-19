import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'mentor' | 'guide' | 'admin' | 'patient' | 'doctor' | 'pharmacist' | 'user';
  isApproved?: boolean;
  specialization?: string;
  specialty?: string;
  department?: string;
  experienceYears?: number;
  address?: string;
  liveStatus?: string;
  currentToken?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Validate token on app load
        const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
        
        fetch(`${API_BASE_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        .then(res => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then(data => {
          if (data && data.id) {
             const updatedUser = { ...JSON.parse(storedUser), ...data };
             setUser(updatedUser);
             localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.clear();
        });
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
    const currentToken = localStorage.getItem('token');
    
    if (currentToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      } catch (e) {
        console.error("Logout API failed", e);
      }
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        setUser(JSON.parse(e.newValue));
      }
      if (e.key === 'token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
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
