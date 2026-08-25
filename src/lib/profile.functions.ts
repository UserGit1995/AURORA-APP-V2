import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().max(150).optional().nullable(),
  company: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  piva: z.string().trim().max(20).optional().nullable(),
  sdi: z.string().trim().max(10).optional().nullable(),
  pec: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  postal_code: z.string().trim().max(10).optional().nullable(),
  province: z.string().trim().max(60).optional().nullable(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => profileSchema.parse(i))
  .handler(async ({ context, data }) => {
    const clean = { ...data, pec: data.pec || null };
    const { error } = await context.supabase.from("profiles").update(clean).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
