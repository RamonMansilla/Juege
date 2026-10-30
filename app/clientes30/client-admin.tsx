"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { JuegueProfile } from "@/lib/catalog";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/webm"];
type Draft = Pick<JuegueProfile, "name" | "slug" | "headline" | "description" | "appointment_type" | "rate_label" | "is_available" | "is_published">;
type ChatLine = { role: "user" | "assistant"; content: string };
const emptyDraft: Draft = { name: "", slug: "", headline: "", description: "", appointment_type: "", rate_label: "Tarifa a consultar", is_available: false, is_published: false };

function makeSlug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = video.duration; URL.revokeObjectURL(url); Number.isFinite(duration) ? resolve(duration) : reject(new Error("No pudimos verificar la duración de uno de los videos.")); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos leer uno de los videos.")); };
    video.src = url;
  });
}

function MediaThumb({ url, remove }: { url: string; remove?: () => void }) {
  const isVideo = /\.(mp4|webm)(\?|$)/i.test(url);
  return <div className="profile-media-thumb">{isVideo ? <video src={url} controls playsInline /> : <img src={url} alt="Medio del perfil" />}{remove && <button type="button" onClick={remove} aria-label="Quitar medio">×</button>}</div>;
}

export default function ClientAdmin() {
  const [profiles, setProfiles] = useState<JuegueProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [media, setMedia] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([{ role: "assistant", content: "Cuéntame cómo quieres presentar este perfil. Te ayudo con un borrador breve; revisa y guarda los cambios." }]);
  const [chatBusy, setChatBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    const { data, error } = await createBrowserSupabase().from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    setProfiles((data || []) as JuegueProfile[]);
  }, []);

  useEffect(() => {
    refresh().catch((error) => setNote(error instanceof Error ? error.message : "No pudimos cargar los perfiles.")).finally(() => setLoading(false));
  }, [refresh]);

  function newProfile() {
    setSelectedId(null); setDraft(emptyDraft); setMedia([]); setFiles([]); setConsent(false); setChat([{ role: "assistant", content: "Cuéntame cómo quieres presentar este perfil. Te ayudo con un borrador breve; revisa y guarda los cambios." }]); setNote("");
  }
  function editProfile(profile: JuegueProfile) {
    setSelectedId(profile.id); setDraft({ name: profile.name, slug: profile.slug, headline: profile.headline, description: profile.description, appointment_type: profile.appointment_type, rate_label: profile.rate_label, is_available: profile.is_available, is_published: profile.is_published }); setMedia(profile.media_urls || []); setFiles([]); setConsent(false); setNote("");
  }

  async function chooseFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    if (media.length + files.length + incoming.length > 6) { setNote("Máximo 6 imágenes o videos por perfil."); return; }
    try {
      for (const file of incoming) {
        if (![...imageTypes, ...videoTypes].includes(file.type)) throw new Error("Usa imágenes JPG, PNG o WebP, o videos MP4/WebM.");
        if (file.size > 20 * 1024 * 1024) throw new Error("Cada archivo puede pesar hasta 20 MB.");
        if (videoTypes.includes(file.type) && await videoDuration(file) > 10) throw new Error("Cada video debe durar máximo 10 segundos.");
      }
      setFiles((current) => [...current, ...incoming]); setNote("");
    } catch (error) { setNote(error instanceof Error ? error.message : "Revisa los archivos seleccionados."); }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) { setNote("Para guardar en línea, conecta Supabase y ejecuta la migración 002_profiles.sql."); return; }
    if (!consent) { setNote("Confirma que la persona tiene 18 años o más y autorizó publicar este perfil y sus medios."); return; }
    if (media.length + files.length > 6) { setNote("Máximo 6 imágenes o videos por perfil."); return; }
    setSaving(true); setNote("");
    try {
      const supabase = createBrowserSupabase();
      const slug = draft.slug.trim() || makeSlug(draft.name);
      const mediaUrls = [...media];
      for (const file of files) {
        const path = slug + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const { error } = await supabase.storage.from("girl-media").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        mediaUrls.push(supabase.storage.from("girl-media").getPublicUrl(path).data.publicUrl);
      }
      const values = { slug, name: draft.name.trim(), headline: draft.headline.trim(), description: draft.description.trim(), appointment_type: draft.appointment_type.trim(), rate_label: draft.rate_label.trim() || "Tarifa a consultar", media_urls: mediaUrls, adult_consent_confirmed: true, is_available: draft.is_available, is_published: draft.is_published, updated_at: new Date().toISOString() };
      const result = selectedId ? await supabase.from("profiles").update(values).eq("id", selectedId) : await supabase.from("profiles").insert(values);
      if (result.error) throw result.error;
      await refresh(); setFiles([]); setConsent(false); setNote("Perfil guardado.");
    } catch (error) { setNote(error instanceof Error ? error.message : "No pudimos guardar el perfil."); }
    finally { setSaving(false); }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = message.trim();
    if (!prompt) return;
    const next = [...chat, { role: "user" as const, content: prompt }];
    setChat(next); setMessage(""); setChatBusy(true);
    try {
      const response = await fetch("/api/clientes30/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8), profile: draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "El asistente no pudo responder.");
      setChat((current) => [...current, { role: "assistant", content: result.reply }]);
      if (result.draft) setDraft((current) => ({ ...current, ...result.draft, slug: selectedId ? current.slug : makeSlug(result.draft.name || current.name) }));
    } catch (error) { setChat((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "No se pudo conectar con la IA." }]); }
    finally { setChatBusy(false); }
  }

  return <main className="admin-shell clients-admin">
    <header className="admin-top"><Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao · clientes30</span></Link><Link className="quiet-button" href="/">Ver sitio ↗</Link></header>
    <section className="admin-heading"><div><span className="eyebrow">PERFILES · CITAS +18</span><h1>Tu equipo, tu estilo.</h1></div><button className="button button-bright" type="button" onClick={newProfile}>+ Nueva chica</button></section>
    <div className="notice-box open-admin-warning">Panel sin contraseña, como pediste. Cualquier persona con esta dirección puede editar perfiles y subir medios.</div>
    {!configured && <div className="form-error" style={{ marginTop: 12 }}>Falta conectar Supabase para guardar perfiles y archivos en línea. Ejecuta <code>supabase/migrations/002_profiles.sql</code> y configura sus variables en Vercel.</div>}
    {note && <div className="notice-box" role="status" style={{ marginTop: 12 }}>{note}</div>}
    <div className="profile-admin-layout">
      <section className="admin-panel profile-admin-list"><div className="profile-admin-list-head"><h2>Perfiles</h2><span>{profiles.length}</span></div>{loading ? <p className="admin-empty">Cargando…</p> : profiles.length ? profiles.map((profile) => <button type="button" className={"profile-admin-row " + (profile.id === selectedId ? "active" : "")} key={profile.id} onClick={() => editProfile(profile)}><span className="profile-admin-avatar">{profile.media_urls[0] ? <img src={profile.media_urls[0]} alt="" /> : profile.name.slice(0,1).toUpperCase()}</span><span><b>{profile.name}</b><small>{profile.is_published ? "Publicado" : "Borrador"} · {profile.media_urls.length}/6 medios</small></span><span className="girl-arrow">↗</span></button>) : <p className="admin-empty">Crea el primer perfil.</p>}</section>
      <section className="admin-panel profile-editor"><h2>{selectedId ? "Editar perfil" : "Nuevo perfil"}</h2><form className="admin-form" onSubmit={saveProfile}>
        <label className="field-label">Nombre<input required maxLength={80} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, slug: selectedId ? current.slug : makeSlug(event.target.value) }))} /></label>
        <label className="field-label">Frase corta<input maxLength={140} value={draft.headline} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} placeholder="Compañía para una buena conversación" /></label>
        <label className="field-label">Descripción<textarea maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        <div className="form-two"><label className="field-label">Tipo de cita<input maxLength={100} value={draft.appointment_type} onChange={(event) => setDraft({ ...draft, appointment_type: event.target.value })} placeholder="Cena y conversación" /></label><label className="field-label">Tarifa<input maxLength={80} value={draft.rate_label} onChange={(event) => setDraft({ ...draft, rate_label: event.target.value })} placeholder="A consultar" /></label></div>
        <label className="upload-box">Fotos o videos · {media.length + files.length}/6<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={(event) => { void chooseFiles(event.target.files); event.currentTarget.value = ""; }} /><span>Hasta 6 medios · MP4/WebM máximo 10 s · 20 MB por archivo.</span></label>
        {(media.length + files.length > 0) && <div className="profile-media-grid">{media.map((url, index) => <MediaThumb key={url} url={url} remove={() => setMedia((current) => current.filter((_, item) => item !== index))} />)}{files.map((file, index) => <LocalMedia key={file.name + file.size} file={file} remove={() => setFiles((current) => current.filter((_, item) => item !== index))} />)}</div>}
        <label className="toggle-line"><input type="checkbox" checked={draft.is_available} onChange={(event) => setDraft({ ...draft, is_available: event.target.checked })} /> Disponible para citas</label>
        <label className="toggle-line"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /> Publicar en el carrusel</label>
        <label className="toggle-line consent-line"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Confirmo que tiene 18+ y autorizó publicar este perfil y sus fotos/videos.</label>
        <button className="button button-bright button-full" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar perfil"} <span aria-hidden="true">↗</span></button>
      </form></section>
      <section className="admin-panel profile-chat"><span className="eyebrow ai-label">✦ JUEGUE AI</span><h2>Chat de perfil</h2><p>Escribe qué quieres destacar. La IA propone cambios; tú decides si los guardas.</p><div className="profile-chat-lines" aria-live="polite">{chat.map((line, index) => <div key={index} className={"profile-chat-line " + line.role}>{line.content}</div>)}{chatBusy && <div className="profile-chat-line assistant">Preparando propuesta…</div>}</div><form onSubmit={sendMessage} className="profile-chat-form"><textarea aria-label="Mensaje para la IA" maxLength={600} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ej. Hazlo cálido y directo, sin inventar datos." /><button className="button button-bright button-full" type="submit" disabled={chatBusy || !message.trim()}>Enviar al chat <span aria-hidden="true">↗</span></button></form></section>
    </div>
  </main>;
}

function LocalMedia({ file, remove }: { file: File; remove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  return <div className="profile-media-thumb">{file.type.startsWith("video/") ? <video src={url} controls playsInline /> : <img src={url} alt={file.name} />}<button type="button" onClick={remove} aria-label="Quitar medio">×</button></div>;
}
