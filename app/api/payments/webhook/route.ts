import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";

type MercadoPagoNotice = { type?: string; action?: string; data?: { id?: string | number } };
type MercadoPagoPayment = { id: number; status: string; external_reference: string | null; transaction_amount: number; currency_id: string; date_approved?: string | null };

function isValidSignature(request: Request, dataId: string, secret: string) {
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(",").map((piece) => {
    const index = piece.indexOf("=");
    return index < 0 ? [piece.trim(), ""] : [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
  }));
  if (!parts.ts || !parts.v1) return false;
  const url = new URL(request.url);
  const manifestId = (url.searchParams.get("data.id") || url.searchParams.get("id") || dataId).toLowerCase();
  const manifest = "id:" + manifestId + ";request-id:" + requestId + ";ts:" + parts.ts + ";";
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(parts.v1, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

async function deliverShopNotification(admin: NonNullable<ReturnType<typeof createAdminSupabase>>, reservationId: string, payload: Record<string, unknown>) {
  const destination = process.env.SHOP_NOTIFICATION_WEBHOOK_URL;
  if (!destination) return;
  const { data: claimed } = await admin.rpc("claim_shop_notification", { p_reservation_id: reservationId });
  if (!claimed) return;
  try {
    const response = await fetch(destination, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": reservationId },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Store notification endpoint returned an error");
    await admin.from("reservation_notifications").update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null }).eq("reservation_id", reservationId);
  } catch {
    await admin.from("reservation_notifications").update({ status: "failed", updated_at: new Date().toISOString(), last_error: "No se pudo enviar el aviso externo; queda disponible para reintento." }).eq("reservation_id", reservationId);
  }
}

export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const token = process.env.MERCADOPAGO_SELLER_ACCESS_TOKEN;
  if (!secret || !token) return Response.json({ error: "Webhook no configurado." }, { status: 503 });

  const notice = await request.json().catch(() => null) as MercadoPagoNotice | null;
  const dataId = notice?.data?.id ? String(notice.data.id) : "";
  if (!dataId || !isValidSignature(request, dataId, secret)) return Response.json({ error: "Firma no válida." }, { status: 401 });
  if (notice?.type !== "payment" && !notice?.action?.startsWith("payment.")) return Response.json({ received: true });

  const admin = createAdminSupabase();
  if (!admin) return Response.json({ error: "Webhook no disponible." }, { status: 503 });

  const paymentResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(dataId), {
    headers: { authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!paymentResponse.ok) return Response.json({ error: "No se pudo comprobar el estado del pago." }, { status: 502 });
  const payment = await paymentResponse.json() as MercadoPagoPayment;
  if (payment.status !== "approved" || !payment.external_reference) return Response.json({ received: true });

  const { data: reservation, error: readError } = await admin.from("reservations").select("*").eq("id", payment.external_reference).maybeSingle();
  if (readError || !reservation) return Response.json({ error: "La reserva asociada no existe." }, { status: 404 });
  if (Number(payment.transaction_amount) !== Number(reservation.deposit_amount) || payment.currency_id !== reservation.currency) {
    return Response.json({ error: "El pago no coincide con el monto de la reserva." }, { status: 409 });
  }

  let paidReservation = reservation;
  if (reservation.status !== "paid") {
    const { data: updated, error: updateError } = await admin.from("reservations").update({
      status: "paid",
      provider_payment_id: String(payment.id),
      paid_at: payment.date_approved || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", reservation.id).eq("status", "pending").select("*").maybeSingle();
    if (updateError) return Response.json({ error: "No se pudo guardar la confirmación." }, { status: 500 });
    if (updated) paidReservation = updated;
    else {
      const { data: latest } = await admin.from("reservations").select("*").eq("id", reservation.id).maybeSingle();
      if (!latest || latest.status !== "paid") return Response.json({ error: "La reserva no está en estado pagable." }, { status: 409 });
      paidReservation = latest;
    }
  }

  const { error: queueError } = await admin.from("reservation_notifications").upsert({ reservation_id: paidReservation.id }, { onConflict: "reservation_id", ignoreDuplicates: true });
  if (queueError) return Response.json({ error: "Pago confirmado; el aviso queda pendiente." }, { status: 500 });
  await deliverShopNotification(admin, paidReservation.id, {
    type: "reservation.paid",
    reservation_id: paidReservation.id,
    product: paidReservation.product_snapshot,
    customer: { name: paidReservation.customer_name, email: paidReservation.customer_email },
    paid_amount: paidReservation.deposit_amount,
    platform_fee: paidReservation.platform_fee,
    store_deposit: paidReservation.store_deposit,
    balance_due: paidReservation.balance_due,
    currency: paidReservation.currency,
    paid_at: paidReservation.paid_at,
  });
  return Response.json({ received: true });
}
