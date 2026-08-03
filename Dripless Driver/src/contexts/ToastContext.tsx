import React, { useCallback, useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}
const ToastContext = createContext<ToastContextType | null>(null);
export function ToastProvider({ children }: {children: React.ReactNode;}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        duration
      }]
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  return (
    <ToastContext.Provider
      value={{
        showToast
      }}>

      {children}
      <div className="fixed bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) =>
          <motion.div
            key={toast.id}
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.9
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.9
            }}
            layout
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-xl border w-full max-w-sm
                ${toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/50' : toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400/50' : 'bg-slate-800/90 text-white border-slate-700/50'}
              `}>

              {toast.type === 'success' &&
            <CheckCircle size={20} className="shrink-0" />
            }
              {toast.type === 'error' &&
            <AlertCircle size={20} className="shrink-0" />
            }
              {toast.type === 'info' && <Info size={20} className="shrink-0" />}

              <p className="text-sm font-medium flex-1">{toast.message}</p>

              <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close notification">

                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>);

}
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};