import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { authApi } from '@shared/api';
import type { OpsAdminProfile } from '@shared/types';

interface OpsAuthContextType {
  admin: OpsAdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const OpsAuthContext = createContext<OpsAuthContextType | undefined>(undefined);

export const useOpsAuth = () => {
  const context = useContext(OpsAuthContext);
  if (!context) {
    throw new Error('useOpsAuth must be used within OpsAuthProvider');
  }
  return context;
};

export const OpsAuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<OpsAdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const activeAdmin = authApi.getCurrentOpsAdminProfile();
    if (activeAdmin) {
      setAdmin(activeAdmin);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const profile = await authApi.loginOpsAdmin(email, password);
      setAdmin(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setAdmin(null);
  };

  const value = useMemo(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      logout
    }),
    [admin, isLoading]
  );

  return (
    <OpsAuthContext.Provider value={value}>{children}</OpsAuthContext.Provider>
  );
};
