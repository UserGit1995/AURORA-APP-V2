import { createServerFn } from '@tanstack/start';

export const getProfile = createServerFn({ method: 'GET' })
  .validator((userId: unknown) => String(userId))
  .handler(async ({ data: userId }) => {
    const { db } = await import('../db');
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((payload: { userId: string; [key: string]: any }) => payload)
  .handler(async ({ data }) => {
    const { db } = await import('../db');
    const { userId, ...profileData } = data;
    const { data: updated, error } = await db
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, profile: updated[0] };
  });
