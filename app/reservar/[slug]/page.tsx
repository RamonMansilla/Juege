import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { calculateSplit, formatMoney, RAMNCO_FEE_BASE, RAMNCO_FEE_RATE } from "@/lib/pricing";
import CheckoutForm from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.is_published) notFound();
  const split = calculateSplit(product.price_clp);
  const feeBase = RAMNCO_FEE_BASE === "deposit_amount" ? "el abono" : "el precio total";
  const feePercent = Math.round(RAMNCO_FEE_RATE * 100);
  const paymentReady = Boolean(
    process.env.NEXT_PUBLIC_SITE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.MERCADOPAGO_SELLER_ACCESS_TOKEN &&
    process.env.MERCADOPAGO_WEBHOOK_SECRET,
  );

  return <main className="checkout-shell">
    <header className="checkout-top">
      <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link>
      <Link className="back-link" href={"/producto/" + product.slug}>← Volver al producto</Link>
    </header>
    <div className="checkout-layout">
      <section className="checkout-main">
        <span className="eyebrow">UNA RESERVA · UN PRODUCTO</span>
        <h1>Dejemos tu plan listo.</h1>
        <p>Completa tus datos de contacto. El pago se realizará en Mercado Pago y la tienda solo recibirá el aviso cuando el proveedor confirme el pago.</p>
        <CheckoutForm product={product} paymentReady={paymentReady} />
      </section>
      <aside className="checkout-side">
        <div className="checkout-product">
          <div className="checkout-product-image">{product.photo_urls[0] && <img src={product.photo_urls[0]} alt={product.title} />}</div>
          <div className="checkout-product-copy"><span className="eyebrow">{product.category}</span><h2>{product.title}</h2><p>{product.description}</p></div>
        </div>
        <div className="price-card">
          <h2>Tu abono</h2>
          <div className="price-line"><span>Total del producto</span><strong>{formatMoney(split.total)}</strong></div>
          <div className="price-line"><span>Abono hoy · 10%</span><strong>{formatMoney(split.deposit)}</strong></div>
          <div className="price-line fee"><span>RAMNCO · {feePercent}% de {feeBase}<small>Incluido en el abono.</small></span><strong>− {formatMoney(split.ramncoFee)}</strong></div>
          <div className="price-line"><span>Abono para la tienda</span><strong>{formatMoney(split.storeDeposit)}</strong></div>
          <div className="price-line"><span>Saldo pendiente</span><strong>{formatMoney(split.balance)}</strong></div>
          {!paymentReady && <div className="checkout-unavailable">Los cobros reales todavía no están conectados. No se ha iniciado ningún pago. El acceso se activa al configurar Supabase y Mercado Pago en el servidor.</div>}
          <p className="price-note">La comisión RAMNCO se calcula sobre {feeBase} y se descuenta del abono. Los cargos propios del proveedor se muestran aparte.</p>
        </div>
      </aside>
    </div>
  </main>;
}
