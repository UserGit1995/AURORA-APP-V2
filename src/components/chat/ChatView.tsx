import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Phone, User, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import {
  ChatMessage, ChatSession, fetchChat, loadChatSession, mergeMessages, sendChat, startChat,
} from '../../services/chat';
import { ChatThread, WA } from './ChatThread';

const POLL_MS = 4000;

/** Pagina chat del cliente: vede e scrive solo la propria conversazione con Aurora. */
export const ChatView: React.FC<{ onBack: () => void; onOpenPrivacy?: () => void }> = ({ onBack, onOpenPrivacy }) => {
  const { currentUser } = useAdmin();
  const [session, setSession] = useState<ChatSession | null>(() => loadChatSession());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modulo di ingresso
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lastAt = useRef<string | null>(null);
  lastAt.current = messages.length ? messages[messages.length - 1].created_at : null;

  const refresh = useCallback(async (full = false) => {
    if (!session) return;
    try {
      const add = await fetchChat(session, full ? null : lastAt.current);
      setMessages((prev) => (full ? add : mergeMessages(prev, add)));
      setError(null);
    } catch (e) {
      const msg = (e as Error).message;
      if (/non trovata/i.test(msg)) {
        // chat eliminata: si ricomincia dal modulo
        setSession(null);
        setMessages([]);
      } else {
        setError('Connessione assente, riprovo…');
      }
    }
  }, [session]);

  // primo caricamento + aggiornamento automatico
  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    refresh(true).finally(() => alive && setLoading(false));
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    return () => { alive = false; window.clearInterval(t); };
  }, [session, refresh]);

  const onStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) return setFormError('Scrivi il tuo nome o quello della tua attività');
    if (phone.replace(/\D/g, '').length < 6) return setFormError('Scrivi un numero di telefono valido');
    if (!consent) return setFormError('Per scriverci devi accettare l\'informativa privacy');
    setStarting(true);
    try {
      setSession(await startChat(name, phone));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const onSend = async (text: string) => {
    if (!session) return;
    const m = await sendChat(session, text);
    setMessages((prev) => mergeMessages(prev, [m]));
  };

  const header = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <button onClick={onBack} aria-label="Indietro" className="p-1.5 -ml-1 rounded-full hover:bg-white/5" style={{ color: WA.text }}>
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="w-10 h-10 rounded-full bg-[#0d1420] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
        <img src="/icon-192.png" alt="" className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold truncate" style={{ color: WA.text }}>Aurora S.r.l.s</p>
        <p className="text-[12px] truncate" style={{ color: WA.muted }}>Assistenza clienti · ordini e preventivi</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl h-[calc(100dvh-190px)] min-h-[460px] rounded-2xl overflow-hidden border border-[#1c2433] shadow-2xl">
      {session ? (
        <ChatThread
          me="cliente"
          messages={messages}
          onSend={onSend}
          header={header}
          loading={loading}
          error={error}
          intro={
            <>
              Ciao {session.name}! Scrivici qui per ordini, preventivi o informazioni sui prodotti.
              Ti rispondiamo in questa chat appena possibile (giorni lavorativi).
            </>
          }
        />
      ) : (
        <div className="flex flex-col h-full" style={{ background: WA.bg }}>
          <div className="shrink-0 border-b border-[#1c2433]" style={{ background: WA.bar }}>{header}</div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-5">
            <form onSubmit={onStart} className="w-full max-w-sm space-y-4">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: WA.green }}>
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: WA.text }}>Scrivici in chat</h2>
                <p className="text-[13px] mt-1" style={{ color: WA.muted }}>
                  Inserisci nome e numero: potrai scriverci direttamente da qui, senza uscire dall'app.
                </p>
              </div>

              <label className="block">
                <span className="text-[12px] font-medium" style={{ color: WA.muted }}>Nome o attività</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl px-3" style={{ background: WA.input, border: '1px solid #1c2433' }}>
                  <User className="w-4 h-4 shrink-0" style={{ color: WA.muted }} />
                  <input
                    id="chat-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    placeholder="es. Mario Rossi / Bar Centrale"
                    className="flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-slate-500"
                    style={{ color: WA.text }}
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[12px] font-medium" style={{ color: WA.muted }}>Numero di telefono</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl px-3" style={{ background: WA.input, border: '1px solid #1c2433' }}>
                  <Phone className="w-4 h-4 shrink-0" style={{ color: WA.muted }} />
                  <input
                    id="chat-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="es. 345 123 4567"
                    className="flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-slate-500"
                    style={{ color: WA.text }}
                  />
                </div>
              </label>

              <label className="flex items-start gap-2 text-[12px] leading-snug cursor-pointer" style={{ color: WA.muted }}>
                <input id="chat-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-sky-500" />
                <span>
                  Accetto che nome, numero e messaggi vengano usati solo per rispondermi, come indicato
                  nell'{onOpenPrivacy ? (
                    <button type="button" onClick={onOpenPrivacy} className="underline" style={{ color: WA.green }}>informativa privacy</button>
                  ) : 'informativa privacy'}.
                </span>
              </label>

              {formError && <p className="text-[12px] text-rose-300">{formError}</p>}

              <button
                id="chat-start-btn"
                type="submit"
                disabled={starting}
                className="w-full rounded-full py-3 text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: WA.green }}
              >
                {starting && <Loader2 className="w-4 h-4 animate-spin" />}
                Inizia la chat
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: WA.muted }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Solo tu e Aurora vedete questa conversazione
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
