import Link from "next/link";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  return <main className="auth-shell">
    <section className="auth-card">
      <Link className="wordmark" href="/"><span className="wordmark-name">JUEGUE<span className="wordmark-dot">.</span></span><span className="wordmark-place">callao</span></Link>
      <h1>Hola, equipo.</h1>
      <p>Entra al espacio privado para editar el catálogo, las promos de portada y las reservas confirmadas.</p>
      <LoginNotice searchParams={searchParams} />
      <LoginForm />
      <div className="auth-foot">El panel no tiene registro público. Solo pueden entrar cuentas autorizadas por RAMNCO.</div>
    </section>
  </main>;
}

async function LoginNotice({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const params = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <div className="notice-box">El acceso del equipo se activa al conectar Supabase. Ninguna cuenta de muestra está habilitada.</div>;
  if (params.denied) return <div className="form-error" role="status">Esta cuenta no tiene acceso al panel. Pide a un administrador que la habilite.</div>;
  return null;
}
