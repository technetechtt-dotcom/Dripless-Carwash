import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import { accountApi, authApi } from '@shared/api';
import { notify } from '../utils/notify';
import { registerSessionDevice } from '../utils/pushDevice';
import type { CustomerProfile } from '@shared/types';

export type User = CustomerProfile;
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export const AuthProvider = ({ children }: {children: ReactNode;}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionUser = authApi.getCurrentCustomerProfile();
    if (sessionUser) {
      setUser(sessionUser);
      void registerSessionDevice();
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const profile = await authApi.loginCustomer(email, password);
      setUser(profile);
      void registerSessionDevice();
      notify.success('Welcome back!');
    } catch (error) {
      notify.error('Invalid credentials');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const profile = await authApi.signupCustomer(name, email, password);
      setUser(profile);
      void registerSessionDevice();
      notify.success('Account created successfully!');
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Failed to create account'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    notify.info('Logged out successfully');
  };
  const logoutAll = async () => {
    await accountApi.logoutAll();
    setUser(null);
    notify.info('All devices have been signed out');
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        logoutAll
      }}>

      {children}
    </AuthContext.Provider>);

};
