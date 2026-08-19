import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { authApi, mfaApi, passkeyApi } from '@shared/api';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON
} from '@simplewebauthn/browser';
import type { OpsAdminProfile } from '@shared/types';

interface OpsAuthContextType {
  admin: OpsAdminProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string, mfaToken?: string) => Promise<void>;
  loginWithPasskey: () => Promise<void>;
  enrollTotp: (token: string) => Promise<string[]>;
  enrollPasskey: () => Promise<void>;
  finishMfaEnrollment: () => void;
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

  const login = async (email: string, password: string, mfaCode?: string, mfaToken?: string) => {
    setIsLoading(true);
    try {
      if (mfaCode && mfaToken) {
        const profile = await authApi.completeOpsMfa(mfaToken, mfaCode);
        setAdmin(profile);
        return;
      }
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

  const loginWithPasskey = async () => {
    setIsLoading(true);
    try {
      const challenge = await passkeyApi.authenticationOptions();
      const response = await startAuthentication({
        optionsJSON: challenge.options as PublicKeyCredentialRequestOptionsJSON
      });
      setAdmin(await passkeyApi.verifyAuthentication(challenge.challengeToken, response));
    } finally {
      setIsLoading(false);
    }
  };

  const enrollTotp = async (token: string) => {
    const result = await mfaApi.verifySetup(token);
    return result.backupCodes;
  };

  const enrollPasskey = async () => {
    const challenge = await passkeyApi.registrationOptions();
    const response = await startRegistration({
      optionsJSON: challenge.options as PublicKeyCredentialCreationOptionsJSON
    });
    const result = await passkeyApi.verifyRegistration(challenge.challengeToken, response);
    setAdmin(result.profile);
  };

  const finishMfaEnrollment = () => {
    setAdmin(authApi.getCurrentOpsAdminProfile());
  };

  const value = useMemo(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      loginWithPasskey,
      enrollTotp,
      enrollPasskey,
      finishMfaEnrollment,
      logout
    }),
    [admin, isLoading]
  );

  return (
    <OpsAuthContext.Provider value={value}>{children}</OpsAuthContext.Provider>
  );
};
