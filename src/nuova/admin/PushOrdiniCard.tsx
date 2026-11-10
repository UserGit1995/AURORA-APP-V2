import React, { useEffect, useState } from 'react';
import { Ic, vib } from '../Icona';
import { PushState, disablePush, enablePush, getPushState, sendTestPush } from '../../services/push';

/** Riquadro in Ordini: attiva sul telefono la notifica per ogni nuovo ordine. */
export const PushOrdiniCard: React.FC<{ toast: (t: string) => void }> = ({ toast }) => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  if (!state || state === 'unsupported') return null;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      toast(e?.message || 'Operazione non riuscita');
    } finally {
      setBusy(false);
      setState(await getPushState());
    }
  };

  const on = state === 'on';
  const text =
    state === 'ios-not-installed'
      ? "Su iPhone le notifiche funzionano solo dall'app sulla schermata Home: apri questa pagina in Safari, tocca Condividi → \"Aggiungi alla schermata Home\", poi apri Aurora dall'icona ed entra qui."
      : state === 'denied'
        ? 'Le notifiche sono bloccate: sul telefono vai in Impostazioni → Notifiche → Aurora e attivale.'
        : on
          ? 'Attive su questo telefono: ricevi un avviso per ogni nuovo ordine, anche ad app chiusa.'
          : 'Ricevi su questo telefono un avviso per ogni nuovo ordine, anche ad app chiusa.';

  return (
    <div className="a-card" style={{ marginBottom: 14 }}>
      <div className="a-row" style={{ borderTop: 0, alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="a-oav" aria-hidden="true"><Ic n="bell" s={18} /></span>
        <span className="a-tx" style={{ flex: '1 1 220px' }}>
          <b>Notifiche ordini sul telefono</b>
          <small style={{ whiteSpace: 'normal', overflow: 'visible', lineHeight: 1.45, marginTop: 2 }}>{text}</small>
        </span>
        {(state === 'off' || on) && (
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {on && (
              <button
                type="button"
                className="a-btn a-gh a-sm"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await sendTestPush();
                    toast(r.sent ? `Notifica di prova inviata a ${r.sent} ${r.sent === 1 ? 'telefono' : 'telefoni'}` : 'Nessun telefono ha ricevuto la prova');
                  })
                }
              >
                Prova
              </button>
            )}
            <button
              type="button"
              className={`a-btn a-sm ${on ? 'a-gh' : 'a-prim'}`}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  vib(8);
                  if (on) {
                    await disablePush();
                    toast('Notifiche disattivate su questo telefono');
                  } else {
                    await enablePush();
                    toast('Notifiche attivate');
                  }
                })
              }
            >
              {busy ? 'Attendi…' : on ? 'Disattiva' : 'Attiva notifiche'}
            </button>
          </span>
        )}
      </div>
    </div>
  );
};
