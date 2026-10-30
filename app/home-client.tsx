"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/pricing";
import type { Product, Promotion } from "@/lib/catalog";
import { useLanguage, type Locale } from "@/lib/language";

const text: Record<Locale, { title: string; label: string; see: string; available: string; age: string; categories: Record<string, string> }> = {
  es: { title: "Elige tu plan.", label: "2 ideas para esta noche", see: "Ver producto", available: "Disponible", age: "18+ · con respeto", categories: { "Para conversar": "Para conversar", "Para compartir": "Para compartir", "Para salir": "Para salir" } },
  en: { title: "Pick your plan.", label: "2 ideas for tonight", see: "View details", available: "Available", age: "18+ · be respectful", categories: { "Para conversar": "To talk", "Para compartir": "To share", "Para salir": "To go out" } },
  pt: { title: "Escolha seu plano.", label: "2 ideias para hoje", see: "Ver produto", available: "Disponível", age: "18+ · com respeito", categories: { "Para conversar": "Para conversar", "Para compartir": "Para compartilhar", "Para salir": "Para sair" } },
  fr: { title: "Choisis ton idée.", label: "2 idées pour ce soir", see: "Voir le produit", available: "Disponible", age: "18+ · avec respect", categories: { "Para conversar": "Pour discuter", "Para compartir": "À partager", "Para salir": "Pour sortir" } },
  ca: { title: "Tria el teu pla.", label: "2 idees per aquesta nit", see: "Veure producte", available: "Disponible", age: "18+ · amb respecte", categories: { "Para conversar": "Per conversar", "Para compartir": "Per compartir", "Para salir": "Per sortir" } },
};

const shortDescription: Record<Locale, Record<string, string>> = {
  es: { "mazo-sin-filtro": "Preguntas para romper el hielo.", "kit-sobremesa": "Juego, vela y playlist para compartir.", "tarjetas-que-tal-si": "Ideas breves para elegir juntos." },
  en: { "mazo-sin-filtro": "Questions to break the ice.", "kit-sobremesa": "A game, candle and playlist to share.", "tarjetas-que-tal-si": "Quick ideas to choose together." },
  pt: { "mazo-sin-filtro": "Perguntas para quebrar o gelo.", "kit-sobremesa": "Jogo, vela e playlist para compartilhar.", "tarjetas-que-tal-si": "Ideias rápidas para escolher juntos." },
  fr: { "mazo-sin-filtro": "Des questions pour briser la glace.", "kit-sobremesa": "Jeu, bougie et playlist à partager.", "tarjetas-que-tal-si": "Des idées pour choisir ensemble." },
  ca: { "mazo-sin-filtro": "Preguntes per trencar el gel.", "kit-sobremesa": "Joc, espelma i playlist per compartir.", "tarjetas-que-tal-si": "Idees breus per triar plegats." },
};
const languages: Locale[] = ["es", "en", "pt", "fr", "ca"];

export default function HomeClient({ products }: { products: Product[]; promotion?: Promotion | null; demo: boolean }) {
  const { locale, setLocale } = useLanguage();
  const t = text[locale];
  const featured = products.filter((item) => item.is_featured && item.is_available);
  const picks = (featured.length >= 2 ? featured : [...featured, ...products.filter((item) => item.is_available && !featured.some((featuredItem) => featuredItem.id === item.id))]).slice(0, 2);

  return (
    <main className="bakery-home">
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

      <footer className="bakery-footer"><span>JUEGUE · CALLAO</span><span>{t.age}</span></footer>
    </main>
  );
}
