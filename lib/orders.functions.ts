import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ORDER_NOTIFICATION_EMAIL_KEY } from "@/lib/settings.functions";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(9999),
});

const customerSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z.string().trim().min(5).max(30),
  customerAddress: z.string().trim().min(3).max(300),
  customerProvince: z.string().trim().min(2).max(60),
  notes: z.string().trim().max(1000).optional(),
});

async function sendOrderNotificationEmail(params: {
  supabaseAdmin: any;
  orderNumber: string;
  customer: z.infer<typeof customerSchema>;
  lines: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
  total: number;
  isGuest: boolean;
}) {
  try {
    const { data: setting } = await params.supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", ORDER_NOTIFICATION_EMAIL_KEY)
      .maybeSingle();
    const to = setting?.value;
    const apiKey = process.env.RESEND_API_KEY;

    if (!to || !apiKey) {
      console.warn(
        `[ordini] Email non inviata: ${!to ? "indirizzo destinatario non configurato in admin" : "RESEND_API_KEY mancante"}. Ordine ${params.orderNumber} salvato comunque.`
      );
      return;
    }

    const from = process.env.RESEND_FROM_EMAIL || "Aurora Ordini <onboarding@resend.dev>";
    const rows = params.lines
      .map((l) => `<tr><td style="padding:4px 8px">${l.name}</td><td style="padding:4px 8px">${l.quantity}</td><td style="padding:4px 8px">€ ${l.unitPrice.toFixed(2)}</td><td style="padding:4px 8px">€ ${l.subtotal.toFixed(2)}</td></tr>`)
      .join("");

    const html = `
      <h2>Nuovo ordine ${params.orderNumber}${params.isGuest ? " (cliente ospite)" : ""}</h2>
      <p><b>${params.customer.customerName}</b><br/>
      Email: ${params.customer.customerEmail}<br/>
      Tel: ${params.customer.customerPhone}<br/>
      Indirizzo: ${params.customer.customerAddress} (${params.customer.customerProvince})</p>
      ${params.customer.notes ? `<p>Note: ${params.customer.notes}</p>` : ""}
      <table border="1" cellspacing="0" style="border-collapse:collapse">
        <tr><th style="padding:4px 8px">Prodotto</th><th style="padding:4px 8px">Qtà</th><th style="padding:4px 8px">Prezzo</th><th style="padding:4px 8px">Subtot.</th></tr>
        ${rows}
      </table>
      <p><b>Totale: € ${params.total.toFixed(2)}</b></p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: params.customer.customerEmail,
        subject: `Nuovo ordine ${params.orderNumber}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[ordini] Invio email fallito:", await res.text());
    }
  } catch (err) {
    // L'ordine è comunque salvato: un problema con l'email non deve far perdere l'ordine.
    console.error("[ordini] Errore invio email notifica:", err);
  }
}

async function buildOrderLines(supabase: any, items: z.infer<typeof itemSchema>[], applyReservedPrice: boolean) {
  const ids = items.map((i) => i.productId);
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, discount_price, active")
    .in("id", ids);
  if (error) throw error;

  const lines = items.map((item) => {
    const product = (products ?? []).find((p: any) => p.id === item.productId);
    if (!product || !product.active) throw new Error(`Prodotto non disponibile: ${item.productId}`);
    // Sicurezza: il prezzo riservato/scontato viene applicato solo per i clienti loggati,
    // ricalcolato qui lato server (mai fidarsi del prezzo eventualmente inviato dal client).
    const unitPrice =
      applyReservedPrice && product.discount_price != null && Number(product.discount_price) < Number(product.price)
        ? Number(product.discount_price)
        : Number(product.price);
    const subtotal = +(unitPrice * item.quantity).toFixed(2);
    return { productId: product.id, name: product.name as string, quantity: item.quantity, unitPrice, subtotal };
  });

  const total = +lines.reduce((s, l) => s + l.subtotal, 0).toFixed(2);
  return { lines, total };
}

export const submitOrderAuthenticated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => customerSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { lines, total } = await buildOrderLines(supabase, data.items, true);

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
        total,
      })
      .select("id, order_number")
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.name,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        subtotal: l.subtotal,
      }))
    );
    if (iErr) throw iErr;

    await sendOrderNotificationEmail({ supabaseAdmin, orderNumber: order.order_number, customer: data, lines, total, isGuest: false });

    return { orderNumber: order.order_number };
  });

export const submitOrderGuest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => customerSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Prezzo pieno sempre e comunque per gli ordini da ospite: i prezzi riservati
    // richiedono un account, applicati solo nel percorso "authenticated" sopra.
    const { lines, total } = await buildOrderLines(supabaseAdmin, data.items, false);

    const { data: numRow, error: nErr } = await supabaseAdmin.rpc("generate_order_number");
    if (nErr) throw nErr;
    const orderNumber = numRow as unknown as string;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: null,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        customer_address: data.customerAddress,
        customer_province: data.customerProvince,
        notes: data.notes ?? null,
        total,
      })
      .select("id, order_number")
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.name,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        subtotal: l.subtotal,
      }))
    );
    if (iErr) throw iErr;

    await sendOrderNotificationEmail({ supabaseAdmin, orderNumber: order.order_number, customer: data, lines, total, isGuest: true });

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
