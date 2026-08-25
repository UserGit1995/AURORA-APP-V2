import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuroraLogo } from './AuroraLogo';
import { useLanguage } from '../context/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: { name: string; company: string; email: string; piva: string }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { language } = useLanguage();
  const isIt = language === 'it';

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [emailOrPiva, setEmailOrPiva] = useState('simonearico10@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess({
            name: 'Simone Aricò',
            company: 'Aurora Distributi S.r.l.',
            email: 'simonearico10@gmail.com',
            piva: 'IT09876543210',
          });
        }
        setLoginSuccess(false);
        onClose();
      }, 1000);
    }, 800);
  };

  const handleQuickDemoLogin = (type: 'b2b' | 'gestionale') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess({
            name: type === 'b2b' ? 'Simone Aricò' : 'Operatore Logistica',
            company: 'Aurora Distributi S.r.l.',
            email: type === 'b2b' ? 'simonearico10@gmail.com' : 'magazzino@auroradistribuzione.it',
            piva: 'IT09876543210',
          });
        }
        setLoginSuccess(false);
        onClose();
      }, 900);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Dark backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Login Card Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#060e1d] border border-[#142848] rounded-3xl shadow-[0_0_50px_rgba(2,132,199,0.18)] z-10 overflow-hidden"
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-sky-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="close-login-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-[#0d1d38]/80 hover:bg-[#132c54] border border-[#1a3359] transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Official Aurora Logo */}
        <div className="pt-8 pb-4 px-6 text-center flex flex-col items-center border-b border-[#0f213d] bg-[#071329]/60">
          <div className="relative mb-2 p-2">
            <AuroraLogo size="login" showSubtitle={true} />
          </div>

          <p className="text-xs text-slate-400 max-w-xs mt-2">
            {isIt
              ? 'Portale B2B Ufficiale • Accesso Fornitori e Rifornimento Merci'
              : 'Official B2B Portal • Supplier Access & Supply Replenishment'}
          </p>
        </div>

        {/* Auth Body */}
        <div className="p-6">
          {/* Quick Demo Access Bar */}
          <div className="mb-5 p-3 rounded-2xl bg-[#091730] border border-sky-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-300 font-semibold">
                {isIt ? 'Accesso Rapido Demo:' : 'Quick Demo Access:'}
              </span>
            </div>
            <button
              type="button"
              id="demo-login-btn"
              onClick={() => handleQuickDemoLogin('b2b')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-950/60 transition-transform active:scale-95 flex items-center gap-1"
            >
              <span>1-Click Login</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">
                  {isIt ? 'Autenticazione riuscita! Accesso in corso...' : 'Authentication successful! Logging in...'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{isIt ? 'Partita IVA o Email B2B' : 'VAT / Tax ID or B2B Email'}</span>
                <span className="text-[10px] text-sky-400 font-normal">{isIt ? 'Verificato SDI' : 'SDI Verified'}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="login-email-input"
                  value={emailOrPiva}
                  onChange={(e) => setEmailOrPiva(e.target.value)}
                  required
                  placeholder="simonearico10@gmail.com"
                  className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{isIt ? 'Password / PIN Terminale' : 'Password / Terminal PIN'}</span>
                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(isIt ? 'Link di recupero inviato a simonearico10@gmail.com' : 'Recovery link sent.');
                  }}
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  {isIt ? 'Recupera password' : 'Forgot password?'}
                </a>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#050c18] border border-[#132542] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Terminal Device Info */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-[#050c18] text-sky-500 focus:ring-0"
                />
                <span>{isIt ? 'Ricorda su questo terminale' : 'Remember this terminal'}</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> TLS 256-bit
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all hover:scale-[1.01] mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>{isIt ? 'Accedi al Listino Riservato' : 'Sign in to B2B Catalog'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#040a14] border-t border-[#0e1d35] text-center text-[11px] text-slate-500">
          AURORA Distribuzione • {isIt ? 'Soluzioni Professionali per Pulizia e Sanificazione' : 'Professional Hygiene Solutions'}
        </div>
      </motion.div>
    </div>
  );
};
