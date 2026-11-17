import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  ChatMessage, ChatSession, fetchChat, formatChatDay, formatChatTime, loadChatEmail, loadChatSession, mergeMessages, sendChat,
  setChatEmail, startChat,
} from '../services/chat';
import { PushState, askNotificationPermission, enableChatPush, getChatPushState, notifyChatNew } from '../services/push';
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
  const [email, setEmail] = useState(currentUser?.email || '');
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // avvisi quando Aurora risponde: notifica su questo dispositivo e/o email
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [savedEmail, setSavedEmail] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    setSavedEmail(loadChatEmail(session));
    getChatPushState(session).then(setPushState).catch(() => setPushState('unsupported'));
  }, [session]);

  const turnOnPush = async () => {
    if (!session || notifBusy) return;
    setNotifBusy(true);
    setNotifMsg(null);
    try {
      await enableChatPush(session);
      setPushState('on');
    } catch (e) {
      setNotifMsg((e as Error).message);
      setPushState(await getChatPushState(session).catch(() => 'off' as PushState));
    } finally {
      setNotifBusy(false);
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || notifBusy) return;
    const v = emailDraft.trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setNotifMsg('Scrivi un\'email valida');
    setNotifBusy(true);
    setNotifMsg(null);
    try {
      await setChatEmail(session, v);
      setSavedEmail(v);
      setEmailOpen(false);
    } catch (err) {
      setNotifMsg((err as Error).message);
    } finally {
      setNotifBusy(false);
    }
  };

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
    const mail = email.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setFormError("Controlla l'email (oppure lasciala vuota)");
    // il permesso per le notifiche va chiesto subito, mentre il tocco è "fresco"
    const perm = askNotificationPermission();
    setStarting(true);
    try {
      const s = await startChat(name, phone);
      if (mail) await setChatEmail(s, mail).catch(() => { /* la chat parte lo stesso */ });
      if (perm && (await perm.catch(() => 'denied')) === 'granted') {
        await enableChatPush(s).catch(() => { /* resta il pulsante "Avvisami" */ });
      }
      setSession(s);
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
      notifyChatNew(session); // avviso sul telefono di Aurora
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
          <div className="ch-notif">
            {pushState === 'on' ? (
              <span className="ok"><Ic n="bell" s={15} /> Ti avvisiamo qui quando rispondiamo</span>
            ) : pushState === 'off' ? (
              <button type="button" className="on" onClick={turnOnPush} disabled={notifBusy}>
                <Ic n="bell" s={15} /> {notifBusy ? 'Un momento…' : 'Avvisami quando rispondete'}
              </button>
            ) : pushState === 'denied' ? (
              <span><Ic n="bell" s={15} /> Notifiche bloccate: puoi riattivarle nelle impostazioni del browser</span>
            ) : pushState === 'ios-not-installed' ? (
              <span><Ic n="bell" s={15} /> Su iPhone le notifiche arrivano solo se aggiungi Aurora alla schermata Home</span>
            ) : pushState === 'unsupported' ? (
              <span><Ic n="bell" s={15} /> Questo browser non riceve notifiche</span>
            ) : null}
            {!emailOpen && (
              <button type="button" className="lnk" onClick={() => { setEmailDraft(savedEmail); setEmailOpen(true); setNotifMsg(null); }}>
                {savedEmail ? `Avviso anche via email a ${savedEmail} · Cambia` : 'Avvisami anche per email'}
              </button>
            )}
            {emailOpen && (
              <form className="mail" onSubmit={saveEmail}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="La tua email"
                  maxLength={120}
                  aria-label="Email per gli avvisi"
                />
                <button type="submit" disabled={notifBusy}>{notifBusy ? '…' : 'Salva'}</button>
                <button type="button" className="x" onClick={() => setEmailOpen(false)} aria-label="Annulla">✕</button>
              </form>
            )}
            {notifMsg && <p className="ch-err">{notifMsg}</p>}
          </div>
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
            <label>
              Email <em>(facoltativa: ti avvisiamo quando rispondiamo)</em>
              <input
                id="chat-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={120}
                placeholder="es. mario@email.it"
              />
            </label>
            <label className="ck">
              <input id="chat-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Accetto che nome, numero, email (se la scrivo) e messaggi vengano usati solo per rispondermi e avvisarmi delle risposte, come indicato nell'
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
