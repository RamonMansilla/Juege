"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/pricing";
import type { Product, Promotion } from "@/lib/catalog";
import { useLanguage, type Locale } from "@/lib/language";

const categories = ["Todo", "Para conversar", "Para compartir", "Para salir"];
const copy: Record<Locale, Record<string, string>> = {
  es: { discover: "Descubrir", how: "Cómo funciona", access: "Acceso tienda", heroTag: "NOCHES CON OTRA ONDA", heroTitle: "La noche se juega mejor", heroAccent: "en buena compañía.", heroBody: "Ideas, juegos y pequeños planes para conocerse sin tanta vuelta. Tú eliges una cosa; nosotros te guardamos el cupo.", explore: "Explorar productos", howQuestion: "¿Cómo funciona?", consent: "Sin presión. Con consentimiento. A tu ritmo.", preview: "Vista previa · productos de muestra", introTag: "JUEGUE · CALLAO", introTitle: "Menos scroll.", introAccent: "Más historias.", introBody: "No es una app para hacer match con cualquiera. Es una vitrina de ideas para una salida ligera, una buena conversación o ese plan que empieza con “¿y si…?”.", step1: "Elige un producto", step1b: "Una reserva, una sola elección.", step2: "Abona para reservar", step2b: "Pagas el 10% del total.", promo: "IDEA PARA ESTA NOCHE", viewIdeas: "Ver ideas", chooseMood: "ELIGE TU MOOD", catalogTitle: "Una buena idea", catalogAccent: "y listo.", catalogAside: "Cada reserva es para un solo producto.\nSin carrito, sin enredos.", featured: "BUENA ELECCIÓN", filter: "Filtrar productos", available: "Disponible", unavailable: "Agotado por ahora", save: "Guardar producto", unsave: "Quitar de guardados", highlight: "DESTACADO", from: "Desde", see: "Ver", empty: "Estamos preparando algo bueno.", emptyBody: "Vuelve pronto: se vienen nuevas ideas para la noche.", depositTag: "RESERVA CON ABONO", depositTitle: "Tu plan, guardado.", depositBody: "Para reservar pagas solo el 10% del precio. El desglose muestra qué parte corresponde a RAMNCO y cuánto queda para la tienda.", findPlan: "Encuentra tu plan", footer: "Una salida tranquila empieza con respeto y consentimiento.", age: "18+ · con respeto", home: "Inicio" },
  en: { discover: "Discover", how: "How it works", access: "Store access", heroTag: "NIGHTS WITH A DIFFERENT VIBE", heroTitle: "The night is better", heroAccent: "in good company.", heroBody: "Ideas, games and little plans to get to know each other without overthinking it. Pick one thing; we'll save your spot.", explore: "Explore ideas", howQuestion: "How does it work?", consent: "No pressure. With consent. At your pace.", preview: "Preview · sample products", introTag: "JUEGUE · CALLAO", introTitle: "Less scrolling.", introAccent: "More stories.", introBody: "Not an app to match with just anyone. A showcase of ideas for a relaxed outing, a good conversation or a plan that starts with “what if…?”.", step1: "Choose a product", step1b: "One reservation, one choice.", step2: "Pay a deposit", step2b: "Pay 10% of the total.", promo: "TONIGHT'S IDEA", viewIdeas: "See ideas", chooseMood: "PICK YOUR MOOD", catalogTitle: "One good idea", catalogAccent: "and you're set.", catalogAside: "Each reservation is for one product.\nNo cart, no fuss.", featured: "GREAT PICK", filter: "Filter products", available: "Available", unavailable: "Sold out for now", save: "Save product", unsave: "Remove saved product", highlight: "FEATURED", from: "From", see: "View", empty: "We're getting something good ready.", emptyBody: "Come back soon for new ideas for your night.", depositTag: "RESERVE WITH A DEPOSIT", depositTitle: "Your plan, saved.", depositBody: "Pay just 10% of the price to reserve. The breakdown shows RAMNCO's share and the amount that goes to the store.", findPlan: "Find your plan", footer: "A relaxed outing starts with respect and consent.", age: "18+ · be respectful", home: "Home" },
  pt: { discover: "Descobrir", how: "Como funciona", access: "Acesso da loja", heroTag: "NOITES COM OUTRA VIBE", heroTitle: "A noite fica melhor", heroAccent: "em boa companhia.", heroBody: "Ideias, jogos e pequenos planos para se conhecer sem complicação. Você escolhe uma coisa; nós guardamos seu lugar.", explore: "Explorar ideias", howQuestion: "Como funciona?", consent: "Sem pressão. Com consentimento. No seu ritmo.", preview: "Prévia · produtos de exemplo", introTag: "JUEGUE · CALLAO", introTitle: "Menos rolagem.", introAccent: "Mais histórias.", introBody: "Não é um app para dar match com qualquer pessoa. É uma vitrine de ideias para um passeio leve, uma boa conversa ou aquele plano que começa com “e se…?”.", step1: "Escolha um produto", step1b: "Uma reserva, uma escolha.", step2: "Pague um sinal", step2b: "Pague 10% do total.", promo: "IDEIA PARA ESTA NOITE", viewIdeas: "Ver ideias", chooseMood: "ESCOLHA SEU CLIMA", catalogTitle: "Uma boa ideia", catalogAccent: "e pronto.", catalogAside: "Cada reserva é para um produto.\nSem carrinho, sem complicação.", featured: "BOA ESCOLHA", filter: "Filtrar produtos", available: "Disponível", unavailable: "Esgotado no momento", save: "Salvar produto", unsave: "Remover dos salvos", highlight: "DESTAQUE", from: "A partir de", see: "Ver", empty: "Estamos preparando algo legal.", emptyBody: "Volte em breve: vêm aí novas ideias para a noite.", depositTag: "RESERVE COM SINAL", depositTitle: "Seu plano está guardado.", depositBody: "Para reservar, pague apenas 10% do preço. O detalhamento mostra a parte da RAMNCO e quanto fica para a loja.", findPlan: "Encontre seu plano", footer: "Um passeio tranquilo começa com respeito e consentimento.", age: "18+ · com respeito", home: "Início" },
};
const categoryLabels: Record<Locale, Record<string, string>> = {
  es: { Todo: "Todo", "Para conversar": "Para conversar", "Para compartir": "Para compartir", "Para salir": "Para salir" },
  en: { Todo: "All", "Para conversar": "To talk", "Para compartir": "To share", "Para salir": "To go out" },
  pt: { Todo: "Tudo", "Para conversar": "Para conversar", "Para compartir": "Para compartilhar", "Para salir": "Para sair" },
};
const productCopy: Record<Locale, Record<string, string>> = {
  es: {},
  en: { "mazo-sin-filtro": "Curious questions to spark the first laugh and let the conversation find its own way.", "kit-sobremesa": "A little kit to keep the conversation going: a tabletop game, a candle and a playlist to share.", "tarjetas-que-tal-si": "Quick ideas for choosing your next step together, with no pressure and room to say no." },
  pt: { "mazo-sin-filtro": "Perguntas curiosas para soltar a primeira risada e deixar a conversa seguir seu caminho.", "kit-sobremesa": "Um pequeno kit para prolongar a conversa: jogo de mesa, vela e uma playlist para compartilhar.", "tarjetas-que-tal-si": "Ideias rápidas para escolher o próximo passo juntos, sem pressão e com espaço para dizer não." },
};

