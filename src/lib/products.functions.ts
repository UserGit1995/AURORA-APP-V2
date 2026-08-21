import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const c = publicClient();
  const { data, error } = await c.from("categories").select("*").eq("active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((i: { categorySlug?: string; featured?: boolean; onOffer?: boolean; isNew?: boolean; q?: string } = {}) =>
    z.object({
      categorySlug: z.string().optional(),
      featured: z.boolean().optional(),
      onOffer: z.boolean().optional(),
      isNew: z.boolean().optional(),
      q: z.string().optional(),
    }).parse(i))
  .handler(async ({ data }) => {
    const c = publicClient();
    let query = c
      .from("products")
      .select("*, categories(slug, name)")
      .eq("active", true);
    if (data.featured) query = query.eq("is_featured", true);
    if (data.onOffer) query = query.eq("is_on_offer", true);
    if (data.isNew) query = query.eq("is_new", true);
    if (data.q) query = query.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    let filtered = rows ?? [];
    if (data.categorySlug) {
      filtered = filtered.filter((p: any) => p.categories?.slug === data.categorySlug);
    }
    return filtered;
  });

export const listCategoryCounts = createServerFn({ method: "GET" }).handler(async () => {
  const c = publicClient();
  const { data, error } = await c.from("products").select("category_id").eq("active", true);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.category_id) continue;
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const c = publicClient();
    const { data: row, error } = await c.from("products").select("*, categories(slug, name)").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });