import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminGetSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { key: string }) => z.object({ key: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("settings").select("value").eq("key", data.key).maybeSingle();
    if (error) throw error;
    return { value: row?.value ?? null };
  });

export const adminSetSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { key: string; value: string }) =>
    z.object({ key: z.string().min(1).max(100), value: z.string().max(500) }).parse(i)
  )
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

// Chiave usata per l'indirizzo email a cui notificare i nuovi ordini.
export const ORDER_NOTIFICATION_EMAIL_KEY = "order_notification_email";

// Chiavi pubbliche (telefono/email/indirizzo/orari mostrati su Contatti e Footer,
// dati aziendali, condizioni di spedizione, banner annunci).
export const PUBLIC_SETTINGS_KEYS = [
  "contact_phone",
  "contact_email",
  "contact_address",
  "contact_hours",
  "company_name",
  "company_vat",
  "company_sdi",
  "min_order_amount",
  "free_shipping_threshold",
  "standard_shipping_cost",
  "announcement_banner_text",
  "announcement_banner_enabled",
] as const;

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const map: Record<string, string | null> = {};
  for (const k of PUBLIC_SETTINGS_KEYS) map[k] = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", PUBLIC_SETTINGS_KEYS as unknown as string[]);
    if (error) {
      console.warn("[settings] Impossibile leggere le impostazioni pubbliche:", error.message);
      return map;
    }
    for (const row of data ?? []) map[row.key] = row.value;
  } catch (err) {
    console.warn("[settings] Errore imprevisto leggendo le impostazioni pubbliche:", err);
  }
  return map;
});
