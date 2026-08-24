import { createServerFn } from '@tanstack/start';
import { db } from '../db';

export const getProducts = createServerFn({ method: 'GET' }).handler(async () => {
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
});

export const getProductById = createServerFn({ method: 'GET' })
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id }) => {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const addProduct = createServerFn({ method: 'POST' })
  .validator((productData: any) => productData)
  .handler(async ({ data }) => {
    const { data: inserted, error } = await db
      .from('products')
      .insert([data])
      .select();

    if (error) throw new Error(error.message);
    return { success: true, product: inserted[0] };
  });

export const updateProduct = createServerFn({ method: 'POST' })
  .validator((payload: { id: number; [key: string]: any }) => payload)
  .handler(async ({ data }) => {
    const { id, ...fieldsToUpdate } = data;
    const { data: updated, error } = await db
      .from('products')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return { success: true, product: updated[0] };
  });

export const deleteProduct = createServerFn({ method: 'POST' })
  .validator((id: unknown) => Number(id))
  .handler(async ({ data: id }) => {
    const { error } = await db
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  });
