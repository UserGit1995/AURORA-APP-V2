import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { FlipBook, FlipBookHandle } from './FlipBook';
import { Flyer, fetchActiveFlyer, shortDate } from '../services/flyers';

const validityText = (f: Flyer) => {
  if (f.validFrom && f.validTo) return `Offerte valide dal ${shortDate(f.validFrom)} al ${shortDate(f.validTo)}`;
  if (f.validTo) return `Offerte valide fino al ${shortDate(f.validTo)}`;
  if (f.validFrom) return `Offerte valide dal ${shortDate(f.validFrom)}`;
  return '';
};

const NavButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }> = ({
  onClick,
  label,
  children,
  disabled,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    disabled={disabled}
    className="p-2.5 rounded-full bg-[#0e1b30] border border-[#1c2433] text-white hover:bg-sky-600 hover:border-sky-600 disabled:opacity-30 disabled:hover:bg-[#0e1b30] transition-colors"
  >
    {children}
  </button>
);

export const FlyerSection: React.FC = () => {
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [page, setPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = sfoglia; >1 = pagina ingrandita
  const bookRef = useRef<FlipBookHandle>(null);
  const bigBookRef = useRef<FlipBookHandle>(null);

  useEffect(() => {
    fetchActiveFlyer().then(setFlyer).catch(() => setFlyer(null));
  }, []);

  // Blocca lo scorrimento della pagina sotto la finestra a schermo intero
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  if (!flyer || flyer.pages.length === 0) return null;

  const total = flyer.pages.length;
  const validity = validityText(flyer);

  const openFull = () => {
    setZoom(1);
    setFullscreen(true);
  };

  return (
    <section className="w-full mt-6 sm:mt-7">
      <div className="flex items-center justify-between gap-3 mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white text-sm sm:text-lg font-bold tracking-tight leading-tight truncate">{flyer.title}</h2>
            {validity && <p className="text-sky-300 text-xs font-semibold">{validity}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={openFull}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Schermo intero</span>
          <span className="sm:hidden">Apri</span>
        </button>
      </div>

      <div className="rounded-2xl border border-[#1c2433] bg-[#0b1526]/70 p-3 sm:p-5">
        {!fullscreen && (
          <FlipBook ref={bookRef} pages={flyer.pages} maxWidth={280} startPage={page} onPageChange={setPage} />
        )}
        <div className="flex items-center justify-center gap-4 mt-3">
          <NavButton label="Pagina precedente" onClick={() => bookRef.current?.prev()} disabled={page === 0}>
            <ChevronLeft className="w-4 h-4" />
          </NavButton>
          <span className="text-xs text-slate-300 font-semibold min-w-[90px] text-center">
            Pagina {Math.min(page + 1, total)} di {total}
          </span>
          <NavButton label="Pagina successiva" onClick={() => bookRef.current?.next()} disabled={page >= total - 1}>
            <ChevronRight className="w-4 h-4" />
          </NavButton>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-[#050b16]/95 flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-[#1c2433]">
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{flyer.title}</p>
              {validity && <p className="text-sky-300 text-[11px] font-semibold">{validity}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e1b30] border border-[#1c2433] text-white text-xs font-semibold hover:border-sky-500"
              >
                {zoom > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                <span className="hidden sm:inline">{zoom > 1 ? 'Torna a sfogliare' : 'Ingrandisci pagina'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                aria-label="Chiudi"
                className="p-2 rounded-xl bg-[#0e1b30] border border-[#1c2433] text-white hover:bg-rose-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-6">
            {zoom === 1 ? (
              <div className="max-w-[1200px] mx-auto">
                <FlipBook
                  ref={bigBookRef}
                  pages={flyer.pages}
                  maxWidth={Math.max(260, Math.min(700, Math.floor((window.innerHeight - 190) / 1.414)))}
                  startPage={page}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <div className="mx-auto" style={{ width: `${Math.min(100 * zoom, 300)}%`, maxWidth: 1800 * (zoom / 2) }}>
                <img src={flyer.pages[page]} alt={`Pagina ${page + 1}`} className="w-full h-auto rounded-lg" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 py-3 border-t border-[#1c2433]">
            {zoom > 1 ? (
              <>
                <NavButton label="Riduci" onClick={() => setZoom((z) => Math.max(1.5, z - 0.5))}>
                  <ZoomOut className="w-4 h-4" />
                </NavButton>
                <NavButton
                  label="Pagina precedente"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </NavButton>
                <span className="text-xs text-slate-300 font-semibold min-w-[90px] text-center">
                  Pagina {page + 1} di {total}
                </span>
                <NavButton
                  label="Pagina successiva"
                  onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                  disabled={page >= total - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </NavButton>
                <NavButton label="Ingrandisci" onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>
                  <ZoomIn className="w-4 h-4" />
                </NavButton>
              </>
            ) : (
              <>
                <NavButton label="Pagina precedente" onClick={() => bigBookRef.current?.prev()} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </NavButton>
                <span className="text-xs text-slate-300 font-semibold min-w-[90px] text-center">
                  Pagina {Math.min(page + 1, total)} di {total}
                </span>
                <NavButton
                  label="Pagina successiva"
                  onClick={() => bigBookRef.current?.next()}
                  disabled={page >= total - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </NavButton>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
