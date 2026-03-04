"use client";
// app/(public)/auth/nueva-password/page.tsx
// Supabase redirige aquí después del link de recuperación
// El usuario ingresa y confirma su nueva contraseña

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Store, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NuevaPasswordPage() {
  const [password,   setPassword]   = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState("");
  const [listo,      setListo]      = useState(false);
  const [sesionOk,   setSesionOk]   = useState(false);
  const router = useRouter();

  const passLen    = password.length >= 8;
  const passUpper  = /[A-Z]/.test(password);
  const passNum    = /[0-9]/.test(password);
  const passStrength = [passLen, passUpper, passNum].filter(Boolean).length;
  const coinciden  = password === confirmar && confirmar.length > 0;

  // Supabase maneja el token automáticamente via el hash de la URL
  // Solo verificamos que haya sesión activa
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSesionOk(true);
      else {
        // No hay sesión — el link es inválido o expiró
        router.replace("/auth/login?error=Link+expirado,+solicitá+uno+nuevo");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!passLen)    { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (!coinciden)  { setError("Las contraseñas no coinciden."); return; }
    setCargando(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setListo(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Error al actualizar la contraseña");
    } finally {
      setCargando(false);
    }
  }

  if (!sesionOk) {
    return (
      <div className="auth-shell">
        <div className="auth-glow" />
        <div className="auth-card" style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <span className="auth-spinner" />
        </div>
        <style>{authStyles}</style>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="auth-shell">
        <div className="auth-glow" />
        <div className="auth-card" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1.25rem",
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle2 className="h-7 w-7" style={{ color: "#22c55e" }} />
          </div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: "1.375rem",
            fontWeight: 700, color: "#fff", margin: "0 0 0.5rem",
          }}>
            ¡Contraseña actualizada!
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#71717a", margin: 0 }}>
            Redirigiendo a tu dashboard...
          </p>
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
          <h1>Nueva contraseña</h1>
          <p>Elegí una contraseña segura para tu cuenta</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="password">Nueva contraseña</label>
            <div className="auth-pass-wrap">
              <input
                id="password" type={showPass ? "text" : "password"}
                autoComplete="new-password" placeholder="Mínimo 8 caracteres"
                value={password} onChange={e => setPassword(e.target.value)}
                required disabled={cargando}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="auth-strength">
                <div className="auth-strength-bars">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="auth-strength-bar" style={{
                      background: i < passStrength
                        ? passStrength === 1 ? "#ef4444" : passStrength === 2 ? "#f59e0b" : "#22c55e"
                        : "rgba(255,255,255,0.08)"
                    }} />
                  ))}
                </div>
                <span className="auth-strength-label">
                  {passStrength === 1 ? "Débil" : passStrength === 2 ? "Media" : "Fuerte"}
                </span>
              </div>
            )}

            <div className="auth-hints">
              <span className={passLen   ? "hint-ok" : "hint-no"}>8+ caracteres</span>
              <span className={passUpper ? "hint-ok" : "hint-no"}>Mayúscula</span>
              <span className={passNum   ? "hint-ok" : "hint-no"}>Número</span>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <div className="auth-pass-wrap">
              <input
                id="confirmar" type={showConf ? "text" : "password"}
                autoComplete="new-password" placeholder="Repetí la contraseña"
                value={confirmar} onChange={e => setConfirmar(e.target.value)}
                required disabled={cargando}
                style={{
                  borderColor: confirmar.length > 0
                    ? coinciden ? "rgba(34,197,94,0.4)" : "rgba(220,38,38,0.4)"
                    : undefined
                }}
              />
              <button type="button" className="auth-eye" onClick={() => setShowConf(!showConf)} tabIndex={-1}>
                {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmar.length > 0 && (
              <span style={{
                fontSize: "0.6875rem", fontWeight: 500,
                color: coinciden ? "#4ade80" : "#f87171",
              }}>
                {coinciden ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
              </span>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={cargando || !coinciden || !passLen}>
            {cargando
              ? <span className="auth-spinner" />
              : <><ArrowRight className="h-4 w-4" />Guardar nueva contraseña</>
            }
          </button>
        </form>

        <p className="auth-footer">
          <Link href="/auth/login">Volver al login</Link>
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
  .auth-pass-wrap { position: relative; }
  .auth-pass-wrap input { padding-right: 42px; }
  .auth-eye {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; padding: 0; cursor: pointer;
    color: #52525b; display: flex; align-items: center; transition: color 0.15s;
  }
  .auth-eye:hover { color: #a1a1aa; }
  .auth-strength { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .auth-strength-bars { display: flex; gap: 4px; flex: 1; }
  .auth-strength-bar { height: 3px; flex: 1; border-radius: 99px; transition: background 0.3s; }
  .auth-strength-label { font-size: 0.6875rem; font-weight: 600; color: #52525b; white-space: nowrap; }
  .auth-hints { display: flex; gap: 8px; flex-wrap: wrap; }
  .hint-ok, .hint-no { font-size: 0.6875rem; font-weight: 500; padding: 2px 8px; border-radius: 99px; }
  .hint-ok { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
  .hint-no { background: rgba(255,255,255,0.04); color: #52525b; border: 1px solid rgba(255,255,255,0.06); }
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
  .auth-footer a { color: #DC2626; text-decoration: none; font-weight: 600; }
  .auth-footer a:hover { color: #ef4444; }
`;