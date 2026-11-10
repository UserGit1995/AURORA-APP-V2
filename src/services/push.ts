/**
 * Notifiche sul telefono (iPhone/Android) per ogni nuovo ordine.
 * Il telefono si registra dal pannello admin -> Ordini -> "Attiva notifiche".
 * La registrazione viene salvata nella tabella push_subscriptions (solo admin).
 * Sul server (api/send-order.ts) servono VAPID_PRIVATE_KEY e SUPABASE_SERVICE_ROLE_KEY.
 */
import { getSupabase } from './supabase';

/** Chiave pubblica (non segreta): deve essere la stessa scritta in api/send-order.ts */
export const VAPID_PUBLIC_KEY = 'BI6U5HZj2mN0LJt9SKqyOdonqSUcUUlzKpLGJoeWzT6W-qRT78k9eHny3BiBpv0l9f-t6tS6tbioao13hzwCJ9Q';

export type PushState =
  | 'unsupported' // browser senza notifiche push
  | 'ios-not-installed' // iPhone: serve aprire Aurora dall'icona sulla schermata Home
  | 'denied' // permesso negato nelle impostazioni del telefono
  | 'off' // si può attivare
  | 'on'; // attive su questo telefono

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;

function keyToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export async function getPushState(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIos() && !isStandalone() ? 'ios-not-installed' : 'unsupported';
  if (isIos() && !isStandalone()) return 'ios-not-installed';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'PC Windows';
  return 'Dispositivo';
}

/** Chiede il permesso e registra questo telefono. Va chiamata dal tocco su un pulsante. */
export async function enablePush(): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permesso notifiche non concesso.');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as BufferSource });
    } catch {
      throw new Error('Il telefono non ha accettato la registrazione: controlla che le notifiche di Aurora siano consentite e riprova.');
    }
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Registrazione del telefono non riuscita.');
  const sb = getSupabase();
  if (!sb) throw new Error('Database non disponibile.');
  const { data } = await sb.auth.getUser();
  const { error } = await sb.from('push_subscriptions').upsert(
    { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_id: data.user?.id ?? null, device: deviceName() },
    { onConflict: 'endpoint' }
  );
  if (error) {
    throw new Error(
      /push_subscriptions|relation|schema cache/i.test(error.message)
        ? 'Manca la tabella delle notifiche: esegui lo script SQL su Supabase.'
        : 'Salvataggio non riuscito: ' + error.message
    );
  }
}

/** Disattiva le notifiche su questo telefono. */
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return;
  const sb = getSupabase();
  if (sb) await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Manda una notifica di prova a tutti i telefoni registrati. */
export async function sendTestPush(): Promise<{ sent: number; failed: number }> {
  const sb = getSupabase();
  const token = sb ? (await sb.auth.getSession()).data.session?.access_token : undefined;
  const r = await fetch('/api/send-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'push-test', accessToken: token || '' }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 503) throw new Error('Su Vercel mancano VAPID_PRIVATE_KEY o SUPABASE_SERVICE_ROLE_KEY.');
  if (r.status === 403) throw new Error('Devi essere entrato come amministratore.');
  if (!r.ok) throw new Error('Invio non riuscito.');
  return { sent: Number(j.sent) || 0, failed: Number(j.failed) || 0 };
}
