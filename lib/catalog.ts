import { createClient } from "@supabase/supabase-js";

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration_label: string | null;
  price_clp: number;
  photo_urls: string[];
  is_available: boolean;
  is_featured: boolean;
  is_published: boolean;
};

export type Promotion = {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string;
  button_text: string | null;
  button_href: string | null;
  image_url: string | null;
};

const demoProducts: Product[] = [
  { id: "sample-1", slug: "mazo-sin-filtro", title: "Mazo Sin Filtro", description: "Preguntas curiosas para soltar la primera risa y dejar que la conversación encuentre su camino.", category: "Para conversar", duration_label: "30 cartas", price_clp: 8990, photo_urls: [], is_available: true, is_featured: true, is_published: true },
  { id: "sample-2", slug: "kit-sobremesa", title: "Kit Sobremesa", description: "Un pequeño kit para alargar la charla: juego de mesa, velita y una playlist para compartir.", category: "Para compartir", duration_label: "Un plan para dos", price_clp: 14990, photo_urls: [], is_available: true, is_featured: true, is_published: true },
  { id: "sample-3", slug: "tarjetas-que-tal-si", title: "Tarjetas ¿Qué tal si…?", description: "Ideas rápidas para elegir el siguiente paso juntos, sin presión y con espacio para decir que no.", category: "Para salir", duration_label: "12 ideas", price_clp: 6990, photo_urls: [], is_available: true, is_featured: false, is_published: true },
];

export function isCatalogConnected() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function getCatalog(): Promise<Product[]> {
  const client = publicClient();
  if (!client) return demoProducts;
  const { data, error } = await client.from("products").select("id,slug,title,description,category,duration_label,price_clp,photo_urls,is_available,is_featured,is_published").eq("is_published", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) return [];
  return (data || []) as Product[];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const catalog = await getCatalog();
  return catalog.find((product) => product.slug === slug) || null;
}

export async function getHomePromotion(): Promise<Promotion | null> {
  const client = publicClient();
  if (!client) return { id: "sample-promo", eyebrow: "IDEA PARA ESTA NOCHE", title: "Una pregunta puede cambiar el plan.", body: "Empieza por una buena conversación y deja que lo demás fluya.", button_text: "Ver ideas", button_href: "/#productos", image_url: null };
  const { data, error } = await client.from("home_promotions").select("id,eyebrow,title,body,button_text,button_href,image_url").eq("is_active", true).order("sort_order", { ascending: true }).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as Promotion;
}
