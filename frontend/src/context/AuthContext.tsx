import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type UserRole = 'STUDENT' | 'COUNSELLOR' | 'PEER_VOLUNTEER' | 'INSTITUTION_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  institution?: {
    id: string;
    name: string;
    code: string;
    crisisHotline: string;
    campusSecurityNo: string;
  };
  studentProfile?: {
    id: string;
    anonymousAlias: string;
    department: string;
    yearOfStudy: number;
    preferredLanguage: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactConsent?: boolean;
    onboardingCompleted?: boolean;
  };
  counsellorProfile?: {
    id: string;
    licenseNumber: string;
    qualification: string;
    specialization: string[];
  };
  consents?: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mindbridge_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (!localStorage.getItem('mindbridge_token')) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      localStorage.removeItem('mindbridge_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string = 'Password123!') => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('mindbridge_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      localStorage.setItem('mindbridge_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo helper for instant persona switching during SIH evaluation
  const switchDemoRole = async (targetRole: UserRole) => {
    const roleAccounts: Record<UserRole, string> = {
      STUDENT: 'aarav.patel@aiths.ac.in',
      COUNSELLOR: 'dr.ananya@aiths.ac.in',
      PEER_VOLUNTEER: 'rohan.peer@aiths.ac.in',
      INSTITUTION_ADMIN: 'dean.welfare@aiths.ac.in',
      SUPER_ADMIN: 'admin@mindbridge.org',
    };

    const email = roleAccounts[targetRole];
    if (email) {
      await login(email, 'Password123!');
    }
  };

  const logout = () => {
    localStorage.removeItem('mindbridge_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        switchDemoRole,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
