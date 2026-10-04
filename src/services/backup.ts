import JSZip from 'jszip';
import { getSupabase } from './supabase';

/**
 * BACKUP E RIPRISTINO DI AURORA
 * - Database: tutte le tabelle dell'app in un unico file .json (scaricato + copia nel cloud).
 * - Immagini: tutti i file degli spazi immagini in uno o più file .zip.
 * Il ripristino AGGIUNGE o AGGIORNA i dati del backup: non cancella mai nulla.
 */

export const BACKUP_BUCKET = 'aurora-backups';
const BACKUP_FOLDER = 'database';
const LAST_BACKUP_KEY = 'aurora_last_backup';

/** Tabelle salvate, nell'ordine giusto per il ripristino (prima le "madri", poi le "figlie") */
export const BACKUP_TABLES: { name: string; label: string; key: string; restorable: boolean }[] = [
  { name: 'categories', label: 'Categorie', key: 'id', restorable: true },
  { name: 'subcategories', label: 'Sottocategorie e marche', key: 'id', restorable: true },
  { name: 'products', label: 'Prodotti', key: 'id', restorable: true },
  { name: 'profiles', label: 'Profili clienti', key: 'id', restorable: true },
  { name: 'orders', label: 'Ordini', key: 'id', restorable: true },
  { name: 'order_items', label: 'Righe degli ordini', key: 'id', restorable: true },
  { name: 'order_templates', label: 'Modelli di ordine', key: 'id', restorable: true },
  { name: 'settings', label: 'Impostazioni', key: 'key', restorable: true },
  { name: 'packaging_prices', label: 'Prezzi personalizzazione', key: 'id', restorable: true },
  { name: 'customization_requests', label: 'Richieste di personalizzazione', key: 'id', restorable: true },
  { name: 'flyers', label: 'Volantini', key: 'id', restorable: true },
  // Ruoli (chi è amministratore): salvati per riferimento, mai ripristinati per sicurezza
  { name: 'user_roles', label: 'Ruoli utenti (solo consultazione)', key: 'id', restorable: false },
];

/** Spazi file con le immagini da salvare */
export const IMAGE_BUCKETS = ['aurora-images', 'customization-logos'];

export interface BackupFile {
  app: 'aurora';
  format: 1;
  createdAt: string;
  tables: Record<string, any[]>;
  counts: Record<string, number>;
  skipped: string[];
}

export interface CloudBackup {
  name: string;
  path: string;
  createdAt: string;
  size: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const stamp = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;

const sbOrThrow = () => {
  const sb = getSupabase();
  if (!sb) throw new Error('Database non collegato');
  return sb;
};

/** Scarica sul dispositivo un file creato dall'app */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const getLastBackupDate = (): Date | null => {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
};
const setLastBackupDate = (d: Date) => {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, d.toISOString());
  } catch {
    /* niente */
  }
};

/** Legge TUTTE le righe di una tabella, a blocchi di 1000 */
async function fetchAllRows(table: string): Promise<any[]> {
  const sb = sbOrThrow();
  const out: any[] = [];
  const size = 1000;
  // ordine univoco per chiave: i blocchi da 1000 non si sovrappongono mai
  const orderKey = BACKUP_TABLES.find((t) => t.name === table)?.key || 'id';
  for (let from = 0; ; from += size) {
    const { data, error } = await sb.from(table).select('*').order(orderKey).range(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < size) break;
  }
  return out;
}

// ======================= BACKUP DATABASE =======================

export async function createDatabaseBackup(onProgress?: (msg: string) => void): Promise<BackupFile> {
  const backup: BackupFile = { app: 'aurora', format: 1, createdAt: new Date().toISOString(), tables: {}, counts: {}, skipped: [] };
  for (const t of BACKUP_TABLES) {
    onProgress?.(`Salvataggio: ${t.label}…`);
    try {
      const rows = await fetchAllRows(t.name);
      backup.tables[t.name] = rows;
      backup.counts[t.name] = rows.length;
    } catch {
      // tabella non presente o non leggibile: la segno e vado avanti
      backup.skipped.push(t.name);
    }
  }
  return backup;
}

