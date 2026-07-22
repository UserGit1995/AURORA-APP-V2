import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const submitSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(9999),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().min(5).max(30),
  customerAddress: z.string().trim().min(3).max(300),
  customerProvince: z.string().trim().min(2).max(60),
  notes: z.string().trim().max(1000).optional(),
});

export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => submitSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, price, discount_price, active")
      .eq("id", data.productId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!product || !product.active) throw new Error("Prodotto non disponibile");

    const unitPrice = Number(product.discount_price ?? product.price);
    const subtotal = +(unitPrice * data.quantity).toFixed(2);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: numRow, error: nErr } = await supabaseAdmin.rpc("generate_order_number");
    if (nErr) throw nErr;
    const orderNumber = numRow as unknown as string;

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        customer_address: data.customerAddress,
        customer_province: data.customerProvince,
        notes: data.notes ?? null,
        total: subtotal,
      })
      .select("id, order_number")
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: data.quantity,
      unit_price: unitPrice,
      subtotal,
    });
    if (iErr) throw iErr;

    // Email notifica admin: sarà attivata quando il dominio email è configurato.
    // L'ordine è salvato ed è visibile nel pannello admin.

    return { orderNumber: order.order_number };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, order_items(product_name, quantity)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });