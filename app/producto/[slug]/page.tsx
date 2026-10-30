import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { calculateSplit, formatMoney, RAMNCO_FEE_BASE, RAMNCO_FEE_RATE } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.is_published) notFound();
  const split = calculateSplit(product.price_clp);
  const feeBase = RAMNCO_FEE_BASE === "deposit_amount" ? "del abono" : "del precio total";
  const percent = Math.round(RAMNCO_FEE_RATE * 100);

  return <main className="detail-shell">
    <header className="detail-top">
      <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link>
      <Link className="back-link" href="/#productos">← Volver al catálogo</Link>
    </header>
    <div className="detail-grid">
      <div className="detail-photo">
        {product.photo_urls[0] ? <img src={product.photo_urls[0]} alt={product.title} /> : <div className="detail-placeholder"><span>✳</span></div>}
        <span className={"availability " + (product.is_available ? "available" : "unavailable")}><i />{product.is_available ? "Disponible para reservar" : "No disponible por ahora"}</span>
      </div>
      <section className="detail-copy">
        <span className="eyebrow">{product.category.toUpperCase()}</span>
        <h1>{product.title}</h1>
        <p>{product.description}</p>
        <div className="detail-labels"><span>Una reserva · un producto</span><span>{product.duration_label || "Un plan para compartir"}</span></div>
        <div className="price-card">
          <h2>Un abono pequeño, el plan guardado.</h2>
          <div className="price-line total"><span>Precio del producto</span><strong>{formatMoney(split.total)}</strong></div>
          <div className="price-line"><span>Abono hoy · 10%</span><strong>{formatMoney(split.deposit)}</strong></div>
          <div className="price-line fee"><span>Incluye RAMNCO · {percent}% {feeBase}<small>Se descuenta del abono, no se suma al total.</small></span><strong>− {formatMoney(split.ramncoFee)}</strong></div>
          <div className="price-line"><span>Parte del abono para la tienda</span><strong>{formatMoney(split.storeDeposit)}</strong></div>
          <div className="price-line"><span>Saldo pendiente</span><strong>{formatMoney(split.balance)}</strong></div>
          <p className="price-note">La parte para la tienda se muestra antes de los cargos que pueda aplicar el proveedor de pago. Base de comisión configurada: {feeBase}.</p>
          {product.is_available ? <Link className="button button-bright button-full" href={"/reservar/" + product.slug}>Reservar este producto <span aria-hidden="true">↗</span></Link> : <button className="button button-bright button-full" disabled>No disponible</button>}
        </div>
        <p className="availability-note"><span>✳</span> Encuentro respetuoso, entre personas adultas. Puedes cambiar de idea en cualquier momento.</p>
      </section>
    </div>
  </main>;
}
