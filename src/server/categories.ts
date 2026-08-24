import { createServerFn } from '@tanstack/start';
import supabase from '../db';

// Recupera tutte le categorie
export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
});

// Aggiunge una nuova categoria
export const addCategory = createServerFn({ method: 'POST' })
  .validator((name: unknown) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Il nome della categoria è obbligatorio.');
    }
    return name.trim();
  })
  .handler(async ({ data: name }) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select();

    if (error) {
      // 23505 è il codice Postgres per violazione di vincolo UNIQUE
      if (error.code === '23505') {
        throw new Error('Questa categoria esiste già.');
      }
      throw new Error(error.message || 'Errore durante il salvataggio.');
    }

    return { success: true, category: data[0] };
  });
