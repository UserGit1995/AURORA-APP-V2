import { createServerFn } from '@tanstack/start';
import db from '../db';

// Funzione per recuperare tutte le categorie
export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const stmt = db.prepare('SELECT * FROM categories ORDER BY id DESC');
  return stmt.all();
});

// Funzione per salvare una nuova categoria
export const addCategory = createServerFn({ method: 'POST' })
  .validator((name: unknown) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Il nome della categoria è obbligatorio.');
    }
    return name.trim();
  })
  .handler(async ({ data: name }) => {
    try {
      const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
      const info = stmt.run(name);
      return { success: true, id: info.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Questa categoria esiste già.');
      }
      throw new Error('Errore durante il salvataggio.');
    }
  });