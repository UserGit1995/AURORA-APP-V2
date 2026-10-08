import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send, Check, Loader2 } from 'lucide-react';
import { ChatMessage, formatChatDay, formatChatTime } from '../../services/chat';

/** Colori della chat: stessa grafica dell'app Aurora (blu notte + azzurro) */
export const WA = {
  bg: '#0a111e',
  bar: '#0e1b30',
  mine: '#0284c7',
  theirs: '#16223a',
  text: '#e2e8f0',
  muted: '#94a3b8',
  green: '#0ea5e9',      // colore principale (pulsanti, accenti)
  input: '#16223a',
  chip: '#122038',
  avatar: '#1e3a5f',
  list: '#0b1424',
  note: '#7dd3fc',
};

// sfondo della chat = sfondo dell'app con il cigno, scurito per leggere bene i messaggi
const WALLPAPER = "linear-gradient(rgba(10,17,30,0.55), rgba(10,17,30,0.55)), url('/sfondi/sfondo-a.svg')";

interface Props {
  messages: ChatMessage[];
  /** chi sta usando questa schermata: i suoi messaggi vanno a destra in verde */
  me: 'cliente' | 'admin';
  onSend: (text: string) => Promise<void>;
  header: React.ReactNode;
  /** messaggio di benvenuto mostrato in alto (non salvato) */
  intro?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  placeholder?: string;
}

export const ChatThread: React.FC<Props> = ({ messages, me, onSend, header, intro, loading, error, placeholder }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(0);

  // scorre in fondo quando arrivano messaggi nuovi
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (messages.length !== lastCount.current) {
      el.scrollTop = el.scrollHeight;
      lastCount.current = messages.length;
    }
  }, [messages.length]);

  // la casella di testo cresce fino a 5 righe
  useEffect(() => {
    const t = inputRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
  }, [text]);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(body);
      setText('');
    } catch (e) {
      setSendError((e as Error).message || 'Messaggio non inviato, riprova');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  let lastDay = '';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: WA.bg }}>
      <div className="shrink-0 border-b border-[#1c2433]" style={{ background: WA.bar }}>{header}</div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-3 space-y-1"
        style={{ backgroundImage: WALLPAPER, backgroundSize: 'cover', backgroundPosition: 'right bottom', backgroundAttachment: 'local' }}
      >
        {intro && (
          <div className="flex justify-center my-2">
            <div className="max-w-[90%] text-center text-[12px] leading-snug rounded-lg px-3 py-2" style={{ background: WA.chip, color: WA.note, border: '1px solid rgba(14,165,233,0.25)' }}>
              {intro}
            </div>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex justify-center py-6" style={{ color: WA.muted }}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {messages.map((m) => {
          const day = formatChatDay(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender === me;
          return (
            <React.Fragment key={m.id}>
              {showDay && (
                <div className="flex justify-center py-2">
                  <span className="text-[11px] font-medium rounded-md px-2.5 py-1" style={{ background: WA.chip, color: WA.muted }}>
                    {day}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`relative max-w-[82%] sm:max-w-[65%] rounded-lg px-2.5 pt-1.5 pb-1 shadow-sm ${mine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                  style={{ background: mine ? WA.mine : WA.theirs, color: WA.text }}
                >
                  <p className="text-[14px] leading-[1.35] whitespace-pre-wrap break-words pr-12">{m.body}</p>
                  <span className="absolute right-2 bottom-1 flex items-center gap-0.5 text-[10.5px]" style={{ color: mine ? '#cfe8f7' : WA.muted }}>
                    {formatChatTime(m.created_at)}
                    {mine && <Check className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {error && (
          <div className="flex justify-center py-2">
            <span className="text-[12px] rounded-md px-3 py-1.5 bg-rose-500/15 text-rose-300">{error}</span>
          </div>
        )}
      </div>

      <div className="shrink-0 px-2 sm:px-3 py-2 border-t border-[#1c2433]" style={{ background: WA.bar }}>
        {sendError && <p className="text-[11px] text-rose-300 px-2 pb-1">{sendError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            id={`chat-input-${me}`}
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder || 'Scrivi un messaggio'}
            className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-[15px] outline-none placeholder:text-slate-500"
            style={{ background: WA.input, color: WA.text, border: '1px solid #1c2433' }}
          />
          <button
            id={`chat-send-${me}`}
            type="button"
            onClick={submit}
            disabled={!text.trim() || sending}
            aria-label="Invia"
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-50"
            style={{ background: WA.green }}
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-0.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
