import React, { useEffect, useState } from 'react';
import {
  DatabaseBackup,
  ArchiveRestore,
  Images,
  Cloud,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileUp,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import {
  BACKUP_TABLES,
  BackupFile,
  CloudBackup,
  RestoreResult,
  deleteCloudBackup,
  downloadBlob,
  downloadCloudBackup,
  getLastBackupDate,
  listCloudBackups,
  parseBackup,
  restoreDatabase,
  restoreImagesFromZips,
  runFullDatabaseBackup,
  runImagesBackup,
  countImageFiles,
} from '../services/backup';

const card = 'bg-[#0d1420] border border-[#1c2433] rounded-2xl p-4 sm:p-5 space-y-3';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold';
const btnSecondary =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#121c2e] border border-[#1c2433] hover:border-indigo-500/50 disabled:opacity-40 text-slate-200 text-xs font-semibold';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Giorni dall'ultimo backup (null = mai fatto) */
export const daysSinceLastBackup = () => {
  const d = getLastBackupDate();
  return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null;
};

export const BackupPanel: React.FC = () => {
  const { refreshFromCloud } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null); // cosa sta facendo
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [cloud, setCloud] = useState<CloudBackup[]>([]);
  const [cloudError, setCloudError] = useState('');
  const [lastDays, setLastDays] = useState(daysSinceLastBackup());
  const [imageInfo, setImageInfo] = useState<{ count: number; bytes: number } | null>(null);

  // Ripristino database
  const [loaded, setLoaded] = useState<{ name: string; data: BackupFile } | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [results, setResults] = useState<RestoreResult[] | null>(null);

  // Ripristino immagini
  const [zipFiles, setZipFiles] = useState<File[]>([]);
  const [confirmImages, setConfirmImages] = useState('');

  const reloadCloud = async () => {
    const res = await listCloudBackups();
    setCloud(res.items);
    setCloudError(res.error || '');
    setLastDays(daysSinceLastBackup());
  };

  useEffect(() => {
    reloadCloud();
  }, []);

  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    setMessage(null);
    setProgress('');
    try {
      await fn();
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || String(e) });
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  // ---------- azioni ----------
  const doDatabaseBackup = () =>
    run('db', async () => {
      const r = await runFullDatabaseBackup(setProgress);
      const tot = Object.values(r.backup.counts).reduce((a, b) => a + b, 0);
      setMessage({
        type: r.cloudError ? 'err' : 'ok',
        text: r.cloudError
          ? `Backup scaricato sul dispositivo (${tot} elementi), ma la copia nel cloud non è riuscita: ${r.cloudError}. Esegui lo script supabase/backup_ripristino.sql.`
          : `Backup completato: ${tot} elementi salvati. File scaricato (${r.fileName}) e copia salvata nel cloud.`,
      });
      await reloadCloud();
    });

  const doCountImages = () =>
    run('count', async () => {
      const files = await countImageFiles(setProgress);
      setImageInfo({ count: files.length, bytes: files.reduce((a, f) => a + (f.size || 0), 0) });
    });

  const doImagesBackup = () =>
    run('img', async () => {
      const r = await runImagesBackup(setProgress);
      setMessage({
        type: r.failed ? 'err' : 'ok',
        text:
          r.files === 0
            ? 'Non ci sono immagini da salvare.'
            : `Backup immagini completato: ${r.files} immagini in ${r.parts} file zip scaricati${r.failed ? ` (${r.failed} non scaricabili)` : ''}.`,
      });
    });

  const openBackupText = (name: string, text: string) => {
    const data = parseBackup(text);
    setLoaded({ name, data });
    setSelectedTables(BACKUP_TABLES.filter((t) => t.restorable && (data.tables[t.name] || []).length > 0).map((t) => t.name));
    setConfirmText('');
    setResults(null);
  };

  const onPickBackupFile = (f: File | undefined) => {
    if (!f) return;
    run('read', async () => {
      openBackupText(f.name, await f.text());
    });
  };

  const useCloudBackup = (b: CloudBackup) =>
    run('read', async () => {
      const blob = await downloadCloudBackup(b.path);
      openBackupText(b.name, await blob.text());
      document.getElementById('restore-db-card')?.scrollIntoView({ behavior: 'smooth' });
    });

  const downloadFromCloud = (b: CloudBackup) =>
    run('read', async () => {
      downloadBlob(await downloadCloudBackup(b.path), b.name);
    });

  const removeFromCloud = (b: CloudBackup) => {
    if (!confirm(`Eliminare dal cloud il backup "${b.name}"?`)) return;
    run('del', async () => {
      await deleteCloudBackup(b.path);
      await reloadCloud();
    });
  };

  const doRestore = () => {
    if (!loaded || confirmText.trim().toUpperCase() !== 'RIPRISTINA' || selectedTables.length === 0) return;
    run('restore', async () => {
      // 1) backup di sicurezza della situazione attuale
      setProgress('Backup di sicurezza della situazione attuale…');
      await runFullDatabaseBackup(setProgress, 'backup-aurora-prima-del-ripristino');
      // 2) ripristino
      const r = await restoreDatabase(loaded.data, selectedTables, setProgress);
      setResults(r);
      setProgress('Aggiorno i dati dell\'app…');
      await refreshFromCloud();
      const errs = r.filter((x) => x.errors.length).length;
      setMessage({
        type: errs ? 'err' : 'ok',
        text: errs
          ? 'Ripristino completato con alcuni errori: guarda il riepilogo qui sotto.'
          : 'Ripristino completato. Prima del ripristino è stato salvato anche un backup di sicurezza.',
      });
      setConfirmText('');
      await reloadCloud();
    });
  };

  const doRestoreImages = () => {
    if (zipFiles.length === 0 || confirmImages.trim().toUpperCase() !== 'RIPRISTINA') return;
    run('restoreImg', async () => {
      const r = await restoreImagesFromZips(zipFiles, setProgress);
      setMessage({
        type: r.failed ? 'err' : 'ok',
        text: `Ripristino immagini completato: ${r.restored} immagini rimesse al loro posto${r.failed ? `, ${r.failed} non riuscite` : ''}.`,
      });
      setZipFiles([]);
      setConfirmImages('');
    });
  };

  const disabled = !!busy;

  return (
    <div className="p-4 sm:p-6 space-y-5 text-left text-sm">
      {/* Stato */}
      <div
        className={`rounded-2xl border p-4 flex items-start gap-3 ${
          lastDays === null || lastDays > 7 ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
        }`}
      >
        {lastDays === null || lastDays > 7 ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-white font-semibold">
            {lastDays === null
              ? 'Non hai ancora fatto nessun backup.'
              : lastDays === 0
              ? 'Ultimo backup: oggi.'
              : `Ultimo backup: ${lastDays} giorn${lastDays === 1 ? 'o' : 'i'} fa.`}
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            Consiglio: un backup del database ogni settimana e prima di ogni modifica importante; il backup delle immagini una
            volta al mese. Conserva i file scaricati anche su Google Drive o su una chiavetta.
          </p>
        </div>
      </div>

      {(busy || progress) && (
        <p className="text-xs text-sky-300 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {progress || 'Attendi…'} — non chiudere questa pagina.
        </p>
      )}
      {message && (
        <p className={`text-sm rounded-xl px-3 py-2 ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Backup database */}
        <div className={card}>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4 text-indigo-300" /> Backup del database
          </h3>
          <p className="text-xs text-slate-400">
            Salva prodotti, prezzi e giacenze, categorie, sottocategorie e marche, ordini, profili clienti, offerte a tempo,
            volantini, personalizzazioni e impostazioni. Il file viene scaricato sul dispositivo e una copia resta nel cloud.
          </p>
          <button type="button" onClick={doDatabaseBackup} disabled={disabled} className={btnPrimary}>
            {busy === 'db' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Crea backup ora
          </button>
        </div>

        {/* Backup immagini */}
        <div className={card}>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Images className="w-4 h-4 text-indigo-300" /> Backup delle immagini
          </h3>
          <p className="text-xs text-slate-400">
            Scarica tutte le foto dei prodotti, delle categorie, dei volantini e i loghi delle personalizzazioni in file .zip
            (più parti da circa 150 MB se sono tante). Meglio farlo dal computer.
          </p>
          {imageInfo && (
            <p className="text-xs text-slate-300">
              Immagini presenti: <b>{imageInfo.count}</b> (circa {fmtSize(imageInfo.bytes)}).
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={doImagesBackup} disabled={disabled} className={btnPrimary}>
              {busy === 'img' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Scarica backup immagini
            </button>
            <button type="button" onClick={doCountImages} disabled={disabled} className={btnSecondary}>
              Quante sono?
            </button>
          </div>
        </div>
      </div>

      {/* Backup nel cloud */}
      <div className={card}>
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Cloud className="w-4 h-4 text-indigo-300" /> Backup del database salvati nel cloud ({cloud.length})
        </h3>
        {cloudError && (
          <p className="text-xs text-amber-300">
            Elenco non disponibile ({cloudError}). Se è la prima volta, esegui su Supabase lo script supabase/backup_ripristino.sql.
          </p>
        )}
        {!cloudError && cloud.length === 0 && <p className="text-xs text-slate-500">Nessun backup nel cloud.</p>}
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {cloud.map((b) => (
            <div key={b.path} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#0a111d] border border-[#1c2433] rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-semibold truncate">{b.name}</p>
                <p className="text-[11px] text-slate-500">
                  {fmtDate(b.createdAt)}
                  {b.size ? ` · ${fmtSize(b.size)}` : ''}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button type="button" onClick={() => downloadFromCloud(b)} disabled={disabled} className={btnSecondary}>
                  <Download className="w-3.5 h-3.5" /> Scarica
                </button>
                <button type="button" onClick={() => useCloudBackup(b)} disabled={disabled} className={btnSecondary}>
                  <ArchiveRestore className="w-3.5 h-3.5" /> Ripristina
                </button>
                <button
                  type="button"
                  onClick={() => removeFromCloud(b)}
                  disabled={disabled}
                  className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-40"
                  title="Elimina dal cloud"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ripristino database */}
      <div id="restore-db-card" className={card}>
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ArchiveRestore className="w-4 h-4 text-indigo-300" /> Ripristino del database
        </h3>
        <p className="text-xs text-slate-400">
          Rimette i dati del backup: quelli presenti nel backup vengono riportati com'erano, quelli aggiunti dopo restano. Prima
          di iniziare l'app salva da sola un backup di sicurezza della situazione attuale.
        </p>
        <label className={`${btnSecondary} cursor-pointer w-fit`}>
          <FileUp className="w-3.5 h-3.5" /> Scegli un file di backup (.json)
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              onPickBackupFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {loaded && (
          <div className="space-y-3 border-t border-[#1c2433] pt-3">
            <p className="text-xs text-slate-300">
              Backup <b className="text-white">{loaded.name}</b> del <b className="text-white">{fmtDate(loaded.data.createdAt)}</b>.
              Scegli cosa ripristinare:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {BACKUP_TABLES.map((t) => {
                const n = (loaded.data.tables[t.name] || []).length;
                return (
                  <label
                    key={t.name}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 border border-[#1c2433] bg-[#0a111d] ${
                      t.restorable && n > 0 ? 'cursor-pointer' : 'opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-indigo-500"
                      disabled={!t.restorable || n === 0}
                      checked={selectedTables.includes(t.name)}
                      onChange={(e) =>
                        setSelectedTables((prev) => (e.target.checked ? [...prev, t.name] : prev.filter((x) => x !== t.name)))
                      }
                    />
                    <span className="flex-1 text-xs text-white">{t.label}</span>
                    <span className="text-[11px] text-slate-400">{n}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Scrivi RIPRISTINA per confermare"
                className="flex-1 bg-[#0a111d] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={doRestore}
                disabled={disabled || confirmText.trim().toUpperCase() !== 'RIPRISTINA' || selectedTables.length === 0}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
              >
                {busy === 'restore' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
                Avvia ripristino
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-1 border-t border-[#1c2433] pt-3">
            {results.map((r) => (
              <div key={r.table} className="text-xs">
                <span className={r.errors.length ? 'text-amber-300' : 'text-emerald-300'}>
                  {r.label}: {r.restored} ripristinati
                </span>
                {r.errors.length > 0 && <span className="text-slate-400"> — errore: {r.errors[0]}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ripristino immagini */}
      <div className={card}>
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Images className="w-4 h-4 text-indigo-300" /> Ripristino delle immagini
        </h3>
        <p className="text-xs text-slate-400">
          Scegli uno o più file .zip del backup immagini: ogni foto viene rimessa al suo posto con lo stesso nome (quelle con lo
          stesso nome vengono sostituite, le altre non vengono toccate).
        </p>
        <label className={`${btnSecondary} cursor-pointer w-fit`}>
          <FileUp className="w-3.5 h-3.5" /> Scegli i file zip
          <input
            type="file"
            accept=".zip,application/zip"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              setZipFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
        </label>
        {zipFiles.length > 0 && (
          <>
            <ul className="text-xs text-slate-300 space-y-0.5">
              {zipFiles.map((f) => (
                <li key={f.name}>
                  • {f.name} ({fmtSize(f.size)})
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={confirmImages}
                onChange={(e) => setConfirmImages(e.target.value)}
                placeholder="Scrivi RIPRISTINA per confermare"
                className="flex-1 bg-[#0a111d] border border-[#1c2433] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={doRestoreImages}
                disabled={disabled || confirmImages.trim().toUpperCase() !== 'RIPRISTINA'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
              >
                {busy === 'restoreImg' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
                Ripristina immagini
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Non sono inclusi negli backup gli account di accesso e le password dei clienti (li gestisce Supabase in modo protetto) e
        il codice dell'app, che è già conservato su GitHub con tutte le versioni.
      </p>
    </div>
  );
};
