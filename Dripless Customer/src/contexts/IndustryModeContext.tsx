import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import {
  INDUSTRY_MODE_STORAGE_KEY,
  INDUSTRY_MODES,
  isIndustryMode,
  type IndustryMode
} from '@shared/industry-modes';

interface IndustryModeContextType {
  mode: IndustryMode;
  setMode: (mode: IndustryMode) => void;
  toggleMode: () => void;
  meta: (typeof INDUSTRY_MODES)[IndustryMode];
  isCleaning: boolean;
  isEhailing: boolean;
}

const IndustryModeContext = createContext<IndustryModeContextType | undefined>(undefined);

export const useIndustryMode = () => {
  const context = useContext(IndustryModeContext);
  if (!context) {
    throw new Error('useIndustryMode must be used within an IndustryModeProvider');
  }
  return context;
};

export const IndustryModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<IndustryMode>('cleaning');

  useEffect(() => {
    const stored = localStorage.getItem(INDUSTRY_MODE_STORAGE_KEY);
    if (isIndustryMode(stored)) setModeState(stored);
  }, []);

  const setMode = (next: IndustryMode) => {
    setModeState(next);
    localStorage.setItem(INDUSTRY_MODE_STORAGE_KEY, next);
  };

  const toggleMode = () => {
    setMode(mode === 'cleaning' ? 'ehailing' : 'cleaning');
  };

  return (
    <IndustryModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        meta: INDUSTRY_MODES[mode],
        isCleaning: mode === 'cleaning',
        isEhailing: mode === 'ehailing'
      }}>
      {children}
    </IndustryModeContext.Provider>
  );
};
