import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  X, 
  Camera, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowRight, 
  Upload, 
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
  Search,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenCart?: () => void;
}

interface ScannedEntry {
  product: Product;
  quantity: number;
  scannedAt: Date;
  rawText: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart,
  onOpenCart,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanQuantity, setScanQuantity] = useState(1);
  const [recentScans, setRecentScans] = useState<ScannedEntry[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAddMode, setAutoAddMode] = useState(true);
  const [justAddedAnimation, setJustAddedAnimation] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTextRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'aurora-qr-reader-container';

  const playSuccessChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.08); // C6
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {
      // Audio context might be restricted
    }

    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {}
    }
  };

  // Find product by SKU code, ID, or embedded string
  const findProductByScannedText = (text: string): Product | null => {
    const cleanText = text.trim();
    const upperText = cleanText.toUpperCase();

    // 1. Direct match on product.code
    let matched = products.find((p) => p.code.toUpperCase() === upperText);
    if (matched) return matched;

    // 2. Direct match on product.id
    matched = products.find((p) => p.id.toUpperCase() === upperText);
    if (matched) return matched;

    // 3. Substring match inside URL or formatted QR string (e.g. AUR-LAV-3000 or p1)
    matched = products.find((p) => upperText.includes(p.code.toUpperCase()));
    if (matched) return matched;

    // 4. Match product ID in URLs
    matched = products.find((p) => {
      const idUpper = p.id.toUpperCase();
      return upperText.includes(`/${idUpper}`) || upperText.includes(`=${idUpper}`) || upperText.includes(`"${idUpper}"`);
    });
    if (matched) return matched;

    // 5. Match by product name similarity if code includes name
    matched = products.find((p) => upperText.includes(p.name.toUpperCase()));
    if (matched) return matched;

    return null;
  };

  const handleProductRecognized = (product: Product, rawText: string) => {
    setLastScannedProduct(product);
    playSuccessChime();

    // Add to cart automatically if autoAddMode is on
    if (autoAddMode) {
      onAddToCart(product, scanQuantity);
      setJustAddedAnimation(true);
      setTimeout(() => setJustAddedAnimation(false), 2200);
    }

    // Add to recent scans log
    setRecentScans((prev) => [
      {
        product,
        quantity: scanQuantity,
        scannedAt: new Date(),
        rawText,
      },
      ...prev.slice(0, 7),
    ]);
  };

  const onScanSuccess = (decodedText: string) => {
    const now = Date.now();
    // Debounce duplicate scans within 2 seconds for the exact same text
    if (decodedText === lastScannedTextRef.current && now - lastScanTimestampRef.current < 2000) {
      return;
    }

    lastScannedTextRef.current = decodedText;
    lastScanTimestampRef.current = now;

    const matchedProduct = findProductByScannedText(decodedText);
    if (matchedProduct) {
      handleProductRecognized(matchedProduct, decodedText);
      setCameraError(null);
    } else {
      setCameraError(`Nessun prodotto trovato per il codice scansionato: "${decodedText}"`);
      setTimeout(() => setCameraError(null), 4000);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.75);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => onScanSuccess(decodedText),
        () => {
          // ignore scan frame errors
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraActive(false);
      setCameraError(
        'Impossibile accedere alla fotocamera. Verifica i permessi del browser o prova a caricare una foto del QR code.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      } finally {
        html5QrCodeRef.current = null;
        setCameraActive(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow modal DOM container to render before starting camera
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setLastScannedProduct(null);
      setCameraError(null);
      setManualCodeInput('');
      setManualCodeError(null);
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      const matched = findProductByScannedText(decodedText);
      if (matched) {
        handleProductRecognized(matched, decodedText);
      } else {
        setCameraError(`Codice QR non associato a nessun prodotto del catalogo: "${decodedText}"`);
      }
    } catch (err) {
      setCameraError('Nessun QR code leggibile rilevato nell\'immagine caricata.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;

    const matched = findProductByScannedText(manualCodeInput);
    if (matched) {
      handleProductRecognized(matched, manualCodeInput.trim());
      setManualCodeInput('');
      setManualCodeError(null);
    } else {
      setManualCodeError(`Codice SKU "${manualCodeInput.trim()}" non trovato nel catalogo.`);
    }
  };

  const handleQuickTestScan = (productCode: string) => {
    const matched = findProductByScannedText(productCode);
    if (matched) {
      handleProductRecognized(matched, productCode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-xs"
      />

      {/* Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#071120] border border-[#1a355c] rounded-3xl shadow-2xl z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#142848] bg-gradient-to-r from-[#071120] via-[#0b1c38] to-[#071120] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Scanner QR & Codici a Barre B2B
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <Zap className="w-3 h-3 text-sky-400" />
                  <span>Rilevamento Istantaneo</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inquadra il codice QR o SKU dell'articolo per aggiungerlo direttamente al carrello.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="qr-sound-toggle-btn"
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-400 hover:text-sky-300 hover:bg-[#0e203c] border border-[#183154] transition-colors"
              title={soundEnabled ? 'Disattiva segnale acustico' : 'Attiva segnale acustico'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              id="close-qr-scanner-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e203c] border border-[#183154] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(92vh-130px)] space-y-4">
          {/* Viewfinder Camera Stream View */}
          <div className="relative rounded-2xl overflow-hidden bg-[#030710] border border-[#152a4e] aspect-4/3 sm:aspect-16/10 flex flex-col items-center justify-center shadow-inner">
            {/* HTML5 QR Container element */}
            <div
              id={scannerContainerId}
              className="w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Target Viewfinder Overlay HUD */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* HUD Corners Box */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-sky-400/40 rounded-2xl shadow-[0_0_25px_rgba(56,189,248,0.15)] flex items-center justify-center">
                  {/* Glowing Laser Scan Bar */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce" />
                  
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-sky-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-sky-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-sky-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-sky-400 rounded-br-lg" />
                </div>

                <div className="mt-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-sky-500/30 text-[11px] font-semibold text-sky-300">
                  Posiziona il codice QR o SKU al centro del mirino
                </div>
              </div>
            )}

            {/* Camera Error / Permission Fallback State */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-[#060e1c] flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <p className="text-sm font-bold text-white">Fotocamera non attiva</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Consenti l'accesso alla fotocamera per scansionare in tempo reale, oppure carica una foto o inserisci il codice manualmente.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Avvia Fotocamera</span>
                </button>
              </div>
            )}

            {/* Camera Controls Floating Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-auto">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="qr-file-upload-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-[#1c3860] text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-colors inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isProcessingFile ? 'Decodifica...' : 'Carica Foto QR'}</span>
                </button>
              </div>

              {cameraActive && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="p-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-[#1c3860] text-slate-300 hover:text-white text-xs backdrop-blur-md transition-colors"
                  title="Riavvia sensore fotocamera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Alert / Warning message */}
          {cameraError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{cameraError}</span>
            </motion.div>
          )}

          {/* Last Scanned Product Card (Success Banner) */}
          <AnimatePresence>
            {lastScannedProduct && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-gradient-to-r from-[#0c1f3d] via-[#09172f] to-[#071120] border border-sky-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-xl bg-[#050c18] border border-[#142848] p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={lastScannedProduct.image}
                        alt={lastScannedProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">
                          {lastScannedProduct.name}
                        </h4>
                        <span className="font-mono text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">
                          {lastScannedProduct.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lastScannedProduct.unit} • {lastScannedProduct.packageQty}
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-bold text-white font-mono">
                          €{lastScannedProduct.price.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (€{(lastScannedProduct.price * 1.22).toFixed(2)} iva incl.)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add action & Quantity */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#142848] pt-2 sm:pt-0">
                    <div className="flex items-center gap-1 bg-[#050c18] border border-[#142848] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setScanQuantity(Math.max(1, scanQuantity - 1))}
                        className="w-6 h-6 rounded-lg bg-[#0e1d38] flex items-center justify-center text-slate-300 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold text-white">
                        {scanQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScanQuantity(scanQuantity + 1)}
                        className="w-6 h-6 rounded-lg bg-[#0e1d38] flex items-center justify-center text-slate-300 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      id="scan-add-to-cart-btn"
                      type="button"
                      onClick={() => {
                        onAddToCart(lastScannedProduct, scanQuantity);
                        setJustAddedAnimation(true);
                        setTimeout(() => setJustAddedAnimation(false), 2000);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                        justAddedAnimation
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-500/20'
                      }`}
                    >
                      {justAddedAnimation ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Nel Carrello!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Aggiungi ({scanQuantity})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick SKU Test Chips & Manual Code Bar */}
          <div className="bg-[#081326] border border-[#142848] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Oppure testa codici SKU rapidi</span>
              </span>
              <span className="text-[10px] text-slate-400">Clicca per simulare scansione</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  id={`quick-scan-chip-${p.code}`}
                  type="button"
                  onClick={() => handleQuickTestScan(p.code)}
                  className="px-2.5 py-1 rounded-lg bg-[#050c18] hover:bg-[#0c1e3d] border border-[#142848] hover:border-sky-500/40 text-[11px] font-mono text-slate-300 hover:text-sky-300 transition-colors flex items-center gap-1"
                >
                  <span>{p.code}</span>
                  <span className="text-slate-500 font-sans text-[10px]">({p.name.split(' ')[0]})</span>
                </button>
              ))}
            </div>

            {/* Manual SKU Form */}
            <form onSubmit={handleManualCodeSubmit} className="pt-2 border-t border-[#142848] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="manual-sku-input"
                  type="text"
                  placeholder="Digita codice SKU manuale (es. AUR-LAV-3000)..."
                  value={manualCodeInput}
                  onChange={(e) => {
                    setManualCodeInput(e.target.value);
                    if (manualCodeError) setManualCodeError(null);
                  }}
                  className="w-full bg-[#050c18] border border-[#142848] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
                />
              </div>
              <button
                id="submit-manual-sku-btn"
                type="submit"
                className="px-3.5 py-1.5 bg-[#0e2140] hover:bg-[#152e58] border border-[#1a3866] text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
              >
                Cerca
              </button>
            </form>

            {manualCodeError && (
              <p className="text-[11px] text-rose-400">{manualCodeError}</p>
            )}
          </div>

          {/* Scan History in Current Session */}
          {recentScans.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Articoli scansionati in questa sessione ({recentScans.length})</span>
                </span>
                {onOpenCart && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Vai al carrello</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="bg-[#050c18] border border-[#142848] rounded-2xl divide-y divide-[#0e1d38] max-h-36 overflow-y-auto">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#081326] p-0.5 border border-[#152848] flex items-center justify-center shrink-0">
                        <img
                          src={scan.product.image}
                          alt={scan.product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-white leading-tight">{scan.product.name}</p>
                        <p className="font-mono text-[10.5px] text-slate-400">{scan.product.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-300">
                        x{scan.quantity}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Aggiunto
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#142848] bg-[#060e1b] flex items-center justify-between shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              id="auto-add-checkbox"
              type="checkbox"
              checked={autoAddMode}
              onChange={(e) => setAutoAddMode(e.target.checked)}
              className="rounded border-[#162d50] bg-[#050c18] text-sky-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Aggiungi al carrello automaticamente dopo la scansione</span>
          </label>

          <button
            id="close-bottom-qr-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d1c34] hover:bg-[#14294a] text-slate-300 hover:text-white transition-colors"
          >
            Fatto
          </button>
        </div>
      </motion.div>
    </div>
  );
};
