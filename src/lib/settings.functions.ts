import { createServerFn } from '@tanstack/start';

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const { db } = await import('../db');
  const { data, error } = await db
    .from('settings')
    .select('*');

  if (error) throw new Error(error.message);
  return data;
});

export const updateSettings = createServerFn({ method: 'POST' })
  .validator((settings: any) => settings)
  .handler(async ({ data }) => {
    const { db } = await import('../db');
    const { data: updated, error } = await db
      .from('settings')
      .upsert(data)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, settings: updated };
  });
