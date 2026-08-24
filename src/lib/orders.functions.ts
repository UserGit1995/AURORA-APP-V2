import { createServerFn } from '@tanstack/start';
import db from '../db';

export const getOrders = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
});

export const createOrder = createServerFn({ method: 'POST' })
  .validator((orderData: any) => orderData)
  .handler(async ({ data }) => {
    const { data: created, error } = await db
      .from('orders')
      .insert([data])
      .select();

    if (error) throw new Error(error.message);
    return { success: true, order: created[0] };
  });

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .validator((payload: { id: number; status: string }) => payload)
  .handler(async ({ data }) => {
    const { data: updated, error } = await db
      .from('orders')
      .update({ status: data.status })
      .eq('id', data.id)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, order: updated[0] };
  });