/** Crea il backup, lo scarica sul dispositivo e ne salva una copia nel cloud */
export async function runFullDatabaseBackup(
  onProgress?: (msg: string) => void,
  prefix = 'backup-aurora'
): Promise<{ fileName: string; backup: BackupFile; cloudError?: string }> {
  const backup = await createDatabaseBackup(onProgress);
  const fileName = `${prefix}-${stamp()}.json`;
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  downloadBlob(blob, fileName);
  let cloudError: string | undefined;
  try {
    onProgress?.('Copia nel cloud…');
    const sb = sbOrThrow();
    const { error } = await sb.storage
      .from(BACKUP_BUCKET)
      .upload(`${BACKUP_FOLDER}/${fileName}`, blob, { upsert: true, contentType: 'application/json' });
    if (error) cloudError = error.message;
  } catch (e: any) {
    cloudError = e?.message || String(e);
  }
  setLastBackupDate(new Date());
  return { fileName, backup, cloudError };
}

export async function listCloudBackups(): Promise<{ items: CloudBackup[]; error?: string }> {
  try {
    const sb = sbOrThrow();
    const { data, error } = await sb.storage
      .from(BACKUP_BUCKET)
      .list(BACKUP_FOLDER, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) return { items: [], error: error.message };
    const items = (data || [])
      .filter((f: any) => f.id && f.name.endsWith('.json'))
      .map((f: any) => ({
        name: f.name,
        path: `${BACKUP_FOLDER}/${f.name}`,
        createdAt: f.created_at,
        size: f.metadata?.size || 0,
      }));
    if (items[0]) {
      const last = getLastBackupDate();
      const cloudDate = new Date(items[0].createdAt);
      if (!last || cloudDate > last) setLastBackupDate(cloudDate);
    }
    return { items };
  } catch (e: any) {
    return { items: [], error: e?.message || String(e) };
  }
}

export async function downloadCloudBackup(path: string): Promise<Blob> {
  const sb = sbOrThrow();
  const { data, error } = await sb.storage.from(BACKUP_BUCKET).download(path);
  if (error || !data) throw new Error(error?.message || 'Download non riuscito');
  return data;
}

export async function deleteCloudBackup(path: string) {
  const sb = sbOrThrow();
  const { error } = await sb.storage.from(BACKUP_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export function parseBackup(text: string): BackupFile {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un backup valido.');
  }
  if (!data || data.app !== 'aurora' || !data.tables || typeof data.tables !== 'object') {
    throw new Error('Questo file non è un backup di Aurora.');
  }
  return data as BackupFile;
}

// ======================= RIPRISTINO DATABASE =======================

/** Ordina le sottocategorie: prima quelle principali, poi le sottosezioni */
const sortSubcategories = (rows: any[]) => {
  const parentKey = rows.some((r) => 'parent_subcategory_id' in r) ? 'parent_subcategory_id' : 'parent_id';
  return [...rows].sort((a, b) => (a[parentKey] ? 1 : 0) - (b[parentKey] ? 1 : 0));
};

export interface RestoreResult {
  table: string;
  label: string;
  restored: number;
  errors: string[];
}

export async function restoreDatabase(
  backup: BackupFile,
  tables: string[],
  onProgress?: (msg: string) => void
): Promise<RestoreResult[]> {
  const sb = sbOrThrow();
  const results: RestoreResult[] = [];
  for (const t of BACKUP_TABLES) {
    if (!t.restorable || !tables.includes(t.name)) continue;
    let rows = backup.tables[t.name] || [];
    if (t.name === 'subcategories') rows = sortSubcategories(rows);
    const res: RestoreResult = { table: t.name, label: t.label, restored: 0, errors: [] };
    const size = 300;
    for (let i = 0; i < rows.length; i += size) {
      onProgress?.(`Ripristino ${t.label}: ${Math.min(i + size, rows.length)} di ${rows.length}`);
      const chunk = rows.slice(i, i + size);
      const { error } = await sb.from(t.name).upsert(chunk, { onConflict: t.key });
      if (error) {
        // se un blocco fallisce, riprovo riga per riga per salvare il salvabile
        for (const row of chunk) {
          const { error: e2 } = await sb.from(t.name).upsert(row, { onConflict: t.key });
          if (e2) {
            if (res.errors.length < 5) res.errors.push(e2.message);
          } else res.restored++;
        }
      } else {
        res.restored += chunk.length;
      }
    }
    results.push(res);
  }
  return results;
}

// ======================= BACKUP IMMAGINI =======================

interface StorageFile {
  bucket: string;
  path: string;
  size: number;
}

async function listBucketFiles(bucket: string, prefix = ''): Promise<StorageFile[]> {
  const sb = sbOrThrow();
  const out: StorageFile[] = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    for (const item of data || []) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || item.id === undefined) {
        out.push(...(await listBucketFiles(bucket, full))); // è una cartella
      } else if (item.name !== '.emptyFolderPlaceholder') {
        out.push({ bucket, path: full, size: (item as any).metadata?.size || 0 });
      }
    }
    if (!data || data.length < limit) break;
  }
  return out;
}

