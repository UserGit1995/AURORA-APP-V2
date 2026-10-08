/**
 * Chat clienti dentro l'app (stile WhatsApp).
 * Il cliente scrive con nome e numero; il codice segreto della sua chat resta
 * solo su questo telefono, così vede soltanto i propri messaggi.
 * Funzioni database: supabase/chat_clienti.sql
 */
import { getSupabase } from './supabase';

export interface ChatMessage {
  id: string;
  sender: 'cliente' | 'admin';
  body: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  token: string;
  name: string;
  phone: string;
}

export interface ChatConversation {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
  unread_admin: number;
}

const KEY = 'aurora_chat_session_v1';

export function loadChatSession(): ChatSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.id && s.token ? (s as ChatSession) : null;
  } catch {
    return null;
  }
}

function saveChatSession(s: ChatSession | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* memoria del browser non disponibile: la chat funziona finché la pagina resta aperta */
  }
}

export function forgetChatSession() {
  saveChatSession(null);
}

function sb() {
  const c = getSupabase();
  if (!c) throw new Error('Servizio non disponibile, riprova tra poco');
  return c;
}

function cleanError(e: unknown): Error {
  const msg = (e as { message?: string })?.message || 'Errore di connessione, riprova';
  if (/function .* does not exist|Could not find the function/i.test(msg)) {
    return new Error('La chat non è ancora attiva: esegui lo script chat_clienti.sql su Supabase');
  }
  return new Error(msg);
}

export async function startChat(name: string, phone: string): Promise<ChatSession> {
  const { data, error } = await sb().rpc('chat_start', { p_name: name, p_phone: phone });
  if (error) throw cleanError(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error('Non è stato possibile aprire la chat');
  const s: ChatSession = { id: row.id, token: row.token, name: name.trim(), phone: phone.trim() };
  saveChatSession(s);
  return s;
}

export async function fetchChat(s: ChatSession, after?: string | null): Promise<ChatMessage[]> {
  const { data, error } = await sb().rpc('chat_get', { p_id: s.id, p_token: s.token, p_after: after ?? null });
  if (error) {
    if (/Conversazione non trovata/i.test(error.message)) forgetChatSession();
    throw cleanError(error);
  }
  return (data as ChatMessage[]) || [];
}

export async function sendChat(s: ChatSession, body: string): Promise<ChatMessage> {
  const { data, error } = await sb().rpc('chat_send', { p_id: s.id, p_token: s.token, p_body: body });
  if (error) throw cleanError(error);
  return (Array.isArray(data) ? data[0] : data) as ChatMessage;
}

export async function fetchClientUnread(s: ChatSession): Promise<number> {
  const { data, error } = await sb().rpc('chat_unread', { p_id: s.id, p_token: s.token });
  if (error) return 0;
  return Number(data) || 0;
}

// --- amministratore ---------------------------------------------------------

export async function adminListChats(): Promise<ChatConversation[]> {
  const { data, error } = await sb().rpc('chat_admin_list');
  if (error) throw cleanError(error);
  return (data as ChatConversation[]) || [];
}

export async function adminFetchChat(id: string, after?: string | null): Promise<ChatMessage[]> {
  const { data, error } = await sb().rpc('chat_admin_get', { p_id: id, p_after: after ?? null });
  if (error) throw cleanError(error);
  return (data as ChatMessage[]) || [];
}

export async function adminSendChat(id: string, body: string): Promise<ChatMessage> {
  const { data, error } = await sb().rpc('chat_admin_send', { p_id: id, p_body: body });
  if (error) throw cleanError(error);
  return (Array.isArray(data) ? data[0] : data) as ChatMessage;
}

export async function adminUnreadCount(): Promise<number> {
  const { data, error } = await sb().rpc('chat_admin_unread');
  if (error) return 0;
  return Number(data) || 0;
}

export async function adminDeleteChat(id: string): Promise<void> {
  const { error } = await sb().rpc('chat_admin_delete', { p_id: id });
  if (error) throw cleanError(error);
}

// --- utilità per la grafica -------------------------------------------------

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatChatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Oggi';
  if (d.toDateString() === y.toDateString()) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Unisce messaggi nuovi a quelli già mostrati, senza doppioni, in ordine di tempo. */
export function mergeMessages(prev: ChatMessage[], add: ChatMessage[]): ChatMessage[] {
  if (add.length === 0) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const next = [...prev, ...add.filter((m) => !seen.has(m.id))];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return next;
}
