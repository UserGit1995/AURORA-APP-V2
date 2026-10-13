import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  PenTool,
  Image as ImageIcon,
  Megaphone,
  Monitor,
  Smartphone,
  Package,
  Wallpaper,
  FileText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { getSupabase } from '../services/supabase';

/**
 * Pagina profilo di Simone Aricò (creatore dell'app) con il modulo per richiedere lavori.
 * - Nessun dato personale mostrato oltre a nome e cognome.
 * - Le richieste vengono inviate dal server (/api/send-order, tipo "design"): l'indirizzo
 *   email di destinazione è impostato su Vercel e non compare mai nell'app né nel codice.
 * - Immagine profilo: all'inizio le iniziali; un amministratore può caricarne una
 *   (foto, logo, avatar) direttamente da questa pagina. Viene salvata nello spazio file.
 */

const NAME = 'Simone Aricò';
const BUCKET = 'aurora-images';
const AVATAR_DIR = 'profilo-creatore';
const AVATAR_FILE = 'avatar.jpg';

const SERVICES = [
  { id: 'Logo e immagine coordinata', icon: PenTool, text: 'Loghi, marchi e immagine coordinata' },
  { id: 'Banner e grafiche social', icon: Megaphone, text: 'Banner, post e grafiche per i social' },
  { id: 'Sfondi e illustrazioni', icon: Wallpaper, text: 'Sfondi, illustrazioni e immagini su misura' },
  { id: 'Volantini e cataloghi', icon: FileText, text: 'Volantini, cataloghi e materiale stampato' },
  { id: 'Packaging e etichette', icon: Package, text: 'Grafiche per packaging ed etichette' },
  { id: 'Sito web', icon: Monitor, text: 'Siti web vetrina e cataloghi online' },
  { id: 'App', icon: Smartphone, text: 'App per telefono e computer' },
  { id: 'Fotoritocco', icon: ImageIcon, text: 'Fotoritocco e foto prodotto su sfondo bianco' },
];

const inputCls =
  'w-full bg-[#0d1420] border border-[#1c2433] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500';

async function toJpeg(file: File, max = 600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Immagine non valida'));
      i.src = url;
    });
    // ritaglio quadrato centrale, così nel cerchio sta sempre bene
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const out = Math.min(max, side);
    const c = document.createElement('canvas');
    c.width = out;
    c.height = out;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversione non riuscita'))), 'image/jpeg', 0.9)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  onBack: () => void;
  onOpenPrivacy: () => void;
}

