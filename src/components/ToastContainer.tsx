import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "info" | "warning";
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icon = { success: CheckCircle2, info: Info, warning: AlertTriangle }[toast.type];
  const color = {
    success: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    info: "text-sky-400 border-sky-500/30 bg-sky-500/10",
    warning: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  }[toast.type];
  const Icon = icon;

  return (
    <div className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl bg-card animate-in slide-in-from-top-2 fade-in duration-200 ${color}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">{toast.title}</p>
        {toast.message && <p className="text-[11px] text-muted-foreground mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve essere usato dentro ToastProvider");
  return ctx;
}
