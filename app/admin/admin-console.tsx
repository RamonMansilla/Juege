"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { formatMoney, RAMNCO_FEE_BASE, RAMNCO_FEE_RATE } from "@/lib/pricing";

type Tab = "products" | "promotions" | "reservations";
type Promo = { id: string; eyebrow: string; title: string; body: string; button_text: string; button_href: string; is_active: boolean; image_url: string | null };
type Reservation = { id: string; customer_name: string | null; customer_email: string; product_snapshot: { title?: string; price_clp?: number } | null; deposit_amount: number; platform_fee: number; store_deposit: number; balance_due: number; currency: string; paid_at: string | null; notification_status?: string };
type Draft = { title: string; slug: string; description: string; category: string; duration_label: string; price_clp: string; is_available: boolean; is_featured: boolean; is_published: boolean };
type PromoDraft = { eyebrow: string; title: string; body: string; button_text: string; button_href: string; is_active: boolean };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const emptyProduct: Draft = { title: "", slug: "", description: "", category: "Para conversar", duration_label: "", price_clp: "", is_available: true, is_featured: false, is_published: true };
const emptyPromo: PromoDraft = { eyebrow: "IDEA PARA ESTA NOCHE", title: "", body: "", button_text: "Ver ideas", button_href: "/#productos", is_active: true };
const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img src={url} alt={file.name} /> : null;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function asProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id), slug: String(row.slug), title: String(row.title), description: String(row.description),
    category: String(row.category), duration_label: row.duration_label ? String(row.duration_label) : null,
    price_clp: Number(row.price_clp), photo_urls: Array.isArray(row.photo_urls) ? row.photo_urls.map(String) : [],
    is_available: Boolean(row.is_available), is_featured: Boolean(row.is_featured), is_published: Boolean(row.is_published),
  };
}

