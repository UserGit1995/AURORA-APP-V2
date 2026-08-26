import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, ShoppingBag, Menu, X, QrCode, Mic, MicOff, AlertCircle, RotateCw, LogIn, ShieldAlert, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAdmin } from '../context/AdminContext';
import { AuroraLogo } from './AuroraLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenLogin?: () => void;
  onOpenAdminPanel?: () => void;
  onToggleMobileMenu: () => void;
  onOpenQrScanner?: () => void;
  onOpenQuickReorder?: () => void;
  unreadNotificationsCount?: number;
  isCartPulsing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  onOpenNotifications,
  onOpenProfile,
  onOpenLogin,
  onOpenAdminPanel,
  onToggleMobileMenu,
  onOpenQrScanner,
  onOpenQuickReorder,
  unreadNotificationsCount = 2,
  isCartPulsing = false,
}) => {
  const { t, language } = useLanguage();
  const { isAdmin, currentUser, logout } = useAdmin();
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API availability
  const isSpeechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const playBeep = (freq: number = 600, duration: number = 0.1) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch {
      // Audio context restricted or unavailable
    }
  };

  const startVoiceSearch = () => {
    setSpeechError(null);
    setInterimText('');

    if (!isSpeechSupported) {
      setSpeechError('Ricerca vocale non supportata dal tuo browser attuale.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        playBeep(750, 0.12);
        if (navigator.vibrate) navigator.vibrate(60);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (final) {
          const cleanQuery = final.trim();
          onSearchChange(cleanQuery);
          setInterimText('');
          setIsListening(false);
          playBeep(950, 0.15);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Accesso al microfono negato. Verifica i permessi del browser.');
        } else if (event.error === 'no-speech') {
          setSpeechError('Nessun comando vocale rilevato. Riprova.');
        } else {
          setSpeechError(`Errore riconoscimento vocale: ${event.error}`);
        }
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      setIsListening(false);
      setSpeechError('Impossibile avviare la ricerca vocale.');
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      stopVoiceSearch();
    } else {
      startVoiceSearch();
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#050b17]/90 backdrop-blur-md border-b border-[#0e1b30] px-4 lg:px-8 py-3 lg:py-3.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-4 gap-y-2.5">
      {/* Mobile Menu Button & Brand Logo */}
      <div className="flex items-center gap-2.5 lg:hidden order-1">
        <button
          id="mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg bg-[#0e1a30] text-slate-300 hover:text-white border border-[#182a4a]"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <AuroraLogo size="sm" className="scale-90 origin-left" />
      </div>

      {/* Search Bar & Quick Scan / Voice Search Trigger */}
      <div className="w-full order-3 lg:order-none lg:w-auto lg:flex-1 max-w-xl relative">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="global-search-input"
            type="text"
            value={isListening && interimText ? interimText : searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              isListening
                ? (language === 'it' ? "Parla adesso (es. 'Detergente pavimenti')..." : "Speak now (e.g. 'Floor cleaner')...")
                : t('header.searchPlaceholder', 'Cerca prodotti...')
            }
            className={`w-full bg-[#0a1424] text-slate-100 placeholder-slate-400 text-sm rounded-full pl-10 pr-24 py-2 border transition-all duration-200 focus:outline-hidden ${
              isListening
                ? 'border-sky-400 ring-2 ring-sky-500/40 bg-[#071933]'
                : 'border-[#152744] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50'
            }`}
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
            {searchQuery && !isListening && (
              <button
                id="clear-search-btn"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Voice Search Mic Trigger */}
            <button
              id="header-voice-search-btn"
              type="button"
              onClick={toggleVoiceSearch}
              className={`relative p-1.5 rounded-full border transition-all ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-[#0e223f] hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border-sky-500/30'
              }`}
              title={
                isListening
                  ? 'Interrompi ascolto vocale'
                  : 'Ricerca vocale (parla per cercare prodotti in magazzino)'
              }
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}

              {/* Listening radar ripple effect */}
              {isListening && (
                <span className="absolute -inset-1 rounded-full border-2 border-rose-400 animate-ping opacity-75 pointer-events-none" />
              )}
            </button>

            {/* QR Code Scanner Trigger */}
            {onOpenQrScanner && (
              <button
                id="header-search-qr-btn"
                type="button"
                onClick={onOpenQrScanner}
                className="p-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors"
                title="Scansiona QR / Codice a barre con fotocamera"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Listening Active Banner / Tooltip */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#0b1b36] border border-sky-500/50 rounded-2xl p-2.5 px-3 shadow-xl z-40 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-sky-300 font-semibold">In ascolto microfono:</span>
                <span className="text-white italic">
                  {interimText ? `"${interimText}"` : 'Pronuncia il nome o SKU dell\'articolo...'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 h-3 px-1">
                  <span className="w-0.5 h-full bg-sky-400 animate-[pulse_0.6s_ease-in-out_infinite]" />
                  <span className="w-0.5 h-2/3 bg-sky-400 animate-[pulse_0.4s_ease-in-out_infinite]" />
                  <span className="w-0.5 h-full bg-sky-400 animate-[pulse_0.8s_ease-in-out_infinite]" />
                  <span className="w-0.5 h-1/2 bg-sky-400 animate-[pulse_0.5s_ease-in-out_infinite]" />
                </div>
                <button
                  type="button"
                  onClick={stopVoiceSearch}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
                >
                  Stop
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Error Notification Toast */}
        <AnimatePresence>
          {speechError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#1f0d14] border border-rose-500/40 rounded-xl p-2 px-3 shadow-lg z-40 flex items-center gap-2 text-xs text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{speechError}</span>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Quick Reorder Dedicated Header Button */}
        {onOpenQuickReorder && (
          <button
            id="header-quick-reorder-btn"
            onClick={onOpenQuickReorder}
            className="relative order-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            title={language === 'it' ? "Riordino Rapido fornitura: 1-click senza checkout e senza carte" : "Quick Reorder: 1-click supplies replenishment"}
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-100" />
            <span>{t('header.quickReorder', 'Riordino Rapido')}</span>
          </button>
        )}

        {/* QR Code Scanner Dedicated Header Button */}
        {onOpenQrScanner && (
          <button
            id="header-qr-scanner-button"
            onClick={onOpenQrScanner}
            className="relative hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold shadow-xs transition-all"
            title={language === 'it' ? "Scansiona codice QR fotocamera per aggiungere al carrello" : "Scan camera QR / barcode to add to cart"}
          >
            <QrCode className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">{t('header.qrScanner', 'Scanner QR')}</span>
          </button>
        )}

        {/* Notifications Bell */}
        <button
          id="header-notifications-button"
          onClick={onOpenNotifications}
          className="relative order-2 p-2 rounded-full bg-[#0a1424] hover:bg-[#0f1d33] text-slate-300 hover:text-white border border-[#152744] transition-colors"
          aria-label="Notifiche"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full ring-2 ring-[#050b17]" />
          )}
        </button>

        {/* Shopping Cart Button with Badge and Pulse Animation */}
        <div className="relative order-2">
          {/* Subtle pulse ring on item addition */}
          <AnimatePresence>
            {isCartPulsing && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-sky-400/40 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <motion.button
            id="header-cart-button"
            onClick={onOpenCart}
            animate={
              isCartPulsing
                ? {
                    scale: [1, 1.18, 0.94, 1.08, 1],
                    borderColor: ['#152744', '#38bdf8', '#0284c7', '#152744'],
                    backgroundColor: ['#0a1424', '#0c2242', '#0a1424'],
                  }
                : { scale: 1 }
            }
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`relative p-2 rounded-full bg-[#0a1424] hover:bg-[#0f1d33] text-slate-300 hover:text-white border border-[#152744] transition-colors ${
              isCartPulsing ? 'text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]' : ''
            }`}
            aria-label="Carrello"
          >
            <motion.div
              animate={isCartPulsing ? { rotate: [-8, 8, -4, 4, 0] } : { rotate: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ShoppingBag className="w-4 h-4" />
            </motion.div>

            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-[#0284c7] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#050b17] shadow-xs"
              >
                {cartCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* SuperAdmin Master Control Button - STRICTLY FOR AUTHENTICATED ADMIN ONLY */}
        {isAdmin && (
          <button
            id="header-admin-control-btn"
            onClick={onOpenAdminPanel}
            className="relative order-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-sky-950/60 hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer border border-sky-300/40"
            title="Pannello SuperAdmin: Modifica catalogo, prezzi, ordini e impostazioni senza limiti"
          >
            <span className="text-sm">⚡</span>
            <span className="uppercase tracking-wider font-extrabold text-[11px]">
              Admin {currentUser?.name ? `(${currentUser.name})` : ''}
            </span>
          </button>
        )}

        {/* Profile Info / Login Trigger */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 order-2">
            <button
              id="header-profile-button"
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-[#0a1424] border border-transparent hover:border-[#152744] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center font-bold text-xs shadow-xs tracking-tight">
                {currentUser.avatarInitials || currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-xs font-bold leading-none truncate max-w-[110px]">
                  {currentUser.name}
                </p>
                <p className="text-slate-400 text-[10px] leading-tight mt-0.5">
                  {currentUser.role === 'superadmin' ? 'SuperAdmin' : 'Cliente B2B'}
                </p>
              </div>
            </button>
            <button
              id="header-logout-button"
              onClick={logout}
              className="p-2 rounded-full hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors"
              title="Disconnetti"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            id="header-login-btn"
            onClick={onOpenLogin}
            className="order-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0d1f3b] hover:bg-[#132c52] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('auth.login', 'Accedi')}</span>
          </button>
        )}
      </div>
    </header>
  );
};