export async function countImageFiles(onProgress?: (msg: string) => void) {
  const all: StorageFile[] = [];
  for (const b of IMAGE_BUCKETS) {
    onProgress?.(`Conteggio immagini in ${b}…`);
    try {
      all.push(...(await listBucketFiles(b)));
    } catch {
      /* spazio non presente */
    }
  }
  return all;
}

/**
 * Scarica tutte le immagini e le mette in file .zip (più parti se sono tante,
 * così il computer o il telefono non si bloccano). Restituisce il numero di file salvati.
 */
export async function runImagesBackup(
  onProgress: (msg: string) => void,
  maxPartBytes = 150 * 1024 * 1024
): Promise<{ files: number; parts: number; failed: number }> {
  const sb = sbOrThrow();
  const files = await countImageFiles(onProgress);
  if (files.length === 0) return { files: 0, parts: 0, failed: 0 };

  const when = stamp();
  let zip = new JSZip();
  let partBytes = 0;
  let part = 1;
  let inPart: string[] = [];
  let saved = 0;
  let failed = 0;

  const flush = async () => {
    if (inPart.length === 0) return;
    zip.file('aurora-immagini-elenco.json', JSON.stringify({ app: 'aurora', type: 'images', createdAt: new Date().toISOString(), part, files: inPart }));
    onProgress(`Preparo il file zip (parte ${part})…`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    downloadBlob(blob, `backup-aurora-immagini-${when}-parte-${part}.zip`);
    part++;
    zip = new JSZip();
    partBytes = 0;
    inPart = [];
  };

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress(`Scarico immagini: ${i + 1} di ${files.length}`);
    try {
      const { data, error } = await sb.storage.from(f.bucket).download(f.path);
      if (error || !data) throw new Error('download');
      const buf = await data.arrayBuffer();
      if (partBytes + buf.byteLength > maxPartBytes && inPart.length > 0) await flush();
      zip.file(`${f.bucket}/${f.path}`, buf);
      inPart.push(`${f.bucket}/${f.path}`);
      partBytes += buf.byteLength;
      saved++;
    } catch {
      failed++;
    }
  }
  await flush();
  return { files: saved, parts: part - 1, failed };
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  avif: 'image/avif',
};

/** Rimette le immagini dei file zip di backup nei loro spazi (sovrascrive quelle con lo stesso nome) */
export async function restoreImagesFromZips(
  zips: File[],
  onProgress: (msg: string) => void
): Promise<{ restored: number; failed: number }> {
  const sb = sbOrThrow();
  let restored = 0;
  let failed = 0;
  for (let z = 0; z < zips.length; z++) {
    onProgress(`Apro il file ${z + 1} di ${zips.length}…`);
    const zip = await JSZip.loadAsync(zips[z]);
    const entries = Object.values(zip.files).filter((e) => !e.dir && e.name !== 'aurora-immagini-elenco.json');
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      onProgress(`File ${z + 1} di ${zips.length} — immagini: ${i + 1} di ${entries.length}`);
      const slash = e.name.indexOf('/');
      const bucket = e.name.slice(0, slash);
      const path = e.name.slice(slash + 1);
      if (!IMAGE_BUCKETS.includes(bucket) || !path) {
        failed++;
        continue;
      }
      try {
        const data = await e.async('blob');
        const ext = (path.split('.').pop() || '').toLowerCase();
        const { error } = await sb.storage
          .from(bucket)
          .upload(path, data, { upsert: true, contentType: MIME[ext] || 'application/octet-stream' });
        if (error) throw error;
        restored++;
      } catch {
        failed++;
      }
    }
  }
  return { restored, failed };
}
