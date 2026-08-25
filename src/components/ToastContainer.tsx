import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle2, 
  Package, 
  AlertCircle, 
  Info, 
  X, 
  ArrowRight, 
  ExternalLink,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastNotification } from '../types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div 
      aria-live="polite"
      className="fixed top-20 right-4 z-50 flex flex-col gap-3 w-full max-w-sm sm:max-w-md pointer-events-none px-2 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration || 7500;
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isHovered) return;

    const startTime = Date.now();
    const interval = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        onDismiss();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration, isHovered, onDismiss]);

  const isShipped = toast.type === 'order_shipped';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md transition-all ${
        isShipped
          ? 'bg-[#061226]/95 border-sky-500/50 shadow-[0_10px_35px_rgba(2,132,199,0.35)] ring-1 ring-sky-400/40'
          : toast.type === 'success'
          ? 'bg-[#061814]/95 border-emerald-500/50 shadow-[0_10px_35px_rgba(16,185,129,0.25)]'
          : 'bg-[#0a1528]/95 border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Top Ambient Glow Line */}
      <div 
        className={`h-1 w-full ${
          isShipped 
            ? 'bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-500' 
            : toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
            : 'bg-sky-500'
        }`} 
      />

      <div className="p-4 sm:p-4.5">
        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div className="relative shrink-0 mt-0.5">
            {isShipped ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                <Truck className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
              </div>
            ) : toast.type === 'success' ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Package className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white tracking-tight">
                {toast.title}
              </h4>
              {toast.orderId && (
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-400/30">
                  {toast.orderId}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {toast.message}
            </p>

            {/* Courier and AWB Pill */}
            {(toast.courier || toast.trackingNumber) && (
              <div className="mt-2.5 flex items-center gap-2 text-[11px] flex-wrap">
                {toast.courier && (
                  <span className="text-slate-400">
                    Vettore: <strong className="text-slate-200">{toast.courier}</strong>
                  </span>
                )}
                {toast.trackingNumber && (
                  <span className="font-mono text-[10.5px] bg-[#0c1e3a] text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30 font-semibold">
                    AWB: {toast.trackingNumber}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {toast.onAction && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{toast.actionLabel || 'Traccia Spedizione'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Chiudi notifica"
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="h-0.5 w-full bg-slate-800/80">
        <div
          className={`h-full transition-all duration-75 ${
            isShipped ? 'bg-sky-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};
