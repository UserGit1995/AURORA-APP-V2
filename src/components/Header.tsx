import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  ShoppingBag, 
  Menu, 
  X, 
  QrCode, 
  Mic, 
  MicOff, 
  AlertCircle, 
  RotateCw, 
  LogIn, 
  LogOut, 
  Mail, 
  RotateCcw 
} from 'lucide-react';
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
  onOpenContact?: () => void;
  unreadNotificationsCount?: number;
  unreadInquiriesCount?: number;
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
  onOpenContact,
  unreadNotificationsCount = 3,
  unreadInquiriesCount = 5,
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

  const handleAdminAction = () => {
    if (isAdmin && onOpenAdminPanel) {
      onOpenAdminPanel();
    } else if (onOpenLogin) {
      onOpenLogin();
    }
  };

  return (
    <header className="relative z-20 w-full bg-[#030914] border-b border-[#0e1c33] transition-all">
      {/* 1. MOBILE SMARTPHONE HEADER (EXACT REPLICA OF ATTACHED SCREENSHOT) */}
      <div className="lg:hidden px-4 pt-3 pb-3 space-y-3">
        {/* Top Row: [Hamburger] [AURORA Logo Centered] [Bell Badge] [Mail Badge] */}
        <div className="flex items-center justify-between">
          {/* Menu Button */}
          <button
            id="mobile-menu-toggle"
            onClick={onToggleMobileMenu}
            className="w-10 h-10 rounded-xl bg-[#09152b] text-slate-100 flex items-center justify-center border border-[#132a4e] active:scale-95 transition-transform"
            aria-label="Menu di navigazione"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Centered Brand Logo */}
          <div className="flex items-center justify-center">
            <AuroraLogo size="sm" className="scale-105" />
          </div>

          {/* Top Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Notification Bell with Badge */}
            <button
              id="mobile-header-notifications-btn"
              onClick={onOpenNotifications}
              className="relative w-10 h-10 rounded-full bg-[#09152b] text-slate-200 flex items-center justify-center border border-[#132a4e] active:scale-95 transition-transform"
              aria-label="Notifiche"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-sky-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 border border-[#030914] shadow-sm">
                {unreadNotificationsCount || 3}
              </span>
            </button>

            {/* Inquiries / Mail / Cart with Badge */}
            <button
              id="mobile-header-mail-btn"
              onClick={onOpenContact || onOpenCart}
              className="relative w-10 h-10 rounded-full bg-[#09152b] text-slate-200 flex items-center justify-center border border-[#132a4e] active:scale-95 transition-transform"
              aria-label="Messaggi e Richieste"
            >
              <Mail className="w-4.5 h-4.5" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-sky-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 border border-[#030914] shadow-sm">
                {unreadInquiriesCount || 5}
              </span>
            </button>
          </div>
        </div>

        {/* Second Row: Mobile Search Bar with Mic */}
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="mobile-search-input"
              type="text"
              value={isListening && interimText ? interimText : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isListening
                  ? "Parla adesso (es. 'Detergente pavimenti')..."
                  : "Cerca prodotti..."
              }
              className={`w-full bg-[#081427] text-slate-100 placeholder-slate-400 text-xs sm:text-sm rounded-2xl pl-10 pr-11 py-2.5 border transition-all duration-200 focus:outline-hidden ${
                isListening
                  ? 'border-sky-400 ring-2 ring-sky-500/40 bg-[#071933]'
                  : 'border-[#132644] focus:border-sky-500'
              }`}
            />
            {/* Mic Voice Search Button */}
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`p-1.5 rounded-full transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-sky-400 hover:text-sky-300'
                }`}
                title="Ricerca vocale"
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Third Row: Riordino Rapido (e, solo per l'amministratore, il pulsante di Gestione) */}
        <div className={`grid gap-2.5 pt-0.5 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            id="mobile-quick-reorder-pill"
            onClick={onOpenQuickReorder}
            type="button"
            className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-semibold text-xs py-2.5 px-3 rounded-2xl transition-all"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span className="truncate">Riordino Rapido</span>
          </button>

          {isAdmin && (
            <button
              id="mobile-admin-pill"
              onClick={handleAdminAction}
              type="button"
              className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs py-2.5 px-3 rounded-2xl transition-all"
            >
              <span className="truncate">Gestione</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DESKTOP / TABLET HEADER (WIDE VIEWPORTS) */}
      <div className="hidden lg:flex px-8 py-3.5 items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <AuroraLogo size="md" />
        </div>

        {/* Search Bar & Voice Search */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="global-search-input-desktop"
              type="text"
              value={isListening && interimText ? interimText : searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isListening
                  ? "Parla adesso (es. 'Detergente pavimenti')..."
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
                title="Ricerca vocale"
              >
                {isListening ? (
                  <MicOff className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>

              {/* QR Code Scanner Trigger */}
              {onOpenQrScanner && (
                <button
                  id="header-search-qr-btn"
                  type="button"
                  onClick={onOpenQrScanner}
                  className="p-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors"
                  title="Scansiona QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right User Actions Desktop */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Quick Reorder Dedicated Header Button */}
          {onOpenQuickReorder && (
            <button
              id="header-quick-reorder-btn"
              onClick={onOpenQuickReorder}
              className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
              title="Riordino Rapido fornitura: 1-click senza checkout e senza carte"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{t('header.quickReorder', 'Riordino Rapido')}</span>
            </button>
          )}

          {/* QR Code Scanner Dedicated Header Button */}
          {onOpenQrScanner && (
            <button
              id="header-qr-scanner-button"
              onClick={onOpenQrScanner}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors"
              title="Scansiona codice QR fotocamera per aggiungere al carrello"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>{t('header.qrScanner', 'Scanner QR')}</span>
            </button>
          )}

          {/* Pulsante di accesso al pannello di gestione, visibile solo all'amministratore */}
          {isAdmin && (
            <button
              id="header-admin-control-btn"
              onClick={onOpenAdminPanel}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              title="Pannello di gestione: catalogo, prezzi, ordini e impostazioni"
            >
              <span>Gestione {currentUser?.name ? `(${currentUser.name})` : ''}</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            id="header-notifications-button"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full bg-[#0a1424] hover:bg-[#0f1d33] text-slate-300 hover:text-white border border-[#152744] transition-colors"
            aria-label="Notifiche"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-sky-400 rounded-full ring-2 ring-[#050b17]" />
            )}
          </button>

          {/* Shopping Cart Button with Pulse Animation */}
          <div className="relative">
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

          {/* Profile Info / Login Trigger */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0d1f3b] hover:bg-[#132c52] text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('auth.login', 'Accedi')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

