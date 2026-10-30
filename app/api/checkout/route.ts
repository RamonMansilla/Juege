import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { calculateServerSplit, getServerPaymentConfig } from "@/lib/server-pricing";

const bodySchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  const config = getServerPaymentConfig();
  if (!config.ready) return Response.json({ error: "Los pagos todavía no están configurados." }, { status: 503 });

  const admin = createAdminSupabase();
  if (!admin) return Response.json({ error: "El servicio de reservas no está disponible." }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revisa el producto y el correo de contacto." }, { status: 400 });

  const { data: product, error: productError } = await admin.from("products")
    .select("id,slug,title,description,price_clp,photo_urls,is_available,is_published,deleted_at")
    .eq("id", parsed.data.productId).maybeSingle();
  if (productError || !product || !product.is_published || product.deleted_at || !product.is_available) {
    return Response.json({ error: "Este producto ya no está disponible para reservar." }, { status: 409 });
  }

  const split = calculateServerSplit(Number(product.price_clp));
  if (split.deposit <= 0 || split.platformFee < 0 || split.platformFee > split.deposit) {
    return Response.json({ error: "La configuración de abonos y comisión necesita revisión." }, { status: 503 });
  }
  const snapshot = { id: product.id, slug: product.slug, title: product.title, price_clp: product.price_clp, photo_urls: product.photo_urls || [] };
  const { data: reservation, error: reservationError } = await admin.from("reservations").insert({
    product_id: product.id,
    product_snapshot: snapshot,
    customer_name: parsed.data.name || null,
    customer_email: parsed.data.email,
    total_amount: split.total,
    deposit_amount: split.deposit,
    platform_fee: split.platformFee,
    store_deposit: split.storeDeposit,
    balance_due: split.balance,
    currency: config.currency,
    status: "pending",
  }).select("id").single();
  if (reservationError || !reservation) return Response.json({ error: "No pudimos guardar la reserva." }, { status: 500 });

  try {
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: "Bearer " + config.sellerAccessToken,
        "content-type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        items: [{ id: product.id, title: "Abono · " + product.title, quantity: 1, currency_id: config.currency, unit_price: split.deposit }],
        marketplace_fee: split.platformFee,
        external_reference: reservation.id,
        metadata: { reservation_id: reservation.id, product_id: product.id },
        notification_url: new URL("/api/payments/webhook", config.siteUrl).toString(),
        back_urls: {
          success: new URL("/reserva/estado", config.siteUrl).toString(),
          pending: new URL("/reserva/estado", config.siteUrl).toString(),
          failure: new URL("/reserva/estado", config.siteUrl).toString(),
        },
        auto_return: "approved",
        statement_descriptor: "JUEGUE CALLAO",
      }),
    });
    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok || !preference.id || !preference.init_point) throw new Error("Preference creation failed");
    await admin.from("reservations").update({ provider_preference_id: preference.id, updated_at: new Date().toISOString() }).eq("id", reservation.id);
    return Response.json({ checkoutUrl: preference.init_point }, { status: 201 });
  } catch {
    await admin.from("reservations").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", reservation.id).eq("status", "pending");
    return Response.json({ error: "Mercado Pago no pudo iniciar el cobro. No se ha confirmado ninguna reserva." }, { status: 502 });
  }
}
