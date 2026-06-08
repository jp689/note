"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { LuminaIcon } from "./lumina-icon";

type ToastType = "info" | "success" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const toneClasses: Record<ToastType, string> = {
    info: "border-primary/20 bg-primary/10 text-primary",
    success: "border-teal/20 bg-teal/10 text-teal",
    warning: "border-warning/20 bg-warning/10 text-warning"
  };

  const toneIcons: Record<ToastType, string> = {
    info: "auto_awesome",
    success: "check_circle",
    warning: "help"
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 lg:bottom-6">
        {toasts.map((toast) => (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-lift backdrop-blur-sm ${toneClasses[toast.type]}`}
            key={toast.id}
          >
            <LuminaIcon className="text-[18px]" name={toneIcons[toast.type]} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
