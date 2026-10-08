import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Phone, Search, Trash2, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import {
  ChatConversation, ChatMessage, adminDeleteChat, adminFetchChat, adminListChats, adminSendChat,
  formatChatDay, formatChatTime, mergeMessages,
} from '../../services/chat';
import { ChatThread, WA } from './ChatThread';

const LIST_POLL_MS = 6000;
const THREAD_POLL_MS = 4000;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

function waLink(phone: string) {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length <= 10 && !d.startsWith('39')) d = '39' + d;
  return `https://wa.me/${d}`;
}

/** Pannello admin: tutte le chat dei clienti, con risposta dall'app. */
export const ChatAdminPanel: React.FC<{ onUnreadChange?: (n: number) => void }> = ({ onUnreadChange }) => {
  const [list, setList] = useState<ChatConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const rows = await adminListChats();
      setList(rows);
      setListError(null);
      onUnreadChange?.(rows.reduce((s, r) => s + (r.unread_admin || 0), 0));
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    loadList();
    const t = window.setInterval(() => document.visibilityState === 'visible' && loadList(), LIST_POLL_MS);
    return () => window.clearInterval(t);
  }, [loadList]);

  const lastAt = useRef<string | null>(null);
  lastAt.current = messages.length ? messages[messages.length - 1].created_at : null;

  const loadThread = useCallback(async (id: string, full: boolean) => {
    try {
      const add = await adminFetchChat(id, full ? null : lastAt.current);
      setMessages((prev) => (full ? add : mergeMessages(prev, add)));
      setThreadError(null);
      if (add.length) setList((prev) => prev.map((c) => (c.id === id ? { ...c, unread_admin: 0 } : c)));
    } catch (e) {
      setThreadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!openId) return;
    let alive = true;
    setMessages([]);
    setThreadLoading(true);
    loadThread(openId, true).finally(() => alive && setThreadLoading(false));
    const t = window.setInterval(() => document.visibilityState === 'visible' && loadThread(openId, false), THREAD_POLL_MS);
    return () => { alive = false; window.clearInterval(t); };
  }, [openId, loadThread]);

  const open = list.find((c) => c.id === openId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    const qd = q.replace(/\D/g, '');
    return list.filter((c) => c.name.toLowerCase().includes(q) || (qd && c.phone.replace(/\D/g, '').includes(qd)));
  }, [list, query]);

  const onSend = async (text: string) => {
    if (!openId) return;
    const m = await adminSendChat(openId, text);
    setMessages((prev) => mergeMessages(prev, [m]));
    setList((prev) => prev.map((c) => (c.id === openId ? { ...c, last_message: text, last_message_at: m.created_at } : c)));
  };

  const onDelete = async () => {
    if (!open) return;
    if (!window.confirm(`Eliminare definitivamente la chat con ${open.name}? I messaggi spariranno anche dal telefono del cliente.`)) return;
    try {
      await adminDeleteChat(open.id);
      setOpenId(null);
      setList((prev) => prev.filter((c) => c.id !== open.id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const header = open && (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <button onClick={() => setOpenId(null)} aria-label="Torna all'elenco" className="lg:hidden p-1.5 -ml-1 rounded-full hover:bg-white/5" style={{ color: WA.text }}>
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: WA.avatar, color: '#7dd3fc' }}>
        {initials(open.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold truncate" style={{ color: WA.text }}>{open.name}</p>
        <p className="text-[12px] truncate" style={{ color: WA.muted }}>{open.phone}</p>
      </div>
      <a href={`tel:${open.phone}`} title="Chiama" className="p-2 rounded-full hover:bg-white/5" style={{ color: WA.muted }}>
        <Phone className="w-5 h-5" />
      </a>
      <a href={waLink(open.phone)} target="_blank" rel="noopener noreferrer" title="Apri sul tuo WhatsApp" className="p-2 rounded-full hover:bg-white/5" style={{ color: WA.green }}>
        <MessageCircle className="w-5 h-5" />
      </a>
      <button onClick={onDelete} title="Elimina chat" className="p-2 rounded-full hover:bg-white/5 text-rose-300">
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-220px)] min-h-[480px] rounded-2xl overflow-hidden border border-[#1c2433] flex" style={{ background: WA.bg }}>
      {/* Elenco chat */}
      <div className={`${openId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[340px] shrink-0 flex-col border-r border-white/5`} style={{ background: WA.list }}>
        <div className="px-3 py-3 flex items-center gap-2" style={{ background: WA.bar }}>
          <div className="flex-1 flex items-center gap-2 rounded-lg px-3" style={{ background: WA.input, border: '1px solid #1c2433' }}>
            <Search className="w-4 h-4" style={{ color: WA.muted }} />
            <input
              id="chat-admin-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca nome o numero"
              className="flex-1 bg-transparent py-2 text-[14px] outline-none placeholder:text-slate-500"
              style={{ color: WA.text }}
            />
          </div>
          <button onClick={loadList} title="Aggiorna" className="p-2 rounded-full hover:bg-white/5" style={{ color: WA.muted }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading && (
            <div className="flex justify-center py-8" style={{ color: WA.muted }}><Loader2 className="w-5 h-5 animate-spin" /></div>
          )}
          {listError && <p className="m-3 text-[12px] rounded-lg px-3 py-2 bg-rose-500/15 text-rose-300">{listError}</p>}
          {!listLoading && !listError && filtered.length === 0 && (
            <p className="text-center text-[13px] py-10 px-6" style={{ color: WA.muted }}>
              {list.length === 0 ? 'Nessun messaggio dai clienti per ora.' : 'Nessuna chat trovata.'}
            </p>
          )}
          {filtered.map((c) => {
            const active = c.id === openId;
            const day = formatChatDay(c.last_message_at);
            return (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 border-b border-white/5 hover:bg-white/[0.03]"
                style={{ background: active ? '#16223a' : undefined }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: WA.avatar, color: '#7dd3fc' }}>
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[15px] truncate" style={{ color: WA.text }}>{c.name}</p>
                    <span className="text-[11px] shrink-0" style={{ color: c.unread_admin ? WA.green : WA.muted }}>
                      {day === 'Oggi' ? formatChatTime(c.last_message_at) : day}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[13px] truncate" style={{ color: WA.muted }}>{c.last_message || c.phone}</p>
                    {c.unread_admin > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: WA.green, color: '#ffffff' }}>
                        {c.unread_admin}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversazione aperta */}
      <div className={`${openId ? 'flex' : 'hidden lg:flex'} flex-1 min-w-0 flex-col`}>
        {open ? (
          <ChatThread
            me="admin"
            messages={messages}
            onSend={onSend}
            header={header}
            loading={threadLoading}
            error={threadError}
            placeholder="Scrivi la risposta al cliente"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ color: WA.muted }}>
            <MessageCircle className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-[15px]" style={{ color: WA.text }}>Chat clienti</p>
            <p className="text-[13px] mt-1 max-w-sm">Scegli una conversazione a sinistra per leggere i messaggi e rispondere. Il cliente vede la risposta nella sua app.</p>
          </div>
        )}
      </div>
    </div>
  );
};
