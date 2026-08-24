import { createServerFn } from '@tanstack/start';
import db from '../db';

export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await db
    .from('categories')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
});

export const addCategory = createServerFn({ method: 'POST' })
  .validator((name: unknown) => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Il nome della categoria è obbligatorio.');
    }
    return name.trim();
  })
  .handler(async ({ data: name }) => {
    const { data, error } = await db
      .from('categories')
      .insert([{ name }])
      .select();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Questa categoria esiste già.');
      }
      throw new Error(error.message);
    }

    return { success: true, category: data[0] };
  });
