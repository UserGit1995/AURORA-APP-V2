import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  ChatMessage, ChatSession, fetchChat, formatChatDay, formatChatTime, loadChatSession, mergeMessages, sendChat, startChat,
} from '../services/chat';
import { Ic } from './Icona';
import { EMBLEM } from './NuovaShell';

const POLL_MS = 4000;
const QUICK = ['Consegnate nella mia zona?', 'Fate fattura?', 'Avete i bicchieri da 90 ml?'];

/**
 * Chat del cliente con la grafica del prototipo.
 * Funziona come prima: il cliente scrive nome e numero, poi chatta con Aurora (stessi servizi di ChatView).
 */
export const NuovaChat: React.FC<{ onOpenPrivacy?: () => void }> = ({ onOpenPrivacy }) => {
  const { currentUser } = useAdmin();
  const [session, setSession] = useState<ChatSession | null>(() => loadChatSession());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

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
        setSession(null);
        setMessages([]);
      } else {
        setError('Connessione assente, riprovo…');
      }
    }
  }, [session]);

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

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (messages.length !== lastCount.current) {
      el.scrollTop = el.scrollHeight;
      lastCount.current = messages.length;
    }
  }, [messages.length]);

  const onStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) return setFormError('Scrivi il tuo nome o quello della tua attività');
    if (phone.replace(/\D/g, '').length < 6) return setFormError('Scrivi un numero di telefono valido');
    if (!consent) return setFormError("Per scriverci devi accettare l'informativa privacy");
    setStarting(true);
    try {
      setSession(await startChat(name, phone));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const send = async (body: string) => {
    const b = body.trim();
    if (!b || !session || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const m = await sendChat(session, b);
      setMessages((prev) => mergeMessages(prev, [m]));
      setText('');
    } catch (e) {
      setSendError((e as Error).message || 'Messaggio non inviato, riprova');
    } finally {
      setSending(false);
    }
  };

  let lastDay = '';

  return (
    <section className="n-chatpg" aria-label="Chat con Aurora">
      <header className="ch-top">
        <span className="cav"><img src={EMBLEM} alt="" /></span>
        <span>
          <b>Aurora S.r.l.s</b>
          <small><i />Ufficio ordini, rispondiamo in giornata</small>
        </span>
      </header>

      {session ? (
        <>
          <div className="chat-body" ref={listRef}>
            <div className="msg">
              Ciao {session.name}! Siamo l'ufficio ordini di Aurora. Come possiamo aiutarti?
            </div>
            {loading && messages.length === 0 && <p className="ch-note">Caricamento…</p>}
            {messages.map((m) => {
              const day = formatChatDay(m.created_at);
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <React.Fragment key={m.id}>
                  {showDay && <p className="ch-day">{day}</p>}
                  <div className={`msg${m.sender === 'cliente' ? ' me' : ''}`}>
                    {m.body}
                    <small>{formatChatTime(m.created_at)}</small>
                  </div>
                </React.Fragment>
              );
            })}
            {error && <p className="ch-note err">{error}</p>}
          </div>
          {messages.length === 0 && (
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}
          <form
            className="cin"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            {sendError && <p className="ch-err">{sendError}</p>}
            <input
              id="chat-input-cliente"
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              placeholder="Scrivi un messaggio"
              autoComplete="off"
            />
            <button className="send" id="chat-send-cliente" aria-label="Invia" disabled={!text.trim() || sending}>
              <Ic n="arrow" s={19} />
            </button>
          </form>
        </>
      ) : (
        <div className="chat-body">
          <div className="msg">Ciao! Siamo l'ufficio ordini di Aurora. Come possiamo aiutarti?</div>
          <form className="ch-start" onSubmit={onStart}>
            <b>Per scriverci lasciaci nome e numero</b>
            <label>
              Nome o attività
              <input
                id="chat-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="es. Mario Rossi / Bar Centrale"
              />
            </label>
            <label>
              Numero di telefono
              <input
                id="chat-phone-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="es. 345 123 4567"
              />
            </label>
            <label className="ck">
              <input id="chat-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Accetto che nome, numero e messaggi vengano usati solo per rispondermi, come indicato nell'
                {onOpenPrivacy ? (
                  <button type="button" onClick={onOpenPrivacy}>informativa privacy</button>
                ) : (
                  'informativa privacy'
                )}
                .
              </span>
            </label>
            {formError && <p className="ch-err">{formError}</p>}
            <button id="chat-start-btn" type="submit" className="go" disabled={starting}>
              {starting ? 'Un momento…' : 'Inizia la chat'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
