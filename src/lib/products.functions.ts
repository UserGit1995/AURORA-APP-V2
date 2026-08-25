import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VsQKGL806R1Jkh9Q70zMLQ_BPiUa4g";
  const url = process.env.SUPABASE_URL || "https://hkpqvggvqzvpkzeqmtga.supabase.co";
  return createClient<Database>(url, key, {
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

// Non lasciamo mai che un problema di connessione a Supabase (chiave scaduta,
// tabella mancante, rete) faccia cadere l'intera pagina: logghiamo e torniamo
// un valore vuoto, così il sito resta visitabile.
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[products] Errore recuperando dati pubblici:", err);
    return fallback;
  }
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () =>
  safe([] as any[], async () => {
    const c = publicClient();
    const { data, error } = await c.from("categories").select("*").eq("active", true).order("sort_order");
    if (error) throw error;
    return data ?? [];
  })
);

export const listSubcategories = createServerFn({ method: "GET" })
  .inputValidator((i: { categorySlug?: string } = {}) => z.object({ categorySlug: z.string().optional() }).parse(i))
  .handler(async ({ data }) =>
    safe([] as any[], async () => {
      const c = publicClient();
      let query = c.from("subcategories").select("*, categories!inner(slug)").eq("active", true);
      if (data.categorySlug) query = query.eq("categories.slug", data.categorySlug);
      const { data: rows, error } = await query.order("sort_order");
      if (error) throw error;
      return rows ?? [];
    })
  );

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((i: { categorySlug?: string; subcategorySlug?: string; featured?: boolean; onOffer?: boolean; isNew?: boolean; q?: string } = {}) =>
    z.object({
      categorySlug: z.string().optional(),
      subcategorySlug: z.string().optional(),
      featured: z.boolean().optional(),
      onOffer: z.boolean().optional(),
      isNew: z.boolean().optional(),
      q: z.string().optional(),
    }).parse(i))
  .handler(async ({ data }) =>
    safe([] as any[], async () => {
      const c = publicClient();
      let query = c
        .from("products")
        .select("*, categories(slug, name), subcategories(slug, name)")
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
      if (data.subcategorySlug) {
        filtered = filtered.filter((p: any) => p.subcategories?.slug === data.subcategorySlug);
      }
      return filtered;
    })
  );

export const listCategoryCounts = createServerFn({ method: "GET" }).handler(async () =>
  safe({} as Record<string, number>, async () => {
    const c = publicClient();
    const { data, error } = await c.from("products").select("category_id").eq("active", true);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (!row.category_id) continue;
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
    }
    return counts;
  })
);

export const listBestsellers = createServerFn({ method: "GET" }).handler(async () =>
  safe([] as any[], async () => {
    const c = publicClient();
    const { data: itemRows, error: iErr } = await c.from("order_items").select("product_id, quantity");
    if (iErr) throw iErr;
    const totals: Record<string, number> = {};
    for (const row of itemRows ?? []) {
      if (!row.product_id) continue;
      totals[row.product_id] = (totals[row.product_id] ?? 0) + row.quantity;
    }
    const topIds = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([id]) => id);
    if (topIds.length === 0) return [];
    const { data: products, error: pErr } = await c
      .from("products")
      .select("*, categories(name, slug)")
      .in("id", topIds)
      .eq("active", true);
    if (pErr) throw pErr;
    const order = new Map(topIds.map((id, i) => [id, i]));
    return (products ?? []).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  })
);

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) =>
    safe(null as any, async () => {
      const c = publicClient();
      const { data: row, error } = await c.from("products").select("*, categories(slug, name)").eq("id", data.id).maybeSingle();
      if (error) throw error;
      return row;
    })
  );
