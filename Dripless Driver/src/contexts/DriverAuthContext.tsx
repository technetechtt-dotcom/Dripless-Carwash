import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import { authApi } from '@shared/api';
import { registerSessionDevice } from '../utils/pushDevice';
import { Driver } from '../types';
interface DriverAuthContextType {
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
  name: string,
  email: string,
  password: string,
  vehicle: string)
  => Promise<void>;
  logout: () => Promise<void>;
}
const DriverAuthContext = createContext<DriverAuthContextType | undefined>(
  undefined
);
export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};
export const DriverAuthProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const activeDriver = authApi.getCurrentDriverProfile();
    if (activeDriver) {
      setDriver(activeDriver);
      void registerSessionDevice();
    }
    setIsLoading(false);
  }, []);
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const profile = await authApi.loginDriver(email, password);
      setDriver(profile);
      void registerSessionDevice();
    } finally {
      setIsLoading(false);
    }
  };
  const signup = async (
  name: string,
  email: string,
  password: string,
  vehicle: string) =>
  {
    setIsLoading(true);
    try {
      const profile = await authApi.signupDriver(name, email, password, vehicle);
      setDriver(profile);
      void registerSessionDevice();
    } finally {
      setIsLoading(false);
    }
  };
  const logout = async () => {
    await authApi.logout();
    setDriver(null);
  };
  return (
    <DriverAuthContext.Provider
      value={{
        driver,
        isAuthenticated: !!driver,
        isLoading,
        login,
        signup,
        logout
      }}>

      {children}
    </DriverAuthContext.Provider>);

};