"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
      setBusy(false);
    }
  }

  return <form className="checkout-form" onSubmit={submit}>
    <label className="field-label">Correo de trabajo <input required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="equipo@juegue.cl" /></label>
    <label className="field-label">Contraseña <input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="button button-bright button-full" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Entrar al panel"} <span aria-hidden="true">↗</span></button>
  </form>;
}
