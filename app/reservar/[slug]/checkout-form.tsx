"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";

export default function CheckoutForm({ product, paymentReady }: { product: Product; paymentReady: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!paymentReady) return;
    if (!consent) {
      setError("Confirma que revisaste los datos y las condiciones de reserva.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, name, email }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || "No pudimos iniciar el pago. Inténtalo nuevamente.");
      const checkoutUrl = new URL(payload.checkoutUrl);
      const trustedPaymentDomains = ["mercadopago.cl", "mercadopago.com", "mercadopago.com.ar", "mercadopago.com.br", "mercadopago.com.mx", "mercadopago.com.uy", "mercadopago.com.co", "mercadopago.com.pe"];
      const trustedHost = trustedPaymentDomains.some((domain) => checkoutUrl.hostname === domain || checkoutUrl.hostname.endsWith("." + domain));
      if (checkoutUrl.protocol !== "https:" || !trustedHost) throw new Error("El proveedor devolvió un enlace de pago no válido.");
      window.location.assign(checkoutUrl.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos iniciar el pago.");
      setBusy(false);
    }
  }

  return <form className="checkout-form" onSubmit={submit}>
    <label className="field-label">Tu nombre <input autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="¿Cómo te llamamos?" /></label>
    <label className="field-label">Correo para confirmar la reserva <input required autoComplete="email" type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" /></label>
    <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Confirmo que soy mayor de 18 años, revisé el desglose y acepto que la reserva se confirme solo después del pago.</span></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="button button-bright button-full" type="submit" disabled={!paymentReady || busy || !product.is_available} aria-disabled={!paymentReady || busy || !product.is_available}>{busy ? "Conectando con el pago…" : "Pagar abono y reservar"} <span aria-hidden="true">↗</span></button>
    {!paymentReady && <button className="button button-glass button-full" type="button" onClick={() => router.push("/admin/login")}>Configurar cuando esté listo</button>}
    <p className="price-note">No ingreses datos de tarjeta aquí. Mercado Pago los procesa en su página segura.</p>
  </form>;
}
