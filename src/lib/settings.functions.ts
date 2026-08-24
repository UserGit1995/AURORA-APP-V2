import { createServerFn } from '@tanstack/start';
import db from '../db.server';

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await db
    .from('settings')
    .select('*');

  if (error) throw new Error(error.message);
  return data;
});

export const updateSettings = createServerFn({ method: 'POST' })
  .validator((settings: any) => settings)
  .handler(async ({ data }) => {
    const { data: updated, error } = await db
      .from('settings')
      .upsert(data)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, settings: updated };
  });
