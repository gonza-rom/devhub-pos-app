"use client";
// app/(public)/auth/recuperar/page.tsx
// Formulario para pedir el link de recuperación de contraseña

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email,   setEmail]   = useState("");
  const [cargando, setCargando] = useState(false);
  const [error,   setError]   = useState("");
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/nueva-password`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err: any) {
      setError(err.message ?? "Error al enviar el email");
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="auth-shell">
        <div className="auth-glow" />
        <div className="auth-card" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.25rem",
            background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail className="h-7 w-7" style={{ color: "#DC2626" }} />
          </div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: "1.375rem",
            fontWeight: 700, color: "#fff", margin: "0 0 0.5rem",
          }}>
            Revisá tu correo
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#71717a", margin: "0 0 0.25rem", lineHeight: 1.6 }}>
            Te enviamos las instrucciones a
          </p>
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#f4f4f5", margin: "0 0 1.25rem" }}>
            {email}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#52525b", lineHeight: 1.7, margin: "0 0 1.5rem" }}>
            Hacé click en el link del email para crear una nueva contraseña.<br />
            El link expira en 1 hora.
          </p>
          <Link href="/auth/login" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.8125rem", color: "#DC2626", textDecoration: "none", fontWeight: 600,
          }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
          </Link>
        </div>
        <style>{authStyles}</style>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow" />
      <div className="auth-card">

        <div className="auth-logo-wrap">
          <div className="auth-logo-icon">
            <Store className="h-5 w-5" style={{ color: "#DC2626" }} />
          </div>
          <span className="auth-logo-text">DevHub POS</span>
        </div>

        <div className="auth-heading">
          <h1>Recuperar contraseña</h1>
          <p>Te enviamos un link para crear una nueva</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email" type="email" autoComplete="email"
              placeholder="tu@correo.com" value={email}
              onChange={e => setEmail(e.target.value)} required disabled={cargando}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={cargando}>
            {cargando
              ? <span className="auth-spinner" />
              : <><ArrowRight className="h-4 w-4" />Enviar link de recuperación</>
            }
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/auth/login" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
          </Link>
        </p>
      </div>
      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
  .auth-shell {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 1.5rem; background: #0a0a0a; position: relative; overflow: hidden;
  }
  .auth-glow {
    position: fixed; top: -20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse at center, rgba(220,38,38,0.11) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .auth-card {
    position: relative; z-index: 1; width: 100%; max-width: 420px;
    background: #111111; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 2rem;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.6);
  }
  .auth-logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 1.75rem; }
  .auth-logo-icon {
    width: 36px; height: 36px; background: rgba(220,38,38,0.12);
    border: 1px solid rgba(220,38,38,0.25); border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-logo-text { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; color: #fff; }
  .auth-heading { margin-bottom: 1.5rem; }
  .auth-heading h1 {
    font-family: 'Syne', sans-serif; font-size: 1.5rem; font-weight: 700;
    color: #fff; margin: 0 0 0.375rem; letter-spacing: -0.02em;
  }
  .auth-heading p { font-size: 0.875rem; color: #71717a; margin: 0; }
  .auth-error {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25);
    border-radius: 10px; color: #f87171; font-size: 0.8125rem; margin-bottom: 1.25rem;
  }
  .auth-form { display: flex; flex-direction: column; gap: 1rem; }
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-field label { font-size: 0.75rem; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
  .auth-field input {
    width: 100%; padding: 10px 14px; background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    color: #f4f4f5; font-size: 0.875rem; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .auth-field input::placeholder { color: #3f3f46; }
  .auth-field input:focus { border-color: rgba(220,38,38,0.45); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
  .auth-field input:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-submit {
    margin-top: 0.25rem; width: 100%; display: flex; align-items: center;
    justify-content: center; gap: 8px; padding: 11px 20px;
    background: #DC2626; border: none; border-radius: 10px;
    color: #fff; font-size: 0.9375rem; font-weight: 600;
    font-family: 'DM Sans', sans-serif; cursor: pointer;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .auth-submit:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(220,38,38,0.3); }
  .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-spinner {
    display: inline-block; width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
    border-radius: 50%; animation: auth-spin 0.7s linear infinite;
  }
  @keyframes auth-spin { to { transform: rotate(360deg); } }
  .auth-footer { margin-top: 1.5rem; text-align: center; font-size: 0.8125rem; color: #52525b; }
  .auth-footer a { color: #DC2626; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
  .auth-footer a:hover { color: #ef4444; }
`;