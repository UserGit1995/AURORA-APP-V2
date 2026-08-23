import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const itemSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(9999) });

export const listMyTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("order_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(300).optional(),
        items: z.array(itemSchema).min(1).max(50),
      })
      .parse(i)
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("order_templates").insert({
      user_id: context.userId,
      name: data.name,
      description: data.description ?? null,
      items: data.items,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("order_templates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
