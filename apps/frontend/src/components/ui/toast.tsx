'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full duration-300',
            {
              'bg-background border-border': toast.variant === 'default' || !toast.variant,
              'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800':
                toast.variant === 'success',
              'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800':
                toast.variant === 'error',
              'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800':
                toast.variant === 'warning',
            }
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div
                className={cn('font-semibold text-sm', {
                  'text-foreground': toast.variant === 'default' || !toast.variant,
                  'text-green-800 dark:text-green-200': toast.variant === 'success',
                  'text-red-800 dark:text-red-200': toast.variant === 'error',
                  'text-yellow-800 dark:text-yellow-200': toast.variant === 'warning',
                })}
              >
                {toast.title}
              </div>
              {toast.description && (
                <div
                  className={cn('text-sm mt-1', {
                    'text-muted-foreground': toast.variant === 'default' || !toast.variant,
                    'text-green-700 dark:text-green-300': toast.variant === 'success',
                    'text-red-700 dark:text-red-300': toast.variant === 'error',
                    'text-yellow-700 dark:text-yellow-300': toast.variant === 'warning',
                  })}
                >
                  {toast.description}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