export const DeveloperProfileView: React.FC<Props> = ({ onBack, onOpenPrivacy }) => {
  const { isAdmin } = useAdmin();

  // ---- immagine profilo
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAvatar = async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data } = await sb.storage.from(BUCKET).list(AVATAR_DIR, { limit: 5 });
      const f = (data || []).find((x: any) => x.name === AVATAR_FILE);
      if (!f) return setAvatar(null);
      const v = encodeURIComponent((f as any).updated_at || (f as any).created_at || '1');
      setAvatar(`${sb.storage.from(BUCKET).getPublicUrl(`${AVATAR_DIR}/${AVATAR_FILE}`).data.publicUrl}?v=${v}`);
    } catch {
      setAvatar(null);
    }
  };
  useEffect(() => {
    loadAvatar();
  }, []);

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    const sb = getSupabase();
    if (!sb) return;
    setAvatarBusy(true);
    setAvatarMsg('');
    try {
      const blob = await toJpeg(file);
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(`${AVATAR_DIR}/${AVATAR_FILE}`, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' });
      if (error) throw new Error(error.message);
      await loadAvatar();
      setAvatarMsg('Immagine aggiornata');
    } catch (e: any) {
      setAvatarMsg(`Caricamento non riuscito: ${e?.message || e}`);
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    const sb = getSupabase();
    if (!sb || !confirm('Togliere l\'immagine e tornare alle iniziali?')) return;
    setAvatarBusy(true);
    try {
      await sb.storage.from(BUCKET).remove([`${AVATAR_DIR}/${AVATAR_FILE}`]);
      setAvatar(null);
      setAvatarMsg('Tornato alle iniziali');
    } finally {
      setAvatarBusy(false);
    }
  };

  // ---- modulo richiesta
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState(''); // trappola anti-bot
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const toggleService = (id: string) =>
    setServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Scrivi il tuo nome.');
    if (!contact.trim()) return setError('Scrivi un\'email o un numero di telefono per essere ricontattato.');
    if (services.length === 0) return setError('Scegli almeno un tipo di lavoro.');
    if (message.trim().length < 10) return setError('Descrivi in poche parole cosa ti serve.');
    if (!privacy) return setError('Per inviare la richiesta devi accettare l\'informativa privacy.');
    setSending(true);
    try {
      const res = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'design', name, contact, services, message, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `errore ${res.status}`);
      setSent(true);
    } catch {
      setError('Invio non riuscito. Riprova tra qualche minuto.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-left">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Torna alla home
      </button>

      {/* Profilo */}
      <section className="relative overflow-hidden rounded-3xl border border-[#1c2433] bg-gradient-to-br from-[#0a111e] to-[#0e1b30] p-6 pb-40 sm:p-8">
        {/* Sfondo come quello dell'app: luci blu sfumate + logo "SA Simone Aricò" in trasparenza */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-32 -top-40 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(30,110,180,0.28),rgba(30,110,180,0.126)_45%,transparent)]" />
          <div className="absolute -right-40 -bottom-48 w-[32rem] h-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(20,90,160,0.32),rgba(20,90,160,0.144)_45%,transparent)]" />
          <img
            src="/sfondi/logo-simone.svg"
            alt=""
            className="absolute right-4 bottom-4 w-32 opacity-[0.22] sm:w-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:right-6 sm:h-[90%] sm:opacity-[0.09] select-none"
            draggable={false}
          />
        </div>
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full p-[3px] bg-gradient-to-br from-sky-400 via-sky-600 to-indigo-600 shadow-lg shadow-sky-950/50">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0d1420] flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt={NAME} className="w-full h-full object-cover" onError={() => setAvatar(null)} />
                ) : (
                  <span className="text-4xl font-bold tracking-wide text-white font-heading">SA</span>
                )}
              </div>
            </div>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  title="Cambia immagine profilo"
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-sky-600 hover:bg-sky-500 border-2 border-[#041a3a] text-white flex items-center justify-center"
                >
                  {avatarBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    uploadAvatar(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading">{NAME}</h1>
            <p className="mt-1 text-sky-300 text-sm font-semibold">Grafico e sviluppatore · Team AURORA</p>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Grafico privato del team AURORA: ho ideato, disegnato e sviluppato questa app, dalla grafica al catalogo.
              Realizzo loghi, grafiche, siti e app su misura per attività e professionisti, seguendo ogni progetto
              dall'idea al risultato finito con cura per i dettagli, tempi chiari e soluzioni pensate per il tuo lavoro.
            </p>
            {isAdmin && (avatarMsg || avatar) && (
              <p className="mt-2 text-[11px] text-slate-400">
                {avatarMsg}
                {avatar && (
                  <button type="button" onClick={removeAvatar} className="ml-2 text-sky-300 hover:text-white underline">
                    Torna alle iniziali
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Servizi */}
      <section>
        <h2 className="text-white text-lg font-bold mb-3">Cosa posso realizzare per te</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SERVICES.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-[#1c2433] bg-[#0e1b30] px-4 py-3">
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4" />
              </span>
              <span className="text-sm text-slate-200">{s.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Richiesta */}
      <section className="rounded-3xl border border-[#1c2433] bg-[#0b1526] p-5 sm:p-6">
        <h2 className="text-white text-lg font-bold">Richiedi un lavoro</h2>
        <p className="text-slate-400 text-sm mt-1">Raccontami cosa ti serve: ti ricontatto io con una proposta.</p>

        {sent ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <p className="mt-3 text-white font-semibold">Richiesta inviata!</p>
            <p className="text-slate-300 text-sm mt-1">Grazie {name.split(' ')[0]}, ti ricontatterò al più presto.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome o attività</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="es. Mario Rossi / Bar Centrale" maxLength={120} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email o telefono per ricontattarti</label>
                <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls} placeholder="es. mario@email.it o 345 123 4567" maxLength={120} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Che lavoro ti serve? (puoi sceglierne più di uno)</label>
              <div className="flex flex-wrap gap-2">
                {[...SERVICES.map((s) => s.id), 'Altro'].map((id) => {
                  const on = services.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleService(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        on ? 'bg-sky-600 border-sky-500 text-white' : 'bg-[#0d1420] border-[#1c2433] text-slate-300 hover:border-sky-500/50'
                      }`}
                    >
                      {on && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                      {id}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descrivi il lavoro</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={3000}
                className={inputCls}
                placeholder="Cosa ti serve, per quale attività, colori o idee che hai in mente, entro quando..."
              />
            </div>

            {/* campo invisibile anti-bot */}
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-0.5 accent-sky-500" />
              <span>
                Accetto che i dati inseriti vengano usati solo per rispondere a questa richiesta, come indicato nell'{' '}
                <button type="button" onClick={onOpenPrivacy} className="text-sky-300 underline hover:text-white">
                  informativa privacy
                </button>
                .
              </span>
            </label>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="w-full h-12 rounded-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold inline-flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Invia richiesta
            </button>
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> La richiesta arriva direttamente a me, in modo riservato.
            </p>
          </form>
        )}
      </section>
    </div>
  );
};
