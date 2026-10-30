"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/pricing";
import type { Product, Promotion } from "@/lib/catalog";

const categories = ["Todo", "Para conversar", "Para compartir", "Para salir"];

export default function HomeClient({ products, promotion, demo }: { products: Product[]; promotion: Promotion | null; demo: boolean }) {
  const [category, setCategory] = useState("Todo");
  const [saved, setSaved] = useState<string[]>([]);
  const visible = useMemo(() => category === "Todo" ? products : products.filter((item) => item.category === category), [category, products]);
  const featured = products.filter((item) => item.is_featured && item.is_available).slice(0, 2);

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="JUEGUE Callao, inicio">
          <span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span>
          <span className="wordmark-place">callao</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <a href="#productos">Descubrir</a>
          <a href="#como-funciona">Cómo funciona</a>
        </nav>
        <div className="header-actions">
          <span className="adult-pill">18+ · con respeto</span>
          <Link className="admin-link" href="/admin/login">Acceso tienda <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-photo" src="/images/juegue-night.png" alt="" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow"><i /> NOCHES CON OTRA ONDA</span>
          <h1 id="hero-title">La noche se juega mejor <em>en buena compañía.</em></h1>
          <p>Ideas, juegos y pequeños planes para conocerse sin tanta vuelta. Tú eliges una cosa; nosotros te guardamos el cupo.</p>
          <div className="hero-actions">
            <a className="button button-bright" href="#productos">Explorar productos <span aria-hidden="true">↘</span></a>
            <a className="button button-glass" href="#como-funciona">¿Cómo funciona?</a>
          </div>
          <div className="hero-footnote"><span className="sparkle">✳</span> Sin presión. Con consentimiento. A tu ritmo.</div>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>UNA NOCHE</span><b>✳</b><span>UNA ELECCIÓN</span></div>
        {demo && <div className="preview-ribbon">Vista previa · productos de muestra</div>}
      </section>

      <section className="intro-row" id="como-funciona">
        <div><span className="eyebrow pink">JUEGUE · CALLAO</span><h2>Menos scroll.<br /><span>Más historias.</span></h2></div>
        <p>No es una app para hacer match con cualquiera. Es una vitrina de ideas para una salida ligera, una buena conversación o ese plan que empieza con “¿y si…?”.</p>
        <div className="how-card"><span className="how-number">01</span><b>Elige un producto</b><span>Una reserva, una sola elección.</span><i>↗</i></div>
        <div className="how-card"><span className="how-number">02</span><b>Abona para reservar</b><span>Pagas el 10% del total.</span><i>↗</i></div>
      </section>

      {promotion && (
        <section className="promo-strip" aria-label="Promoción destacada">
          <div className="promo-icon">✦</div>
          <div><span className="eyebrow pink">{promotion.eyebrow || "IDEA PARA ESTA NOCHE"}</span><h2>{promotion.title}</h2><p>{promotion.body}</p></div>
          <a href={promotion.button_href || "#productos"}>{promotion.button_text || "Ver ideas"} <span aria-hidden="true">↗</span></a>
        </section>
      )}

      <section className="catalog-section" id="productos" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <div><span className="eyebrow">ELIGE TU MOOD</span><h2 id="catalog-title">Una buena idea <em>y listo.</em></h2></div>
          <p>Cada reserva es para un solo producto.<br />Sin carrito, sin enredos.</p>
        </div>
        {featured.length > 0 && (
          <div className="featured-row">
            <span className="featured-label">BUENA ELECCIÓN</span>
            {featured.map((item) => <Link key={item.id} className="featured-chip" href={"/producto/" + item.slug}><span>✳</span>{item.title}<b>↗</b></Link>)}
          </div>
        )}
        <div className="category-tabs" role="tablist" aria-label="Filtrar productos">
          {categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {visible.length ? <div className="product-grid">
          {visible.map((product, index) => <article className={"product-card tone-" + (index % 4 + 1)} key={product.id}>
            <div className="product-visual">
              {product.photo_urls[0] ? <img src={product.photo_urls[0]} alt={product.title} /> : <div className="product-art" aria-hidden="true"><span>{index % 2 ? "✳" : "◉"}</span><i>{product.category}</i></div>}
              <span className={"availability " + (product.is_available ? "available" : "unavailable")}><i />{product.is_available ? "Disponible" : "Agotado por ahora"}</span>
              <button className={"save-button " + (saved.includes(product.id) ? "saved" : "")} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? "Quitar de guardados" : "Guardar producto"} aria-pressed={saved.includes(product.id)}>♡</button>
              {product.is_featured && <span className="feature-tag">DESTACADO</span>}
            </div>
            <div className="product-info">
              <div className="product-meta"><span>{product.category}</span><span>{product.duration_label || "Para compartir"}</span></div>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              <div className="product-bottom"><div><span>Desde</span><strong>{formatMoney(product.price_clp)}</strong></div><Link className="arrow-link" href={"/producto/" + product.slug} aria-label={"Ver " + product.title}>→</Link></div>
            </div>
          </article>)}
        </div> : <div className="empty-catalog"><span>✳</span><h3>Estamos preparando algo bueno.</h3><p>Vuelve pronto: se vienen nuevas ideas para la noche.</p></div>}
      </section>

      <section className="deposit-section">
        <div className="deposit-glyph" aria-hidden="true">10<span>%</span></div>
        <div><span className="eyebrow">RESERVA CON ABONO</span><h2>Tu plan, guardado.</h2><p>Para reservar pagas solo el 10% del precio. El desglose muestra qué parte corresponde a RAMNCO y cuánto queda para la tienda.</p></div>
        <a href="#productos">Encuentra tu plan <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="footer">
        <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link>
        <p>Una salida tranquila empieza con respeto y consentimiento.</p>
        <span>© {new Date().getFullYear()} RAMNCO · Solo mayores de 18</span>
      </footer>
      <nav className="mobile-nav" aria-label="Atajos">
        <a href="#hero-title"><span>⌂</span>Inicio</a><a href="#productos"><span>✳</span>Descubrir</a><a href="#como-funciona"><span>↗</span>Cómo funciona</a>
      </nav>
    </main>
  );
}
