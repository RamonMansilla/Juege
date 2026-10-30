"use client";

import Link from "next/link";
import { useRef } from "react";
import { formatMoney } from "@/lib/pricing";
import type { Product, Promotion } from "@/lib/catalog";
import { useLanguage, type Locale } from "@/lib/language";

const text: Record<Locale, { title: string; label: string; see: string; age: string; categories: Record<string, string>; girls: string; sample: string; perDate: string; favorite: string; prev: string; next: string; plans: string[] }> = {
  es: { title: "Elige tu plan.", label: "2 ideas para esta noche", see: "Ver producto", age: "18+ · con respeto", categories: { "Para conversar": "Para conversar", "Para compartir": "Para compartir", "Para salir": "Para salir" }, girls: "Compañía para tu noche", sample: "Perfiles de muestra · +18", perDate: "Por cita · tarifa a consultar", favorite: "FAVORITO", prev: "Anterior", next: "Siguiente", plans: ["Cena y conversación", "Paseo por Callao", "Cócteles y charla", "Una noche especial"] },
  en: { title: "Pick your plan.", label: "2 ideas for tonight", see: "View details", age: "18+ · be respectful", categories: { "Para conversar": "To talk", "Para compartir": "To share", "Para salir": "To go out" }, girls: "Company for your night", sample: "Sample profiles · 18+", perDate: "By appointment · ask for rates", favorite: "FAVORITE", prev: "Previous", next: "Next", plans: ["Dinner and conversation", "Walk around Callao", "Cocktails and a chat", "A special night"] },
  pt: { title: "Escolha seu plano.", label: "2 ideias para hoje", see: "Ver produto", age: "18+ · com respeito", categories: { "Para conversar": "Para conversar", "Para compartir": "Para compartilhar", "Para salir": "Para sair" }, girls: "Companhia para sua noite", sample: "Perfis de exemplo · 18+", perDate: "Por encontro · consulte valores", favorite: "FAVORITO", prev: "Anterior", next: "Próximo", plans: ["Jantar e conversa", "Passeio pelo Callao", "Drinks e conversa", "Uma noite especial"] },
  fr: { title: "Choisis ton idée.", label: "2 idées pour ce soir", see: "Voir le produit", age: "18+ · avec respect", categories: { "Para conversar": "Pour discuter", "Para compartir": "À partager", "Para salir": "Pour sortir" }, girls: "De la compagnie pour ta soirée", sample: "Profils de démo · 18+", perDate: "Sur rendez-vous · tarif à demander", favorite: "COUP DE CŒUR", prev: "Précédent", next: "Suivant", plans: ["Dîner et conversation", "Balade à Callao", "Cocktails et discussion", "Une soirée spéciale"] },
  ca: { title: "Tria el teu pla.", label: "2 idees per aquesta nit", see: "Veure producte", age: "18+ · amb respecte", categories: { "Para conversar": "Per conversar", "Para compartir": "Per compartir", "Para salir": "Per sortir" }, girls: "Companyia per a la nit", sample: "Perfils de mostra · +18", perDate: "Per cita · tarifa a consultar", favorite: "PREFERIT", prev: "Anterior", next: "Següent", plans: ["Sopar i conversa", "Passeig per Callao", "Còctels i conversa", "Una nit especial"] },
};

const shortDescription: Record<Locale, Record<string, string>> = {
  es: { "mazo-sin-filtro": "Preguntas para romper el hielo.", "kit-sobremesa": "Juego, vela y playlist para compartir.", "tarjetas-que-tal-si": "Ideas breves para elegir juntos." },
  en: { "mazo-sin-filtro": "Questions to break the ice.", "kit-sobremesa": "A game, candle and playlist to share.", "tarjetas-que-tal-si": "Quick ideas to choose together." },
  pt: { "mazo-sin-filtro": "Perguntas para quebrar o gelo.", "kit-sobremesa": "Jogo, vela e playlist para compartilhar.", "tarjetas-que-tal-si": "Ideias rápidas para escolher juntos." },
  fr: { "mazo-sin-filtro": "Des questions pour briser la glace.", "kit-sobremesa": "Jeu, bougie et playlist à partager.", "tarjetas-que-tal-si": "Des idées pour choisir ensemble." },
  ca: { "mazo-sin-filtro": "Preguntes per trencar el gel.", "kit-sobremesa": "Joc, espelma i playlist per compartir.", "tarjetas-que-tal-si": "Idees breus per triar plegats." },
};
const languages: Locale[] = ["es", "en", "pt", "fr", "ca"];
const profiles = [
  { name: "Alma", style: "rose" },
  { name: "Mía", style: "blue" },
  { name: "Luna", style: "violet" },
  { name: "Vera", style: "lime" },
];

