import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [orders, products, users, recent] = await Promise.all([
      supabaseAdmin.from("orders").select("id, total, created_at, status"),
      supabaseAdmin.from("products").select("id").eq("active", true),
      supabaseAdmin.from("profiles").select("id"),
      supabaseAdmin.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(10),
    ]);
    const ordersData = orders.data ?? [];
    const totalRevenue = ordersData.reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      totalOrders: ordersData.length,
      totalRevenue,
      totalProducts: products.data?.length ?? 0,
      totalUsers: users.data?.length ?? 0,
      recentOrders: recent.data ?? [],
    };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["nuovo","in_lavorazione","evaso","annullato"]) }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("products").select("*, categories(name)").order("created_at", { ascending: false });
    return data ?? [];
  });

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  price: z.number().min(0),
  discount_price: z.number().min(0).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  sku: z.string().max(60).optional().nullable(),
  in_stock: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  is_on_offer: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => productSchema.parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await context.supabase.from("products").update(rest).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("products").insert(data as any);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
    image_url: z.string().url().optional().nullable(),
    sort_order: z.number().int().optional(),
    active: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await context.supabase.from("categories").update(rest).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("categories").insert(data as any);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, phone, company, created_at").order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(["admin","user"]), grant: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    return { ok: true };
  });