export default function HomeClient({ products, promotion, demo }: { products: Product[]; promotion: Promotion | null; demo: boolean }) {
  const [category, setCategory] = useState("Todo");
  const [saved, setSaved] = useState<string[]>([]);
  const { locale, setLocale } = useLanguage();
  const t = copy[locale];
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
          <a href="#productos">{t.discover}</a>
          <a href="#como-funciona">{t.how}</a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label="Language / Idioma / Língua">
            {(["es", "en", "pt"] as Locale[]).map((language) => <button key={language} type="button" aria-pressed={locale === language} className={locale === language ? "selected" : ""} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}
          </div>
          <span className="adult-pill">{t.age}</span>
          <Link className="admin-link" href="/admin/login">{t.access} <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-photo" src="/images/juegue-night.png" alt="" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow"><i /> {t.heroTag}</span>
          <h1 id="hero-title">{t.heroTitle} <em>{t.heroAccent}</em></h1>
          <p>{t.heroBody}</p>
          <div className="hero-actions">
            <a className="button button-bright" href="#productos">{t.explore} <span aria-hidden="true">↘</span></a>
            <a className="button button-glass" href="#como-funciona">{t.howQuestion}</a>
          </div>
          <div className="hero-footnote"><span className="sparkle">✳</span> {t.consent}</div>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>UNA NOCHE</span><b>✳</b><span>UNA ELECCIÓN</span></div>
        {demo && <div className="preview-ribbon">{t.preview}</div>}
      </section>

      <section className="intro-row" id="como-funciona">
        <div><span className="eyebrow pink">{t.introTag}</span><h2>{t.introTitle}<br /><span>{t.introAccent}</span></h2></div>
        <p>{t.introBody}</p>
        <div className="how-card"><span className="how-number">01</span><b>{t.step1}</b><span>{t.step1b}</span><i>↗</i></div>
        <div className="how-card"><span className="how-number">02</span><b>{t.step2}</b><span>{t.step2b}</span><i>↗</i></div>
      </section>

      {promotion && (
        <section className="promo-strip" aria-label="Promoción destacada">
          <div className="promo-icon">✦</div>
          <div><span className="eyebrow pink">{locale === "es" ? (promotion.eyebrow || t.promo) : t.promo}</span><h2>{locale === "es" || promotion.id !== "sample-promo" ? promotion.title : locale === "en" ? "One question can change the plan." : "Uma pergunta pode mudar o plano."}</h2><p>{locale === "es" || promotion.id !== "sample-promo" ? promotion.body : locale === "en" ? "Start with a good conversation and let the rest flow." : "Comece com uma boa conversa e deixe o resto fluir."}</p></div>
          <a href={promotion.button_href || "#productos"}>{locale === "es" ? (promotion.button_text || t.viewIdeas) : t.viewIdeas} <span aria-hidden="true">↗</span></a>
        </section>
      )}

      <section className="catalog-section" id="productos" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <div><span className="eyebrow">{t.chooseMood}</span><h2 id="catalog-title">{t.catalogTitle} <em>{t.catalogAccent}</em></h2></div>
          <p>{t.catalogAside.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</p>
        </div>
        {featured.length > 0 && (
          <div className="featured-row">
            <span className="featured-label">{t.featured}</span>
            {featured.map((item) => <Link key={item.id} className="featured-chip" href={"/producto/" + item.slug}><span>✳</span>{item.title}<b>↗</b></Link>)}
          </div>
        )}
        <div className="category-tabs" role="tablist" aria-label={t.filter}>
          {categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{categoryLabels[locale][item]}</button>)}
        </div>
        {visible.length ? <div className="product-grid">
          {visible.map((product, index) => <article className={"product-card tone-" + (index % 4 + 1)} key={product.id}>
            <div className="product-visual">
              {product.photo_urls[0] ? <img src={product.photo_urls[0]} alt={product.title} /> : <div className="product-art" aria-hidden="true"><span>{index % 2 ? "✳" : "◉"}</span><i>{product.category}</i></div>}
              <span className={"availability " + (product.is_available ? "available" : "unavailable")}><i />{product.is_available ? t.available : t.unavailable}</span>
              <button className={"save-button " + (saved.includes(product.id) ? "saved" : "")} onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? t.unsave : t.save} aria-pressed={saved.includes(product.id)}>♡</button>
              {product.is_featured && <span className="feature-tag">{t.highlight}</span>}
            </div>
            <div className="product-info">
              <div className="product-meta"><span>{categoryLabels[locale][product.category] || product.category}</span><span>{product.duration_label || categoryLabels[locale]["Para compartir"]}</span></div>
              <h3>{product.title}</h3>
              <p>{productCopy[locale][product.slug] || product.description}</p>
              <div className="product-bottom"><div><span>{t.from}</span><strong>{formatMoney(product.price_clp)}</strong></div><Link className="arrow-link" href={"/producto/" + product.slug} aria-label={t.see + " " + product.title}>→</Link></div>
            </div>
          </article>)}
        </div> : <div className="empty-catalog"><span>✳</span><h3>{t.empty}</h3><p>{t.emptyBody}</p></div>}
      </section>

      <section className="deposit-section">
        <div className="deposit-glyph" aria-hidden="true">10<span>%</span></div>
        <div><span className="eyebrow">{t.depositTag}</span><h2>{t.depositTitle}</h2><p>{t.depositBody}</p></div>
        <a href="#productos">{t.findPlan} <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="footer">
        <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link>
        <p>{t.footer}</p>
        <span>© {new Date().getFullYear()} RAMNCO · Solo mayores de 18</span>
      </footer>
      <nav className="mobile-nav" aria-label="Atajos">
        <a href="#hero-title"><span>⌂</span>{t.home}</a><a href="#productos"><span>✳</span>{t.discover}</a><a href="#como-funciona"><span>↗</span>{t.how}</a>
      </nav>
    </main>
  );
}