export default function HomeClient({ products }: { products: Product[]; promotion?: Promotion | null; demo: boolean }) {
  const { locale, setLocale } = useLanguage();
  const t = text[locale];
  const carousel = useRef<HTMLDivElement>(null);
  const featured = products.filter((item) => item.is_featured && item.is_available);
  const picks = (featured.length >= 2 ? featured : [...featured, ...products.filter((item) => item.is_available && !featured.some((featuredItem) => featuredItem.id === item.id))]).slice(0, 2);
  const moveCarousel = (direction: number) => carousel.current?.scrollBy({ left: direction * 290, behavior: "smooth" });

  return (
    <main className="bakery-home neon-home">
      <header className="bakery-topbar">
        <Link className="bakery-brand" href="/" aria-label="JUEGUE Callao">
          <span className="bakery-mark" aria-hidden="true">✳</span>
          <span className="bakery-brand-name">JUEGUE</span><span className="bakery-brand-place">CALLAO</span>
        </Link>
        <div className="bakery-actions">
          <div className="language-switch bakery-language" role="group" aria-label="Idioma">
            {languages.map((language) => <button key={language} type="button" aria-pressed={locale === language} className={locale === language ? "selected" : ""} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}
          </div>
          <span className="bakery-age">{t.age}</span>
        </div>
      </header>

      <section className="bakery-intro" aria-labelledby="home-title">
        <div><p className="bakery-kicker">JUEGUE · CALLAO</p><h1 id="home-title">{t.title}</h1></div>
        <span className="bakery-count">{t.label}</span>
      </section>

      {picks.length ? <section className="bakery-products" aria-label={t.label}>
        {picks.map((product, index) => <article className="bakery-product" key={product.id}>
          <Link className={"bakery-art bakery-art-" + (index + 1)} href={"/producto/" + product.slug} aria-label={t.see + ": " + product.title}>
            {product.photo_urls[0] ? <img src={product.photo_urls[0]} alt="" /> : <div className="bakery-artwork" aria-hidden="true"><span>{index === 0 ? "✳" : "◉"}</span><i>{index === 0 ? "UNA BUENA PREGUNTA" : "UN PLAN PARA DOS"}</i></div>}
            {product.is_featured && <span className="bakery-tag">FAVORITO</span>}
          </Link>
          <div className="bakery-product-copy">
            <p className="bakery-category">{t.categories[product.category] || product.category}</p>
            <h2>{product.title}</h2>
            <p className="bakery-description">{shortDescription[locale][product.slug] || product.description}</p>
            <div className="bakery-product-bottom"><strong>{formatMoney(product.price_clp)}</strong><Link className="bakery-button" href={"/producto/" + product.slug}>{t.see}<span aria-hidden="true">↗</span></Link></div>
          </div>
        </article>)}
      </section> : <p className="bakery-empty">Pronto tendremos nuevas ideas.</p>}

      <section className="girls-section" aria-labelledby="girls-heading">
        <div className="girls-heading"><div><p className="bakery-kicker">JUEGUE · CALLAO</p><h2 id="girls-heading">{t.girls}</h2><p>{t.sample}</p></div><div className="girls-arrows"><button type="button" onClick={() => moveCarousel(-1)} aria-label={t.prev}>←</button><button type="button" onClick={() => moveCarousel(1)} aria-label={t.next}>→</button></div></div>
        <div className="girls-carousel" ref={carousel}>
          {profiles.map((profile, index) => <article className={"girl-card girl-" + profile.style} key={profile.name}>
            <div className="girl-portrait" aria-hidden="true"><span className="portrait-halo" /><svg viewBox="0 0 180 220" role="presentation"><path className="portrait-hair" d="M38 90c-7-48 18-72 52-72s61 24 53 74l-9 58H48z"/><path className="portrait-neck" d="M73 127h34v38H73z"/><ellipse className="portrait-face" cx="90" cy="91" rx="39" ry="48"/><path className="portrait-bangs" d="M52 78c4-38 23-54 41-54 30 0 42 19 41 51-16-2-27-12-35-23-11 15-27 24-47 26z"/><path className="portrait-body" d="M28 220c4-49 22-72 62-72s58 23 62 72z"/><path className="portrait-glow" d="M68 166l22 25 22-25 18 54H50z"/></svg><span className="girl-demo">DEMO</span></div>
            <div className="girl-copy"><div><h3>{profile.name}</h3><p>{t.plans[index]}</p></div><span className="girl-arrow" aria-hidden="true">↗</span><small>{t.perDate}</small></div>
          </article>)}
        </div>
      </section>

      <footer className="bakery-footer"><span>JUEGUE · CALLAO</span><span>{t.age}</span></footer>
    </main>
  );
}