export default function AdminConsole({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promo[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyProduct);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [promoDraft, setPromoDraft] = useState<PromoDraft>(emptyPromo);
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);
  const [assistantKind, setAssistantKind] = useState<"product" | "promotion">("product");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantFiles, setAssistantFiles] = useState<File[]>([]);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [assistantNote, setAssistantNote] = useState("");
  const speechRef = useRef<SpeechRecognitionLike | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const [productResult, promoResult, reservationResult, notificationResult] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("home_promotions").select("*").order("sort_order", { ascending: true }),
      supabase.from("reservations").select("id,customer_name,customer_email,product_snapshot,deposit_amount,platform_fee,store_deposit,balance_due,currency,paid_at").eq("status", "paid").order("paid_at", { ascending: false }).limit(50),
      supabase.from("reservation_notifications").select("reservation_id,status"),
    ]);
    if (productResult.error) throw productResult.error;
    if (promoResult.error) throw promoResult.error;
    if (reservationResult.error) throw reservationResult.error;
    if (notificationResult.error) throw notificationResult.error;
    const notificationStatuses = new Map((notificationResult.data || []).map((item) => [String(item.reservation_id), String(item.status)]));
    setProducts((productResult.data || []).map((row) => asProduct(row as Record<string, unknown>)));
    setPromotions((promoResult.data || []) as Promo[]);
    setReservations((reservationResult.data || []).map((row) => ({ ...row, notification_status: notificationStatuses.get(String(row.id)) || "pending" })) as Reservation[]);
  }, []);

  useEffect(() => {
    let active = true;
    refresh().catch((cause) => setMessage(cause instanceof Error ? cause.message : "No pudimos cargar el panel.")).finally(() => { if (active) setLoading(false); });
    const timer = window.setInterval(() => { refresh().catch(() => undefined); }, 20000);
    return () => { active = false; window.clearInterval(timer); speechRef.current?.stop(); };
  }, [refresh]);

  const selected = useMemo(() => products.find((item) => item.id === selectedProduct), [products, selectedProduct]);
  const commissionBase = RAMNCO_FEE_BASE === "deposit_amount" ? "del abono" : "del precio total";
  const commissionPercent = Math.round(RAMNCO_FEE_RATE * 100);

  function newProduct() {
    setSelectedProduct(null);
    setDraft(emptyProduct);
    setProductFiles([]);
    setTab("products");
    setMessage("");
  }

  function editProduct(product: Product) {
    setSelectedProduct(product.id);
    setDraft({ title: product.title, slug: product.slug, description: product.description, category: product.category, duration_label: product.duration_label || "", price_clp: String(product.price_clp), is_available: product.is_available, is_featured: product.is_featured, is_published: product.is_published });
    setProductFiles([]);
    setMessage("");
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(draft.price_clp);
    if (!draft.title.trim() || !draft.description.trim() || !Number.isInteger(price) || price < 1) {
      setMessage("Completa título, descripción y un precio entero mayor a cero.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserSupabase();
      const values = { title: draft.title.trim(), slug: (draft.slug || slugify(draft.title)).trim(), description: draft.description.trim(), category: draft.category, duration_label: draft.duration_label.trim() || null, price_clp: price, is_available: draft.is_available, is_featured: draft.is_featured, is_published: draft.is_published, updated_at: new Date().toISOString() };
      let productId = selectedProduct;
      if (productId) {
        const { error } = await supabase.from("products").update(values).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(values).select("id").single();
        if (error) throw error;
        productId = String(data.id);
      }
      if (productFiles.length) {
        const urls: string[] = [];
        for (const file of productFiles) {
          if (!acceptedImageTypes.includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Usa fotos JPG, PNG o WebP de hasta 8 MB cada una.");
          const objectPath = productId + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const { error: uploadError } = await supabase.storage.from("product-images").upload(objectPath, file, { upsert: false, contentType: file.type });
          if (uploadError) throw uploadError;
          urls.push(supabase.storage.from("product-images").getPublicUrl(objectPath).data.publicUrl);
        }
        const { error } = await supabase.from("products").update({ photo_urls: urls, updated_at: new Date().toISOString() }).eq("id", productId);
        if (error) throw error;
      }
      await refresh();
      setSelectedProduct(productId);
      setProductFiles([]);
      setMessage("Producto guardado. " + (productFiles.length ? "Las nuevas fotos ya están en la galería." : ""));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo guardar el producto.");
    } finally {
      setBusy(false);
    }
  }

  async function hideProduct(product: Product) {
    if (!window.confirm("¿Ocultar “" + product.title + "” del catálogo? Las reservas existentes se conservan.")) return;
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("products").update({ is_published: false, is_available: false, updated_at: new Date().toISOString() }).eq("id", product.id);
      if (error) throw error;
      await refresh();
      if (selectedProduct === product.id) newProduct();
      setMessage("Producto ocultado del catálogo.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo ocultar el producto.");
    }
  }

  function editPromotion(promo?: Promo) {
    setSelectedPromo(promo?.id || null);
    setPromoDraft(promo ? { eyebrow: promo.eyebrow || "", title: promo.title, body: promo.body, button_text: promo.button_text || "Ver ideas", button_href: promo.button_href || "/#productos", is_active: promo.is_active } : emptyPromo);
    setTab("promotions");
    setMessage("");
  }

  async function savePromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!promoDraft.title.trim() || !promoDraft.body.trim()) {
      setMessage("Completa el título y el mensaje de la promoción.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserSupabase();
      const values = { eyebrow: promoDraft.eyebrow.trim(), title: promoDraft.title.trim(), body: promoDraft.body.trim(), button_text: promoDraft.button_text.trim() || "Ver ideas", button_href: promoDraft.button_href.trim() || "/#productos", is_active: promoDraft.is_active, updated_at: new Date().toISOString() };
      const result = selectedPromo
        ? await supabase.from("home_promotions").update(values).eq("id", selectedPromo)
        : await supabase.from("home_promotions").insert(values);
      if (result.error) throw result.error;
      await refresh();
      setMessage("Promoción guardada.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo guardar la promoción.");
    } finally {
      setBusy(false);
    }
  }

  async function removePromotion(promo: Promo) {
    if (!window.confirm("¿Quitar “" + promo.title + "” de las promociones?")) return;
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("home_promotions").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", promo.id);
      if (error) throw error;
      await refresh();
      setMessage("Promoción pausada.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo pausar la promoción.");
    }
  }

  async function createWithAssistant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssistantBusy(true);
    setAssistantNote("");
    const form = new FormData();
    form.set("kind", assistantKind);
    form.set("prompt", assistantPrompt);
    assistantFiles.forEach((file) => form.append("photos", file));
    try {
      const response = await fetch("/api/admin/assistant", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.draft) throw new Error(result.error || "La IA no pudo preparar el borrador.");
      const value = result.draft;
      if (assistantKind === "product") {
        setDraft({ ...emptyProduct, title: value.title || "", slug: slugify(value.title || ""), description: value.description || "", category: value.category || "Para conversar", duration_label: value.duration_label || "", price_clp: value.price_clp ? String(value.price_clp) : "", is_available: true, is_featured: Boolean(value.is_featured), is_published: false });
        setSelectedProduct(null);
        setProductFiles(assistantFiles);
        setTab("products");
        setAssistantNote(value.price_clp ? "Borrador listo. Revisa el texto, el precio y las fotos antes de publicarlo." : "Borrador listo. La IA dejó el precio vacío para que tú lo definas.");
      } else {
        setPromoDraft({ ...emptyPromo, eyebrow: value.eyebrow || emptyPromo.eyebrow, title: value.title || "", body: value.body || "", button_text: value.button_text || "Ver ideas", is_active: false });
        setSelectedPromo(null);
        setTab("promotions");
        setAssistantNote("Promoción en borrador. Revisa y publícala cuando quieras.");
      }
      setAssistantPrompt("");
      setAssistantFiles([]);
    } catch (cause) {
      setAssistantNote(cause instanceof Error ? cause.message : "No se pudo preparar el borrador.");
    } finally {
      setAssistantBusy(false);
    }
  }

  function dictate(target: "product" | "promotion") {
    const browser = window as SpeechWindow;
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("El dictado por voz no está disponible en este navegador. Puedes escribir aquí.");
      return;
    }
    if (listening) {
      speechRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "es-CL";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (target === "product") setDraft((current) => ({ ...current, description: current.description ? current.description + " " + transcript : transcript }));
      else setPromoDraft((current) => ({ ...current, body: current.body ? current.body + " " + transcript : transcript }));
    };
    recognition.onerror = () => setMessage("No se pudo completar el dictado. Revisa el permiso del micrófono.");
    recognition.onend = () => setListening(false);
    speechRef.current = recognition;
    recognition.start();
    setListening(true);
    setMessage("");
  }

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    window.location.assign("/admin/login");
  }

  return <main className="admin-shell">
    <header className="admin-top">
      <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao · tienda</span></Link>
      <div className="admin-top-right"><span>{email}</span><button className="quiet-button" onClick={signOut}>Salir</button></div>
    </header>
    <section className="admin-heading"><div><span className="eyebrow">ESPACIO PRIVADO · RAMNCO</span><h1>Tu vitrina, tu noche.</h1></div><p>Edita productos, imágenes y promociones. Las reservas aparecen aquí solo después de la confirmación segura del pago.</p></section>
    <nav className="admin-tabs" aria-label="Secciones de administración">
      <button className={tab === "products" ? "active" : ""} onClick={() => { setTab("products"); setAssistantKind("product"); }}>Productos <span>{products.length}</span></button>
      <button className={tab === "promotions" ? "active" : ""} onClick={() => { setTab("promotions"); setAssistantKind("promotion"); }}>Portada y promos <span>{promotions.length}</span></button>
      <button className={tab === "reservations" ? "active" : ""} onClick={() => setTab("reservations")}>Reservas confirmadas <span>{reservations.length}</span></button>
    </nav>

    {message && <div className="notice-box" role="status" style={{ marginTop: 15 }}>{message}</div>}
    {loading ? <div className="admin-empty">Cargando tu vitrina…</div> : tab === "products" ? <div className="admin-grid">
      <section className="admin-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2>Productos del catálogo</h2><button className="quiet-button" onClick={newProduct}>+ Agregar</button>
        </div>
        {products.length ? <div className="admin-product-list">{products.map((product) => <div className="admin-product-row" key={product.id}>
          <div className="admin-thumb">{product.photo_urls[0] && <img src={product.photo_urls[0]} alt="" />}{!product.photo_urls[0] && "✳"}</div>
          <div className="admin-product-name"><b>{product.title}</b><span>{formatMoney(product.price_clp)} · {product.is_available ? "Disponible" : "No disponible"}{!product.is_published ? " · Oculto" : ""}</span></div>
          <div className="admin-row-actions"><button className="mini-button" onClick={() => editProduct(product)}>Editar</button><button className="mini-button danger" onClick={() => hideProduct(product)}>Ocultar</button></div>
        </div>)}</div> : <div className="admin-empty">Todavía no hay productos. Crea uno aquí o pídele a la IA un primer borrador.</div>}
      </section>
      <section className="admin-panel form-panel">
        <h2>{selected ? "Editar producto" : "Nuevo producto"}</h2>
        <form className="admin-form" onSubmit={saveProduct}>
          <label className="field-label">Título<input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: selectedProduct ? draft.slug : slugify(event.target.value) })} placeholder="Ej. Mazo de preguntas" /></label>
          <div className="form-two"><label className="field-label">Categoría<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>Para conversar</option><option>Para compartir</option><option>Para salir</option><option>Detalles de noche</option></select></label><label className="field-label">Duración o formato<input maxLength={60} value={draft.duration_label} onChange={(event) => setDraft({ ...draft, duration_label: event.target.value })} placeholder="30 cartas" /></label></div>
          <label className="field-label">Descripción<textarea required maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Cuenta qué hace especial a este producto." /></label>
          <button className={"voice-button " + (listening ? "listening" : "")} type="button" onClick={() => dictate("product")}>{listening ? "■ Detener dictado" : "◉ Dictar descripción"}</button>
          <label className="field-label">Precio total<input required type="number" min="1" step="1" inputMode="numeric" value={draft.price_clp} onChange={(event) => setDraft({ ...draft, price_clp: event.target.value })} placeholder="12990" /></label>
          <label className="upload-box">Fotos del producto · puedes elegir varias<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setProductFiles(Array.from(event.target.files || []))} /><span>JPG, PNG o WebP · hasta 8 MB cada una. Seleccionar nuevas fotos reemplaza la galería.</span>
            {productFiles.length > 0 && <div className="upload-previews">{productFiles.map((file) => <FilePreview key={file.name + file.size} file={file} />)}</div>}
          </label>
          {selected?.photo_urls?.length ? <div className="upload-previews">{selected.photo_urls.map((url) => <img key={url} src={url} alt="Foto actual del producto" />)}</div> : null}
          <label className="toggle-line"><input type="checkbox" checked={draft.is_available} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })} /> Disponible para reservar</label>
          <label className="toggle-line"><input type="checkbox" checked={draft.is_featured} onChange={(event) => setDraft({ ...draft, is_featured: event.target.checked })} /> Destacar en el inicio</label>
          <label className="toggle-line"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /> Mostrar en el catálogo</label>
          <button className="button button-bright button-full" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar producto"} <span aria-hidden="true">↗</span></button>
        </form>
      </section>
      <section className="admin-panel ai-panel">
        <span className="eyebrow ai-label">✦ ASISTENTE JUEGUE</span><h2>¿Qué quieres crear?</h2><p>Cuéntaselo en una frase. Para un producto, adjunta las fotos y la IA prepara título, descripción, categoría y un borrador de precio cuando tengas una referencia. Nada se publica sin tu revisión.</p>
        <form className="admin-form" onSubmit={createWithAssistant}>
          <label className="field-label">Quiero crear<select value={assistantKind} onChange={(event) => setAssistantKind(event.target.value as "product" | "promotion")}><option value="product">Un producto</option><option value="promotion">Una promoción para el inicio</option></select></label>
          <label className="field-label">Cuéntame la idea<textarea required maxLength={900} value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder={assistantKind === "product" ? "Ej. Un mazo breve para romper el hielo en una primera cita." : "Ej. Promociona el mazo de conversación para este fin de semana."} /></label>
          <label className="upload-box">Fotos de referencia <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setAssistantFiles(Array.from(event.target.files || []))} /><span>La IA puede describir tus fotos y preparar el borrador del producto.</span>{assistantFiles.length > 0 && <div className="upload-previews">{assistantFiles.map((file) => <FilePreview key={file.name + file.size} file={file} />)}</div>}</label>
          {assistantNote && <div className="notice-box" role="status">{assistantNote}</div>}
          <button className="button button-bright button-full" type="submit" disabled={assistantBusy}>{assistantBusy ? "Preparando borrador…" : "Crear un borrador"} <span aria-hidden="true">✦</span></button>
        </form>
      </section>
    </div> : tab === "promotions" ? <div className="admin-grid">
      <section className="admin-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h2>Mensajes de portada</h2><button className="quiet-button" onClick={() => editPromotion()}>+ Crear promo</button></div>
        {promotions.length ? <div className="admin-product-list">{promotions.map((promo) => <div className="admin-product-row" key={promo.id}>
          <div className="admin-thumb">✦</div><div className="admin-product-name"><b>{promo.title}</b><span>{promo.is_active ? "Visible en inicio" : "Pausada"}</span></div>
          <div className="admin-row-actions"><button className="mini-button" onClick={() => editPromotion(promo)}>Editar</button><button className="mini-button danger" onClick={() => removePromotion(promo)}>Pausar</button></div>
        </div>)}</div> : <div className="admin-empty">Todavía no hay promociones. Pídele a la IA un borrador o crea una desde aquí.</div>}
      </section>
      <section className="admin-panel form-panel"><h2>{selectedPromo ? "Editar promoción" : "Nueva promoción"}</h2>
        <form className="admin-form" onSubmit={savePromotion}>
          <label className="field-label">Antetítulo<input maxLength={80} value={promoDraft.eyebrow} onChange={(event) => setPromoDraft({ ...promoDraft, eyebrow: event.target.value })} /></label>
          <label className="field-label">Título<input required maxLength={100} value={promoDraft.title} onChange={(event) => setPromoDraft({ ...promoDraft, title: event.target.value })} /></label>
          <label className="field-label">Mensaje<textarea required maxLength={500} value={promoDraft.body} onChange={(event) => setPromoDraft({ ...promoDraft, body: event.target.value })} /></label>
          <button className={"voice-button " + (listening ? "listening" : "")} type="button" onClick={() => dictate("promotion")}>{listening ? "■ Detener dictado" : "◉ Dictar mensaje"}</button>
          <div className="form-two"><label className="field-label">Texto del botón<input maxLength={40} value={promoDraft.button_text} onChange={(event) => setPromoDraft({ ...promoDraft, button_text: event.target.value })} /></label><label className="field-label">Enlace<input maxLength={180} value={promoDraft.button_href} onChange={(event) => setPromoDraft({ ...promoDraft, button_href: event.target.value })} /></label></div>
          <label className="toggle-line"><input type="checkbox" checked={promoDraft.is_active} onChange={(event) => setPromoDraft({ ...promoDraft, is_active: event.target.checked })} /> Publicar en la portada</label>
          <button className="button button-bright button-full" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar promoción"} <span aria-hidden="true">↗</span></button>
        </form>
      </section>
      <section className="admin-panel ai-panel"><span className="eyebrow ai-label">✦ ASISTENTE JUEGUE</span><h2>¿Qué quieres promocionar?</h2><p>Describe el producto o el tono de la campaña. El asistente redacta una propuesta que puedes ajustar y dejar en pausa.</p>
        <form className="admin-form" onSubmit={createWithAssistant}>
          <input type="hidden" value="promotion" />
          <label className="field-label">Idea<textarea required maxLength={900} value={assistantPrompt} onChange={(event) => setAssistantPrompt(event.target.value)} placeholder="Ej. Una promoción breve y divertida para el fin de semana." /></label>
          {assistantNote && <div className="notice-box" role="status">{assistantNote}</div>}
          <button className="button button-bright button-full" type="submit" disabled={assistantBusy}>{assistantBusy ? "Preparando…" : "Crear un borrador"} <span aria-hidden="true">✦</span></button>
        </form>
      </section>
    </div> : <section className="admin-grid">
      <div className="admin-panel"><h2>Reservas con pago confirmado</h2><p className="admin-empty">La lista se actualiza cada 20 segundos. El regreso desde el checkout no confirma una reserva; solo cuenta el webhook validado.</p>
        {reservations.length ? <div className="order-list">{reservations.map((reservation) => <article className="order-row" key={reservation.id}>
          <div><b>{reservation.product_snapshot?.title || "Producto reservado"}</b><br /><span>{reservation.customer_name || "Cliente"} · {reservation.customer_email}</span><br /><span>{reservation.paid_at ? new Date(reservation.paid_at).toLocaleString("es-CL") : "Pago confirmado"}</span></div>
          <div><span className="status-pill">PAGADO</span><br /><strong>Abono {formatMoney(reservation.deposit_amount, reservation.currency)}</strong><br /><span>Tienda: {formatMoney(reservation.store_deposit, reservation.currency)}</span><br /><span>Saldo: {formatMoney(reservation.balance_due, reservation.currency)}</span><br /><span>Aviso: {reservation.notification_status === "sent" ? "enviado" : reservation.notification_status === "failed" ? "pendiente de reintento" : "en cola"}</span></div>
        </article>)}</div> : <div className="admin-empty">Aún no hay pagos confirmados. Cuando llegue un webhook válido, la reserva y su aviso a la tienda aparecerán aquí.</div>}
      </div>
      <div className="admin-panel"><h2>Cómo se reparte el abono</h2><div className="price-line"><span>Abono pagado</span><strong>{Math.round(Number(process.env.NEXT_PUBLIC_DEPOSIT_RATE || "0.1") * 100)}% del precio</strong></div><div className="price-line"><span>RAMNCO</span><strong>{commissionPercent}% {commissionBase}</strong></div><div className="price-line"><span>Para la tienda</span><strong>Abono menos RAMNCO</strong></div><p className="price-note">La base y el porcentaje de RAMNCO se pueden cambiar en la configuración. El proveedor puede descontar su propia tarifa.</p></div>
    </section>}
  </main>;
}
