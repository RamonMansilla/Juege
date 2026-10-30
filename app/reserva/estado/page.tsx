import Link from "next/link";

export default function ReservationStatusPage() {
  return <main className="detail-shell">
    <header className="detail-top"><Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link></header>
    <section className="confirm-card">
      <div className="confirm-mark">↻</div>
      <span className="eyebrow">VERIFICANDO TU PAGO</span>
      <h1>Un segundo, estamos confirmando.</h1>
      <p>Volviste desde Mercado Pago. La reserva se confirma cuando recibamos y validemos el aviso seguro del proveedor. La tienda recibirá su notificación después de esa confirmación.</p>
      <p>Esta pantalla por sí sola no confirma que el pago se haya realizado.</p>
      <Link className="button button-bright" href="/">Volver a JUEGUE <span aria-hidden="true">↗</span></Link>
    </section>
  </main>;
}
